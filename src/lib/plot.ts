import type { AnimationMode } from './templates'

export type PlotMode = 'surface3d' | 'line2d' | 'heatmap2d'

export interface AnimationSettings {
  mode: AnimationMode
  speed: number
  playing: boolean
}

export const plotModeDescriptions: Record<PlotMode, string> = {
  surface3d: 'Render z = f(x, y) as an interactive surface.',
  line2d: 'Render y = f(x) as an interactive line graph.',
  heatmap2d: 'Render z = f(x, y) as a color heatmap.',
}
