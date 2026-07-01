import { Fragment, h, type VNode } from 'vue'

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

type VueElement = string | VNode

const mapAttrsToProps = createMapAttrsToProps('vue')

/**
 * Create a reusable renderer function that converts ProseMirror document JSON
 * to Vue VNodes. The renderer can be used multiple times with different
 * content, avoiding repeated schema initialization.
 *
 * @example
 * ```ts
 * import { createVueRenderer } from 'prosekit-static-renderer/vue'
 * import { defineExtension } from './my-extension'
 *
 * const render = createVueRenderer({
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
export function createVueRenderer(
  options: StaticRendererCreateOptions & CustomMappingOptions<VueElement>,
): (content: NodeJSON | ProseMirrorNode) => VueElement {
  return createRenderer<VueElement>({
    ...options,
    domOutputSpecToElement: createDOMOutputSpecParser<VueElement>(
      (tag, props, ...children) => h(tag, props, children),
      mapAttrsToProps,
      { sanitizeURL: options.sanitizeURL },
    ),
    mapDefinedTypes: {
      doc: ({ children }) => h(Fragment, null, children),
      text: ({ node }) => node.text ?? '',
    },
    nodeMapping: options.nodeMapping,
    markMapping: options.markMapping,
    unhandledNode: options.unhandledNode,
    unhandledMark: options.unhandledMark,
  })
}

/**
 * Render a ProseMirror document JSON to a Vue VNode without creating
 * an editor instance.
 *
 * @example
 * ```ts
 * import { renderToVueElement } from 'prosekit-static-renderer/vue'
 * import { defineExtension } from './my-extension'
 *
 * const vnode = renderToVueElement({
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
export function renderToVueElement(
  options: StaticRendererOptions & CustomMappingOptions<VueElement>,
): VueElement {
  const render = createVueRenderer(options)

  if (!options.content) {
    throw new Error(
      '[prosekit error]: content is required for renderToVueElement. Use createVueRenderer() if you want to create a reusable renderer.',
    )
  }

  return render(options.content)
}
