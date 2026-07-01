import type {
  DOMOutputSpecArray,
  DomOutputSpecToElement,
  URLSanitizer,
  URLSanitizerContext,
} from '../types.ts'

import {
  filterStaticAttrs,
  stringifyStaticAttrValue,
  unsupportedDOMOutputSpecError,
} from './attrs.ts'

/**
 * A function that creates an element from a tag, props, and children.
 */
export type CreateElement<T> = (
  tag: string,
  props: Record<string, any>,
  ...children: T[]
) => T

/**
 * A function that maps and filters HTML attributes to framework-specific props.
 */
export type MapAttrs = (
  attrs: Record<string, any> | undefined,
  tag: string,
  sanitizeURL?: URLSanitizer,
) => Record<string, any>

function normalizeChildren<T>(child?: T | T[]): T[] {
  if (child == null) return []
  return Array.isArray(child) ? child : [child]
}

/**
 * Create a `mapAttrsToProps` function for a given renderer target.
 * Filters out event attributes and dangerous URLs, then stringifies values.
 */
export function createMapAttrsToProps(
  target: URLSanitizerContext['target'],
): MapAttrs {
  return (attrs, tag = '', sanitizeURL) => {
    const filteredAttrs = filterStaticAttrs(attrs, { tag, target, sanitizeURL })

    if (Object.keys(filteredAttrs).length === 0) {
      return {}
    }

    const result: Record<string, any> = {}

    for (const [name, value] of Object.entries(filteredAttrs)) {
      if (value == null) continue

      if (name === 'class') {
        result.class = stringifyStaticAttrValue(value)
      } else if (name === 'style' && typeof value === 'string') {
        result.style = value
      } else {
        result[name] = stringifyStaticAttrValue(value)
      }
    }

    return result
  }
}

/**
 * Create a generic DOMOutputSpec-to-element parser.
 *
 * All framework renderers (Preact, Solid, Svelte, Vue) share the same
 * DOMOutputSpec parsing logic. They differ only in how elements are created
 * and how attributes are mapped. This function captures the shared logic.
 *
 * @param createElement - Creates an element from tag, props, and children.
 * @param mapAttrs - Maps HTML attrs to framework-specific props.
 * @param options - Includes optional `sanitizeURL`.
 */
export function createDOMOutputSpecParser<T>(
  createElement: CreateElement<T>,
  mapAttrs: MapAttrs,
  options: { sanitizeURL?: URLSanitizer } = {},
): DomOutputSpecToElement<T> {
  const parse: DomOutputSpecToElement<T> = (spec) => {
    if (typeof spec === 'string') {
      return () => spec as T
    }

    if (typeof spec === 'object' && spec && 'length' in spec) {
      let [otag, attrs, children, ...rest] = spec as DOMOutputSpecArray
      let tag = otag

      // Handle namespaced tags like "http://www.w3.org/2000/svg svg"
      const parts = tag.split(' ')
      if (parts.length > 1) {
        tag = parts[1]
        if (attrs === undefined) {
          attrs = { xmlns: parts[0] }
        } else if (attrs === 0) {
          attrs = { xmlns: parts[0] }
          children = 0
        } else if (typeof attrs === 'object' && !Array.isArray(attrs)) {
          attrs = { ...attrs, xmlns: parts[0] }
        }
      }

      // Self-closing tag
      if (attrs === undefined) {
        return () =>
          createElement(tag, mapAttrs(undefined, tag, options.sanitizeURL))
      }

      // No attributes, content placeholder is 0
      if (attrs === 0) {
        return (child) =>
          createElement(
            tag,
            mapAttrs(undefined, tag, options.sanitizeURL),
            ...normalizeChildren(child),
          )
      }

      // Object attrs
      if (typeof attrs === 'object') {
        // attrs is actually an array (child element spec)
        if (Array.isArray(attrs)) {
          const renderChild = parse(attrs as DOMOutputSpecArray)

          if (children === undefined) {
            return (child) =>
              createElement(
                tag,
                mapAttrs(undefined, tag, options.sanitizeURL),
                renderChild(child),
              )
          }
          if (children === 0) {
            return (child) =>
              createElement(
                tag,
                mapAttrs(undefined, tag, options.sanitizeURL),
                ...normalizeChildren(child),
              )
          }
          return (child) =>
            createElement(
              tag,
              mapAttrs(undefined, tag, options.sanitizeURL),
              renderChild(child),
              ...[children].concat(rest).map((s) => parse(s)(child)),
            )
        }

        // attrs is an attributes object
        if (children === undefined) {
          return () =>
            createElement(tag, mapAttrs(attrs, tag, options.sanitizeURL))
        }
        if (children === 0) {
          return (child) =>
            createElement(
              tag,
              mapAttrs(attrs, tag, options.sanitizeURL),
              ...normalizeChildren(child),
            )
        }
        return (child) =>
          createElement(
            tag,
            mapAttrs(attrs, tag, options.sanitizeURL),
            ...[children].concat(rest).map((s) => parse(s)(child)),
          )
      }
    }

    throw unsupportedDOMOutputSpecError(spec)
  }
  return parse
}
