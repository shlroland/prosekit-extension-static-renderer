# prosekit-static-renderer

[![NPM version](https://img.shields.io/npm/v/prosekit-static-renderer?color=a1b858&label=)](https://www.npmjs.com/package/prosekit-static-renderer)

Render ProseKit and ProseMirror JSON documents to HTML, Markdown, and framework elements without creating an editor instance.

This package is based on the static renderer work from [`prosekit/prosekit#1663`](https://github.com/prosekit/prosekit/pull/1663), packaged as a standalone utility.

## Install

```bash
pnpm add prosekit-static-renderer
```

Install the framework peer dependency only when you use that renderer:

```bash
pnpm add react react-dom
pnpm add preact
pnpm add solid-js
pnpm add svelte
pnpm add vue
```

## Usage

Render from a ProseKit extension:

```ts
import { defineBasicExtension } from '@prosekit/basic'
import { union } from '@prosekit/core'
import { renderToHTMLString } from 'prosekit-static-renderer/html'
import { renderToMarkdown } from 'prosekit-static-renderer/markdown'

const extension = union(defineBasicExtension())

const content = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Hello' }],
    },
  ],
}

const html = renderToHTMLString({ extension, content })
const markdown = renderToMarkdown({ extension, content })
```

Or render from a plain ProseMirror schema:

```ts
import { Schema } from '@prosekit/pm/model'
import { renderToHTMLString } from 'prosekit-static-renderer/html'

const schema = new Schema({
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

const html = renderToHTMLString({
  schema,
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
})
```

For repeated renders, create a reusable renderer:

```ts
import { createHTMLRenderer } from 'prosekit-static-renderer/html'

const render = createHTMLRenderer({ extension })

const first = render(firstDocument)
const second = render(secondDocument)
```

Every renderer accepts either:

- `extension`: a ProseKit extension with a schema.
- `schema`: a ProseMirror schema.

If both are provided, `schema` is used for parsing JSON and reading `toDOM`
specs. If neither is provided, the renderer throws.

## Entry Points

- `prosekit-static-renderer`
- `prosekit-static-renderer/html`
- `prosekit-static-renderer/markdown`
- `prosekit-static-renderer/react`
- `prosekit-static-renderer/preact`
- `prosekit-static-renderer/solid`
- `prosekit-static-renderer/svelte`
- `prosekit-static-renderer/vue`

The root entry exports all renderer functions and shared types.

Prefer subpath imports in applications and libraries. The root entry re-exports
all framework renderers, so it is best suited for environments where the
framework peer dependencies you need are already installed.

## API

### HTML

```ts
import {
  createHTMLRenderer,
  renderToHTMLString,
} from 'prosekit-static-renderer/html'

const render = createHTMLRenderer({ extension })
const html = render(content)

const oneShotHTML = renderToHTMLString({ extension, content })
```

### Markdown

```ts
import {
  createMarkdownRenderer,
  renderToMarkdown,
} from 'prosekit-static-renderer/markdown'

const render = createMarkdownRenderer({ extension })
const markdown = render(content)

const oneShotMarkdown = renderToMarkdown({ extension, content })
```

### React

```tsx
import { createReactRenderer } from 'prosekit-static-renderer/react'
import { renderToStaticMarkup } from 'react-dom/server'

const render = createReactRenderer({ extension })
const element = render(content)
const html = renderToStaticMarkup(element)
```

### Other Frameworks

```ts
import { createPreactRenderer } from 'prosekit-static-renderer/preact'
import { createSolidRenderer } from 'prosekit-static-renderer/solid'
import { createSvelteRenderer } from 'prosekit-static-renderer/svelte'
import { createVueRenderer } from 'prosekit-static-renderer/vue'

const preactVNode = createPreactRenderer({ extension })(content)
const solidElement = createSolidRenderer({ extension })(content)
const svelteAST = createSvelteRenderer({ extension })(content)
const vueVNode = createVueRenderer({ extension })(content)
```

## Custom Mappings

Use `nodeMapping` and `markMapping` to override rendering for built-in or
custom schema types. Mapping return values match the renderer target:

- HTML and Markdown mappings return strings.
- React mappings return React nodes.
- Preact mappings return VNodes.
- Solid mappings return Solid elements.
- Svelte mappings return Svelte AST nodes.
- Vue mappings return Vue VNodes or strings.

```ts
import { renderToHTMLString } from 'prosekit-static-renderer/html'

const html = renderToHTMLString({
  extension,
  content,
  nodeMapping: {
    paragraph: ({ children }) => `<div class="paragraph">${children}</div>`,
  },
  markMapping: {
    bold: ({ children }) => `<b>${children}</b>`,
  },
})
```

In React, mappings can return components. This is useful for static previews
that need framework-specific rendering, such as syntax highlighting or math:

```tsx
import { createReactRenderer } from 'prosekit-static-renderer/react'

function CodeBlock({
  code,
  language,
}: {
  code: string
  language: string
}) {
  return (
    <pre data-language={language || undefined}>
      <code className={language ? `language-${language}` : undefined}>
        {code}
      </code>
    </pre>
  )
}

function MathInline({ value }: { value: string }) {
  return <span className="math-inline">{value}</span>
}

const render = createReactRenderer({
  extension,
  nodeMapping: {
    codeBlock: ({ node }) => (
      <CodeBlock
        code={node.textContent}
        language={String(node.attrs.language || '')}
      />
    ),
    mathInline: ({ node }) => <MathInline value={node.textContent} />,
  },
})
```

Mappings are synchronous, but framework components may load async resources
internally on the client. For server-side output that must include async work
such as Shiki highlighting, prepare the rendered data before calling the static
renderer, or render a synchronous fallback.

Use `unhandledNode` and `unhandledMark` when a schema type has no `toDOM` method and you want fallback behavior instead of an error.

## Options

All renderer functions accept the same schema and customization options:

```ts
type StaticRendererCreateOptions =
  | { extension: Extension; schema?: Schema }
  | { extension?: Extension; schema: Schema }

type StaticRendererOptions = StaticRendererCreateOptions & {
  content?: NodeJSON | ProseMirrorNode
}

type CustomMappingOptions<T> = {
  nodeMapping?: Record<string, (props: NodeProps<T>) => T>
  markMapping?: Record<string, (props: MarkProps<T>) => T>
  unhandledNode?: (props: NodeProps<T>) => T
  unhandledMark?: (props: MarkProps<T>) => T
}
```

`content` is required by one-shot functions like `renderToHTMLString` and
`renderToMarkdown`. It is not accepted by `create*Renderer` functions because
they return a reusable render function.

## Development

Local development needs Node.js v22+ and pnpm.

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

## Release

For the first manual npm release:

```bash
pnpm release
```

`pnpm release` runs the full check suite, builds the package, asks
[bumpp](https://github.com/antfu-collective/bumpp) for the next version,
creates the version commit and tag locally, publishes to npm, then pushes the
commit and tag only after `pnpm publish` succeeds.

To bump the version without publishing:

```bash
pnpm bump
```

After the package exists on npm, configure npm Trusted Publisher for this
repository and `release.yml`. Future releases can then use the GitHub Actions
flow:

1. Merge normal feature and fix commits to `master`.
2. `release-please` opens or updates a release PR.
3. Merge the release PR.
4. The release workflow builds and publishes the package through npm OIDC.

## License

MIT
