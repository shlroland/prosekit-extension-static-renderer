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

For repeated renders, create a reusable renderer:

```ts
import { createHTMLRenderer } from 'prosekit-static-renderer/html'

const render = createHTMLRenderer({ extension })

const first = render(firstDocument)
const second = render(secondDocument)
```

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

## Custom Mappings

Use `nodeMapping` and `markMapping` to override rendering for built-in or custom schema types:

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

Use `unhandledNode` and `unhandledMark` when a schema type has no `toDOM` method and you want fallback behavior instead of an error.

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

Run the checks, bump the version, then publish:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm bump
pnpm publish
```

`pnpm bump` uses [bumpp](https://github.com/antfu-collective/bumpp) to update the package version and optionally create a commit and tag.

## License

MIT
