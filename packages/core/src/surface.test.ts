import { describe, expect, it } from 'vitest'
import {
  createSurface,
  createSurfacePointSampler,
  createSurfaceSampler,
  normalizeEquation,
  type SurfaceSettings,
} from './surface'

function settings(overrides: Partial<SurfaceSettings> = {}): SurfaceSettings {
  return {
    x: { min: -1, max: 1 },
    y: { min: -1, max: 1 },
    resolution: 8,
    ...overrides,
  }
}

describe('normalizeEquation', () => {
  it('accepts an expression with or without z =', () => {
    expect(normalizeEquation('sin(x) + y^2')).toBe('sin(x) + y^2')
    expect(normalizeEquation('  z = sin(x) + y^2  ')).toBe('sin(x) + y^2')
    expect(normalizeEquation('  y = sin(x)  ', 'y')).toBe('sin(x)')
  })

  it('rejects empty equations and assignments', () => {
    expect(() => normalizeEquation('   ')).toThrow('Enter an equation for z')
    expect(() => normalizeEquation('x = 2')).toThrow('Assignments are not supported')
  })
})

describe('createSurfaceSampler', () => {
  it('evaluates expressions with a time context', () => {
    const sample = createSurfaceSampler('x + 2 * t')
    const surface = sample(settings(), { time: 3 })

    expect(surface.zMin).toBe(5)
    expect(surface.zMax).toBe(7)
  })

  it('wraps moving-window coordinates at domain limits', () => {
    const sample = createSurfaceSampler('x')
    const surface = sample(settings(), { xOffset: 2.5 })

    expect(surface.zMin).toBe(-1)
    expect(surface.zMax).toBe(0.75)
  })
})

describe('createSurfacePointSampler', () => {
  it('evaluates a marker point with time and moving-window context', () => {
    const sample = createSurfacePointSampler('x + 2 * t')

    expect(sample(settings(), 0.5, -0.25, { time: 3 })).toBe(6.5)
    expect(createSurfacePointSampler('x')(settings(), 0.75, 0, { xOffset: 2.5 })).toBeCloseTo(
      -0.75,
    )
  })
})

describe('createSurface', () => {
  it('builds a triangulated grid for z = x + y', () => {
    const surface = createSurface('x + y', settings())

    expect(surface.positions).toHaveLength(8 * 8 * 2 * 3 * 3)
    expect(surface.colors).toHaveLength(surface.positions.length)
    expect(surface.definedSamples).toBe(81)
    expect(surface.totalSamples).toBe(81)
    expect(surface.zMin).toBe(-2)
    expect(surface.zMax).toBe(2)
    expect(surface.skippedCells).toBe(0)
  })

  it('skips cells that contain undefined values', () => {
    const surface = createSurface('1 / (x^2 + y^2)', settings())

    expect(surface.definedSamples).toBeLessThan(surface.totalSamples)
    expect(surface.skippedCells).toBeGreaterThan(0)
    expect(surface.clipped).toBe(true)
  })

  it('reports equations with no real samples', () => {
    expect(() => createSurface('sqrt(-1)', settings())).toThrow(
      'did not produce any real z values',
    )
  })

  it('reports an unknown variable', () => {
    expect(() => createSurface('x + a', settings())).toThrow('Undefined symbol a')
  })

  it('validates domain ranges', () => {
    expect(() =>
      createSurface('x + y', settings({ x: { min: 2, max: 1 } })),
    ).toThrow('X maximum must be greater')
  })
})