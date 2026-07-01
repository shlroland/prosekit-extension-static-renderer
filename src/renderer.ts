import type {
  CustomMappingOptions,
  DomOutputSpecToElement,
  NodeJSON,
  ProseMirrorNode,
  Schema,
  StaticRendererSchemaOptions,
} from './types.ts'

/**
 * @internal
 */
type RenderOptions<T> = CustomMappingOptions<T> &
  StaticRendererSchemaOptions & {
    domOutputSpecToElement: DomOutputSpecToElement<T>
    mapDefinedTypes: {
      doc: (props: { node: ProseMirrorNode; children: T[] }) => T
      text: (props: { node: ProseMirrorNode }) => T
    }
  }

/**
 * Create a renderer function that walks a ProseMirror node tree and renders
 * it to a target format using the provided DOMOutputSpec converter.
 *
 * @internal
 */
export function createRenderer<T>(
  options: RenderOptions<T>,
): (content: NodeJSON | ProseMirrorNode) => T {
  const {
    domOutputSpecToElement,
    mapDefinedTypes,
    nodeMapping = {},
    markMapping = {},
    unhandledNode,
    unhandledMark,
  } = options

  const schema = getSchema(options)

  function renderNode(node: ProseMirrorNode, parent?: ProseMirrorNode): T {
    const name = node.type.name

    // Handle predefined types (doc, text)
    if (name === 'doc') {
      const children: T[] = []
      node.forEach((child) => children.push(renderNode(child, node)))
      return mapDefinedTypes.doc({ node, children })
    }

    if (name === 'text') {
      const textResult = mapDefinedTypes.text({ node })
      return applyMarks(node, textResult, parent)
    }

    // Check custom node mapping
    const nodeHandler = nodeMapping[name]
    if (nodeHandler) {
      const children: T[] = []
      node.forEach((child) => children.push(renderNode(child, node)))
      return nodeHandler({
        node,
        parent,
        children: children.length === 1 ? children[0] : children,
      })
    }

    // Use toDOM from schema spec
    const nodeSpec = schema.nodes[name]?.spec
    if (!nodeSpec?.toDOM) {
      if (unhandledNode) {
        const children: T[] = []
        node.forEach((child) => children.push(renderNode(child, node)))
        return unhandledNode({
          node,
          parent,
          children: children.length === 1 ? children[0] : children,
        })
      }
      throw new Error(
        `[prosekit error]: Node type "${name}" has no toDOM method and no custom nodeMapping provided.`,
      )
    }

    const domSpec = nodeSpec.toDOM(node)
    const render = domOutputSpecToElement(domSpec)

    // Render children
    const children: T[] = []
    node.forEach((child) => children.push(renderNode(child, node)))

    return render(
      children.length > 0
        ? children.length === 1
          ? children[0]
          : children
        : undefined,
    )
  }

  function applyMarks(
    node: ProseMirrorNode,
    content: T,
    parent?: ProseMirrorNode,
  ): T {
    let result = content

    for (const mark of node.marks) {
      const markName = mark.type.name

      // Check custom mark mapping
      const markHandler = markMapping[markName]
      if (markHandler) {
        result = markHandler({ mark, node, parent, children: result })
        continue
      }

      // Use toDOM from schema spec
      const markSpec = schema.marks[markName]?.spec
      if (!markSpec?.toDOM) {
        if (unhandledMark) {
          result = unhandledMark({ mark, node, parent, children: result })
          continue
        }
        throw new Error(
          `[prosekit error]: Mark type "${markName}" has no toDOM method and no custom markMapping provided.`,
        )
      }

      const domSpec = markSpec.toDOM(mark, true)
      const render = domOutputSpecToElement(domSpec)
      result = render(result)
    }

    return result
  }

  return function render(content: NodeJSON | ProseMirrorNode): T {
    const node = isProseMirrorNode(content)
      ? content
      : schema.nodeFromJSON(content)
    return renderNode(node)
  }
}

/**
 * Extract the ProseMirror schema from explicit options or an extension.
 *
 * @internal
 */
function getSchema(options: StaticRendererSchemaOptions): Schema {
  const schema = options.schema ?? options.extension?.schema
  if (!schema) {
    if (!options.extension) {
      throw new Error(
        '[prosekit error]: createRenderer requires either a ProseKit extension or a ProseMirror schema.',
      )
    }

    throw new Error(
      '[prosekit error]: Extension does not define a schema. Provide a ProseMirror schema or make sure the extension includes at least a document node spec.',
    )
  }
  return schema
}

function isProseMirrorNode(value: unknown): value is ProseMirrorNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'forEach' in value &&
    'marks' in value
  )
}
