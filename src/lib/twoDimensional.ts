import {
  cleanMathError,
  createExpressionEvaluator,
  createSurfacePointSampler,
  getHeatmapColor,
  getRenderRange,
  toFiniteNumber,
  wrapCoordinate,
  type AxisRange,
  type SurfacePointSampler,
  type SurfaceSampleContext,
  type SurfaceSettings,
} from './surface'

export interface LinePoint {
  x: number
  y: number | null
}

export interface LineData {
  time: number
  points: LinePoint[]
  yMin: number
  yMax: number
  renderYMin: number
  renderYMax: number
  definedSamples: number
  totalSamples: number
  clipped: boolean
}

export interface HeatmapData {
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

export type LineSampler = (
  settings: SurfaceSettings,
  context?: SurfaceSampleContext,
) => LineData

export type HeatmapSampler = (
  settings: SurfaceSettings,
  context?: SurfaceSampleContext,
) => HeatmapData

function getContext(context: SurfaceSampleContext = {}) {
  return {
    time:
      typeof context.time === 'number' && Number.isFinite(context.time)
        ? context.time
        : 0,
    xOffset:
      typeof context.xOffset === 'number' && Number.isFinite(context.xOffset)
        ? context.xOffset
        : 0,
    yOffset:
      typeof context.yOffset === 'number' && Number.isFinite(context.yOffset)
        ? context.yOffset
        : 0,
  }
}

function validateGridSettings(settings: SurfaceSettings) {
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

}

function validateLineSettings(settings: SurfaceSettings) {
  const { x, resolution } = settings

  if (!Number.isFinite(x.min) || !Number.isFinite(x.max) || x.max <= x.min) {
    throw new Error('X maximum must be greater than X minimum.')
  }

  if (!Number.isInteger(resolution) || resolution < 8 || resolution > 128) {
    throw new Error('Resolution must be between 8 and 128.')
  }
}

function createPointErrorMessage(valueName: 'y' | 'z', errors: Set<string>) {
  const reason = errors.values().next().value as string | undefined

  return reason
    ? `The equation has no real values in this range. ${reason}`
    : `The equation did not produce any real ${valueName} values in this range.`
}

export function createLineSampler(equation: string): LineSampler {
  const evaluator = createExpressionEvaluator(equation, 'y')

  return (settings, context = {}) => {
    validateLineSettings(settings)
    const { time, xOffset } = getContext(context)
    const lineCount = settings.resolution + 1
    const points: LinePoint[] = []
    const finiteValues: number[] = []
    const evaluationErrors = new Set<string>()

    for (let column = 0; column < lineCount; column += 1) {
      const x = settings.x.min + ((settings.x.max - settings.x.min) * column) / settings.resolution
      const sampleX = wrapCoordinate(x + xOffset, settings.x)
      let y: number | null = null

      try {
        y = toFiniteNumber(evaluator.evaluate({ x: sampleX, y: 0, t: time }))
      } catch (cause) {
        evaluationErrors.add(cleanMathError(cause))
      }

      if (y !== null) {
        finiteValues.push(y)
      }

      points.push({ x, y })
    }

    if (finiteValues.length === 0) {
      throw new Error(createPointErrorMessage('y', evaluationErrors))
    }

    const yMin = Math.min(...finiteValues)
    const yMax = Math.max(...finiteValues)
    const renderRange = getRenderRange(finiteValues)

    return {
      time,
      points,
      yMin,
      yMax,
      renderYMin: renderRange.min,
      renderYMax: renderRange.max,
      definedSamples: finiteValues.length,
      totalSamples: lineCount,
      clipped: yMin < renderRange.min || yMax > renderRange.max,
    }
  }
}

export function createLine(equation: string, settings: SurfaceSettings, context?: SurfaceSampleContext) {
  return createLineSampler(equation)(settings, context)
}

export function createHeatmapSampler(equation: string): HeatmapSampler {
  const evaluator = createExpressionEvaluator(equation)

  return (settings, context = {}) => {
    validateGridSettings(settings)
    const { time, xOffset, yOffset } = getContext(context)
    const lineCount = settings.resolution + 1
    const values: Array<number | null> = new Array(lineCount * lineCount).fill(null)
    const finiteValues: number[] = []
    const evaluationErrors = new Set<string>()

    for (let row = 0; row < lineCount; row += 1) {
      const y = settings.y.min + ((settings.y.max - settings.y.min) * row) / settings.resolution
      const sampleY = wrapCoordinate(y + yOffset, settings.y)

      for (let column = 0; column < lineCount; column += 1) {
        const x = settings.x.min + ((settings.x.max - settings.x.min) * column) / settings.resolution
        const sampleX = wrapCoordinate(x + xOffset, settings.x)
        const index = row * lineCount + column

        try {
          const z = toFiniteNumber(evaluator.evaluate({ x: sampleX, y: sampleY, t: time }))

          if (z !== null) {
            values[index] = z
            finiteValues.push(z)
          }
        } catch (cause) {
          evaluationErrors.add(cleanMathError(cause))
        }
      }
    }

    if (finiteValues.length === 0) {
      throw new Error(createPointErrorMessage('z', evaluationErrors))
    }

    const zMin = Math.min(...finiteValues)
    const zMax = Math.max(...finiteValues)
    const renderRange = getRenderRange(finiteValues)

    return {
      time,
      values,
      zMin,
      zMax,
      renderZMin: renderRange.min,
      renderZMax: renderRange.max,
      definedSamples: finiteValues.length,
      totalSamples: lineCount * lineCount,
      clipped: zMin < renderRange.min || zMax > renderRange.max,
    }
  }
}

export function createHeatmap(
  equation: string,
  settings: SurfaceSettings,
  context?: SurfaceSampleContext,
) {
  return createHeatmapSampler(equation)(settings, context)
}

export function createLinePointSampler(equation: string) {
  const evaluator = createExpressionEvaluator(equation, 'y')

  return (settings: SurfaceSettings, x: number, context: SurfaceSampleContext = {}) => {
    if (!Number.isFinite(x)) {
      return null
    }

    const { time, xOffset } = getContext(context)
    const sampleX = wrapCoordinate(x + xOffset, settings.x)

    try {
      return toFiniteNumber(evaluator.evaluate({ x: sampleX, y: 0, t: time }))
    } catch {
      return null
    }
  }
}

export function createHeatmapPointSampler(equation: string): SurfacePointSampler {
  return createSurfacePointSampler(equation)
}

export function getHeatmapColorValue(
  value: number,
  minimum: number,
  maximum: number,
) {
  const span = maximum - minimum
  return getHeatmapColor(span === 0 ? 0.5 : (value - minimum) / span)
}

export function getAxisPadding(range: AxisRange) {
  const span = range.max - range.min
  return Math.max(span * 0.08, 0.5)
}
