import {
  computeBarLayout,
  getChartColor,
  type ChartData,
} from '@mathplot/core'
import { formatAxisValue } from './common'
import { ChartTitle } from './ChartTitle'

export interface BarChartProps {
  data: ChartData
  title?: string
  width?: number
  height?: number
}

export function BarChart({ data, title, width = 420, height = 280 }: BarChartProps) {
  const layout = computeBarLayout(data, { width, height })
  const plot = layout.plot
  const seriesCount = data.series.length

  return (
    <div className="chart-viewport bar-chart" style={{ aspectRatio: `${width} / ${height}` }}>
      <ChartTitle text={title} />
      <svg
        className="chart-graph"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title ? `Bar chart: ${title}` : 'Bar chart'}
      >
        <rect className="chart-background" x="0" y="0" width={width} height={height} />
        {layout.yTicks.map((tick, index) => (
          <g key={`y-grid-${index}`}>
            <line
              className="chart-grid-line"
              x1={plot.left}
              x2={plot.right}
              y1={tick.y}
              y2={tick.y}
            />
            <text
              className="chart-tick-label"
              x={plot.left - 5}
              y={tick.y + 3}
              textAnchor="end"
            >
              {formatAxisValue(tick.value)}
            </text>
          </g>
        ))}
        <line
          className="chart-axis-line"
          x1={plot.left}
          x2={plot.right}
          y1={plot.bottom}
          y2={plot.bottom}
        />
        {layout.rects.map((rect, index) => (
          <rect
            className="chart-bar"
            key={`bar-${index}`}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill={getChartColor(rect.seriesIndex)}
            rx={2}
          >
            <title>{`${rect.label} · ${data.series[rect.seriesIndex]?.name ?? ''}: ${rect.value}`}</title>
          </rect>
        ))}
        {data.labels.map((label, index) => {
          const slotWidth = (plot.right - plot.left) / data.labels.length
          return (
            <text
              className="chart-tick-label"
              key={`x-label-${index}`}
              x={plot.left + slotWidth * index + slotWidth / 2}
              y={plot.bottom + 14}
              textAnchor="middle"
            >
              {label}
            </text>
          )
        })}
      </svg>
      {seriesCount > 1 && (
        <div className="chart-legend" aria-label="Series legend">
          {data.series.map((series, index) => (
            <span key={series.name} className="chart-legend-item">
              <span
                className="chart-legend-swatch"
                style={{ background: getChartColor(index) }}
                aria-hidden="true"
              />
              {series.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}