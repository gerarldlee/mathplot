import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(cleanup)

vi.mock('@mathplot/react', () => ({
  Surface3DPlot: function MockSurface3DPlot({
    marker,
    settings,
  }: {
    marker: { x: number; y: number }
    settings: { x: { min: number; max: number }; y: { min: number; max: number } }
  }) {
    return (
      <div
        data-testid="mock-surface"
        data-marker-x={marker.x}
        data-marker-y={marker.y}
        data-x-min={settings.x.min}
        data-x-max={settings.x.max}
        data-y-min={settings.y.min}
        data-y-max={settings.y.max}
        role="img"
        aria-label="Mock 3D surface graph"
      />
    )
  },
  Line2DPlot: function MockLine2DPlot({
    marker,
    settings,
    initialData,
  }: {
    marker: { x: number }
    settings: { x: { min: number; max: number } }
    initialData: { definedSamples: number; totalSamples: number }
  }) {
    return (
      <div
        data-testid="mock-line"
        data-marker-x={marker.x}
        data-x-min={settings.x.min}
        data-x-max={settings.x.max}
        data-samples={initialData.definedSamples}
        data-total-samples={initialData.totalSamples}
        role="img"
        aria-label="Mock line2d graph"
      />
    )
  },
  Heatmap2DPlot: function MockHeatmap2DPlot({
    marker,
    settings,
    initialData,
  }: {
    marker: { x: number; y: number }
    settings: { x: { min: number; max: number }; y: { min: number; max: number } }
    initialData: { definedSamples: number; totalSamples: number }
  }) {
    return (
      <div
        data-testid="mock-heatmap"
        data-marker-x={marker.x}
        data-marker-y={marker.y}
        data-x-min={settings.x.min}
        data-x-max={settings.x.max}
        data-y-min={settings.y.min}
        data-y-max={settings.y.max}
        data-samples={initialData.definedSamples}
        data-total-samples={initialData.totalSamples}
        role="img"
        aria-label="Mock heatmap2d graph"
      />
    )
  },
}))

describe('App', () => {
  it('renders a surface and loads structured templates', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /z = sin\(x\) \* cos\(y\) \+ 0\.2 \* x/ }),
    ).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Sample template'), 'wave')

    expect(
      screen.getByRole('heading', { name: /z = sin\(x \+ t\) \+ cos\(y - 0\.8 \* t\)/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause animation' })).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Sample template'), 'us-economy')

    expect(
      screen.getByRole('heading', {
        name: /z = 0\.65 \* x - 0\.45 \* y - 0\.06 \* \(x - 3\)\^2/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Illustrative model only/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Moving window' })).toBeChecked()
  })

  it('moves the surface marker with one slider per axis', () => {
    render(<App />)

    const plot = screen.getByTestId('mock-surface')
    const plotControls = screen.getByLabelText('Plot marker controls')
    const xPosition = within(plotControls).getByRole('slider', { name: 'X position' })
    const yPosition = within(plotControls).getByRole('slider', { name: 'Y position' })

    expect(within(plotControls).getAllByRole('slider')).toHaveLength(2)
    expect(xPosition).toHaveAttribute('min', '-6')
    expect(xPosition).toHaveAttribute('max', '6')
    expect(yPosition).toHaveAttribute('min', '-6')
    expect(yPosition).toHaveAttribute('max', '6')
    expect(plot).toHaveAttribute('data-marker-x', '0')
    expect(plot).toHaveAttribute('data-marker-y', '0')

    fireEvent.change(xPosition, { target: { value: '-4' } })
    fireEvent.change(yPosition, { target: { value: '4' } })

    expect(screen.getByRole('spinbutton', { name: 'X range minimum' })).toHaveValue(-6)
    expect(screen.getByRole('spinbutton', { name: 'Y range maximum' })).toHaveValue(6)
    expect(screen.getByTestId('mock-surface')).toHaveAttribute('data-marker-x', '-4')
    expect(screen.getByTestId('mock-surface')).toHaveAttribute('data-marker-y', '4')
  })

  it('switches to a 2D line plot and moves its marker', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('radio', { name: '2D line' }))

    expect(screen.getByRole('heading', { name: /y = sin\(x\)/ })).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', { name: 'Y range minimum' })).not.toBeInTheDocument()

    const plot = screen.getByTestId('mock-line')
    const plotControls = screen.getByLabelText('Plot marker controls')
    const xPosition = within(plotControls).getByRole('slider', { name: 'X position' })

    expect(within(plotControls).getAllByRole('slider')).toHaveLength(1)
    expect(plot).toHaveAttribute('data-marker-x', '0')

    fireEvent.change(xPosition, { target: { value: '-4' } })
    expect(screen.getByTestId('mock-line')).toHaveAttribute('data-marker-x', '-4')
  })

  it('switches to a 2D heatmap with both position handles', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('radio', { name: '2D heatmap' }))

    expect(screen.getByRole('heading', { name: /z = sin\(x\) \* cos\(y\) \+ 0\.2 \* x/ })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Y range minimum' })).toBeInTheDocument()

    const plotControls = screen.getByLabelText('Plot marker controls')
    expect(within(plotControls).getAllByRole('slider')).toHaveLength(2)
    expect(screen.getByTestId('mock-heatmap')).toHaveAttribute('data-marker-y', '0')
  })

  it('changes animation mode and play state', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Play animation' }))
    expect(screen.getByRole('button', { name: 'Pause animation' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('radio', { name: 'Moving window' }))
    expect(screen.getByRole('radio', { name: 'Moving window' })).toBeChecked()
    expect(screen.getByText(/X and Y sample values advance/)).toBeInTheDocument()
  })

  it('shows a useful error for an invalid equation', async () => {
    const user = userEvent.setup()
    render(<App />)

    const equation = screen.getByLabelText('Equation')
    await user.clear(equation)
    await user.type(equation, 'x +')
    await user.click(screen.getByRole('button', { name: 'Plot surface' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Check your equation')
  })

  it('resets a 2D mode back to the 3D surface', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('radio', { name: '2D line' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(screen.getByRole('radio', { name: '3D surface' })).toBeChecked()
    expect(screen.getByRole('heading', { name: /z = sin\(x\) \* cos\(y\) \+ 0\.2 \* x/ })).toBeInTheDocument()
  })

  it('restores the initial calculator', async () => {
    const user = userEvent.setup()
    render(<App />)

    const equation = screen.getByLabelText('Equation')
    await user.clear(equation)
    await user.type(equation, 'x + y')
    await user.click(screen.getByRole('button', { name: 'Plot surface' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(equation).toHaveValue('sin(x) * cos(y) + 0.2 * x')
  })
})