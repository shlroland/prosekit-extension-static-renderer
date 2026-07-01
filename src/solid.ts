import type { JSX } from 'solid-js'
import { createComponent, Dynamic } from 'solid-js/web'

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

type SolidElement = JSX.Element

const mapAttrsToProps = createMapAttrsToProps('solid')

/**
 * Create a Solid element using `createComponent` and `Dynamic` from `solid-js/web`.
 */
function createSolidElement(
  tag: string,
  props: Record<string, any>,
  ...children: SolidElement[]
): SolidElement {
  return createComponent(Dynamic, {
    component: tag,
    ...props,
    // Solid expects children as a getter so they stay reactive.
    get children() {
      return children
    },
  })
}

/**
 * Create a reusable renderer function that converts ProseMirror document JSON
 * to Solid elements. The renderer can be used multiple times with different
 * content, avoiding repeated schema initialization.
 *
 * @example
 * ```tsx
 * import { createSolidRenderer } from 'prosekit-static-renderer/solid'
 * import { defineExtension } from './my-extension'
 *
 * const render = createSolidRenderer({
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
export function createSolidRenderer(
  options: StaticRendererCreateOptions & CustomMappingOptions<SolidElement>,
): (content: NodeJSON | ProseMirrorNode) => SolidElement {
  return createRenderer<SolidElement>({
    ...options,
    domOutputSpecToElement: createDOMOutputSpecParser<SolidElement>(
      createSolidElement,
      mapAttrsToProps,
      { sanitizeURL: options.sanitizeURL },
    ),
    mapDefinedTypes: {
      doc: ({ children }) => children,
      text: ({ node }) => node.text ?? '',
    },
    nodeMapping: options.nodeMapping,
    markMapping: options.markMapping,
    unhandledNode: options.unhandledNode,
    unhandledMark: options.unhandledMark,
  })
}

/**
 * Render a ProseMirror document JSON to a Solid element without creating
 * an editor instance.
 *
 * @example
 * ```tsx
 * import { renderToSolidElement } from 'prosekit-static-renderer/solid'
 * import { defineExtension } from './my-extension'
 *
 * const element = renderToSolidElement({
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
export function renderToSolidElement(
  options: StaticRendererOptions & CustomMappingOptions<SolidElement>,
): SolidElement {
  const render = createSolidRenderer(options)

  if (!options.content) {
    throw new Error(
      '[prosekit error]: content is required for renderToSolidElement. Use createSolidRenderer() if you want to create a reusable renderer.',
    )
  }

  return render(options.content)
}
