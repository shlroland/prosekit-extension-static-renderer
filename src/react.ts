import { createElement, Fragment, type ReactNode } from 'react'

import { createDOMOutputSpecToReactElement } from './react/dom-output-spec.ts'
import { createRenderer } from './renderer.ts'
import type {
  CustomMappingOptions,
  NodeJSON,
  ProseMirrorNode,
  StaticRendererCreateOptions,
  StaticRendererOptions,
  StaticRendererSchemaOptions,
  StaticRendererSecurityOptions,
  URLSanitizer,
  URLSanitizerContext,
} from './types.ts'

export type {
  CustomMappingOptions,
  StaticRendererCreateOptions,
  StaticRendererOptions,
  StaticRendererSchemaOptions,
  StaticRendererSecurityOptions,
  URLSanitizer,
  URLSanitizerContext,
}

/**
 * Create a reusable renderer function that converts ProseMirror document JSON
 * to React elements. The renderer can be used multiple times with different
 * content, avoiding repeated schema initialization.
 *
 * @example
 * ```tsx
 * import { createReactRenderer } from 'prosekit-static-renderer/react'
 * import { defineExtension } from './my-extension'
 *
 * const render = createReactRenderer({
 *   extension: defineExtension(),
 * })
 *
 * const element1 = render({
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
 *   ],
 * })
 *
 * const element2 = render({
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'World' }] },
 *   ],
 * })
 * ```
 */
export function createReactRenderer(
  options: StaticRendererCreateOptions & CustomMappingOptions<ReactNode>,
): (content: NodeJSON | ProseMirrorNode) => ReactNode {
  return createRenderer<ReactNode>({
    ...options,
    domOutputSpecToElement: createDOMOutputSpecToReactElement({
      sanitizeURL: options.sanitizeURL,
    }),
    mapDefinedTypes: {
      doc: ({ children }) => createElement(Fragment, null, ...children),
      text: ({ node }) => node.text ?? '',
    },
    nodeMapping: options.nodeMapping,
    markMapping: options.markMapping,
    unhandledNode: options.unhandledNode,
    unhandledMark: options.unhandledMark,
  })
}

/**
 * Render a ProseMirror document JSON to a React element without creating
 * an editor instance.
 *
 * @example
 * ```tsx
 * import { renderToReactElement } from 'prosekit-static-renderer/react'
 * import { defineExtension } from './my-extension'
 *
 * const element = renderToReactElement({
 *   extension: defineExtension(),
 *   content: {
 *     type: 'doc',
 *     content: [
 *       { type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] },
 *     ],
 *   },
 * })
 * // => <><p>Hello World</p></>
 * ```
 */
export function renderToReactElement(
  options: StaticRendererOptions & CustomMappingOptions<ReactNode>,
): ReactNode {
  const render = createReactRenderer(options)

  if (!options.content) {
    throw new Error(
      '[prosekit error]: content is required for renderToReactElement. Use createReactRenderer() if you want to create a reusable renderer.',
    )
  }

  return render(options.content)
}
