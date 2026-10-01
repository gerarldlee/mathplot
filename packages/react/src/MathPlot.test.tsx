import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { MathPlot, MathPlotCodeFence } from './MathPlot'

vi.mock('@react-three/fiber', () => ({
  Canvas: () => null,
  useFrame: () => {},
  useThree: () => ({ camera: { position: { set: vi.fn() } } }),
}))

vi.mock('@react-three/drei', () => ({
  Grid: () => null,
  Html: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  OrbitControls: () => null,
}))

afterEach(cleanup)

describe('MathPlot', () => {
  it('renders a 2d fence from raw code', () => {
    render(<MathPlot code={'2d\ny = sin(x)\nx: -6..6'} />)

    expect(screen.getByLabelText('Interactive two-dimensional line graph')).toBeInTheDocument()
  })

  it('renders a pie chart from CSV', () => {
    render(<MathPlot code={'pie\nA, 3\nB, 1'} />)

    expect(screen.getByLabelText('Pie chart')).toBeInTheDocument()
    expect(screen.getByText('A · 75%')).toBeInTheDocument()
    expect(screen.getByText('B · 25%')).toBeInTheDocument()
  })

  it('renders a parsed spec without re-parsing', () => {
    render(
      <MathPlot
        spec={{
          type: 'bar',
          title: 'Demo',
          data: { labels: ['A', 'B'], series: [{ name: 'v', values: [2, 5] }] },
        }}
      />,
    )

    expect(screen.getByLabelText('Bar chart: Demo')).toBeInTheDocument()
  })

  it('accepts compact info-string fences', () => {
    render(<MathPlot code="sin(x)" infoString="2d y=sin(x) x=-6..6" />)

    expect(screen.getByLabelText('Interactive two-dimensional line graph')).toBeInTheDocument()
  })

  it('renders a 3d fence without marker or surface props', () => {
    render(<MathPlot code={'3d\nz = sin(x) * cos(y)\nx: -6..6\ny: -6..6'} />)

    expect(screen.getByLabelText('z color legend')).toBeInTheDocument()
    expect(screen.getByText('z = sin(x) * cos(y)')).toBeInTheDocument()
  })
})

describe('MathPlotCodeFence', () => {
  it('renders code blocks as plots when language is mathplot', () => {
    render(
      <MathPlotCodeFence className="language-mathplot">{'2d\ny = cos(x)'}</MathPlotCodeFence>,
    )

    expect(screen.getByLabelText('Interactive two-dimensional line graph')).toBeInTheDocument()
  })

  it('renders regular code blocks untouched', () => {
    render(<MathPlotCodeFence className="language-js">const x = 1</MathPlotCodeFence>)

    expect(screen.getByText('const x = 1')).toBeInTheDocument()
    expect(screen.queryByLabelText(/graph/i)).not.toBeInTheDocument()
  })
})