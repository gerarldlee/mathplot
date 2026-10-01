import { Component, useMemo, type ReactNode } from 'react'
import {
  parseMathPlotFence,
  type ChartPlotSpec,
  type FenceChartType,
  type FunctionPlotSpec,
  type MathPlotSpec,
} from '@mathplot/core'
import { Line2DPlot } from './Line2DPlot'
import { Heatmap2DPlot } from './Heatmap2DPlot'
import { Surface3DPlot } from './Surface3DPlot'
import { BarChart } from './BarChart'
import { LineChart } from './LineChart'
import { PieChart } from './PieChart'
import type { AnimationSettings } from './types'
import './styles.css'

const CHART_TYPE_BY_TYPE: Record<FenceChartType, 'bar' | 'line' | 'pie'> = {
  bar: 'bar',
  line: 'line',
  pie: 'pie',
}

function FunctionPlot({ spec }: { spec: FunctionPlotSpec }) {
  const settings = {
    x: spec.x,
    y: spec.y,
    resolution: spec.resolution,
  }
  const animation: AnimationSettings = {
    mode: spec.animate ?? 'time',
    speed: spec.speed ?? 1,
    playing: spec.autoplay ?? false,
  }

  if (spec.type === '2d') {
    return <Line2DPlot equation={spec.equation} settings={settings} animation={animation} />
  }

  if (spec.type === 'heatmap') {
    return (
      <Heatmap2DPlot equation={spec.equation} settings={settings} animation={animation} />
    )
  }

  if (spec.type === '3d') {
    return <Surface3DPlot equation={spec.equation} settings={settings} animation={animation} showEquation />
  }
}

function ChartPlot({ spec }: { spec: ChartPlotSpec }) {
  const kind = CHART_TYPE_BY_TYPE[spec.type]

  if (kind === 'bar') {
    return <BarChart data={spec.data} title={spec.title} />
  }

  if (kind === 'line') {
    return <LineChart data={spec.data} title={spec.title} />
  }

  return <PieChart data={spec.data} title={spec.title} />
}

export function PlotForSpec({ spec }: { spec: MathPlotSpec }) {
  if (spec.type === 'bar' || spec.type === 'line' || spec.type === 'pie') {
    return <ChartPlot spec={spec as ChartPlotSpec} />
  }

  return <FunctionPlot spec={spec as FunctionPlotSpec} />
}

export interface MathPlotProps {
  /** A parsed spec or the raw fence contents (with the optional info string). */
  spec?: MathPlotSpec
  /** Raw fence source, e.g. everything between ```mathplot and the closing fence. */
  code?: string
  /** Info string after "mathplot" for compact fences, e.g. `2d y=sin(x) x=-6..6`. */
  infoString?: string
  className?: string
}

function parseProps(props: MathPlotProps): MathPlotSpec {
  if (props.spec) {
    return props.spec
  }

  return parseMathPlotFence(props.code ?? '', props.infoString)
}

export function MathPlot(props: MathPlotProps) {
  const { spec, code, infoString, className } = props
  const parsed = useMemo(
    () => parseProps({ spec, code, infoString }),
    [spec, code, infoString],
  )

  return (
    <div className={className ? `mathplot-container ${className}` : 'mathplot-container'}>
      <MathPlotErrorBoundary>
        <PlotForSpec spec={parsed} />
      </MathPlotErrorBoundary>
    </div>
  )
}

interface ErrorBoundaryState {
  message: string | null
}

class MathPlotErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { message: null }

  static getDerivedStateFromError(cause: unknown): ErrorBoundaryState {
    return {
      message: cause instanceof Error ? cause.message : 'Unable to plot this mathplot.',
    }
  }

  render() {
    if (this.state.message !== null) {
      return (
        <div className="mathplot-error" role="alert">
          {this.state.message}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Convenience component for react-markdown: intercepts fence code blocks.
 *
 * ```jsx
 * <ReactMarkdown components={{ code: MathPlotCodeFence }} />
 * ```
 *
 * For ```mathplot fences the fence body arrives as `children` and any args
 * after the language token (````mathplot 2d y=sin(x)````) arrive as `meta`.
 */
export function MathPlotCodeFence({
  className,
  children,
  meta,
}: {
  className?: string
  children?: ReactNode
  meta?: string
}) {
  const isMathPlot = Boolean(className?.includes('language-mathplot'))

  if (!isMathPlot) {
    return <code className={className}>{children}</code>
  }

  const raw = typeof children === 'string' ? children : ''

  if (meta && meta.trim()) {
    return <MathPlot code={raw} infoString={meta} />
  }

  return <MathPlot code={raw} />
}