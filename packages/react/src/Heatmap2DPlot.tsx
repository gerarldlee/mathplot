import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react'
import {
  createHeatmapPointSampler,
  createHeatmapSampler,
  getHeatmapColorValue,
  type HeatmapData,
  type SurfaceMarker,
  type SurfaceSampleContext,
  type SurfaceSettings,
} from '@mathplot/core'
import { getSampleContext, useAnimatedData, formatValue } from './common'
import type { AnimationSettings, AxisLabels } from './types'

export interface Heatmap2DPlotProps {
  equation: string
  settings: SurfaceSettings
  axisLabels?: AxisLabels
  initialData?: HeatmapData
  marker?: SurfaceMarker
  animation?: AnimationSettings
  animationResetKey?: number
  onAnimationError?: (message: string) => void
}

export function Heatmap2DPlot({
  equation,
  settings,
  axisLabels = { x: 'x', y: 'y', z: 'z' },
  initialData,
  marker = { x: 0, y: 0 },
  animation = { mode: 'time', speed: 1, playing: false },
  animationResetKey = 0,
  onAnimationError = () => {},
}: Heatmap2DPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sampler = useMemo(() => createHeatmapSampler(equation), [equation])
  const data = useAnimatedData<HeatmapData>(
    initialData ?? sampler(settings),
    useCallback(
      (context?: SurfaceSampleContext) => sampler(settings, context),
      [sampler, settings],
    ),
    animation,
    animationResetKey,
    onAnimationError,
  )
  const pointSampler = useMemo(() => createHeatmapPointSampler(equation), [equation])
  const markerValue = pointSampler(
    settings,
    marker.x,
    marker.y,
    getSampleContext(data.time, animation),
  )
  const lineCount = settings.resolution + 1
  const markerLeft =
    9 + ((marker.x - settings.x.min) / (settings.x.max - settings.x.min)) * 83
  const markerTop =
    9 + (1 - (marker.y - settings.y.min) / (settings.y.max - settings.y.min)) * 82

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const image = context.createImageData(lineCount, lineCount)
    for (let row = 0; row < lineCount; row += 1) {
      for (let column = 0; column < lineCount; column += 1) {
        const value = data.values[row * lineCount + column]

        if (value === null) {
          continue
        }

        const [red, green, blue] = getHeatmapColorValue(
          value,
          data.renderZMin,
          data.renderZMax,
        )
        const pixel = ((lineCount - 1 - row) * lineCount + column) * 4
        image.data[pixel] = red
        image.data[pixel + 1] = green
        image.data[pixel + 2] = blue
        image.data[pixel + 3] = 255
      }
    }

    context.putImageData(image, 0, 0)
  }, [data, lineCount])

  return (
    <div className="two-dimensional-viewport heatmap-viewport">
      <canvas
        ref={canvasRef}
        className="heatmap-canvas"
        width={lineCount}
        height={lineCount}
        role="img"
        aria-label="Interactive two-dimensional heatmap"
      />
      <div
        className="heatmap-marker"
        style={
          {
            left: `${markerLeft}%`,
            top: `${markerTop}%`,
          } as CSSProperties
        }
        aria-hidden="true"
      />
      <div className="heatmap-axis-label heatmap-axis-label-x">{axisLabels.x}</div>
      <div className="heatmap-axis-label heatmap-axis-label-y">{axisLabels.y}</div>
      <div
        className="function-readout"
        aria-live={animation.playing ? 'off' : 'polite'}
      >
        <span>
          {axisLabels.x} {formatValue(marker.x)} · {axisLabels.y} {formatValue(marker.y)} ·{' '}
          {axisLabels.z} {formatValue(markerValue)}
        </span>
        {data.clipped && <span className="readout-note">Values clipped for clarity</span>}
      </div>
      <div className="heatmap-legend" aria-label={`${axisLabels.z} color legend`}>
        <span>{axisLabels.z}</span>
        <div className="heatmap-legend-gradient" />
        <div className="heatmap-legend-values">
          <span>{data.zMax.toFixed(2)}</span>
          <span>{data.zMin.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}