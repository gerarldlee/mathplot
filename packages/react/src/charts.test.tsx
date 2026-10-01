import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BarChart } from './BarChart'
import { LineChart } from './LineChart'
import { PieChart } from './PieChart'
import { parseChartCsv } from '@mathplot/core'

afterEach(cleanup)

const barCsv = 'Quarter, Revenue, Costs\nQ1, 120, 60\nQ2, 180, 75'
const lineCsv = 'Month, Visitors\nJan, 300\nFeb, 420\nMar, 390'
const pieCsv = 'Chrome, 65\nFirefox, 20\nOther, 15'

describe('chart components', () => {
  it('lays out bars across the full plot area', () => {
    const { container } = render(
      <BarChart data={parseChartCsv(barCsv, 'bar')} title="Revenue" />,
    )

    const bars = container.querySelectorAll<SVGRectElement>('.chart-bar')
    expect(bars).toHaveLength(4)

    // viewBox is 420 wide with 24px padding: two label slots of ~186px each,
    // two ~67px bars per slot. A small/compressed layout (e.g. laying out in a
    // 100x100 box) produces widths under 40.
    const widths = Array.from(bars).map((bar) => Number(bar.getAttribute('width')))
    for (const width of widths) {
      expect(width).toBeGreaterThan(40)
      expect(width).toBeLessThan(140)
    }

    // Tallest bars reach near the top of the plot area, not the 100x100 corner.
    const tops = Array.from(bars).map((bar) => Number(bar.getAttribute('y')))
    expect(Math.min(...tops)).toBeLessThan(40)
    for (const bar of bars) {
      expect(Number(bar.getAttribute('x'))).toBeGreaterThan(20)
      expect(Number(bar.getAttribute('x'))).toBeLessThan(400)
    }
  })

  it('gives line charts tooltips naming their own data point', () => {
    const { container } = render(
      <LineChart data={parseChartCsv(lineCsv, 'line')} title="Visitors" />,
    )

    const dots = container.querySelectorAll<SVGCircleElement>('.chart-line-dot')
    expect(dots).toHaveLength(3)

    const firstTitle = dots[0].querySelector('title')?.textContent ?? ''
    expect(firstTitle).toContain('Jan')
    const lastTitle = dots[2].querySelector('title')?.textContent ?? ''
    expect(lastTitle).toContain('Mar')
  })

  it('scales the line chart with the given width and height', () => {
    const { container } = render(
      <LineChart data={parseChartCsv(lineCsv, 'line')} width={560} height={300} />,
    )

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 560 300')
  })

  it('renders pie legends with ratios', () => {
    render(<PieChart data={parseChartCsv(pieCsv, 'pie')} />)

    expect(screen.getByLabelText('Pie chart')).toBeInTheDocument()
    expect(screen.queryAllByText(/Chrome · 65%/)).toHaveLength(1)
  })
})