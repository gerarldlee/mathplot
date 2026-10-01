import { parseMathPlotFence } from '@mathplot/core'
import { MathPlot } from '@mathplot/react'
import { createRoot, type Root } from 'react-dom/client'
import './web-styles'

const ELEMENT_TAGS = [
  'mathplot-plot',
  'mathplot-2d',
  'mathplot-heatmap',
  'mathplot-3d',
  'mathplot-bar',
  'mathplot-line',
  'mathplot-pie',
] as const

type MathPlotTag = (typeof ELEMENT_TAGS)[number]

const TYPE_PREFIX: Partial<Record<MathPlotTag, string>> = {
  'mathplot-2d': '2d',
  'mathplot-heatmap': 'heatmap',
  'mathplot-3d': '3d',
}

const CHART_TAGS: Partial<Record<MathPlotTag, true>> = {
  'mathplot-bar': true,
  'mathplot-line': true,
  'mathplot-pie': true,
}

/** Keeps react-dom out of consumers who never import the elements. */
const registeredTags = new Set<MathPlotTag>()

interface MathPlotElement extends HTMLElement {
  __mathplotRoot?: Root
}

function renderIntoElement(element: MathPlotElement) {
  const shadow = element.shadowRoot ?? element.attachShadow({ mode: 'open' })
  const container = element.ownerDocument.createElement('div')
  container.className = 'mathplot-web-component'
  shadow.textContent = ''
  shadow.appendChild(container)

  const source = (element.textContent ?? '').trim()
  const tag = element.tagName.toLowerCase() as MathPlotTag

  try {
    let body = source
    let infoString: string | undefined

    if (tag === 'mathplot-plot') {
      const infoMatch = source.match(/^(\S+)\s*([\s\S]*)$/)

      if (infoMatch && infoMatch[1].toLowerCase() === 'mathplot') {
        const rest = infoMatch[2]
        const newlineIndex = rest.indexOf('\n')

        if (newlineIndex === -1) {
          infoString = rest.trim() || undefined
          body = ''
        } else {
          infoString = rest.slice(0, newlineIndex).trim() || undefined
          body = rest.slice(newlineIndex + 1)
        }
      }
    } else if (CHART_TAGS[tag]) {
      infoString = tag.replace('mathplot-', '')
    } else {
      const prefix = TYPE_PREFIX[tag]

      if (prefix) {
        infoString = prefix
      }
    }

    // Validate synchronously so invalid fences fall back to raw text.
    const spec = parseMathPlotFence(body, infoString)
    const root = createRoot(container)
    root.render(<MathPlot spec={spec} />)
    element.__mathplotRoot = root
  } catch {
    container.textContent = source
  }
}

function defineElement(tag: MathPlotTag, renderer: (element: MathPlotElement) => void) {
  if (registeredTags.has(tag) || customElements.get(tag)) {
    return
  }

  registeredTags.add(tag)

  class MathPlotElementImpl extends HTMLElement implements MathPlotElement {
    __mathplotRoot?: Root

    connectedCallback() {
      renderer(this)
    }

    disconnectedCallback() {
      this.__mathplotRoot?.unmount()
      this.__mathplotRoot = undefined
    }
  }

  customElements.define(tag, MathPlotElementImpl)
}

/**
 * Register all mathplot custom elements. Call once at startup; safe to call
 * repeatedly. With no argument every element is registered.
 */
export function registerMathPlotElements(tags: readonly MathPlotTag[] = ELEMENT_TAGS) {
  for (const tag of tags) {
    defineElement(tag, renderIntoElement)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mathplot-plot': MathPlotElement
    'mathplot-2d': MathPlotElement
    'mathplot-heatmap': MathPlotElement
    'mathplot-3d': MathPlotElement
    'mathplot-bar': MathPlotElement
    'mathplot-line': MathPlotElement
    'mathplot-pie': MathPlotElement
  }
}