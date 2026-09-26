import type { EvalFunction } from 'mathjs'
import { all, create } from 'mathjs/number'

const math = create(all)

const colorStops = [
  [45, 212, 191],
  [59, 130, 246],
  [139, 92, 246],
  [244, 114, 182],
]

export interface AxisRange {
  min: number
  max: number
}

export interface SurfaceSettings {
  x: AxisRange
  y: AxisRange
  resolution: number
}

export interface SurfaceSampleContext {
  time?: number
  xOffset?: number
  yOffset?: number
}

export type SurfaceSampler = (
  settings: SurfaceSettings,
  context?: SurfaceSampleContext,
) => SurfaceData

export interface SurfaceMarker {
  x: number
  y: number
}

export type SurfacePointSampler = (
  settings: SurfaceSettings,
  x: number,
  y: number,
  context?: SurfaceSampleContext,
) => number | null

export interface SurfaceData {
  positions: Float32Array
  colors: Float32Array
  zMin: number
  zMax: number
  renderZMin: number
  renderZMax: number
  definedSamples: number
  totalSamples: number
  skippedCells: number
  clipped: boolean
}

export function cleanMathError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause)
  return message.replace(/^Error:\s*/, '').replace(/\s*\(char:\d+\)$/, '')
}

export function toFiniteNumber(value: unknown) {
  let candidate = value

  if (
    (typeof candidate === 'object' || typeof candidate === 'function') &&
    candidate !== null &&
    'valueOf' in candidate
  ) {
    try {
      candidate = (candidate as { valueOf: () => unknown }).valueOf()
    } catch {
      return null
    }
  }

  return typeof candidate === 'number' && Number.isFinite(candidate)
    ? candidate
    : null
}

function quantile(sortedValues: number[], position: number) {
  const index = Math.round((sortedValues.length - 1) * position)
  return sortedValues[index]
}

export function getRenderRange(values: number[]) {
  const sortedValues = [...values].sort((a, b) => a - b)
  const rawMin = sortedValues[0]
  const rawMax = sortedValues.at(-1) ?? rawMin
  const firstQuartile = quantile(sortedValues, 0.25)
  const thirdQuartile = quantile(sortedValues, 0.75)
  const interquartileRange = thirdQuartile - firstQuartile

  if (interquartileRange === 0) {
    return { min: rawMin, max: rawMax }
  }

  const lowerFence = firstQuartile - interquartileRange * 3
  const upperFence = thirdQuartile + interquartileRange * 3

  return {
    min: Math.max(rawMin, lowerFence),
    max: Math.min(rawMax, upperFence),
  }
}

export function getHeatmapColor(value: number) {
  const scaled = Math.max(0, Math.min(1, value)) * (colorStops.length - 1)
  const startIndex = Math.min(Math.floor(scaled), colorStops.length - 2)
  const amount = scaled - startIndex
  const start = colorStops[startIndex]
  const end = colorStops[startIndex + 1]

  return start.map((channel, index) => channel + (end[index] - channel) * amount)
}

export function wrapCoordinate(value: number, range: AxisRange) {
  if (value >= range.min && value <= range.max) {
    return value
  }

  const span = range.max - range.min
  return ((((value - range.min) % span) + span) % span) + range.min
}

export function normalizeEquation(input: string, target: 'y' | 'z' = 'z') {
  const trimmed = input.trim()

  if (!trimmed) {
    throw new Error(`Enter an equation for ${target}.`)
  }

  const equation =
    trimmed.match(new RegExp(`^${target}\\s*=\\s*(.+)$`, 'i'))?.[1] ?? trimmed

  if (!equation.trim()) {
    throw new Error(`Enter an expression after ${target} =.`)
  }

  if (equation.includes('=')) {
    throw new Error(
      `Assignments are not supported. Enter only the expression for ${target}.`,
    )
  }

  return equation.trim()
}

export function createExpressionEvaluator(equation: string, target: 'y' | 'z' = 'z') {
  const expression = normalizeEquation(equation, target)

  try {
    return math.compile(expression) as EvalFunction
  } catch (cause) {
    throw new Error(`Check your equation: ${cleanMathError(cause)}`)
  }
}

