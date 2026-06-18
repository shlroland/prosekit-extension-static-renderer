import { defineBasicExtension } from '@prosekit/basic'
import { createEditor, union } from '@prosekit/core'
import { defineBackgroundColor } from '@prosekit/extensions/background-color'
import { defineCodeBlockShiki } from '@prosekit/extensions/code-block'
import { defineFontFamily } from '@prosekit/extensions/font-family'
import { defineHighlight } from '@prosekit/extensions/highlight'
import { defineMath } from '@prosekit/extensions/math'
import { defineMention } from '@prosekit/extensions/mention'
import { definePageBreak } from '@prosekit/extensions/page'
import { defineSubscript } from '@prosekit/extensions/subscript'
import { defineSuperscript } from '@prosekit/extensions/superscript'
import { defineTextAlign } from '@prosekit/extensions/text-align'
import { defineTextColor } from '@prosekit/extensions/text-color'
import katex from 'katex'
import { render as renderPreactPreview } from 'preact'
import { createElement, useEffect, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { render as renderSolidPreview } from 'solid-js/web'
import { createApp as createVueApp, type App as VueApp } from 'vue'

import { createHTMLRenderer } from '../src/html.ts'
import { createMarkdownRenderer } from '../src/markdown.ts'
import { createPreactRenderer } from '../src/preact.ts'
import { createReactRenderer } from '../src/react.ts'
import { createSolidRenderer } from '../src/solid.ts'
import { createSvelteRenderer, type SvelteASTNode } from '../src/svelte.ts'
import { createVueRenderer } from '../src/vue.ts'

const editorElement = document.querySelector<HTMLDivElement>('#editor')
const textOutput = document.querySelector<HTMLElement>('#text-output')
const frameworkOutput =
  document.querySelector<HTMLDivElement>('#framework-output')
const preactPreview = document.querySelector<HTMLDivElement>('#preact-preview')
const reactPreview = document.querySelector<HTMLDivElement>('#react-preview')
const solidPreview = document.querySelector<HTMLDivElement>('#solid-preview')
const sveltePreview = document.querySelector<HTMLDivElement>('#svelte-preview')
const vuePreview = document.querySelector<HTMLDivElement>('#vue-preview')
const outputTabs = Array.from(
  document.querySelectorAll<HTMLButtonElement>(
    '[data-output-mode]:not(:disabled)',
  ),
)

if (
  !editorElement ||
  !textOutput ||
  !frameworkOutput ||
  !preactPreview ||
  !reactPreview ||
  !solidPreview ||
  !sveltePreview ||
  !vuePreview ||
  outputTabs.length === 0
) {
  throw new Error('Failed to find demo elements')
}

const editorRoot = editorElement
const textOutputElement = textOutput
const frameworkOutputElement = frameworkOutput
const preactPreviewElement = preactPreview
const reactPreviewElement = reactPreview
const solidPreviewElement = solidPreview
const sveltePreviewElement = sveltePreview
const vuePreviewElement = vuePreview

type OutputMode =
  | 'html'
  | 'markdown'
  | 'preact'
  | 'react'
  | 'solid'
  | 'svelte'
  | 'vue'

let outputMode: OutputMode = 'html'
let outputUpdateID = 0
let highlighterPromise: ReturnType<typeof createDemoHighlighter> | undefined

async function formatHTML(html: string): Promise<string> {
  const [{ default: prettier }, { default: prettierPluginHtml }] =
    await Promise.all([
      import('prettier/standalone'),
      import('prettier/plugins/html'),
    ])

  return await prettier.format(html, {
    parser: 'html',
    plugins: [prettierPluginHtml],
  })
}

async function createDemoHighlighter() {
  const [
    { createHighlighterCore },
    { createJavaScriptRegexEngine },
    { default: html },
    { default: markdown },
    { default: typescript },
    { default: githubLight },
    { default: githubDark },
  ] = await Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
    import('shiki/langs/html.mjs'),
    import('shiki/langs/markdown.mjs'),
    import('shiki/langs/typescript.mjs'),
    import('shiki/themes/github-light.mjs'),
    import('shiki/themes/github-dark.mjs'),
  ])

  return await createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    langs: [html, markdown, typescript],
    themes: [githubLight, githubDark],
  })
}

