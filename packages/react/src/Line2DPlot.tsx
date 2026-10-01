import { useCallback, useMemo } from 'react'
import {
  createLinePointSampler,
  createLineSampler,
  type LineData,
  type SurfaceSampleContext,
  type SurfaceSettings,
} from '@mathplot/core'
import { getSampleContext, getLineGeometry, useAnimatedData, formatValue, formatAxisValue } from './common'
import type { AnimationSettings, AxisLabels } from './types'

export interface Line2DPlotProps {
  equation: string
  settings: SurfaceSettings
  axisLabels?: AxisLabels
  initialData?: LineData
  marker?: { x: number }
  animation?: AnimationSettings
  animationResetKey?: number
  onAnimationError?: (message: string) => void
}

export function Line2DPlot({
  equation,
  settings,
  axisLabels = { x: 'x', y: 'y', z: 'z' },
  initialData,
  marker = { x: 0 },
  animation = { mode: 'time', speed: 1, playing: false },
  animationResetKey = 0,
  onAnimationError = () => {},
}: Line2DPlotProps) {
  const sampler = useMemo(() => createLineSampler(equation), [equation])
  const data = useAnimatedData<LineData>(
    initialData ?? sampler(settings),
    useCallback(
      (context?: SurfaceSampleContext) => sampler(settings, context),
      [sampler, settings],
    ),
    animation,
    animationResetKey,
    onAnimationError,
  )
  const pointSampler = useMemo(() => createLinePointSampler(equation), [equation])
  const markerValue = pointSampler(
    settings,
    marker.x,
    getSampleContext(data.time, animation),
  )
  const geometry = getLineGeometry(data, settings, axisLabels)
  const markerY = markerValue === null ? null : geometry.mapY(markerValue)
  const markerX = geometry.mapX(marker.x)

  return (
    <div className="two-dimensional-viewport line-viewport">
      <svg
        className="line-graph"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Interactive two-dimensional line graph"
      >
        <rect className="graph-background" x="0" y="0" width="100" height="100" />
        {Array.from({ length: 5 }, (_, index) => {
          const y = geometry.top + ((geometry.bottom - geometry.top) * index) / 4
          const x = geometry.left + ((geometry.right - geometry.left) * index) / 4
          return (
            <g key={`grid-${index}`}>
              <line className="graph-grid-line" x1={geometry.left} x2={geometry.right} y1={y} y2={y} />
              <line className="graph-grid-line" x1={x} x2={x} y1={geometry.top} y2={geometry.bottom} />
            </g>
          )
        })}
        <line className="graph-axis-line" x1={geometry.left} x2={geometry.right} y1={geometry.bottom} y2={geometry.bottom} />
        <line className="graph-axis-line" x1={geometry.left} x2={geometry.left} y1={geometry.top} y2={geometry.bottom} />
        {geometry.segments.map((path, index) => (
          <path className="line-path" d={path} key={`line-${index}`} />
        ))}
        {markerY !== null && (
          <>
            <line className="marker-guide" x1={markerX} x2={markerX} y1={geometry.top} y2={geometry.bottom} />
            <circle className="plot-marker-halo" cx={markerX} cy={markerY} r="2.1" />
            <circle className="plot-marker-point" cx={markerX} cy={markerY} r="1.05" />
          </>
        )}
        {geometry.xTicks.map((tick) => (
          <text className="graph-tick-label" key={`x-tick-${tick.value}`} x={tick.x} y="96" textAnchor="middle">
            {formatAxisValue(tick.value)}
          </text>
        ))}
        {geometry.yTicks.map((tick) => (
          <text className="graph-tick-label" key={`y-tick-${tick.value}`} x="2" y={tick.y + 1} textAnchor="start">
            {formatAxisValue(tick.value)}
          </text>
        ))}
        <text className="graph-axis-title" x="96" y="4" textAnchor="end">
          {geometry.axisLabels.x}
        </text>
        <text className="graph-axis-title" x="1" y="4" textAnchor="start">
          {geometry.axisLabels.y}
        </text>
      </svg>
      <div
        className="function-readout"
        aria-live={animation.playing ? 'off' : 'polite'}
      >
        <span>
          {axisLabels.x} {formatValue(marker.x)} · {axisLabels.y} {formatValue(markerValue)}
        </span>
        {data.clipped && <span className="readout-note">Values clipped for clarity</span>}
      </div>
    </div>
  )
}