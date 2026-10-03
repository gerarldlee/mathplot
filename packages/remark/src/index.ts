import type { Code, Root } from 'mdast'
import { visit } from 'unist-util-visit'

const JSX_ELEMENT_NAME = 'MathPlot'

export interface RemarkMathPlotOptions {
  /** Component name emitted into MDX. Change when you register it under another name. */
  componentName?: string
}

/**
 * Remark plugin for MDX: transforms ```mathplot code fences into
 * `<MathPlot code="…" meta="…" />` JSX elements.
 *
 * With react-markdown (non-MDX), combine with
 * `components={{ MathPlot }}` from @mathplot/react:
 *
 * ```jsx
 * <ReactMarkdown remarkPlugins={[remarkMathPlot]} components={{ MathPlot }} />
 * ```
 */
export default function remarkMathPlot(options: RemarkMathPlotOptions = {}) {
  const componentName = options.componentName ?? JSX_ELEMENT_NAME

  return (tree: Root) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (!parent || index === undefined || node.lang !== 'mathplot') {
        return
      }

      const firstLineEnd = node.value.indexOf('\n')
      const firstLine =
        firstLineEnd === -1 ? node.value : node.value.slice(0, firstLineEnd)
      const infoTokens = firstLine.trim().split(/\s+/)
      const body = firstLineEnd === -1 ? '' : node.value.slice(firstLineEnd + 1)

      // Body form: first body line is the type ("2d", "pie", …).
      let code = node.value
      let meta: string | undefined

      // Compact form: "mathplot 2d y=sin(x) x=-6..6" as the entire fence.
      if (
        infoTokens[0]?.toLowerCase() === 'mathplot' &&
        infoTokens.length > 1 &&
        body === ''
      ) {
        meta = infoTokens.slice(1).join(' ')
        code = ''
      } else if (infoTokens[0]?.toLowerCase() === 'mathplot') {
        meta = infoTokens.slice(1).join(' ') || undefined
        code = body
      }

      const jsxNode: MdastJsxFlowElementLike = {
        type: 'mdxJsxFlowElement',
        name: componentName,
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'code',
            value: code,
          },
          ...(meta !== undefined
            ? [
                {
                  type: 'mdxJsxAttribute' as const,
                  name: 'meta',
                  value: meta,
                },
              ]
            : []),
        ],
        children: [],
      }

      // MDX pipelines accept `mdxJsxFlowElement` nodes; plain mdast typing
      // does not include them, so the replacement is written through a cast.
      ;(parent.children as Array<Code | MdastJsxFlowElementLike>)[index] = jsxNode
    })
  }
}

export interface MdastJsxFlowElementLike {
  type: 'mdxJsxFlowElement'
  name: string
  attributes: Array<{
    type: 'mdxJsxAttribute'
    name: string
    value: string
  }>
  children: Array<never>
}