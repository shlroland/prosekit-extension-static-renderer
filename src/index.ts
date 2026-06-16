import {
  defineNodeSpec,
  defineNodeView,
  definePasteHandler,
  union,
} from '@prosekit/core'

export interface YoutubeAttrs {
  videoID: string
}

const YOUTUBE_EMBED_URL_REGEX =
  /^https?:\/\/www\.youtube\.com\/embed\/([^\s/?]+)$/

/** Builds the canonical embed URL for a YouTube video. */
export function getYoutubeEmbedURL(videoID: string): string {
  return `https://www.youtube.com/embed/${videoID}`
}

/** Extracts the video ID from a YouTube embed URL, or `undefined` if the string isn't one. */
export function getYoutubeVideoID(url: string): string | undefined {
  return url.trim().match(YOUTUBE_EMBED_URL_REGEX)?.[1] || undefined
}

export function defineYoutubeSpec() {
  return defineNodeSpec<'youtube', YoutubeAttrs>({
    name: 'youtube',
    group: 'block',
    inline: false,
    attrs: {
      videoID: { default: '', validate: 'string' },
    },
    defining: true,

    parseDOM: [
      {
        tag: 'a[data-prosekit-youtube]',
        priority: 100,
        getAttrs(element) {
          const videoID = element.getAttribute('data-prosekit-youtube')
          if (!videoID) {
            return false
          } else {
            return { videoID } satisfies YoutubeAttrs
          }
        },
      },
      {
        tag: 'iframe[data-prosekit-youtube]',
        getAttrs(element) {
          const videoID = element.getAttribute('data-prosekit-youtube')
          if (!videoID) {
            return false
          } else {
            return { videoID } satisfies YoutubeAttrs
          }
        },
      },
      {
        tag: 'a',
        priority: 100,
        getAttrs(element) {
          const url = element.getAttribute('href') || ''
          const videoID = getYoutubeVideoID(url)
          if (videoID) {
            return { videoID } satisfies YoutubeAttrs
          } else {
            return false
          }
        },
      },
    ],
    toDOM(node) {
      const attrs = node.attrs as YoutubeAttrs
      const url = getYoutubeEmbedURL(attrs.videoID)
      return ['a', { href: url, 'data-prosekit-youtube': attrs.videoID }]
    },
    leafText(node) {
      const attrs = node.attrs as YoutubeAttrs
      return getYoutubeEmbedURL(attrs.videoID)
    },
  })
}

export function defineYoutubeNodeView() {
  return defineNodeView({
    name: 'youtube',
    constructor(node, view) {
      const attrs = node.attrs as YoutubeAttrs
      const url = getYoutubeEmbedURL(attrs.videoID)
      const document = view.dom.ownerDocument
      const iframe = document.createElement('iframe')
      iframe.setAttribute('type', 'text/html')
      iframe.setAttribute('src', url)
      iframe.setAttribute('height', '360')
      iframe.setAttribute('width', '640')
      iframe.setAttribute('data-prosekit-youtube', attrs.videoID)
      iframe.setAttribute('frameborder', '0')
      return {
        dom: iframe,
      }
    },
  })
}

export function defineYoutubePasteHandler() {
  return definePasteHandler((view, event, slice) => {
    // Plain-text pastes never reach `parseDOM`, so a pasted YouTube URL would
    // otherwise be inserted as raw text. Convert it into a youtube node here.
    const text = slice.content.textBetween(0, slice.content.size).trim()
    const videoID = getYoutubeVideoID(text)
    if (!videoID) {
      return false
    }

    const youtubeType = view.state.schema.nodes.youtube
    if (!youtubeType) {
      return false
    }

    const node = youtubeType.create({ videoID } satisfies YoutubeAttrs)
    view.dispatch(view.state.tr.replaceSelectionWith(node))
    return true
  })
}

export function defineYoutube() {
  return union(
    defineYoutubeSpec(),
    defineYoutubeNodeView(),
    defineYoutubePasteHandler(),
  )
}
