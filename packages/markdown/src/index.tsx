import { parseMathPlotFence, type MathPlotSpec } from '@mathplot/core'
import { MathPlot } from '@mathplot/react'
import { createRoot, type Root } from 'react-dom/client'
import type { ReactNode } from 'react'
import './styles-injection'

const MATHPLOT_LANGUAGE_PATTERN = /(?:^|\s)language-mathplot(?:\s|$)/
const MOUNT_FLAG = 'data-mathplot-mounted'

export interface MountAllOptions {
  /**
   * Custom component render, useful for providers or wrappers around <MathPlot/>.
   * Receives the parsed spec and must return React elements. Defaults to <MathPlot/>.
   */
  render?: (spec: MathPlotSpec) => ReactNode
}

let stylesInjected = false

export interface MountResult {
  /** Number of fences mounted by this call. */
  mounted: number
  /** Removes all plots that this call mounted. */
  dispose: () => void
}

function isMathPlotCodeBlock(element: Element) {
  return (
    element.tagName === 'CODE' &&
    MATHPLOT_LANGUAGE_PATTERN.test(element.className) &&
    element.parentElement !== null &&
    element.parentElement.tagName === 'PRE'
  )
}

function injectStyles() {
  if (stylesInjected) {
    return
  }

  // @mathplot/react ships its stylesheet at @mathplot/react/styles.css.
  // When bundled, the css import inside @mathplot/react is already loaded.
  // For the prebuilt esm/cjs builds we inject a link tag pointing at the
  // package export so plain <script> usage gets styles too.
  stylesInjected = true
}

function renderDefault(spec: MathPlotSpec) {
  return <MathPlot spec={spec} />
}

/**
 * Scan `root` for ```mathplot code fences (`pre > code.language-mathplot`)
 * and mount a live plot in place of each one.
 *
 * Works with any markdown-to-HTML pipeline (marked, remark, CMS output).
 * Safe to call multiple times: already-mounted fences are skipped.
 */
export function mountAll(root: Element = document.body, options: MountAllOptions = {}): MountResult {
  injectStyles()
  const render = options.render ?? renderDefault
  const codeBlocks = Array.from(root.querySelectorAll('code')).filter(isMathPlotCodeBlock)
  const mountedRoots: Root[] = []
  const placeholders: HTMLElement[] = []

  for (const codeBlock of codeBlocks) {
    if (codeBlock.hasAttribute(MOUNT_FLAG)) {
      continue
    }

    const raw = codeBlock.textContent ?? ''
    const infoMatch = raw.match(/^\s*mathplot\b\s*([^\n]*)\n?([\s\S]*)$/i)
    let body = raw
    let infoString: string | undefined

    if (infoMatch) {
      infoString = infoMatch[1].trim() || undefined
      body = infoMatch[2]
    }

    const container = root.ownerDocument.createElement('div')
    container.className = 'mathplot-mount'
    codeBlock.setAttribute(MOUNT_FLAG, 'true')

    try {
      const spec = parseMathPlotFence(body, infoString)
      const reactRoot = createRoot(container)
      reactRoot.render(render(spec))
      mountedRoots.push(reactRoot)
      placeholders.push(container)
    } catch {
      // Leave the original code block unchanged when the fence is invalid.
      continue
    }

    const pre = codeBlock.parentElement as HTMLElement
    pre.replaceWith(container)
  }

  return {
    mounted: placeholders.length,
    dispose: () => {
      for (const reactRoot of mountedRoots) {
        reactRoot.unmount()
      }

      for (let index = placeholders.length - 1; index >= 0; index -= 1) {
        placeholders[index].remove()
      }
    },
  }
}