async function highlightCode(code: string, lang: string): Promise<string> {
  highlighterPromise ??= createDemoHighlighter()
  const highlighter = await highlighterPromise

  return highlighter.codeToHtml(code, {
    lang,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  })
}

function normalizeCodeLanguage(language: unknown): string {
  if (language === 'ts') {
    return 'typescript'
  }
  return typeof language === 'string' && language ? language : 'typescript'
}

function renderMathToHTML(value: string, displayMode: boolean): string {
  return katex.renderToString(value, {
    displayMode,
    throwOnError: false,
  })
}

function renderMathToElement(
  value: string,
  element: HTMLElement,
  displayMode: boolean,
): void {
  katex.render(value, element, {
    displayMode,
    throwOnError: false,
  })
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

function appendSvelteASTNode(
  parent: Node,
  node: SvelteASTNode,
  isSVG = false,
): void {
  if (typeof node === 'string') {
    parent.appendChild(document.createTextNode(node))
    return
  }

  const nextIsSVG = isSVG || node.tag === 'svg'
  const element = nextIsSVG
    ? document.createElementNS(SVG_NAMESPACE, node.tag)
    : document.createElement(node.tag)

  for (const [name, value] of Object.entries(node.props)) {
    if (value != null) {
      element.setAttribute(name, String(value))
    }
  }

  for (const child of node.children) {
    appendSvelteASTNode(element, child, nextIsSVG)
  }

  parent.appendChild(element)
}

function ReactCodeBlock({
  code,
  language,
}: {
  code: string
  language: string
}): ReactNode {
  const [html, setHTML] = useState<string>()

  useEffect(() => {
    let active = true
    setHTML(undefined)

    void highlightCode(code, normalizeCodeLanguage(language))
      .then((nextHTML) => {
        if (active) {
          setHTML(nextHTML)
        }
      })
      .catch(() => {
        if (active) {
          setHTML(undefined)
        }
      })

    return () => {
      active = false
    }
  }, [code, language])

  if (html) {
    return createElement('div', {
      className: 'rendered-code-block',
      dangerouslySetInnerHTML: { __html: html },
    })
  }

  return createElement(
    'pre',
    { 'data-language': language || undefined },
    createElement(
      'code',
      { className: language ? `language-${language}` : undefined },
      code,
    ),
  )
}

function ReactMath({
  value,
  displayMode,
}: {
  value: string
  displayMode: boolean
}): ReactNode {
  return createElement(displayMode ? 'div' : 'span', {
    className: displayMode ? 'rendered-math-block' : 'rendered-math-inline',
    dangerouslySetInnerHTML: {
      __html: renderMathToHTML(value, displayMode),
    },
  })
}

function defineEditorExtension() {
  return union(
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
      renderMathBlock: (value, element) =>
        renderMathToElement(value, element, true),
      renderMathInline: (value, element) =>
        renderMathToElement(value, element, false),
    }),
    defineCodeBlockShiki({
      langs: ['typescript', 'tex', 'text'],
      themes: ['github-light'],
    }),
  )
}

type EditorExtension = ReturnType<typeof defineEditorExtension>

const defaultContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1, textAlign: 'center' },
      content: [{ type: 'text', text: 'Static Renderer Demo' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [
        { type: 'text', text: 'Render ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'ProseKit JSON' },
        { type: 'text', text: ' without creating another editor instance.' },
      ],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [
        {
          type: 'text',
          marks: [{ type: 'link', attrs: { href: 'https://prosekit.dev' } }],
          text: 'Links',
        },
        {
          type: 'text',
          text: ', marks, headings, lists, tables, mentions, math, and page breaks can be rendered statically.',
        },
      ],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [
        { type: 'text', text: 'Inline schema coverage: ' },
        { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
        { type: 'text', text: ', ' },
        { type: 'text', marks: [{ type: 'underline' }], text: 'underline' },
        { type: 'text', text: ', ' },
        { type: 'text', marks: [{ type: 'strike' }], text: 'strike' },
        { type: 'text', text: ', ' },
        { type: 'text', marks: [{ type: 'code' }], text: 'code' },
        { type: 'hardBreak' },
        { type: 'text', text: 'Hard breaks are inline nodes too.' },
      ],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'right' },
      content: [
        { type: 'text', text: 'Extra extensions: ' },
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
        { type: 'text', text: ', ' },
        {
          type: 'text',
          marks: [{ type: 'superscript' }],
          text: 'sup',
        },
        { type: 'text', text: ', and ' },
        { type: 'mention', attrs: { id: '1', value: 'Ada', kind: 'user' } },
        { type: 'text', text: '.' },
      ],
    },
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Blockquotes render through the schema toDOM spec.',
            },
          ],
        },
      ],
    },
    {
      type: 'list',
      attrs: { kind: 'bullet', order: null, checked: false, collapsed: false },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'HTML string output' }],
        },
      ],
    },
    {
      type: 'list',
      attrs: { kind: 'ordered', order: 1, checked: false, collapsed: false },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Ordered flat-list item' }],
        },
      ],
    },
    {
      type: 'list',
      attrs: { kind: 'task', order: null, checked: true, collapsed: false },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'React element output' }],
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
                  content: [{ type: 'text', text: 'Schema type' }],
                },
              ],
            },
            {
              type: 'tableHeaderCell',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Static output' }],
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
                  content: [{ type: 'text', text: 'table/tableRow/tableCell' }],
                },
              ],
            },
            {
              type: 'tableCell',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'HTML, Markdown, React, Preact, Solid, Vue, Svelte AST',
                    },
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
      attrs: { language: 'ts' },
      content: [
        {
          type: 'text',
          text: 'const render = createHTMLRenderer({ extension })',
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
      type: 'mathBlock',
      attrs: { language: 'tex' },
      content: [{ type: 'text', text: 'E = mc^2' }],
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [
        { type: 'text', text: 'Inline math ' },
        { type: 'mathInline', content: [{ type: 'text', text: 'x + y' }] },
        { type: 'text', text: ' is rendered too.' },
      ],
    },
    { type: 'pageBreak' },
  ],
}

