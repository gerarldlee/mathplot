# @mathplot/web

Framework-agnostic custom elements for [mathplot](https://github.com/gerarldlee/mathplot):
render live plots anywhere HTML works — plain pages, WordPress, docs sites, or frameworks
that ignore custom elements.

```bash
npm i @mathplot/web
```

Peer deps: `react`, `react-dom` ^18 || ^19 (used internally for rendering).

## Usage

```js
import { registerMathPlotElements } from '@mathplot/web'
import '@mathplot/web/styles'

registerMathPlotElements() // idempotent
```

Then write fences as element content:

```html
<mathplot-plot>
  2d
  y = sin(x) * cos(3x)
  x: -6..6
</mathplot-plot>

<mathplot-bar>
  Quarter, Revenue, Costs
  Q1, 120, 60
  Q2, 180, 75
</mathplot-bar>
```

Type-specific tags: `mathplot-2d`, `mathplot-heatmap`, `mathplot-3d`, `mathplot-bar`,
`mathplot-line`, `mathplot-pie` — content is the payload (equation, or chart CSV).
`mathplot-plot` is the general tag: either body form (first line = type) or, if the first
word is `mathplot`, a compact info string followed by the payload:

```html
<mathplot-plot>2d y=sin(x) x=-6..6</mathplot-plot>
```

## Behavior

- Renders into a shadow root so host-page CSS cannot break the plot.
- Synchronous validation at connect time: invalid fences render the raw source instead of a
  broken plot, so failures stay readable.
- `disconnectedCallback` unmounts cleanly; re-connecting re-renders.
- `registerMathPlotElements(tags?)` registers a subset; every call is idempotent, and the
  tag list is fixed to the seven names above.

## License

MIT