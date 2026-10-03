# @mathplot/core

The engine of [mathplot](https://github.com/gerarldlee/mathplot): parse a ```mathplot fence into
a `MathPlotSpec`, evaluate equations with mathjs, sample functions, and parse chart CSV.

- `parseMathPlotFence(body, infoString?)` — turn fence contents into a `MathPlotSpec`
- `normalizeEquation`, samplers (`createSurfaceSampler`, `createLineSampler`,
  `createHeatmapSampler`, point samplers) and `create*` data builders
- `parseChartCsv` with quote-aware CSV lines for `bar` / `line` / `pie`
- Chart layout helpers (`computeBarLayout`, `computeLineLayout`, `computePieLayout`)
  and the default color palette
- Render-range clipping (`getRenderRange`) and heatmap color ramps

## Usage

```js
import { parseMathPlotFence } from '@mathplot/core'

const spec = parseMathPlotFence(
  '2d\ny = sin(x)\nx: -6..6',
)

// or compact form:
// parseMathPlotFence('', '2d y=sin(x) x=-6..6')

// spec.type === '2d'
// spec.equation === 'y = sin(x)'
// spec.x === { min: -6, max: 6 }
```

Headless sampling:

```js
import { createLine } from '@mathplot/core'

const data = createLine('sin(x)', {
  x: { min: -6, max: 6 },
  y: { min: -6, max: 6 },
  resolution: 64,
})
```

## Fence forms

Body form:

```
2d
y = sin(x) * cos(t)
x: -6..6
animate: time
```

Compact form (info string; quote values containing spaces, `y=…` is the equation unless the
value contains `..`):

```
mathplot 2d y=sin(x) x=-6..6
mathplot bar title="Revenue" Q1,120 Q2,180
```

## License

MIT