function start() {
  const extension = defineEditorExtension()
  const renderHTML = createHTMLRenderer({ extension })
  const renderMarkdown = createMarkdownRenderer({ extension })
  const renderPreact = createPreactRenderer({ extension })
  const renderReact = createReactRenderer({
    extension,
    nodeMapping: {
      codeBlock: ({ node }) => {
        return createElement(ReactCodeBlock, {
          code: node.textContent,
          language: String(node.attrs.language || ''),
        })
      },
      mathBlock: ({ node }) => {
        return createElement(ReactMath, {
          value: node.textContent,
          displayMode: true,
        })
      },
      mathInline: ({ node }) => {
        return createElement(ReactMath, {
          value: node.textContent,
          displayMode: false,
        })
      },
    },
  })
  const renderSolid = createSolidRenderer({ extension })
  const renderSvelte = createSvelteRenderer({ extension })
  const renderVue = createVueRenderer({ extension })
  const reactRoot = createRoot(reactPreviewElement)
  let disposeSolid: (() => void) | undefined
  let vueApp: VueApp<Element> | undefined
  const editor = createEditor<EditorExtension>({
    extension,
    defaultContent,
  })

  function clearFrameworkOutput() {
    reactRoot.render(null)
    renderPreactPreview(null, preactPreviewElement)
    disposeSolid?.()
    disposeSolid = undefined
    vueApp?.unmount()
    vueApp = undefined
    preactPreviewElement.hidden = true
    reactPreviewElement.hidden = true
    solidPreviewElement.hidden = true
    sveltePreviewElement.hidden = true
    vuePreviewElement.hidden = true
    preactPreviewElement.innerHTML = ''
    solidPreviewElement.innerHTML = ''
    sveltePreviewElement.innerHTML = ''
    vuePreviewElement.innerHTML = ''
  }

  async function updateOutput() {
    const updateID = ++outputUpdateID
    const doc = editor.getDocJSON()
    const isFrameworkMode =
      outputMode === 'preact' ||
      outputMode === 'react' ||
      outputMode === 'solid' ||
      outputMode === 'svelte' ||
      outputMode === 'vue'

    textOutputElement.hidden = isFrameworkMode
    frameworkOutputElement.hidden = !isFrameworkMode

    if (outputMode === 'html') {
      clearFrameworkOutput()
      const html = await formatHTML(renderHTML(doc))
      const highlightedHTML = await highlightCode(html, 'html')
      if (updateID === outputUpdateID && outputMode === 'html') {
        textOutputElement.innerHTML = highlightedHTML
      }
    } else if (outputMode === 'markdown') {
      clearFrameworkOutput()
      const markdown = renderMarkdown(doc)
      const highlightedMarkdown = await highlightCode(markdown, 'markdown')
      if (updateID === outputUpdateID && outputMode === 'markdown') {
        textOutputElement.innerHTML = highlightedMarkdown
      }
    } else if (outputMode === 'svelte') {
      textOutputElement.innerHTML = ''
      clearFrameworkOutput()
      sveltePreviewElement.hidden = false
      appendSvelteASTNode(sveltePreviewElement, renderSvelte(doc))
    } else if (outputMode === 'react') {
      textOutputElement.innerHTML = ''
      clearFrameworkOutput()
      reactPreviewElement.hidden = false
      reactRoot.render(renderReact(doc))
    } else if (outputMode === 'preact') {
      textOutputElement.innerHTML = ''
      clearFrameworkOutput()
      preactPreviewElement.hidden = false
      renderPreactPreview(renderPreact(doc), preactPreviewElement)
    } else if (outputMode === 'solid') {
      textOutputElement.innerHTML = ''
      clearFrameworkOutput()
      solidPreviewElement.hidden = false
      disposeSolid = renderSolidPreview(
        () => renderSolid(doc),
        solidPreviewElement,
      )
    } else if (outputMode === 'vue') {
      textOutputElement.innerHTML = ''
      clearFrameworkOutput()
      vuePreviewElement.hidden = false
      vueApp = createVueApp({ render: () => renderVue(doc) })
      vueApp.mount(vuePreviewElement)
    }
  }

  function setOutputMode(nextMode: OutputMode) {
    outputMode = nextMode
    for (const tab of outputTabs) {
      const isActive = tab.dataset.outputMode === nextMode
      tab.classList.toggle('active', isActive)
      tab.setAttribute('aria-pressed', String(isActive))
    }
    void updateOutput()
  }

  editor.mount(editorRoot)
  for (const tab of outputTabs) {
    tab.addEventListener('click', () => {
      const nextMode = tab.dataset.outputMode
      if (
        nextMode === 'html' ||
        nextMode === 'markdown' ||
        nextMode === 'preact' ||
        nextMode === 'react' ||
        nextMode === 'solid' ||
        nextMode === 'svelte' ||
        nextMode === 'vue'
      ) {
        setOutputMode(nextMode)
      }
    })
  }
  void updateOutput()
  editorRoot.addEventListener('input', () => void updateOutput())
  editorRoot.addEventListener('keyup', () => void updateOutput())
  editorRoot.addEventListener('mouseup', () => void updateOutput())
}

try {
  start()
} catch (error) {
  editorRoot.textContent = 'Failed to start the demo. See console for details.'
  throw error
}
