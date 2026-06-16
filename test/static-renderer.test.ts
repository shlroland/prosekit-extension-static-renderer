import { defineBasicExtension } from '@prosekit/basic'
import type { NodeJSON } from '@prosekit/core'
import { union } from '@prosekit/core'
import { defineBackgroundColor } from '@prosekit/extensions/background-color'
import { defineFontFamily } from '@prosekit/extensions/font-family'
import { defineHighlight } from '@prosekit/extensions/highlight'
import { defineMath } from '@prosekit/extensions/math'
import { defineMention } from '@prosekit/extensions/mention'
import { definePageBreak } from '@prosekit/extensions/page'
import { defineSubscript } from '@prosekit/extensions/subscript'
import { defineSuperscript } from '@prosekit/extensions/superscript'
import { defineTextAlign } from '@prosekit/extensions/text-align'
import { defineTextColor } from '@prosekit/extensions/text-color'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  createHTMLRenderer,
  renderToHTMLString,
  renderToMarkdown,
  renderToReactElement,
} from '../src/index.ts'
import { renderToPreactElement } from '../src/preact.ts'
import { renderToSolidElement } from '../src/solid.ts'
import { renderToSvelteAST } from '../src/svelte.ts'
import { renderToVueElement } from '../src/vue.ts'

const extension = union(defineBasicExtension())
const extendedExtension = union(
  defineBasicExtension(),
  defineTextColor(),
  defineBackgroundColor(),
  defineFontFamily(),
  defineTextAlign({ types: ['paragraph', 'heading'] }),
  defineHighlight(),
  defineSubscript(),
  defineSuperscript(),
  defineMention(),
  definePageBreak(),
  defineMath({
    renderMathBlock: () => {},
    renderMathInline: () => {},
  }),
)

const richContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2, textAlign: 'center' },
      content: [{ type: 'text', text: 'Extended ProseKit Content' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'right' },
      content: [
        { type: 'text', text: 'Styled ' },
        {
          type: 'text',
          marks: [{ type: 'textColor', attrs: { color: '#2563eb' } }],
          text: 'color',
        },
        { type: 'text', text: ', ' },
        {
          type: 'text',
          marks: [{ type: 'backgroundColor', attrs: { color: '#fef3c7' } }],
          text: 'background',
        },
        { type: 'text', text: ', ' },
        {
          type: 'text',
          marks: [{ type: 'fontFamily', attrs: { family: 'Inter' } }],
          text: 'font',
        },
        { type: 'text', text: ', ' },
        {
          type: 'text',
          marks: [{ type: 'highlight' }],
          text: 'highlight',
        },
        { type: 'text', text: ', ' },
        {
          type: 'text',
          marks: [{ type: 'subscript' }],
          text: 'sub',
        },
        { type: 'text', text: ' and ' },
        {
          type: 'text',
          marks: [{ type: 'superscript' }],
          text: 'sup',
        },
        { type: 'text', text: ' with ' },
        { type: 'mention', attrs: { id: '1', value: 'Ada', kind: 'user' } },
        { type: 'text', text: '.' },
      ],
    },
    {
      type: 'list',
      attrs: { kind: 'bullet', order: null, checked: false, collapsed: false },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Bullet item' }],
        },
      ],
    },
    {
      type: 'list',
      attrs: { kind: 'task', order: null, checked: true, collapsed: false },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Task item' }],
        },
      ],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableHeaderCell',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Feature' }],
                },
              ],
            },
            {
              type: 'tableHeaderCell',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Status' }],
                },
              ],
            },
          ],
        },
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Static render' }],
                },
              ],
            },
            {
              type: 'tableCell',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Supported' }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'mathBlock',
      attrs: { language: 'tex' },
      content: [{ type: 'text', text: 'E = mc^2' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Inline math ' },
        { type: 'mathInline', content: [{ type: 'text', text: 'x + y' }] },
        { type: 'text', text: ' works.' },
      ],
    },
    { type: 'pageBreak' },
  ],
} satisfies NodeJSON

