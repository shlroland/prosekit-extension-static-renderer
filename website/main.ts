import { defineBasicExtension } from '@prosekit/basic'
import { createEditor, union } from '@prosekit/core'

import { defineYoutube } from '../src/index.ts'

const editorElement = document.querySelector<HTMLDivElement>('#editor')
if (!editorElement) {
  throw new Error('Failed to find #editor element')
}

function defineEditorExtension() {
  return union(defineBasicExtension(), defineYoutube())
}

type EditorExtension = ReturnType<typeof defineEditorExtension>

function start() {
  const editor = createEditor<EditorExtension>({
    extension: defineEditorExtension(),
    defaultContent: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Hello, ProseKit! 👋' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'This editor is powered by ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'ProseKit' },
            {
              type: 'text',
              text: ' with a custom YouTube node. The video below is a real editor node, not an image.',
            },
          ],
        },
        {
          type: 'youtube',
          attrs: { videoID: 'dQw4w9WgXcQ' },
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Paste a link like ' },
            {
              type: 'text',
              marks: [{ type: 'code' }],
              text: 'https://www.youtube.com/embed/VIDEO_ID',
            },
            { type: 'text', text: ' to embed another video of your own.' },
          ],
        },
      ],
    },
  })

  editor.mount(editorElement)
}

try {
  start()
} catch (error) {
  editorElement.textContent =
    'Failed to start the editor. See console for details.'
  throw error
}
