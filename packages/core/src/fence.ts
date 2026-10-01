import { parseChartCsv, type ChartData } from './charts'
import { normalizeEquation } from './surface'

export type FenceFunctionType = '2d' | 'heatmap' | '3d'
export type FenceChartType = 'bar' | 'line' | 'pie'
export type FenceType = FenceFunctionType | FenceChartType
export type FenceAnimation = 'time' | 'window'

export interface FunctionPlotSpec {
  type: FenceFunctionType
  equation: string
  x: { min: number; max: number }
  y: { min: number; max: number }
  resolution: number
  animate?: FenceAnimation
  speed?: number
  autoplay?: boolean
  title?: string
}

export interface ChartPlotSpec {
  type: FenceChartType
  title?: string
  data: ChartData
}

export type MathPlotSpec = FunctionPlotSpec | ChartPlotSpec

const TYPE_ALIASES: Record<string, FenceType> = {
  '2d': '2d',
  '2d-function': '2d',
  function: '2d',
  function2d: '2d',
  line2d: '2d',
  plot: '2d',
  heatmap: 'heatmap',
  heatmap2d: 'heatmap',
  map: 'heatmap',
  '3d': '3d',
  '3d-function': '3d',
  surface: '3d',
  surface3d: '3d',
  function3d: '3d',
  bar: 'bar',
  barchart: 'bar',
  'bar-chart': 'bar',
  line: 'line',
  linechart: 'line',
  'line-chart': 'line',
  pie: 'pie',
  piechart: 'pie',
  'pie-chart': 'pie',
}

const FUNCTION_TYPES: readonly FenceFunctionType[] = ['2d', 'heatmap', '3d']

const OPTION_KEYS = [
  'x',
  'y',
  'resolution',
  'animate',
  'animation',
  'speed',
  'autoplay',
  'play',
  'title',
] as const

type OptionKey = (typeof OPTION_KEYS)[number]

function isFunctionType(type: FenceType): type is FenceFunctionType {
  return (FUNCTION_TYPES as readonly string[]).includes(type)
}

