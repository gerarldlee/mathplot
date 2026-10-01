import {
  computeLineLayout,
  getChartColor,
  type ChartData,
} from '@mathplot/core'
import { formatAxisValue } from './common'
import { ChartTitle } from './ChartTitle'

export interface LineChartProps {
  data: ChartData
  title?: string
  width?: number
  height?: number
}

export function LineChart({ data, title, width = 420, height = 280 }: LineChartProps) {
  const layout = computeLineLayout(data, { width, height })
  const plot = layout.plot

  return (
    <div className="chart-viewport line-chart" style={{ aspectRatio: `${width} / ${height}` }}>
      <ChartTitle text={title} />
      <svg
        className="chart-graph"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title ? `Line chart: ${title}` : 'Line chart'}
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
        {layout.series.map((series, seriesIndex) => (
          <g key={`series-${seriesIndex}`}>
            {series.points.map((segment, segmentIndex) => (
              <path
                key={`segment-${segmentIndex}`}
                className="chart-line-path"
                d={segment
                  .map((point, pointIndex) => {
                    const command = pointIndex === 0 ? 'M' : 'L'
                    return `${command}${point.x.toFixed(2)},${point.y.toFixed(2)}`
                  })
                  .join(' ')}
                stroke={series.color}
              />
            ))}
            {series.points.map((segment, segmentIndex) =>
              segment.map((point, pointIndex) => (
                <circle
                  key={`point-${segmentIndex}-${pointIndex}`}
                  className="chart-line-dot"
                  cx={point.x}
                  cy={point.y}
                  r={2.5}
                  fill={series.color}
                >
                  <title>
                    {`${data.labels[point.labelIndex]} · ${series.name}: ${
                      data.series[seriesIndex]?.values[point.labelIndex] ?? ''
                    }`}
                  </title>
                </circle>
              )),
            )}
          </g>
        ))}
        <line
          className="chart-axis-line"
          x1={plot.left}
          x2={plot.right}
          y1={plot.bottom}
          y2={plot.bottom}
        />
        {layout.xTicks.map((tick, index) => (
          <text
            className="chart-tick-label"
            key={`x-label-${index}`}
            x={tick.x}
            y={plot.bottom + 14}
            textAnchor="middle"
          >
            {tick.label}
          </text>
        ))}
      </svg>
      {data.series.length > 1 && (
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