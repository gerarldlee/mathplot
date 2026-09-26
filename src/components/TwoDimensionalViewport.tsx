import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  createHeatmapPointSampler,
  createHeatmapSampler,
  createLinePointSampler,
  createLineSampler,
  getAxisPadding,
  getHeatmapColorValue,
  type HeatmapData,
  type LineData,
} from '../lib/twoDimensional'
import type { SurfaceMarker, SurfaceSampleContext, SurfaceSettings } from '../lib/surface'
import type { AxisLabels } from '../lib/templates'
import type { AnimationSettings, PlotMode } from '../lib/plot'

interface CommonViewportProps {
  equation: string
  settings: SurfaceSettings
  axisLabels: AxisLabels
  animation: AnimationSettings
  animationResetKey: number
  onAnimationError: (message: string) => void
}

interface LineViewportProps extends CommonViewportProps {
  mode: 'line2d'
  initialData: LineData
  marker: { x: number }
}

interface HeatmapViewportProps extends CommonViewportProps {
  mode: 'heatmap2d'
  initialData: HeatmapData
  marker: SurfaceMarker
}

type TwoDimensionalViewportProps = LineViewportProps | HeatmapViewportProps

function getSampleContext(
  time: number,
  animation: AnimationSettings,
): SurfaceSampleContext {
  return animation.playing && animation.mode === 'window'
    ? { time, xOffset: time * 0.8, yOffset: -time * 0.55 }
    : { time }
}

function useAnimatedData<T extends LineData | HeatmapData>(
  initialData: T,
  sampler: (context?: SurfaceSampleContext) => T,
  animation: AnimationSettings,
  animationResetKey: number,
  onAnimationError: (message: string) => void,
): T {
  const [animatedData, setAnimatedData] = useState<T>(initialData)
  const timeRef = useRef(0)
  const errorHandlerRef = useRef(onAnimationError)
  const { mode, playing, speed } = animation

  useEffect(() => {
    errorHandlerRef.current = onAnimationError
  }, [onAnimationError])

  useEffect(() => {
    timeRef.current = 0
  }, [animationResetKey])

  useEffect(() => {
    if (!playing) {
      return
    }

    let frameId = 0
    let lastSample = performance.now()
    const frameDuration = 1000 / 24

    const updateData = (now: number) => {
      const elapsed = Math.min((now - lastSample) / 1000, 0.1)

      if (document.visibilityState !== 'hidden' && elapsed >= frameDuration / 1000) {
        timeRef.current = (timeRef.current + elapsed * speed) % 10000
        lastSample = now

        try {
          const nextData = sampler(
            getSampleContext(timeRef.current, { mode, playing, speed }),
          )
          setAnimatedData(nextData)
        } catch (cause) {
          errorHandlerRef.current(
            cause instanceof Error
              ? cause.message
              : 'Animation stopped because the graph could not be sampled.',
          )
          return
        }
      }

      frameId = requestAnimationFrame(updateData)
    }

    frameId = requestAnimationFrame(updateData)

    return () => cancelAnimationFrame(frameId)
  }, [animationResetKey, mode, playing, sampler, speed])

  return animation.playing ? animatedData : initialData
}

function formatValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function formatAxisValue(value: number) {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1)
}

function getLineGeometry(
  data: LineData,
  settings: SurfaceSettings,
  axisLabels: AxisLabels,
) {
  const left = 9
  const right = 91
  const top = 9
  const bottom = 91
  const xSpan = settings.x.max - settings.x.min
  const yPadding = getAxisPadding({ min: data.renderYMin, max: data.renderYMax })
  const yMin = data.renderYMin - yPadding
  const yMax = data.renderYMax + yPadding
  const ySpan = Math.max(yMax - yMin, 0.0001)
  const mapX = (x: number) => left + ((x - settings.x.min) / xSpan) * (right - left)
  const mapY = (y: number) => bottom - ((y - yMin) / ySpan) * (bottom - top)
  const segments: string[] = []
  let segment = ''

  for (const point of data.points) {
    if (point.y === null) {
      if (segment) {
        segments.push(segment)
        segment = ''
      }
      continue
    }

    const command = segment ? 'L' : 'M'
    segment += `${command}${mapX(point.x).toFixed(2)},${mapY(point.y).toFixed(2)} `
  }

  if (segment) {
    segments.push(segment)
  }

  const xTicks = Array.from({ length: 5 }, (_, index) => {
    const value = settings.x.min + (xSpan * index) / 4
    return { value, x: mapX(value) }
  })
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const value = yMin + (ySpan * index) / 4
    return { value, y: mapY(value) }
  })

  return {
    bottom,
    left,
    mapX,
    mapY,
    right,
    segments,
    top,
    xTicks,
    yTicks,
    axisLabels,
  }
}

function LineViewport({
  equation,
  initialData,
  settings,
  marker,
  axisLabels,
  animation,
  animationResetKey,
  onAnimationError,
}: LineViewportProps) {
  const sampler = useMemo(() => createLineSampler(equation), [equation])
  const sample = useCallback(
    (context?: SurfaceSampleContext) => sampler(settings, context),
    [sampler, settings],
  )
  const data = useAnimatedData(
    initialData,
    sample,
    animation,
    animationResetKey,
    onAnimationError,
  )
  const pointSampler = useMemo(() => createLinePointSampler(equation), [equation])
  const markerValue = pointSampler(settings, marker.x, getSampleContext(data.time, animation))
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

function HeatmapViewport({
  equation,
  initialData,
  settings,
  marker,
  axisLabels,
  animation,
  animationResetKey,
  onAnimationError,
}: HeatmapViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sampler = useMemo(() => createHeatmapSampler(equation), [equation])
  const sample = useCallback(
    (context?: SurfaceSampleContext) => sampler(settings, context),
    [sampler, settings],
  )
  const data = useAnimatedData(
    initialData,
    sample,
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

export function Line2DViewport(props: LineViewportProps) {
  return <LineViewport {...props} />
}

export function Heatmap2DViewport(props: HeatmapViewportProps) {
  return <HeatmapViewport {...props} />
}

export default function TwoDimensionalViewport(props: TwoDimensionalViewportProps) {
  if (props.mode === 'line2d') {
    return <LineViewport {...props} />
  }

  return <HeatmapViewport {...props} />
}

export type { PlotMode }