function tokenizeInfoString(input: string) {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]

    if (character === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (character === ' ' && !inQuotes) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += character
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

const OPTION_LINE_PATTERN = new RegExp(`^(?:${OPTION_KEYS.join('|')})\\s*:`, 'i')

function parseOptionLines(lines: string[]) {
  const options: Partial<Record<OptionKey, string>> = {}
  const payload: string[] = []

  lines.forEach((rawLine) => {
    const line = rawLine.trim()

    if (!line) {
      if (payload.length > 0) {
        payload.push('')
      }
      return
    }

    if (OPTION_LINE_PATTERN.test(line)) {
      const match = line.match(/^([\w-]+)\s*:\s*(.*)$/)

      if (match) {
        options[match[1].toLowerCase() as OptionKey] = match[2].trim()
        return
      }
    }

    payload.push(line)
  })

  while (payload.length > 0 && payload[payload.length - 1] === '') {
    payload.pop()
  }

  return { options, payload }
}

function parseInlineOptions(tokens: string[]) {
  const options: Partial<Record<OptionKey, string>> = {}
  const positional: string[] = []

  tokens.forEach((token) => {
    const match = token.match(/^([\w-]+)=(.*)$/s)

    if (!match) {
      positional.push(token)
      return
    }

    const key = match[1].toLowerCase()

    if (!(OPTION_KEYS as readonly string[]).includes(key)) {
      positional.push(token)
      return
    }

    // In compact form `y=…` usually names the plotted function (y = f(x)),
    // so it is only treated as the y-range option when the value looks like a range.
    if (key === 'y' && !match[2].includes('..')) {
      positional.push(token)
      return
    }

    options[key as OptionKey] = match[2]
  })

  return { options, positional }
}

function normalizeTitleValue(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function parseRangeOption(value: string, key: string) {
  const parts = value.split('..').map((part) => part.trim())

  if (parts.length !== 2) {
    throw new Error(`The \`${key}\` option needs a range like \`-6..6\`.`)
  }

  const min = Number(parts[0])
  const max = Number(parts[1])

  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    throw new Error(
      `The \`${key}\` option needs an increasing numeric range like \`-6..6\`.`,
    )
  }

  return { min, max }
}

function parseResolutionOption(value: string) {
  const resolution = Number(value)

  if (!Number.isInteger(resolution) || resolution < 8 || resolution > 128) {
    throw new Error('`resolution` must be an integer between 8 and 128.')
  }

  return resolution
}

function parseAnimateOption(value: string): FenceAnimation {
  const normalized = value.trim().toLowerCase()

  if (normalized === 'time' || normalized === 't') {
    return 'time'
  }

  if (normalized === 'window' || normalized === 'move') {
    return 'window'
  }

  throw new Error('`animate` must be `time` or `window`.')
}

function parseBooleanOption(value: string, key: string) {
  const normalized = value.trim().toLowerCase()

  if (['true', 'yes', 'on', '1'].includes(normalized)) {
    return true
  }

  if (['false', 'no', 'off', '0'].includes(normalized)) {
    return false
  }

  throw new Error(`\`${key}\` must be true or false.`)
}

function resolveTypeToken(token: string) {
  const type = TYPE_ALIASES[token.toLowerCase()]

  if (!type) {
    throw new Error(
      `Unknown plot type "${token}". Use one of: 2d, heatmap, 3d, bar, line, pie.`,
    )
  }

  return type
}

interface AnimationOverrides {
  animate?: FenceAnimation
  speed?: number
  autoplay?: boolean
}

function parseAnimationOptions(
  options: Partial<Record<OptionKey, string>>,
): AnimationOverrides {
  const animateValue = options.animate ?? options.animation

  if (!animateValue) {
    if (options.play || options.autoplay) {
      throw new Error('`play` requires `animate: time` or `animate: window`.')
    }

    return {}
  }

  const animate = parseAnimateOption(animateValue)
  let speed: number | undefined
  let autoplay = true

  if (options.speed !== undefined) {
    const parsedSpeed = Number(options.speed)

    if (!Number.isFinite(parsedSpeed) || parsedSpeed <= 0) {
      throw new Error('`speed` must be a positive number.')
    }

    speed = parsedSpeed
  }

  const playValue = options.play ?? options.autoplay

  if (playValue !== undefined) {
    autoplay = parseBooleanOption(
      playValue,
      playValue === options.play ? 'play' : 'autoplay',
    )
  }

  return { animate, speed, autoplay }
}

function buildFunctionSpec(
  type: FenceFunctionType,
  options: Partial<Record<OptionKey, string>>,
  equationTokens: string[],
  bodyPayload: string[],
): FunctionPlotSpec {
  const bodyEquation = bodyPayload.join(' ').trim()
  const equationToken = equationTokens.join(' ').trim()

  if (!equationToken && !bodyEquation) {
    throw new Error(
      `Add an expression for ${type === '2d' ? 'y' : 'z'}, e.g. \`sin(x)\`.`,
    )
  }

  const equation = normalizeEquation(
    bodyEquation ? `${equationToken} ${bodyEquation}`.trim() : equationToken,
    type === '2d' ? 'y' : 'z',
  )

  const x = options.x ? parseRangeOption(options.x, 'x') : { min: -6, max: 6 }
  const y = options.y
    ? parseRangeOption(options.y, 'y')
    : type === '2d'
      ? { min: -1, max: 1 }
      : { min: -6, max: 6 }
  const resolution = options.resolution
    ? parseResolutionOption(options.resolution)
    : 64

  return {
    type,
    equation,
    x,
    y,
    resolution,
    ...parseAnimationOptions(options),
    title: normalizeTitleValue(options.title),
  }
}

function buildChartSpec(
  type: FenceChartType,
  options: Partial<Record<OptionKey, string>>,
  csvTokens: string[],
  bodyPayload: string[],
): ChartPlotSpec {
  const csv = [...csvTokens, ...bodyPayload]
    .join('\n')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n')

  if (!csv) {
    throw new Error(`Add CSV rows for the ${type} chart, e.g. \`Q1, 120\`.`)
  }

  const rows = csv.split('\n')
  let title = normalizeTitleValue(options.title)

  if (title === undefined && rows.length > 1 && !rows[0].trim().includes(',')) {
    title = normalizeTitleValue(rows.shift())
  }

  return { type, title, data: parseChartCsv(rows.join('\n'), type) }
}

function parseBodyForm(body: string): MathPlotSpec {
  const lines = body.split(/\r?\n/)

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift()
  }

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop()
  }

  if (lines.length === 0) {
    throw new Error(
      'The first line must be the plot type, e.g. `2d`, `heatmap`, `3d`, `bar`, `line` or `pie`.',
    )
  }

  const firstLine = lines[0].trim()
  const typeMatch = firstLine.match(/^([\w-]+)\s*(.*)$/)

  if (!typeMatch) {
    throw new Error(
      'The first line must be the plot type, e.g. `2d`, `heatmap`, `3d`, `bar`, `line` or `pie`.',
    )
  }

  const type = resolveTypeToken(typeMatch[1])
  const inlineRest = typeMatch[2].trim()
  const { options, payload } = parseOptionLines(lines.slice(1))

  if (inlineRest) {
    const tokens = tokenizeInfoString(inlineRest)
    const { options: inlineOptions, positional } = parseInlineOptions(tokens)

    if (isFunctionType(type)) {
      return buildFunctionSpec(type, { ...inlineOptions, ...options }, positional, payload)
    }

    return buildChartSpec(type, { ...inlineOptions, ...options }, positional, payload)
  }

  if (isFunctionType(type)) {
    return buildFunctionSpec(type, options, [], payload)
  }

  return buildChartSpec(type, options, [], payload)
}

