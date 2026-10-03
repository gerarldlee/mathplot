# @mathplot/react

React components for [mathplot](https://github.com/gerarldlee/mathplot): interactive 2D function
plots, heatmaps, 3D surfaces, and bar/line/pie charts — plus a react-markdown fence
component.

```bash
npm i @mathplot/react
```

Peer deps: `react` ^18 || ^19, `react-dom` ^18 || ^19. 3D surfaces use `three`,
`@react-three/fiber`, `@react-three/drei` (bundled deps of this package).

## Components

```jsx
import {
  MathPlot,        // render a MathPlotSpec or raw fence source
  Line2DPlot,      // y = f(x)
  Heatmap2DPlot,   // z = f(x, y) color grid
  Surface3DPlot,   // interactive z = f(x, y)
  BarChart,
  LineChart,
  PieChart,
  MathPlotCodeFence, // react-markdown `code` component
} from '@mathplot/react'
import '@mathplot/react/styles.css'
```

## With react-markdown

```jsx
import ReactMarkdown from 'react-markdown'
import { MathPlotCodeFence } from '@mathplot/react'
import '@mathplot/react/styles.css'

<ReactMarkdown components={{ code: MathPlotCodeFence }}>
  {markdown}
</ReactMarkdown>
```

Any ```mathplot fence renders as a live plot; args after the language token
(`mathplot 2d y=sin(x)`) arrive via the `meta` prop and are honored. Other code blocks pass
through untouched.

## Direct rendering

```jsx
// From raw fence contents:
<MathPlot code={'2d\ny = sin(x)\nx: -6..6'} />

// From a compact fence: body + info string
<MathPlot code="" infoString="2d y=sin(x) x=-6..6" />

// From a parsed spec
import { parseMathPlotFence } from '@mathplot/core'
<MathPlot spec={parseMathPlotFence('bar\nA, 3\nB, 4')} />
```

Plotting errors (bad equations, runtime failures) render as an inline `role="alert"` message
instead of crashing your app.

## Component props

`Line2DPlot` / `Heatmap2DPlot` / `Surface3DPlot` take `equation`, `settings`
(`{ x: {min,max}, y: {min,max}, resolution }`), optional `axisLabels`, `marker`, `animation`
(`{ mode: 'time' | 'window', speed, playing }`), `animationResetKey`, and
`onAnimationError`. Charts take `data` (`ChartSeries[]` from `@mathplot/core`) and
`title`.

## License

MIT