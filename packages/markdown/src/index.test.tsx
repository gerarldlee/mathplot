import '@testing-library/jest-dom/vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { mountAll } from './index'

vi.mock('@react-three/fiber', () => ({
  Canvas: () => null,
  useFrame: () => {},
  useThree: () => ({ camera: { position: { set: vi.fn() } } }),
}))

vi.mock('@react-three/drei', () => ({
  Grid: () => null,
  Html: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  OrbitControls: () => null,
}))

function buildDocument(html: string) {
  document.body.innerHTML = `<div id="content">${html}</div>`
  return document.getElementById('content') as HTMLElement
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('mountAll', () => {
  it('replaces mathplot fences with live plots', async () => {
    const root = buildDocument(
      '<pre><code class="language-mathplot">2d\ny = sin(x)\nx: -6..6</code></pre>',
    )
    const result = mountAll(root)

    expect(result.mounted).toBe(1)

    await waitFor(() => {
      expect(screen.getByLabelText('Interactive two-dimensional line graph')).toBeInTheDocument()
    })

    expect(document.querySelector('.mathplot-mount')).not.toBeNull()
    result.dispose()
    expect(document.querySelector('.mathplot-mount')).toBeNull()
  })

  it('mounts chart fences from CSV bodies', async () => {
    const root = buildDocument(
      '<pre><code class="language-mathplot">pie\nA, 3\nB, 1</code></pre>',
    )

    mountAll(root)

    await waitFor(() => {
      expect(screen.getByLabelText('Pie chart')).toBeInTheDocument()
    })
  })

  it('handles compact info strings', async () => {
    const root = buildDocument(
      '<pre><code class="language-mathplot">mathplot 2d y=cos(x) x=-4..4</code></pre>',
    )
    const result = mountAll(root)

    expect(result.mounted).toBe(1)

    await waitFor(() => {
      expect(screen.getByLabelText('Interactive two-dimensional line graph')).toBeInTheDocument()
    })
  })

  it('leaves invalid fences untouched and skips already-mounted blocks', () => {
    const root = buildDocument(
      '<pre><code class="language-mathplot">nonsense here</code></pre>',
    )
    const result = mountAll(root)

    expect(result.mounted).toBe(0)
    expect(document.querySelector('code.language-mathplot')).not.toBeNull()
  })

  it('does not mount regular code blocks', () => {
    const root = buildDocument('<pre><code class="language-js">const a = 1</code></pre>')
    const result = mountAll(root)

    expect(result.mounted).toBe(0)
    expect(document.querySelector('code')).not.toBeNull()
  })
})