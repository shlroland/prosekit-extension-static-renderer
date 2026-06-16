import { defineBasicExtension } from '@prosekit/basic'
import { createEditor, union } from '@prosekit/core'
import { createRoot } from 'react-dom/client'

import { createHTMLRenderer } from '../src/html.ts'
import { createMarkdownRenderer } from '../src/markdown.ts'
import { createReactRenderer } from '../src/react.ts'

const editorElement = document.querySelector<HTMLDivElement>('#editor')
const textOutput = document.querySelector<HTMLElement>('#text-output')
const reactOutput = document.querySelector<HTMLDivElement>('#react-output')
const outputTabs = Array.from(
  document.querySelectorAll<HTMLButtonElement>(
    '[data-output-mode]:not(:disabled)',
  ),
)

if (!editorElement || !textOutput || !reactOutput || outputTabs.length === 0) {
  throw new Error('Failed to find demo elements')
}

const editorRoot = editorElement
const textOutputElement = textOutput
const reactOutputElement = reactOutput

type OutputMode = 'html' | 'markdown' | 'react'

let outputMode: OutputMode = 'html'

function defineEditorExtension() {
  return union(defineBasicExtension())
}

type EditorExtension = ReturnType<typeof defineEditorExtension>

const defaultContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Static Renderer Demo' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Render ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'ProseKit JSON' },
        { type: 'text', text: ' without creating another editor instance.' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          marks: [{ type: 'link', attrs: { href: 'https://prosekit.dev' } }],
          text: 'Links',
        },
        { type: 'text', text: ', marks, headings, lists, and custom nodes can be rendered statically.' },
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
      attrs: { kind: 'bullet', order: null, checked: false, collapsed: false },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Markdown string output' }],
        },
      ],
    },
  ],
}

function start() {
  const extension = defineEditorExtension()
  const renderHTML = createHTMLRenderer({ extension })
  const renderMarkdown = createMarkdownRenderer({ extension })
  const renderReact = createReactRenderer({ extension })
  const reactRoot = createRoot(reactOutputElement)
  const editor = createEditor<EditorExtension>({
    extension,
    defaultContent,
  })

  function updateOutput() {
    const doc = editor.getDocJSON()
    const isReactMode = outputMode === 'react'

    textOutputElement.hidden = isReactMode
    reactOutputElement.hidden = !isReactMode

    if (outputMode === 'html') {
      textOutputElement.textContent = renderHTML(doc)
      reactRoot.render(null)
    } else if (outputMode === 'markdown') {
      textOutputElement.textContent = renderMarkdown(doc)
      reactRoot.render(null)
    } else {
      textOutputElement.textContent = ''
      reactRoot.render(renderReact(doc))
    }
  }

  function setOutputMode(nextMode: OutputMode) {
    outputMode = nextMode
    for (const tab of outputTabs) {
      const isActive = tab.dataset.outputMode === nextMode
      tab.classList.toggle('active', isActive)
      tab.setAttribute('aria-pressed', String(isActive))
    }
    updateOutput()
  }

  editor.mount(editorRoot)
  for (const tab of outputTabs) {
    tab.addEventListener('click', () => {
      const nextMode = tab.dataset.outputMode
      if (
        nextMode === 'html'
        || nextMode === 'markdown'
        || nextMode === 'react'
      ) {
        setOutputMode(nextMode)
      }
    })
  }
  updateOutput()
  editorRoot.addEventListener('input', updateOutput)
  editorRoot.addEventListener('keyup', updateOutput)
  editorRoot.addEventListener('mouseup', updateOutput)
}

try {
  start()
} catch (error) {
  editorRoot.textContent = 'Failed to start the demo. See console for details.'
  throw error
}
