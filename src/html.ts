import {
  createDOMOutputSpecToHTMLString,
  serializeChildrenToHTMLString,
} from './dom-output-spec.ts'
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
 * to HTML strings. The renderer can be used multiple times with different
 * content, avoiding repeated schema initialization.
 *
 * @example
 * ```ts
 * import { createHTMLRenderer } from 'prosekit-static-renderer/html'
 * import { defineExtension } from './my-extension'
 *
 * const render = createHTMLRenderer({
 *   extension: defineExtension(),
 * })
 *
 * const html1 = render({
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
 *   ],
 * })
 *
 * const html2 = render({
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'World' }] },
 *   ],
 * })
 * ```
 */
export function createHTMLRenderer(
  options: StaticRendererCreateOptions & CustomMappingOptions<string>,
): (content: NodeJSON | ProseMirrorNode) => string {
  return createRenderer<string>({
    ...options,
    domOutputSpecToElement: createDOMOutputSpecToHTMLString({
      sanitizeURL: options.sanitizeURL,
    }),
    mapDefinedTypes: {
      doc: ({ children }) => serializeChildrenToHTMLString(children),
      text: ({ node }) => escapeText(node.text ?? ''),
    },
    nodeMapping: options.nodeMapping,
    markMapping: options.markMapping,
    unhandledNode: options.unhandledNode,
    unhandledMark: options.unhandledMark,
  })
}

/**
 * Render a ProseMirror document JSON to an HTML string without creating an
 * editor instance.
 *
 * @example
 * ```ts
 * import { renderToHTMLString } from 'prosekit-static-renderer/html'
 * import { defineExtension } from './my-extension'
 *
 * const html = renderToHTMLString({
 *   extension: defineExtension(),
 *   content: {
 *     type: 'doc',
 *     content: [
 *       { type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] },
 *     ],
 *   },
 * })
 * // => '<p>Hello World</p>'
 * ```
 */
export function renderToHTMLString(
  options: StaticRendererOptions & CustomMappingOptions<string>,
): string {
  const render = createHTMLRenderer(options)

  if (!options.content) {
    throw new Error(
      '[prosekit error]: content is required for renderToHTMLString. Use createHTMLRenderer() if you want to create a reusable renderer.',
    )
  }

  return render(options.content)
}

function escapeText(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
