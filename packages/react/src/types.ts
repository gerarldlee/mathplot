export type PlotMode = 'surface3d' | 'line2d' | 'heatmap2d'

export type AnimationMode = 'time' | 'window'

export interface AnimationSettings {
  mode: AnimationMode
  speed: number
  playing: boolean
}

export interface AxisLabels {
  x: string
  y: string
  z: string
}

export const genericAxisLabels: AxisLabels = {
  x: 'x',
  y: 'y',
  z: 'z',
}