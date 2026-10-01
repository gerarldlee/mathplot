import type { SurfaceSettings } from '@mathplot/core'

export type AnimationMode = 'time' | 'window'

export type PlotMode = 'surface3d' | 'line2d' | 'heatmap2d'

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

export const plotModeDescriptions: Record<PlotMode, string> = {
  surface3d: 'Render z = f(x, y) as an interactive surface.',
  line2d: 'Render y = f(x) as an interactive line graph.',
  heatmap2d: 'Render z = f(x, y) as a color heatmap.',
}

export interface AnimationPreset {
  mode: AnimationMode
  autoPlay: boolean
}

export interface EquationTemplate {
  id: string
  name: string
  description: string
  expression: string
  settings: SurfaceSettings
  axisLabels: AxisLabels
  animation: AnimationPreset
  notice?: string
}

export const equationTemplates: EquationTemplate[] = [
  {
    id: 'ripple',
    name: 'Ripple',
    description: 'A repeating interference pattern across the x-y plane.',
    expression: 'sin(x) * cos(y)',
    settings: {
      x: { min: -6, max: 6 },
      y: { min: -6, max: 6 },
      resolution: 64,
    },
    axisLabels: genericAxisLabels,
    animation: { mode: 'time', autoPlay: false },
  },
  {
    id: 'saddle',
    name: 'Saddle',
    description: 'A hyperbolic paraboloid with upward and downward curvature.',
    expression: 'x^2 - y^2',
    settings: {
      x: { min: -6, max: 6 },
      y: { min: -6, max: 6 },
      resolution: 64,
    },
    axisLabels: genericAxisLabels,
    animation: { mode: 'time', autoPlay: false },
  },
  {
    id: 'dome',
    name: 'Dome',
    description: 'The positive hemisphere of a sphere with radius ten.',
    expression: 'sqrt(10^2 - x^2 - y^2)',
    settings: {
      x: { min: -6, max: 6 },
      y: { min: -6, max: 6 },
      resolution: 64,
    },
    axisLabels: genericAxisLabels,
    animation: { mode: 'time', autoPlay: false },
  },
  {
    id: 'rings',
    name: 'Rings',
    description: 'Concentric waves generated from the origin.',
    expression: 'sin(sqrt(x^2 + y^2))',
    settings: {
      x: { min: -6, max: 6 },
      y: { min: -6, max: 6 },
      resolution: 64,
    },
    axisLabels: genericAxisLabels,
    animation: { mode: 'time', autoPlay: false },
  },
  {
    id: 'wave',
    name: 'Wave',
    description: 'Two phase-shifted waves animated with the time variable t.',
    expression: 'sin(x + t) + cos(y - 0.8 * t)',
    settings: {
      x: { min: -6, max: 6 },
      y: { min: -6, max: 6 },
      resolution: 64,
    },
    axisLabels: { x: 'Wave x', y: 'Wave y', z: 'Amplitude' },
    animation: { mode: 'time', autoPlay: true },
  },
  {
    id: 'us-economy',
    name: 'US Economy 3D',
    description: 'An illustrative health surface based on GDP growth and unemployment inputs.',
    expression: '0.65 * x - 0.45 * y - 0.06 * (x - 3)^2 - 0.035 * (y - 5)^2',
    settings: {
      x: { min: 0, max: 6 },
      y: { min: 2, max: 12 },
      resolution: 64,
    },
    axisLabels: {
      x: 'GDP growth (%)',
      y: 'Unemployment (%)',
      z: 'Health score (demo)',
    },
    animation: { mode: 'window', autoPlay: false },
    notice: 'Illustrative model only — this template does not contain real economic data.',
  },
]

export function getEquationTemplate(id: string) {
  return equationTemplates.find((template) => template.id === id)
}