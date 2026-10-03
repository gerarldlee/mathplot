import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerMathPlotElements } from './index'

vi.mock('@react-three/fiber', () => ({
  Canvas: () => null,
  useFrame: () => {},
  useThree: () => ({ camera: { position: { set: vi.fn() } } }),
}))

vi.mock('@react-three/drei', () => ({
  Grid: () => null,
  Html: ({ children }: { children?: unknown }) => <div>{children as string}</div>,
  Line: () => null,
  OrbitControls: () => null,
}))

afterEach(() => {
  document.body.innerHTML = ''
})

async function mount(tag: string, content: string) {
  const element = document.createElement(tag)
  element.textContent = content
  document.body.appendChild(element)
  await Promise.resolve()
  return element
}

describe('registerMathPlotElements', () => {
  it('registers all elements and renders a 2d plot from text content', async () => {
    registerMathPlotElements()

    expect(customElements.get('mathplot-plot')).toBeDefined()
    expect(customElements.get('mathplot-2d')).toBeDefined()

    const element = await mount('mathplot-2d', 'y = sin(x)\nx: -6..6')
    const container = element.shadowRoot?.querySelector('.mathplot-web-component')

    expect(container).not.toBeNull()
  })

  it('renders chart CSV through dedicated tags', async () => {
    registerMathPlotElements()
    await mount('mathplot-pie', 'A, 3\nB, 1')

    // Chart rendering happens inside the shadow root's React container.
    expect(document.querySelector('mathplot-pie')).not.toBeNull()
  })

  it('falls back to showing raw text for invalid fences', async () => {
    registerMathPlotElements()
    const element = await mount('mathplot-bar', 'no commas here so no data columns')
    await Promise.resolve()

    expect(element.shadowRoot?.textContent).toContain('no commas here')
  })

  it('is idempotent across calls', () => {
    registerMathPlotElements()
    registerMathPlotElements()

    expect(customElements.get('mathplot-plot')).toBeDefined()
  })
})