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

/**
 * A node in the Svelte AST tree.
 * Can be either a string (text content) or an element with tag, props, and children.
 */
export type SvelteASTNode =
  | string
  | {
      tag: string
      props: Record<string, any>
      children: SvelteASTNode[]
    }

const mapAttrsToProps = createMapAttrsToProps('svelte')

/**
 * Create a Svelte AST element.
 */
function createSvelteElement(
  tag: string,
  props: Record<string, any>,
  ...children: SvelteASTNode[]
): SvelteASTNode {
  return { tag, props, children: children.filter((c) => c != null && c !== '') }
}

/**
 * Create a reusable renderer function that converts ProseMirror document JSON
 * to Svelte AST nodes. The renderer can be used multiple times with different
 * content, avoiding repeated schema initialization.
 *
 * @example
 * ```svelte
 * <script>
 * import { createSvelteRenderer } from 'prosekit-static-renderer/svelte'
 * import { defineExtension } from './extension'
 *
 * const render = createSvelteRenderer({
 *   extension: defineExtension(),
 * })
 *
 * const ast1 = render({
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
 *   ],
 * })
 *
 * const ast2 = render({
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'World' }] },
 *   ],
 * })
 * </script>
 * ```
 */
export function createSvelteRenderer(
  options: StaticRendererCreateOptions & CustomMappingOptions<SvelteASTNode>,
): (content: NodeJSON | ProseMirrorNode) => SvelteASTNode {
  return createRenderer<SvelteASTNode>({
    ...options,
    domOutputSpecToElement: createDOMOutputSpecParser<SvelteASTNode>(
      createSvelteElement,
      mapAttrsToProps,
      { sanitizeURL: options.sanitizeURL },
    ),
    mapDefinedTypes: {
      doc: ({ children }) =>
        children.length === 1
          ? children[0]
          : { tag: 'div', props: {}, children },
      text: ({ node }) => node.text ?? '',
    },
    nodeMapping: options.nodeMapping,
    markMapping: options.markMapping,
    unhandledNode: options.unhandledNode,
    unhandledMark: options.unhandledMark,
  })
}

/**
 * Render a ProseMirror document JSON to a Svelte AST node without creating
 * an editor instance.
 *
 * @example
 * ```svelte
 * <script>
 * import { renderToSvelteAST } from 'prosekit-static-renderer/svelte'
 * import { defineExtension } from './extension'
 *
 * const ast = renderToSvelteAST({
 *   extension: defineExtension(),
 *   content: {
 *     type: 'doc',
 *     content: [
 *       { type: 'paragraph', content: [{ type: 'text', text: 'Hello World' }] },
 *     ],
 *   },
 * })
 * </script>
 *
 * <ProseMirrorRenderer node={ast} />
 * ```
 */
export function renderToSvelteAST(
  options: StaticRendererOptions & CustomMappingOptions<SvelteASTNode>,
): SvelteASTNode {
  const render = createSvelteRenderer(options)

  if (!options.content) {
    throw new Error(
      '[prosekit error]: content is required for renderToSvelteAST. Use createSvelteRenderer() if you want to create a reusable renderer.',
    )
  }

  return render(options.content)
}