/**
 * Parse the full contents of a ```mathplot fence.
 *
 * Body form:
 *   2d
 *   y = sin(x)
 *   x: -6..6
 *
 * Compact form (info string after "mathplot"):
 *   mathplot 2d y="sin(x) * cos(t)" x=-6..6
 *
 * When `infoString` is provided with a type token, the body becomes the
 * payload (CSV rows for charts, or extra equation lines); when the info
 * string has no type, the body is parsed as the body form.
 */
export function parseMathPlotFence(body: string, infoString?: string): MathPlotSpec {
  if (infoString !== undefined && infoString.trim() !== '') {
    const tokens = tokenizeInfoString(infoString)
    const { options: infoOptions, positional } = parseInlineOptions(tokens)
    const typeToken = positional[0]
    const bodyTrimmed = body.replace(/^\uFEFF/, '').trim()

    if (typeToken && !(typeToken.toLowerCase() in TYPE_ALIASES)) {
      // No type on the info string: the body must carry it.
      if (!bodyTrimmed) {
        throw new Error(
          'The fence must include a type, e.g. ```mathplot 2d … or a `2d`/`bar` first line.',
        )
      }

      return parseBodyForm(body.replace(/^\uFEFF/, ''))
    }

    if (!typeToken) {
      throw new Error(
        'The fence opener must include a type, e.g. ```mathplot 2d y=sin(x) …',
      )
    }

    const type = resolveTypeToken(typeToken)
    const restPositional = positional.slice(1)

    if (isFunctionType(type)) {
      return buildFunctionSpec(
        type,
        infoOptions,
        restPositional,
        bodyTrimmed ? bodyTrimmed.split(/\r?\n/) : [],
      )
    }

    return buildChartSpec(
      type,
      infoOptions,
      restPositional,
      bodyTrimmed ? bodyTrimmed.split(/\r?\n/) : [],
    )
  }

  return parseBodyForm(body.replace(/^\uFEFF/, ''))
}