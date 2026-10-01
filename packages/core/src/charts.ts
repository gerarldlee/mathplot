export type ChartType = 'bar' | 'line' | 'pie'

export interface ChartSeries {
  name: string
  values: Array<number | null>
}

export interface ChartData {
  labels: string[]
  series: ChartSeries[]
}

function splitCsvLine(line: string) {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (character === ',' && !inQuotes) {
      cells.push(current)
      current = ''
    } else {
      current += character
    }
  }

  cells.push(current)
  return cells.map((cell) => cell.trim())
}

function parseCell(cell: string) {
  if (cell === '') {
    return null
  }

  const value = Number(cell)
  return Number.isFinite(value) ? value : null
}

function normalizeChartTitle(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function parseChartCsv(csv: string, type: ChartType): ChartData {
  const rows = csv
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row !== '' && !row.startsWith('#'))

  if (rows.length === 0) {
    throw new Error('Add at least one data row, e.g. `Q1, 120`.')
  }

  if (type === 'pie') {
    const labels: string[] = []
    const values: Array<number | null> = []

    for (const row of rows) {
      const cells = splitCsvLine(row)

      if (cells.length < 2 || cells[1] === '') {
        throw new Error(`Pie rows need a label and a value, e.g. \`Q1, 120\` (got "${row}").`)
      }

      labels.push(cells[0])
      values.push(parseCell(cells[1]))
    }

    if (labels.length === 0) {
      throw new Error('Add at least one data row, e.g. `Q1, 120`.')
    }

    return { labels, series: [{ name: 'value', values }] }
  }

  const dataRows: string[][] = []
  let header: string[] | undefined

  const firstRow = splitCsvLine(rows[0])
  const isHeaderRow =
    rows.length > 1 &&
    firstRow.every((cell) => cell !== '' && !Number.isFinite(Number(cell)))

  if (isHeaderRow) {
    header = firstRow
    dataRows.push(...rows.slice(1).map((row) => splitCsvLine(row)))
  } else {
    dataRows.push(...rows.map((row) => splitCsvLine(row)))
  }

  if (dataRows.length === 0) {
    throw new Error('Add at least one data row, e.g. `Q1, 120`.')
  }

  const dataColumnCount = Math.max(...dataRows.map((cells) => cells.length))

  if (dataColumnCount < 2) {
    throw new Error('Add at least one value column after the labels, e.g. `Q1, 120`.')
  }

  const parseDataRow = (cells: string[]) => {
    const label = (cells[0] ?? '').trim()
    const values = Array.from({ length: dataColumnCount - 1 }, (_, index) =>
      parseCell((cells[index + 1] ?? '').trim()),
    )

    return { label, values }
  }

  const parsed = dataRows.map(parseDataRow)

  if (parsed.every((row) => row.label === '')) {
    throw new Error('Add a label in the first column of each row, e.g. `Q1, 120`.')
  }

  const seriesNames = header
    ? Array.from({ length: dataColumnCount - 1 }, (_, index) =>
        normalizeChartTitle(header?.[index + 1]) ?? `Series ${index + 1}`,
      )
    : Array.from({ length: dataColumnCount - 1 }, (_, index) => `Series ${index + 1}`)

  return {
    labels: parsed.map((row) => row.label),
    series: seriesNames.map((name, index) => ({
      name,
      values: parsed.map((row) => row.values[index]),
    })),
  }
}

export const chartColorPalette = [
  '#67e8f9',
  '#818cf8',
  '#f472b6',
  '#fbbf24',
  '#34d399',
  '#a78bfa',
  '#fb923c',
  '#38bdf8',
]

export function getChartColor(index: number) {
  return chartColorPalette[index % chartColorPalette.length]
}

export interface BarLayoutOptions {
  width?: number
  height?: number
  padding?: number
  groupGap?: number
}

export interface BarRect {
  label: string
  seriesIndex: number
  x: number
  y: number
  width: number
  height: number
  value: number
}

export interface BarAxisTick {
  value: number
  y: number
}

export interface BarLayout {
  rects: BarRect[]
  yTicks: BarAxisTick[]
  yScale: { min: number; max: number }
  plot: { left: number; right: number; top: number; bottom: number }
}

