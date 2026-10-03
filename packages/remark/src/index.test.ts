import { describe, expect, it } from 'vitest'
import remarkMathPlot, { type MdastJsxFlowElementLike } from './index'
import type { Code, Root, RootContent } from 'mdast'

function runPlugin(fenceValue: string, lang: string) {
  const node: Code = { type: 'code', lang, value: fenceValue }
  const tree: Root = { type: 'root', children: [node] }

  remarkMathPlot()(tree)

  return tree.children[0] as unknown
}

describe('remarkMathPlot', () => {
  it('converts mathplot fences into MathPlot JSX elements', () => {
    const result = runPlugin('2d\ny = sin(x)', 'mathplot') as MdastJsxFlowElementLike

    expect(result.type).toBe('mdxJsxFlowElement')
    expect(result.name).toBe('MathPlot')
    expect(result.attributes).toEqual([
      { type: 'mdxJsxAttribute', name: 'code', value: '2d\ny = sin(x)' },
    ])
  })

  it('splits compact info strings into meta', () => {
    const result = runPlugin('mathplot 2d y=sin(x) x=-6..6', 'mathplot') as MdastJsxFlowElementLike

    expect(result.attributes).toEqual([
      { type: 'mdxJsxAttribute', name: 'code', value: '' },
      { type: 'mdxJsxAttribute', name: 'meta', value: '2d y=sin(x) x=-6..6' },
    ])
  })

  it('keeps info args when a body follows', () => {
    const result = runPlugin('mathplot pie\nA, 3\nB, 1', 'mathplot') as MdastJsxFlowElementLike

    expect(result.attributes[0]).toEqual({ type: 'mdxJsxAttribute', name: 'code', value: 'A, 3\nB, 1' })
    expect(result.attributes[1]).toEqual({ type: 'mdxJsxAttribute', name: 'meta', value: 'pie' })
  })

  it('leaves other code fences unchanged', () => {
    const node = runPlugin('const a = 1', 'js') as Code

    expect(node.type).toBe('code')
    expect(node.value).toBe('const a = 1')
  })

  it('supports a custom component name', () => {
    const node: Code = { type: 'code', lang: 'mathplot', value: '2d\nx' }
    const tree: Root = { type: 'root', children: [node as unknown as RootContent] }

    remarkMathPlot({ componentName: 'LivePlot' })(tree)

    expect((tree.children[0] as unknown as MdastJsxFlowElementLike).name).toBe('LivePlot')
  })
})