export function createSurfaceSampler(equation: string): SurfaceSampler {
  const evaluator = createExpressionEvaluator(equation)

  return (settings, context = {}) => {
    const { x, y, resolution } = settings

    if (!Number.isFinite(x.min) || !Number.isFinite(x.max) || x.max <= x.min) {
      throw new Error('X maximum must be greater than X minimum.')
    }

    if (!Number.isFinite(y.min) || !Number.isFinite(y.max) || y.max <= y.min) {
      throw new Error('Y maximum must be greater than Y minimum.')
    }

    if (!Number.isInteger(resolution) || resolution < 8 || resolution > 128) {
      throw new Error('Resolution must be between 8 and 128.')
    }

    const time =
      typeof context.time === 'number' && Number.isFinite(context.time)
        ? context.time
        : 0
    const xOffset =
      typeof context.xOffset === 'number' && Number.isFinite(context.xOffset)
        ? context.xOffset
        : 0
    const yOffset =
      typeof context.yOffset === 'number' && Number.isFinite(context.yOffset)
        ? context.yOffset
        : 0
    const lineCount = resolution + 1
    const totalSamples = lineCount * lineCount
    const xCoordinates = new Float64Array(totalSamples)
    const yCoordinates = new Float64Array(totalSamples)
    const zValues = new Float64Array(totalSamples)
    const finiteValues: number[] = []
    const evaluationErrors = new Set<string>()

    zValues.fill(Number.NaN)

    for (let row = 0; row < lineCount; row += 1) {
      const yValue = y.min + ((y.max - y.min) * row) / resolution
      const sampleY = wrapCoordinate(yValue + yOffset, y)

      for (let column = 0; column < lineCount; column += 1) {
        const xValue = x.min + ((x.max - x.min) * column) / resolution
        const sampleX = wrapCoordinate(xValue + xOffset, x)
        const index = row * lineCount + column

        xCoordinates[index] = xValue
        yCoordinates[index] = yValue

        try {
          const zValue = toFiniteNumber(
            evaluator.evaluate({ x: sampleX, y: sampleY, t: time }),
          )

          if (zValue !== null) {
            zValues[index] = zValue
            finiteValues.push(zValue)
          }
        } catch (cause) {
          evaluationErrors.add(cleanMathError(cause))
        }
      }
    }

    if (finiteValues.length === 0) {
      const reason = evaluationErrors.values().next().value as string | undefined
      throw new Error(
        reason
          ? `The equation has no real values in this range. ${reason}`
          : 'The equation did not produce any real z values in this range.',
      )
    }

    const zMin = Math.min(...finiteValues)
    const zMax = Math.max(...finiteValues)
    const renderRange = getRenderRange(finiteValues)
    const renderSpan = renderRange.max - renderRange.min
    const positions: number[] = []
    const colors: number[] = []
    let skippedCells = 0

    const addVertex = (index: number) => {
      const rawZ = zValues[index]
      const zValue = Math.max(renderRange.min, Math.min(renderRange.max, rawZ))
      const normalizedZ =
        renderSpan === 0 ? 0.5 : (zValue - renderRange.min) / renderSpan
      const [red, green, blue] = getHeatmapColor(normalizedZ)

      positions.push(xCoordinates[index], zValue, yCoordinates[index])
      colors.push(red / 255, green / 255, blue / 255)
    }

    for (let row = 0; row < resolution; row += 1) {
      for (let column = 0; column < resolution; column += 1) {
        const topLeft = row * lineCount + column
        const topRight = topLeft + 1
        const bottomLeft = topLeft + lineCount
        const bottomRight = bottomLeft + 1

        if (
          !Number.isFinite(zValues[topLeft]) ||
          !Number.isFinite(zValues[topRight]) ||
          !Number.isFinite(zValues[bottomLeft]) ||
          !Number.isFinite(zValues[bottomRight])
        ) {
          skippedCells += 1
          continue
        }

        addVertex(topLeft)
        addVertex(bottomLeft)
        addVertex(topRight)
        addVertex(topRight)
        addVertex(bottomLeft)
        addVertex(bottomRight)
      }
    }

    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      zMin,
      zMax,
      renderZMin: renderRange.min,
      renderZMax: renderRange.max,
      definedSamples: finiteValues.length,
      totalSamples,
      skippedCells,
      clipped: zMin < renderRange.min || zMax > renderRange.max,
    }
  }
}

export function createSurfacePointSampler(
  equation: string,
  target: 'y' | 'z' = 'z',
): SurfacePointSampler {
  const evaluator = createExpressionEvaluator(equation, target)

  return (settings, x, y, context = {}) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null
    }

    const time =
      typeof context.time === 'number' && Number.isFinite(context.time)
        ? context.time
        : 0
    const xOffset =
      typeof context.xOffset === 'number' && Number.isFinite(context.xOffset)
        ? context.xOffset
        : 0
    const yOffset =
      typeof context.yOffset === 'number' && Number.isFinite(context.yOffset)
        ? context.yOffset
        : 0
    const sampleX = wrapCoordinate(x + xOffset, settings.x)
    const sampleY = wrapCoordinate(y + yOffset, settings.y)

    try {
      return toFiniteNumber(evaluator.evaluate({ x: sampleX, y: sampleY, t: time }))
    } catch {
      return null
    }
  }
}

export function createSurface(
  equation: string,
  settings: SurfaceSettings,
  context?: SurfaceSampleContext,
) {
  return createSurfaceSampler(equation)(settings, context)
}