export function computeBarLayout(
  data: ChartData,
  options: BarLayoutOptions = {},
): BarLayout {
  const width = options.width ?? 400
  const height = options.height ?? 260
  const padding = options.padding ?? 24
  const groupGap = options.groupGap ?? 0.28
  const values = data.series
    .flatMap((line) => line.values)
    .filter((value): value is number => value !== null)

  if (values.length === 0 || data.labels.length === 0) {
    throw new Error('The chart has no numeric values to plot.')
  }

  const rawMin = Math.min(0, ...values)
  const rawMax = Math.max(0, ...values)
  const span = rawMax - rawMin || 1
  const paddedMin = rawMin === rawMax ? rawMin - 1 : rawMin - span * 0.05
  const paddedMax = rawMin === rawMax ? rawMax + 1 : rawMax + span * 0.05

  const left = padding
  const right = width - padding
  const top = padding * 0.75
  const bottom = height - padding
  const plotHeight = bottom - top
  const plotWidth = right - left

  const toY = (value: number) =>
    bottom - ((value - paddedMin) / (paddedMax - paddedMin)) * plotHeight

  const slotWidth = plotWidth / data.labels.length
  const barWidth = (slotWidth * (1 - groupGap)) / data.series.length
  const rects: BarRect[] = []

  data.labels.forEach((label, labelIndex) => {
    const slotStart = left + labelIndex * slotWidth + slotWidth * groupGap * 0.5

    data.series.forEach((line, seriesIndex) => {
      const value = line.values[labelIndex]

      if (value === null || value === undefined) {
        return
      }

      const yForValue = toY(Math.max(0, value))
      const yForZero = toY(0)
      const yTop = Math.min(yForValue, yForZero)
      const yBottom = Math.max(yForValue, yForZero)

      rects.push({
        label,
        seriesIndex,
        x: slotStart + seriesIndex * barWidth,
        y: yTop,
        width: barWidth,
        height: Math.max(yBottom - yTop, value === 0 ? 1 : 0.5),
        value,
      })
    })
  })

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const value = paddedMin + ((paddedMax - paddedMin) * index) / 4
    return { value, y: toY(value) }
  })

  return {
    rects,
    yTicks,
    yScale: { min: paddedMin, max: paddedMax },
    plot: { left, right, top, bottom },
  }
}

export interface LineLayoutOptions {
  width?: number
  height?: number
  padding?: number
}

export interface LineSeriesPoint {
  x: number
  y: number
  /** Index into ChartData.labels for the category this point belongs to. */
  labelIndex: number
}

export interface LineLayoutSeries {
  name: string
  points: LineSeriesPoint[][]
  color: string
}

export interface LineAxisTick {
  label: string
  x: number
}

export interface LineLayout {
  series: LineLayoutSeries[]
  xTicks: LineAxisTick[]
  yTicks: Array<{ value: number; y: number }>
  plot: { left: number; right: number; top: number; bottom: number }
  toX: (labelIndex: number) => number
}

export function computeLineLayout(
  data: ChartData,
  options: LineLayoutOptions = {},
): LineLayout {
  const width = options.width ?? 400
  const height = options.height ?? 260
  const padding = options.padding ?? 28
  const values = data.series
    .flatMap((line) => line.values)
    .filter((value): value is number => value !== null)

  if (values.length === 0 || data.labels.length === 0) {
    throw new Error('The chart has no numeric values to plot.')
  }

  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const span = rawMax - rawMin || 1
  const paddedMin = rawMin === rawMax ? rawMin - 1 : rawMin - span * 0.08
  const paddedMax = rawMin === rawMax ? rawMax + 1 : rawMax + span * 0.08

  const left = padding
  const right = width - padding
  const top = padding * 0.7
  const bottom = height - padding * 0.8
  const plotWidth = right - left
  const plotHeight = bottom - top

  const toX = (labelIndex: number) =>
    left + (data.labels.length === 1
      ? plotWidth / 2
      : (labelIndex / (data.labels.length - 1)) * plotWidth)
  const toY = (value: number) =>
    bottom - ((value - paddedMin) / (paddedMax - paddedMin)) * plotHeight

  const series = data.series.map((line, seriesIndex) => {
    const segments: LineSeriesPoint[][] = []
    let current: LineSeriesPoint[] = []

    data.labels.forEach((_, labelIndex) => {
      const value = line.values[labelIndex]

      if (value === null || value === undefined) {
        if (current.length > 0) {
          segments.push(current)
          current = []
        }
        return
      }

      current.push({ x: toX(labelIndex), y: toY(value), labelIndex })
    })

    if (current.length > 0) {
      segments.push(current)
    }

    return { name: line.name, points: segments, color: getChartColor(seriesIndex) }
  })

  const xTicks = data.labels.map((label, index) => ({
    label,
    x: toX(index),
  }))
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const value = paddedMin + ((paddedMax - paddedMin) * index) / 4
    return { value, y: toY(value) }
  })

  return {
    series,
    xTicks,
    yTicks,
    plot: { left, right, top, bottom },
    toX,
  }
}

