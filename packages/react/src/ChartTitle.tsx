import type { ReactNode } from 'react'

export function ChartTitle({ text }: { text?: ReactNode }) {
  if (!text) {
    return null
  }

  return <div className="chart-title">{text}</div>
}