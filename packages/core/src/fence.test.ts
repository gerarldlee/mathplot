import { describe, expect, it } from 'vitest'
import { parseMathPlotFence } from './fence'
import type { ChartPlotSpec, FunctionPlotSpec } from './fence'

describe('body form', () => {
  it('parses a minimal 2d fence', () => {
    const spec = parseMathPlotFence('2d\ny = sin(x)')

    expect(spec.type).toBe('2d')
    expect((spec as FunctionPlotSpec).equation).toBe('sin(x)')
    expect((spec as FunctionPlotSpec).x).toEqual({ min: -6, max: 6 })
    expect((spec as FunctionPlotSpec).resolution).toBe(64)
  })

  it('parses options and an optional y = prefix', () => {
    const spec = parseMathPlotFence(
      [
        '2d',
        'y = sin(x) * cos(t)',
        'x: -10..10',
        'resolution: 96',
        'animate: time',
        'speed: 2',
      ].join('\n'),
    ) as FunctionPlotSpec

    expect(spec.equation).toBe('sin(x) * cos(t)')
    expect(spec.x).toEqual({ min: -10, max: 10 })
    expect(spec.resolution).toBe(96)
    expect(spec.animate).toBe('time')
    expect(spec.speed).toBe(2)
    expect(spec.autoplay).toBe(true)
  })

  it('parses a bare expression without y = for 2d', () => {
    const spec = parseMathPlotFence('2d\ncos(x) - x') as FunctionPlotSpec

    expect(spec.equation).toBe('cos(x) - x')
  })

  it('defaults heatmap y range to -6..6 and 3d to -6..6', () => {
    const heatmap = parseMathPlotFence('heatmap\nsin(x) * cos(y)') as FunctionPlotSpec
    const surface = parseMathPlotFence('3d\nx^2 - y^2') as FunctionPlotSpec

    expect(heatmap.type).toBe('heatmap')
    expect(heatmap.y).toEqual({ min: -6, max: 6 })
    expect(surface.type).toBe('3d')
    expect(surface.y).toEqual({ min: -6, max: 6 })
  })

  it('rejects unknown types and empty equations', () => {
    expect(() => parseMathPlotFence('banana\nx')).toThrow('Unknown plot type')
    expect(() => parseMathPlotFence('2d')).toThrow('Add an expression for y')
  })
})

describe('compact info-string form', () => {
  it('parses mathplot 2d y=sin(x) x=-6..6', () => {
    const spec = parseMathPlotFence('', '2d y=sin(x) x=-6..6') as FunctionPlotSpec

    expect(spec.type).toBe('2d')
    expect(spec.equation).toBe('sin(x)')
    expect(spec.x).toEqual({ min: -6, max: 6 })
  })

  it('supports quoted equations with spaces', () => {
    const spec = parseMathPlotFence(
      '',
      '2d y="sin(x) * cos(t)" animate=time',
    ) as FunctionPlotSpec

    expect(spec.equation).toBe('sin(x) * cos(t)')
    expect(spec.animate).toBe('time')
  })

  it('parses 3d with both ranges', () => {
    const spec = parseMathPlotFence(
      '',
      '3d z=x^2-y^2 x=-6..6 y=-3..3 resolution=32',
    ) as FunctionPlotSpec

    expect(spec.type).toBe('3d')
    expect(spec.equation).toBe('x^2-y^2')
    expect(spec.y).toEqual({ min: -3, max: 3 })
    expect(spec.resolution).toBe(32)
  })

  it('takes chart CSV from the body', () => {
    const spec = parseMathPlotFence('Q1, 120\nQ2, 180', 'pie title=Revenue') as ChartPlotSpec

    expect(spec.type).toBe('pie')
    expect(spec.title).toBe('Revenue')
    expect(spec.data.labels).toEqual(['Q1', 'Q2'])
  })

  it('rejects an info string without a type token', () => {
    expect(() => parseMathPlotFence('', 'x=-6..6')).toThrow('must include a type')
  })

  it('falls back to the body form when the info string has no type', () => {
    const spec = parseMathPlotFence('2d\nsin(x)', '') as FunctionPlotSpec

    expect(spec.equation).toBe('sin(x)')
  })
})

describe('chart body form', () => {
  it('parses a bar chart with title line and header row', () => {
    const spec = parseMathPlotFence(
      ['bar', 'Revenue by quarter', 'Q1, Sales, Costs', 'Q1, 120, 60', 'Q2, 180, 75'].join('\n'),
    ) as ChartPlotSpec

    expect(spec.type).toBe('bar')
    expect(spec.title).toBe('Revenue by quarter')
    expect(spec.data.series[0].name).toBe('Sales')
    expect(spec.data.labels).toEqual(['Q1', 'Q2'])
  })

  it('uses a title option instead of a title line', () => {
    const spec = parseMathPlotFence(
      ['pie', 'title: Market share', 'A, 3', 'B, 1'].join('\n'),
    ) as ChartPlotSpec

    expect(spec.title).toBe('Market share')
    expect(spec.data.labels).toEqual(['A', 'B'])
  })

  it('rejects charts without data rows', () => {
    expect(() => parseMathPlotFence('bar')).toThrow('Add CSV rows')
  })
})

describe('option validation', () => {
  it('rejects malformed ranges and resolutions', () => {
    expect(() => parseMathPlotFence('2d\nsin(x)\nx: banana')).toThrow('range like `-6..6`')
    expect(() => parseMathPlotFence('2d\nsin(x)\nx: 5..1')).toThrow('increasing')
    expect(() => parseMathPlotFence('2d\nsin(x)\nresolution: 4')).toThrow('between 8 and 128')
  })

  it('rejects animate values and stray play', () => {
    expect(() => parseMathPlotFence('2d\nsin(x)\nanimate: spin')).toThrow(
      '`animate` must be `time` or `window`',
    )
    expect(() => parseMathPlotFence('2d\nsin(x)\nplay: true')).toThrow(
      '`play` requires',
    )
  })

  it('accepts play: false to keep animation paused', () => {
    const spec = parseMathPlotFence(
      '2d\nsin(x + t)\nanimate: time\nplay: false',
    ) as FunctionPlotSpec

    expect(spec.animate).toBe('time')
    expect(spec.autoplay).toBe(false)
  })

  it('rejects an empty fence', () => {
    expect(() => parseMathPlotFence('   ')).toThrow('first line must be the plot type')
  })
})