export interface PieLayoutOptions {
  size?: number
  innerRadiusRatio?: number
}

export interface PieSlice {
  label: string
  value: number
  ratio: number
  startAngle: number
  endAngle: number
  path: string
  midX: number
  midY: number
}

export interface PieLayout {
  slices: PieSlice[]
  center: { x: number; y: number }
  radius: number
  innerRadius: number
  total: number
}

const TAU = Math.PI * 2

function polar(centerX: number, centerY: number, radius: number, angle: number) {
  return {
    x: centerX + radius * Math.cos(angle - Math.PI / 2),
    y: centerY + radius * Math.sin(angle - Math.PI / 2),
  }
}

export function computePieLayout(
  data: ChartData,
  options: PieLayoutOptions = {},
): PieLayout {
  const size = options.size ?? 260
  const innerRadiusRatio = Math.max(0, Math.min(0.85, options.innerRadiusRatio ?? 0))
  const values = data.series[0]?.values ?? []
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0)

  if (total <= 0) {
    throw new Error('The pie chart needs at least one positive value.')
  }

  const center = { x: size / 2, y: size / 2 }
  const radius = size / 2 - 10
  const innerRadius = radius * innerRadiusRatio
  const slices: PieSlice[] = []
  let angle = 0

  data.labels.forEach((label, index) => {
    const value = values[index]

    if (value === null || value === undefined || value <= 0) {
      return
    }

    const ratio = value / total
    const sweep = ratio * TAU
    const startAngle = angle
    const endAngle = angle + sweep
    const fullCircle = sweep >= TAU - 1e-9
    const outerStart = polar(center.x, center.y, radius, startAngle)
    const outerEnd = polar(center.x, center.y, radius, endAngle)
    const innerEnd = polar(center.x, center.y, innerRadius, endAngle)
    const innerStart = polar(center.x, center.y, innerRadius, startAngle)
    const largeArc = sweep > Math.PI ? 1 : 0
    const midAngle = (startAngle + endAngle) / 2
    const mid = polar(
      center.x,
      center.y,
      (radius + innerRadius) / 2,
      midAngle,
    )

    if (fullCircle) {
      const top = { x: center.x, y: center.y - radius }
      const innerTop = { x: center.x, y: center.y - innerRadius }

      slices.push({
        label,
        value,
        ratio,
        startAngle,
        endAngle,
        path: innerRadius > 0
          ? [
              `M ${top.x} ${top.y}`,
              `A ${radius} ${radius} 0 1 1 ${top.x - 0.01} ${top.y}`,
              `L ${innerTop.x} ${innerTop.y}`,
              `A ${innerRadius} ${innerRadius} 0 1 0 ${innerTop.x - 0.01} ${innerTop.y}`,
              'Z',
            ].join(' ')
          : [
              `M ${center.x} ${center.y}`,
              `L ${top.x} ${top.y}`,
              `A ${radius} ${radius} 0 1 1 ${top.x - 0.01} ${top.y}`,
              'Z',
            ].join(' '),
        midX: mid.x,
        midY: mid.y,
      })
      return
    }

    slices.push({
      label,
      value,
      ratio,
      startAngle,
      endAngle,
      path: innerRadius > 0
        ? [
            `M ${outerStart.x} ${outerStart.y}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
            `L ${innerEnd.x} ${innerEnd.y}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
            'Z',
          ].join(' ')
        : [
            `M ${center.x} ${center.y}`,
            `L ${outerStart.x} ${outerStart.y}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
            'Z',
          ].join(' '),
      midX: mid.x,
      midY: mid.y,
    })

    angle = endAngle
  })

  return { slices, center, radius, innerRadius, total }
}