import {
  computePieLayout,
  getChartColor,
  type ChartData,
} from '@mathplot/core'
import { ChartTitle } from './ChartTitle'

export interface PieChartProps {
  data: ChartData
  title?: string
  width?: number
  height?: number
  donut?: boolean
}

function formatRatio(value: number) {
  const percent = value * 100
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(1)}%`
}

export function PieChart({ data, title, width = 300, height = 300, donut = false }: PieChartProps) {
  const layout = computePieLayout(data, {
    size: width,
    innerRadiusRatio: donut ? 0.55 : 0,
  })

  return (
    <div className="chart-viewport pie-chart" style={{ aspectRatio: `${width} / ${height}` }}>
      <ChartTitle text={title} />
      <svg
        className="chart-graph"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title ? `Pie chart: ${title}` : 'Pie chart'}
      >
        <rect className="chart-background" x="0" y="0" width={width} height={height} />
        {layout.slices.map((slice, index) => (
          <path
            className="chart-pie-slice"
            key={`slice-${index}`}
            d={slice.path}
            fill={getChartColor(index)}
            stroke="#090c16"
            strokeWidth="1"
          >
            <title>{`${slice.label}: ${slice.value} (${formatRatio(slice.ratio)})`}</title>
          </path>
        ))}
      </svg>
      <div className="chart-legend pie-legend" aria-label="Slice legend">
        {layout.slices.map((slice, index) => (
          <span key={slice.label} className="chart-legend-item">
            <span
              className="chart-legend-swatch"
              style={{ background: getChartColor(index) }}
              aria-hidden="true"
            />
            {`${slice.label} · ${formatRatio(slice.ratio)}`}
          </span>
        ))}
      </div>
    </div>
  )
}