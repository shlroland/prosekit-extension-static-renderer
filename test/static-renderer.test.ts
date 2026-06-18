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
import { type DOMOutputSpec, Schema } from '@prosekit/pm/model'
import { renderToString as renderVueToString } from '@vue/server-renderer'
import { renderToStaticMarkup as renderPreactToStaticMarkup } from 'preact-render-to-string'
import { isValidElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderToString as renderSolidToString } from 'solid-js/web'
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
const expectedExtendedNodeNames = [
  'blockquote',
  'codeBlock',
  'doc',
  'hardBreak',
  'heading',
  'horizontalRule',
  'image',
  'list',
  'mathBlock',
  'mathInline',
  'mention',
  'pageBreak',
  'paragraph',
  'table',
  'tableCell',
  'tableHeaderCell',
  'tableRow',
  'text',
]
const expectedExtendedMarkNames = [
  'backgroundColor',
  'bold',
  'code',
  'fontFamily',
  'highlight',
  'italic',
  'link',
  'strike',
  'subscript',
  'superscript',
  'textColor',
  'underline',
]
const prosemirrorSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'inline*',
      group: 'block',
      toDOM: () => ['p', 0],
    },
    text: { group: 'inline' },
  },
  marks: {
    strong: {
      toDOM: () => ['strong', 0],
    },
  },
})
const attributeSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    label: {
      content: 'inline*',
      group: 'block',
      attrs: {
        for: { default: 'field-id' },
        href: { default: 'javascript:alert(1)' },
      },
      toDOM: (node) => [
        'label',
        {
          class: 'field-label',
          for: String(node.attrs.for),
          href: String(node.attrs.href),
          onclick: 'alert(1)',
          readonly: '',
          tabindex: '2',
          'data-role': 'label',
        },
        0,
      ],
    },
    svg: {
      group: 'block',
      toDOM: () => [
        'svg',
        { viewbox: '0 0 16 16', 'stroke-width': '2' },
        ['path', { d: 'M0 0', 'clip-rule': 'evenodd' }],
      ],
    },
    domNode: {
      group: 'block',
      toDOM: () =>
        ({ nodeType: 1, nodeName: 'SPAN' }) as unknown as DOMOutputSpec,
    },
    text: { group: 'inline' },
  },
})
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

function normalizeSolidHTML(html: string): string {
  return html.replaceAll(/ data-hk="[^"]*"/g, '').replaceAll(' >', '>')
}

function normalizeVueHTML(html: string): string {
  return html.replace('<!--[-->', '').replace('<!--]-->', '')
}

function normalizeFrameworkHTML(html: string): string {
  return normalizeVueHTML(normalizeSolidHTML(html))
}

function expectExtendedSSRHTML(html: string): void {
  expect(html).toContain('<h2 style="text-align:center">')
  expect(html).toContain('data-mention="user"')
  expect(html).toContain('prosemirror-flat-list')
  expect(html).toMatch(/--prosemirror-flat-list-order:\s*1/)
  expect(html).toContain('<th><p style="text-align:left">Feature</p></th>')
  expect(html).toContain('prosemirror-math-block')
}

