import { Fragment, h, type VNode } from 'preact'

import { createRenderer } from './renderer.ts'
import {
  createDOMOutputSpecParser,
  createMapAttrsToProps,
} from './shared/dom-output-spec.ts'
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

const mapAttrsToProps = createMapAttrsToProps('preact')

/**
 * Create a reusable renderer function that converts ProseMirror document JSON
 * to Preact VNodes. The renderer can be used multiple times with different
 * content, avoiding repeated schema initialization.
 *
 * @example
 * ```tsx
 * import { createPreactRenderer } from 'prosekit-static-renderer/preact'
 * import { defineExtension } from './my-extension'
 *
 * const render = createPreactRenderer({
 *   extension: defineExtension(),
 * })
 *
 * const vnode1 = render({
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
 *   ],
 * })
 *
 * const vnode2 = render({
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'World' }] },
 *   ],
 * })
 * ```
 */
export function createPreactRenderer(
  options: StaticRendererCreateOptions & CustomMappingOptions<VNode>,
): (content: NodeJSON | ProseMirrorNode) => VNode {
  return createRenderer<VNode>({
    ...options,
    domOutputSpecToElement: createDOMOutputSpecParser<VNode<any>>(
      (tag, props, ...children) => h(tag, props, ...children),
      mapAttrsToProps,
      { sanitizeURL: options.sanitizeURL },
    ),
    mapDefinedTypes: {
      doc: ({ children }) => h(Fragment, null, children),
      text: ({ node }) => h(Fragment, null, node.text),
    },
    nodeMapping: options.nodeMapping,
    markMapping: options.markMapping,
    unhandledNode: options.unhandledNode,
    unhandledMark: options.unhandledMark,
  })
}

/**
 * Render a ProseMirror document JSON to a Preact VNode without creating
 * an editor instance.
 *
 * @example
 * ```tsx
 * import { renderToPreactElement } from 'prosekit-static-renderer/preact'
 * import { defineExtension } from './my-extension'
 *
 * const vnode = renderToPreactElement({
 *   extension: defineExtension(),
 *   content: {
 *     type: 'doc',
 *     content: [
 *       { type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] },
 *     ],
 *   },
 * })
 * ```
 */
export function renderToPreactElement(
  options: StaticRendererOptions & CustomMappingOptions<VNode>,
): VNode {
  const render = createPreactRenderer(options)

  if (!options.content) {
    throw new Error(
      '[prosekit error]: content is required for renderToPreactElement. Use createPreactRenderer() if you want to create a reusable renderer.',
    )
  }

  return render(options.content)
}
