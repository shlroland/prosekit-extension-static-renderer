import { createHTMLRenderer } from './html.ts'
import {
  createDefaultMarkdownMarkMapping,
  createDefaultMarkdownNodeMapping,
} from './markdown/mappings.ts'
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
 * to Markdown strings. The renderer can be used multiple times with different
 * content, avoiding repeated schema initialization.
 *
 * This reuses the HTML renderer internally, overriding node and mark mappings
 * with Markdown-specific defaults. You can further customize the output by
 * providing your own `nodeMapping` and `markMapping`.
 *
 * @example
 * ```ts
 * import { createMarkdownRenderer } from 'prosekit-static-renderer/markdown'
 * import { defineExtension } from './my-extension'
 *
 * const render = createMarkdownRenderer({
 *   extension: defineExtension(),
 * })
 *
 * const markdown1 = render({
 *   type: 'doc',
 *   content: [
 *     { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
 *   ],
 * })
 *
 * const markdown2 = render({
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] },
 *   ],
 * })
 * ```
 */
export function createMarkdownRenderer(
  options: StaticRendererCreateOptions & CustomMappingOptions<string>,
): (content: NodeJSON | ProseMirrorNode) => string {
  return createHTMLRenderer({
    ...options,
    nodeMapping: {
      ...createDefaultMarkdownNodeMapping({
        sanitizeURL: options.sanitizeURL,
      }),
      ...options.nodeMapping,
    },
    markMapping: {
      ...createDefaultMarkdownMarkMapping({
        sanitizeURL: options.sanitizeURL,
      }),
      ...options.markMapping,
    },
  })
}

/**
 * Render a ProseMirror document JSON to a Markdown string without creating
 * an editor instance.
 *
 * This reuses the HTML renderer internally, overriding node and mark mappings
 * with Markdown-specific defaults. You can further customize the output by
 * providing your own `nodeMapping` and `markMapping`.
 *
 * @example
 * ```ts
 * import { renderToMarkdown } from 'prosekit-static-renderer/markdown'
 * import { defineExtension } from './my-extension'
 *
 * const markdown = renderToMarkdown({
 *   extension: defineExtension(),
 *   content: {
 *     type: 'doc',
 *     content: [
 *       {
 *         type: 'heading',
 *         attrs: { level: 1 },
 *         content: [{ type: 'text', text: 'Title' }],
 *       },
 *       {
 *         type: 'paragraph',
 *         content: [{ type: 'text', text: 'Hello World' }],
 *       },
 *     ],
 *   },
 * })
 * // => '# Title\n\nHello World\n'
 * ```
 */
export function renderToMarkdown(
  options: StaticRendererOptions & CustomMappingOptions<string>,
): string {
  const render = createMarkdownRenderer(options)

  if (!options.content) {
    throw new Error(
      '[prosekit error]: content is required for renderToMarkdown. Use createMarkdownRenderer() if you want to create a reusable renderer.',
    )
  }

  return render(options.content)
}