function expectSafeStaticAttrsHTML(html: string): void {
  expect(html).toMatch(/class="field-label\s*"/)
  expect(html).toContain('for="field-id"')
  expect(html).toContain('tabindex="2"')
  expect(html).toContain('data-role="label"')
  expect(html).toMatch(/view[Bb]ox="0 0 16 16"/)
  expect(html).toContain('stroke-width="2"')
  expect(html).toContain('clip-rule="evenodd"')
  expect(html).not.toContain('href=')
  expect(html).not.toContain('onclick')
  expect(html).not.toContain('javascript:')
}

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
        { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
        { type: 'text', text: ', ' },
        { type: 'text', marks: [{ type: 'underline' }], text: 'underline' },
        { type: 'text', text: ', ' },
        { type: 'text', marks: [{ type: 'strike' }], text: 'strike' },
        { type: 'text', text: ', ' },
        { type: 'text', marks: [{ type: 'code' }], text: 'code' },
        { type: 'hardBreak' },
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
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Quoted content' }],
        },
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
      attrs: { kind: 'ordered', order: 1, checked: false, collapsed: false },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Ordered item' }],
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
      type: 'image',
      attrs: {
        src: 'https://static.photos/yellow/640x360/42',
        width: 48,
        height: 48,
      },
    },
    { type: 'horizontalRule' },
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
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'const answer = 42' }],
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

  it('removes dangerous URL and event attributes by default', () => {
    expect(
      renderToHTMLString({
        schema: attributeSchema,
        content: {
          type: 'doc',
          content: [
            {
              type: 'label',
              content: [{ type: 'text', text: 'Field' }],
            },
          ],
        },
      }),
    ).toBe(
      '<label class="field-label" for="field-id" readonly="" tabindex="2" data-role="label">Field</label>',
    )
  })

  it('allows custom URL sanitizers to override the default URL policy', () => {
    expect(
      renderToHTMLString({
        schema: attributeSchema,
        sanitizeURL: (url) => url,
        content: {
          type: 'doc',
          content: [
            {
              type: 'label',
              attrs: { href: 'ipfs://example' },
              content: [{ type: 'text', text: 'Field' }],
            },
          ],
        },
      }),
    ).toContain('href="ipfs://example"')
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

  it('renders content using a plain ProseMirror schema', () => {
    expect(
      renderToHTMLString({
        schema: prosemirrorSchema,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Plain ' },
                { type: 'text', marks: [{ type: 'strong' }], text: 'schema' },
              ],
            },
          ],
        },
      }),
    ).toBe('<p>Plain <strong>schema</strong></p>')
  })

  it('throws when neither extension nor schema is provided', () => {
    expect(() =>
      createHTMLRenderer({} as Parameters<typeof createHTMLRenderer>[0]),
    ).toThrow(
      '[prosekit error]: createRenderer requires either a ProseKit extension or a ProseMirror schema.',
    )
  })

  it('throws when the provided extension does not define a schema', () => {
    const extensionWithoutSchema = {} as typeof extension

    expect(() =>
      createHTMLRenderer({
        extension: extensionWithoutSchema,
      }),
    ).toThrow(
      '[prosekit error]: Extension does not define a schema. Provide a ProseMirror schema or make sure the extension includes at least a document node spec.',
    )
  })

  it('throws a clear error when toDOM returns a DOM node', () => {
    expect(() =>
      renderToHTMLString({
        schema: attributeSchema,
        content: {
          type: 'doc',
          content: [{ type: 'domNode' }],
        },
      }),
    ).toThrow(
      'Static renderers support SSR-friendly DOMOutputSpec strings and arrays only',
    )
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

  it('handles markdown escaping for code, lists, links, images, and tables', () => {
    const markdown = renderToMarkdown({
      extension: extendedExtension,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'code' }], text: 'tick ` here' },
              {
                type: 'text',
                marks: [
                  {
                    type: 'link',
                    attrs: { href: 'javascript:alert(1)' },
                  },
                ],
                text: 'bad [link]',
              },
            ],
          },
          {
            type: 'list',
            attrs: {
              kind: 'bullet',
              order: null,
              checked: false,
              collapsed: false,
            },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'First paragraph' }],
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Second paragraph' }],
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
                        content: [{ type: 'text', text: 'Feature | Name' }],
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
                        content: [
                          { type: 'text', text: 'Line 1' },
                          { type: 'hardBreak' },
                          { type: 'text', text: 'Line | 2' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'codeBlock',
            attrs: { language: 'md' },
            content: [{ type: 'text', text: '``` inside' }],
          },
          {
            type: 'image',
            attrs: {
              alt: 'Image [alt]',
              src: 'javascript:alert(1)',
            },
          },
        ],
      },
    })

    expect(markdown).toContain('``tick ` here``bad \\[link\\]')
    expect(markdown).toContain('- First paragraph\n\n  Second paragraph')
    expect(markdown).toContain(String.raw`| Feature \| Name |`)
    expect(markdown).toContain(String.raw`| Line 1<br>Line \| 2 |`)
    expect(markdown).toContain('````md\n``` inside\n````')
    expect(markdown).toContain('![]()')
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

  it('renders basic content through framework SSR', async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'World' },
          ],
        },
      ],
    } satisfies NodeJSON
    const expectedHTML = '<p>Hello <strong>World</strong></p>'

    expect(
      renderToStaticMarkup(renderToReactElement({ extension, content })),
    ).toBe(expectedHTML)
    expect(
      renderPreactToStaticMarkup(
        renderToPreactElement({ extension, content }),
      ),
    ).toBe(expectedHTML)
    expect(
      normalizeFrameworkHTML(
        renderSolidToString(() =>
          renderToSolidElement({ extension, content }),
        ),
      ),
    ).toBe(expectedHTML)
    const vueElement = renderToVueElement({ extension, content })
    if (typeof vueElement === 'string') {
      throw new TypeError('Expected renderToVueElement to return a Vue VNode')
    }

    const vueHTML = await renderVueToString(vueElement)
    expect(normalizeFrameworkHTML(vueHTML)).toBe(expectedHTML)
  })

  it('renders extended ProseKit extension content through React SSR', () => {
    const element = renderToReactElement({
      extension: extendedExtension,
      content: richContent,
    })

    const html = renderToStaticMarkup(element)
    expectExtendedSSRHTML(html)
  })

  it('renders extended ProseKit extension content through non-React framework SSR', async () => {
    const preactHTML = renderPreactToStaticMarkup(
      renderToPreactElement({
        extension: extendedExtension,
        content: richContent,
      }),
    )
    expectExtendedSSRHTML(preactHTML)

    const solidHTML = normalizeFrameworkHTML(
      renderSolidToString(() =>
        renderToSolidElement({
          extension: extendedExtension,
          content: richContent,
        }),
      ),
    )
    expectExtendedSSRHTML(solidHTML)

    const vueElement = renderToVueElement({
      extension: extendedExtension,
      content: richContent,
    })
    if (typeof vueElement === 'string') {
      throw new TypeError('Expected renderToVueElement to return a Vue VNode')
    }

    const vueHTML = normalizeFrameworkHTML(await renderVueToString(vueElement))
    expectExtendedSSRHTML(vueHTML)
  })

  it('maps React attributes and removes unsafe static attributes', () => {
    const element = renderToReactElement({
      schema: attributeSchema,
      content: {
        type: 'doc',
        content: [
          {
            type: 'label',
            content: [{ type: 'text', text: 'Field' }],
          },
          { type: 'svg' },
        ],
      },
    })

    expect(isValidElement(element)).toBe(true)

    const root = element as ReactElement<{
      children: Array<ReactElement<Record<string, unknown>>>
    }>
    const [label, svg] = root.props.children
    const path = svg.props.children as ReactElement<Record<string, unknown>>

    expect(label.props).toMatchObject({
      className: 'field-label',
      htmlFor: 'field-id',
      readOnly: true,
      tabIndex: 2,
      'data-role': 'label',
    })
    expect(label.props.href).toBeUndefined()
    expect(label.props.onclick).toBeUndefined()
    expect(svg.props).toMatchObject({
      viewBox: '0 0 16 16',
      strokeWidth: '2',
    })
    expect(path.props.clipRule).toBe('evenodd')
  })

  it('removes unsafe static attributes from non-React framework renderers', () => {
    const ast = renderToSvelteAST({
      schema: attributeSchema,
      content: {
        type: 'doc',
        content: [
          {
            type: 'label',
            content: [{ type: 'text', text: 'Field' }],
          },
        ],
      },
    })

    expect(ast).toMatchObject({
      props: {
        class: 'field-label',
        for: 'field-id',
        'data-role': 'label',
      },
      tag: 'label',
    })
    if (typeof ast !== 'object') {
      throw new TypeError('Expected a Svelte AST element')
    }

    expect(ast.props.href).toBeUndefined()
    expect(ast.props.onclick).toBeUndefined()
  })

  it('renders safe static attributes through non-React framework SSR', async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'label',
          content: [{ type: 'text', text: 'Field' }],
        },
        { type: 'svg' },
      ],
    } satisfies NodeJSON

    const preactHTML = renderPreactToStaticMarkup(
      renderToPreactElement({ schema: attributeSchema, content }),
    )
    expectSafeStaticAttrsHTML(preactHTML)

    const solidHTML = normalizeFrameworkHTML(
      renderSolidToString(() =>
        renderToSolidElement({ schema: attributeSchema, content }),
      ),
    )
    expectSafeStaticAttrsHTML(solidHTML)

    const vueElement = renderToVueElement({ schema: attributeSchema, content })
    if (typeof vueElement === 'string') {
      throw new TypeError('Expected renderToVueElement to return a Vue VNode')
    }

    const vueHTML = normalizeFrameworkHTML(await renderVueToString(vueElement))
    expectSafeStaticAttrsHTML(vueHTML)
  })
})

