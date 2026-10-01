import { describe, expect, it } from 'vitest'
import {
  computeBarLayout,
  computeLineLayout,
  computePieLayout,
  getChartColor,
  parseChartCsv,
} from './charts'

describe('parseChartCsv', () => {
  it('parses pie rows of label and value', () => {
    const data = parseChartCsv('Q1, 120\nQ2, 180\nQ3, 90', 'pie')

    expect(data.labels).toEqual(['Q1', 'Q2', 'Q3'])
    expect(data.series).toHaveLength(1)
    expect(data.series[0].values).toEqual([120, 180, 90])
  })

  it('uses an optional header row to name bar/line series', () => {
    const data = parseChartCsv('Month, Sales, Costs\nQ1, 120, 60\nQ2, 180, 75', 'bar')

    expect(data.labels).toEqual(['Q1', 'Q2'])
    expect(data.series[0]).toEqual({ name: 'Sales', values: [120, 180] })
    expect(data.series[1]).toEqual({ name: 'Costs', values: [60, 75] })
  })

  it('names unnamed series when there is no header', () => {
    const data = parseChartCsv('Q1, 120, 60\nQ2, 180, 75', 'line')

    expect(data.series[0].name).toBe('Series 1')
    expect(data.series[1].name).toBe('Series 2')
  })

  it('ignores comment rows and blank lines', () => {
    const data = parseChartCsv('# revenue\n\nQ1, 120\n# not data\nQ2, 180', 'pie')

    expect(data.labels).toEqual(['Q1', 'Q2'])
    expect(data.series[0].values).toEqual([120, 180])
  })

  it('tolerates whitespace and missing values', () => {
    const data = parseChartCsv('Q1, 120\nQ2,\nQ3, 55', 'bar')

    expect(data.series[0].values).toEqual([120, null, 55])
  })

  it('rejects pie rows without a value', () => {
    expect(() => parseChartCsv('Q1, 120\nQ2', 'pie')).toThrow('Pie rows need a label and a value')
  })

  it('rejects empty input', () => {
    expect(() => parseChartCsv('   ', 'pie')).toThrow('at least one data row')
    expect(() => parseChartCsv('# only comments', 'bar')).toThrow('at least one data row')
  })
})

describe('computeBarLayout', () => {
  it('creates one rect per label and series above zero', () => {
    const data = {
      labels: ['Q1', 'Q2'],
      series: [
        { name: 'Sales', values: [120, 180] },
        { name: 'Costs', values: [60, 75] },
      ],
    }
    const layout = computeBarLayout(data, { width: 200, height: 100 })

    expect(layout.rects).toHaveLength(4)
    expect(layout.rects.every((rect) => rect.y + rect.height <= 100 - 24 + 1)).toBe(true)
    expect(layout.yTicks).toHaveLength(5)
  })

  it('throws when there is nothing to plot', () => {
    expect(() => computeBarLayout({ labels: [], series: [] })).toThrow(
      'no numeric values',
    )
  })
})

describe('computeLineLayout', () => {
  it('splits series into segments around null gaps', () => {
    const data = {
      labels: ['A', 'B', 'C'],
      series: [{ name: 'S', values: [1, null, 3] }],
    }
    const layout = computeLineLayout(data, { width: 300, height: 200 })

    expect(layout.series[0].points).toHaveLength(2)
    expect(layout.series[0].points[0]).toHaveLength(1)
    expect(layout.series[0].points[1][0].x).toBeGreaterThan(
      layout.series[0].points[0][0].x,
    )
  })
})

describe('computePieLayout', () => {
  it('builds slices proportional to values', () => {
    const data = {
      labels: ['A', 'B'],
      series: [{ name: 'value', values: [3, 1] }],
    }
    const layout = computePieLayout(data)

    expect(layout.slices).toHaveLength(2)
    expect(layout.slices[0].ratio).toBeCloseTo(0.75)
    expect(layout.slices[1].ratio).toBeCloseTo(0.25)
    expect(layout.slices[1].startAngle).toBeCloseTo(layout.slices[0].endAngle)
    expect(layout.slices.every((slice) => slice.path.includes('A'))).toBe(true)
  })

  it('handles a single full-circle slice', () => {
    const layout = computePieLayout({
      labels: ['Only'],
      series: [{ name: 'value', values: [5] }],
    })

    expect(layout.slices).toHaveLength(1)
    expect(layout.slices[0].ratio).toBe(1)
  })

  it('rejects all-zero data', () => {
    expect(() =>
      computePieLayout({ labels: ['A'], series: [{ name: 'value', values: [0] }] }),
    ).toThrow('positive value')
  })
})

describe('getChartColor', () => {
  it('cycles through the palette', () => {
    expect(getChartColor(0)).toBe(getChartColor(8))
    expect(getChartColor(1)).not.toBe(getChartColor(0))
  })
})