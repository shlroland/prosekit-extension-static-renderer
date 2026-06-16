import { defineBasicExtension } from '@prosekit/basic'
import { isApple, union } from '@prosekit/core'
import { createTestEditor } from '@prosekit/core/test'
import { expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { defineYoutube } from '../src/index.ts'

import {
  getTestContainerDiv,
  pasteHTML,
  pasteText,
  readHtmlTextFromClipboard,
  readPlainTextFromClipboard,
} from './utils.ts'

it('contains youtube node in the ProseMirror schema', () => {
  const extension = union(defineBasicExtension(), defineYoutube())
  const editor = createTestEditor({ extension })
  const schema = editor.schema
  expect(schema.spec.nodes.get('youtube')).toBeDefined()
})

it('can create a youtube node', () => {
  const extension = union(defineBasicExtension(), defineYoutube())
  const editor = createTestEditor({ extension })
  const schema = editor.schema
  const youtubeNode = schema.nodes.youtube.create({ videoID: 'abc123' })
  expect(youtubeNode).toBeDefined()
  expect(youtubeNode.attrs.videoID).toBe('abc123')
  expect(() => youtubeNode.check()).not.toThrow()
})

it('can reject invalid youtube node attributes', () => {
  const extension = union(defineBasicExtension(), defineYoutube())
  const editor = createTestEditor({ extension })
  const schema = editor.schema
  const invalidVideoID = 123456 // Should be a string
  expect(() => {
    const youtubeNode = schema.nodes.youtube.create({ videoID: invalidVideoID })
    youtubeNode.check()
  }).toThrow()
})

it('can render youtube node as an iframe', () => {
  const extension = union(defineBasicExtension(), defineYoutube())
  const editor = createTestEditor({ extension })
  const n = editor.nodes
  const doc = n.doc(n.paragraph('Paragraph'), n.youtube({ videoID: 'abc123' }))

  const div = getTestContainerDiv()
  const selector = 'iframe[data-prosekit-youtube]'
  expect(document.querySelector(selector)).toBeFalsy()

  editor.mount(div)
  editor.setContent(doc)

  expect(document.querySelector(selector)).toBeTruthy()
  editor.unmount()
})

it('can copy a youtube node as a link', async () => {
  const extension = union(defineBasicExtension(), defineYoutube())
  const editor = createTestEditor({ extension })
  const n = editor.nodes
  const doc = n.doc(
    n.paragraph('<a>Paragraph 1'),
    n.youtube({ videoID: 'foo' }),
    n.paragraph('Paragraph 2<b>'),
  )

  const div = getTestContainerDiv()
  const selector = 'iframe[data-prosekit-youtube]'
  expect(document.querySelector(selector)).toBeFalsy()

  editor.mount(div)
  editor.setContent(doc)
  editor.focus()

  const mod = isApple ? 'Meta' : 'Control'
  await userEvent.keyboard(`{${mod}>}c{/${mod}}`) // Copy

  expect(await readPlainTextFromClipboard()).toMatchInlineSnapshot(`
    "Paragraph 1

    https://www.youtube.com/embed/foo

    Paragraph 2"
  `)
  expect(await readHtmlTextFromClipboard()).toMatchInlineSnapshot(`
    "
    <p data-pm-slice="1 1 []">
      Paragraph 1
    </p>
    <a
      data-prosekit-youtube="foo"
      href="https://www.youtube.com/embed/foo"
    >
    </a>
    <p>
      Paragraph 2
    </p>
    "
  `)

  editor.unmount()
})

it('can paste a youtube link as a youtube node', () => {
  const extension = union(defineBasicExtension(), defineYoutube())
  const editor = createTestEditor({ extension })

  const div = getTestContainerDiv()
  const selector = 'iframe[data-prosekit-youtube]'
  expect(document.querySelector(selector)).toBeFalsy()

  editor.mount(div)
  editor.focus()

  pasteHTML(
    editor.view,
    `<a href="https://www.youtube.com/embed/foo">Youtube</a>`,
  )

  expect(editor.state.doc.toJSON()).toMatchInlineSnapshot(`
    {
      "content": [
        {
          "attrs": {
            "videoID": "foo",
          },
          "type": "youtube",
        },
      ],
      "type": "doc",
    }
  `)

  editor.unmount()
})

it('can paste a youtube link as plain text', () => {
  const extension = union(defineBasicExtension(), defineYoutube())
  const editor = createTestEditor({ extension })

  const div = getTestContainerDiv()
  const selector = 'iframe[data-prosekit-youtube]'
  expect(document.querySelector(selector)).toBeFalsy()

  editor.mount(div)
  editor.focus()

  pasteText(editor.view, `https://www.youtube.com/embed/foo`)

  expect(editor.state.doc.toJSON()).toMatchInlineSnapshot(`
    {
      "content": [
        {
          "attrs": {
            "videoID": "foo",
          },
          "type": "youtube",
        },
      ],
      "type": "doc",
    }
  `)

  editor.unmount()
})

it('keeps the pasted text intact when a youtube link is mixed with other text', () => {
  const extension = union(defineBasicExtension(), defineYoutube())
  const editor = createTestEditor({ extension })

  const div = getTestContainerDiv()
  editor.mount(div)
  editor.focus()

  // The pasted text is more than just a youtube link, so it should stay as
  // plain text instead of being replaced by a youtube node.
  pasteText(editor.view, `https://www.youtube.com/embed/foo and some more text`)

  expect(editor.state.doc.toJSON()).toMatchInlineSnapshot(`
    {
      "content": [
        {
          "content": [
            {
              "text": "https://www.youtube.com/embed/foo and some more text",
              "type": "text",
            },
          ],
          "type": "paragraph",
        },
      ],
      "type": "doc",
    }
  `)

  // The whole pasted text must be preserved.
  expect(editor.state.doc.textContent).toBe(
    `https://www.youtube.com/embed/foo and some more text`,
  )
  expect(document.querySelector('iframe[data-prosekit-youtube]')).toBeFalsy()

  editor.unmount()
})