describe('ProseKit extension compatibility', () => {
  it('includes every schema type used by the full demo extension', () => {
    const schema = extendedExtension.schema

    if (!schema) {
      throw new Error('Expected extended extension to define a schema')
    }

    expect(Object.keys(schema.nodes).sort()).toEqual(expectedExtendedNodeNames)
    expect(Object.keys(schema.marks).sort()).toEqual(expectedExtendedMarkNames)
  })

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
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<u>underline</u>')
    expect(html).toContain('<s>strike</s>')
    expect(html).toContain('<code>code</code>')
    expect(html).toContain('<br/>')
    expect(html).toContain('data-text-color="#2563eb"')
    expect(html).toContain('data-background-color="#fef3c7"')
    expect(html).toContain('data-font-family="Inter"')
    expect(html).toContain('<mark>highlight</mark>')
    expect(html).toContain('<sub>sub</sub>')
    expect(html).toContain('<sup>sup</sup>')
    expect(html).toContain(
      '<blockquote><p style="text-align:left">Quoted content</p></blockquote>',
    )
    expect(html).toContain('prosemirror-flat-list')
    expect(html).toContain('Ordered item')
    expect(html).toContain(
      '<img src="https://static.photos/yellow/640x360/42" width="48" height="48"/>',
    )
    expect(html).toContain('<div class="prosekit-horizontal-rule"><hr/></div>')
    expect(html).toContain('<table>')
    expect(html).toContain(
      '<pre data-language="ts"><code class="language-ts">const answer = 42</code></pre>',
    )
    expect(html).toContain('data-mention="user"')
    expect(html).toContain('prosekit-page-break')
    expect(html).toContain('prosemirror-math-inline')
    expect(html).toContain('prosemirror-math-block')
  })
})
