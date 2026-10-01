import { useEffect, useRef, useState } from 'react'
import {
  getAxisPadding,
  type LineData,
  type SurfaceSampleContext,
  type SurfaceSettings,
} from '@mathplot/core'
import type { AnimationSettings, AxisLabels } from './types'

export function getSampleContext(
  time: number,
  animation: AnimationSettings,
): SurfaceSampleContext {
  return animation.playing && animation.mode === 'window'
    ? { time, xOffset: time * 0.8, yOffset: -time * 0.55 }
    : { time }
}

interface HeatmapLike {
  time: number
  values: Array<number | null>
  zMin: number
  zMax: number
  renderZMin: number
  renderZMax: number
  definedSamples: number
  totalSamples: number
  clipped: boolean
}

export type SampledData = LineData | HeatmapLike

export function useAnimatedData<T extends SampledData>(
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

export function formatValue(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export function formatAxisValue(value: number) {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1)
}

export interface LineGeometry {
  bottom: number
  left: number
  mapX: (x: number) => number
  mapY: (y: number) => number
  right: number
  segments: string[]
  top: number
  xTicks: Array<{ value: number; x: number }>
  yTicks: Array<{ value: number; y: number }>
  axisLabels: AxisLabels
}

export function getLineGeometry(
  data: LineData,
  settings: SurfaceSettings,
  axisLabels: AxisLabels,
): LineGeometry {
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