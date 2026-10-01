import { describe, expect, it } from 'vitest'
import {
  createHeatmap,
  createHeatmapPointSampler,
  createHeatmapSampler,
  createLine,
  createLinePointSampler,
  createLineSampler,
} from './twoDimensional'
import type { SurfaceSettings } from './surface'

function settings(overrides: Partial<SurfaceSettings> = {}): SurfaceSettings {
  return {
    x: { min: -1, max: 1 },
    y: { min: -1, max: 1 },
    resolution: 8,
    ...overrides,
  }
}

describe('createLineSampler', () => {
  it('evaluates a y function with time and moving-window context', () => {
    const sample = createLineSampler('y = x + 2 * t')
    const line = sample(settings(), { time: 3 })

    expect(line.points).toHaveLength(9)
    expect(line.yMin).toBe(5)
    expect(line.yMax).toBe(7)
    expect(line.totalSamples).toBe(9)
    expect(createLine('x', settings(), { xOffset: 2.5 }).points[7].y).toBeCloseTo(-0.75)
  })

  it('keeps undefined samples as gaps', () => {
    const line = createLine('sqrt(0.25 - x^2)', settings())

    expect(line.points.some((point) => point.y === null)).toBe(true)
    expect(line.definedSamples).toBeLessThan(line.totalSamples)
  })
})

describe('createHeatmapSampler', () => {
  it('evaluates a grid with time and moving-window context', () => {
    const sample = createHeatmapSampler('x + 2 * t')
    const heatmap = sample(settings(), { time: 3 })

    expect(heatmap.values).toHaveLength(81)
    expect(heatmap.zMin).toBe(5)
    expect(heatmap.zMax).toBe(7)
    expect(heatmap.totalSamples).toBe(81)
    expect(createHeatmap('x', settings(), { xOffset: 2.5 }).zMin).toBe(-1)
    expect(createHeatmap('y', settings(), { yOffset: 2.5 }).zMin).toBe(-1)
  })

  it('reports an equation with no real grid values', () => {
    expect(() => createHeatmap('sqrt(-1)', settings())).toThrow(
      'did not produce any real z values',
    )
  })
})

describe('2D point samplers', () => {
  it('samples line and heatmap markers with animation context', () => {
    const domain = settings()

    expect(createLinePointSampler('x + 2 * t')(domain, 0.5, { time: 3 })).toBe(6.5)
    expect(createHeatmapPointSampler('x + y')(domain, 0.5, -0.25)).toBe(0.25)
  })
})