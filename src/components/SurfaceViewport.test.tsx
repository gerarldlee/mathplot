import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import SurfaceViewport from './SurfaceViewport'
import { createSurface, type SurfaceSettings } from '../lib/surface'
import { updateSurfaceGeometry } from '../lib/surfaceGeometry'

const camera = vi.hoisted(() => ({
  position: { set: vi.fn() },
  lookAt: vi.fn(),
  updateProjectionMatrix: vi.fn(),
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: () => null,
  useFrame: () => {},
  useThree: () => ({ camera }),
}))

vi.mock('@react-three/drei', () => ({
  Grid: () => null,
  Html: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  OrbitControls: () => null,
}))

const settings: SurfaceSettings = {
  x: { min: -1, max: 1 },
  y: { min: -1, max: 1 },
  resolution: 8,
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SurfaceViewport', () => {
  it('updates surface data after a sample interval', async () => {
    let frameCallback: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameCallback = callback
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const initialSurface = createSurface('t', settings)
    render(
      <SurfaceViewport
        equation="t"
        initialSurface={initialSurface}
        settings={settings}
        marker={{ x: 0, y: 0 }}
        axisLabels={{ x: 'x', y: 'y', z: 'z' }}
        animation={{ mode: 'time', speed: 1, playing: true }}
        animationResetKey={0}
        resetKey={0}
        onAnimationError={vi.fn()}
      />,
    )

    const initialLegend = screen.getByLabelText('z color legend').textContent

    await act(async () => {
      frameCallback?.(performance.now() + 50)
    })

    expect(screen.getByLabelText('z color legend').textContent).not.toBe(initialLegend)
  })

  it('updates an existing geometry buffer in place', () => {
    const initialSurface = createSurface('0', settings)
    const nextSurface = createSurface('1', settings)
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(initialSurface.positions, 3),
    )
    geometry.setAttribute('color', new Float32BufferAttribute(initialSurface.colors, 3))

    const position = geometry.getAttribute('position')
    const color = geometry.getAttribute('color')
    updateSurfaceGeometry(geometry, nextSurface)

    expect(geometry.getAttribute('position')).toBe(position)
    expect(geometry.getAttribute('color')).toBe(color)
    expect(position.array[1]).toBe(nextSurface.positions[1])
    expect(color.array[0]).toBe(nextSurface.colors[0])
  })
})