describe('renderToHTMLString', () => {
  it('renders basic content using schema toDOM specs', () => {
    expect(
      renderToHTMLString({
        extension,
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Title' }],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Hello ' },
                { type: 'text', marks: [{ type: 'bold' }], text: 'World' },
              ],
            },
          ],
        },
      }),
    ).toBe('<h1>Title</h1><p>Hello <strong>World</strong></p>')
  })

  it('escapes text and attribute values', () => {
    expect(
      renderToHTMLString({
        extension,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  marks: [
                    {
                      type: 'link',
                      attrs: { href: 'https://example.com?a=1&b="x"' },
                    },
                  ],
                  text: '<script>alert("xss")</script>',
                },
              ],
            },
          ],
        },
      }),
    ).toBe(
      '<p><a href="https://example.com?a=1&amp;b=&quot;x&quot;">&lt;script&gt;alert("xss")&lt;/script&gt;</a></p>',
    )
  })

  it('supports reusable renderers and custom mappings', () => {
    const render = createHTMLRenderer({
      extension,
      nodeMapping: {
        paragraph: ({ children }) => `<div class="paragraph">${children}</div>`,
      },
      markMapping: {
        bold: ({ children }) => `<b>${children}</b>`,
      },
    })

    expect(
      render({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'bold' }], text: 'Custom' },
            ],
          },
        ],
      }),
    ).toBe('<div class="paragraph"><b>Custom</b></div>')
  })
})

describe('renderToMarkdown', () => {
  it('renders markdown-specific node and mark mappings', () => {
    expect(
      renderToMarkdown({
        extension,
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [{ type: 'text', text: 'Title' }],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', marks: [{ type: 'italic' }], text: 'Hello' },
                { type: 'text', text: ' markdown' },
              ],
            },
          ],
        },
      }),
    ).toBe('## Title\n\n_Hello_ markdown\n')
  })

  it('renders ProseKit list and table nodes as markdown', () => {
    const markdown = renderToMarkdown({
      extension: extendedExtension,
      content: richContent,
    })

    expect(markdown).toContain('- Bullet item')
    expect(markdown).toContain('- [x] Task item')
    expect(markdown).toContain('| Feature | Status |')
    expect(markdown).toContain('| --- | --- |')
    expect(markdown).toContain('@Ada')
    expect(markdown).toContain('$$\nE = mc^2\n$$')
    expect(markdown).toContain('$x + y$')
  })
})

describe('framework renderers', () => {
  it('creates framework-specific render outputs', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
    } satisfies NodeJSON

    expect(renderToReactElement({ extension, content })).toBeTruthy()
    expect(renderToPreactElement({ extension, content })).toBeTruthy()
    expect(renderToSolidElement({ extension, content })).toBeTruthy()
    expect(renderToSvelteAST({ extension, content })).toMatchObject({
      children: ['Hello'],
      props: {},
      tag: 'p',
    })
    expect(renderToVueElement({ extension, content })).toBeTruthy()
  })

  it('renders extended ProseKit extension content through React SSR', () => {
    const element = renderToReactElement({
      extension: extendedExtension,
      content: richContent,
    })

    const html = renderToStaticMarkup(element)
    expect(html).toContain('<h2 style="text-align:center">')
    expect(html).toContain('data-mention="user"')
    expect(html).toContain('prosemirror-flat-list')
    expect(html).toContain('<th><p style="text-align:left">Feature</p></th>')
    expect(html).toContain('prosemirror-math-block')
  })
})

describe('ProseKit extension compatibility', () => {
  it('has toDOM for every non built-in schema type in the extended extension', () => {
    const missingNodes: string[] = []
    const missingMarks: string[] = []
    const schema = extendedExtension.schema

    if (!schema) {
      throw new Error('Expected extended extension to define a schema')
    }

    schema.spec.nodes.forEach((name, spec) => {
      if (name !== 'doc' && name !== 'text' && !spec.toDOM) {
        missingNodes.push(name)
      }
    })
    schema.spec.marks.forEach((name, spec) => {
      if (!spec.toDOM) {
        missingMarks.push(name)
      }
    })

    expect(missingNodes).toEqual([])
    expect(missingMarks).toEqual([])
  })

  it('renders extended ProseKit extension content to HTML without custom mappings', () => {
    const html = renderToHTMLString({
      extension: extendedExtension,
      content: richContent,
    })

    expect(html).toContain('<h2 style="text-align:center">')
    expect(html).toContain('data-text-color="#2563eb"')
    expect(html).toContain('data-background-color="#fef3c7"')
    expect(html).toContain('data-font-family="Inter"')
    expect(html).toContain('<mark>highlight</mark>')
    expect(html).toContain('<sub>sub</sub>')
    expect(html).toContain('<sup>sup</sup>')
    expect(html).toContain('data-mention="user"')
    expect(html).toContain('prosekit-page-break')
    expect(html).toContain('prosemirror-math-inline')
    expect(html).toContain('prosemirror-math-block')
  })
})
