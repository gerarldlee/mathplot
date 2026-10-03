# @mathplot/remark

remark plugin for [mathplot](https://github.com/gerarldlee/mathplot): turns ```mathplot code
fences into `<MathPlot>` JSX flow elements, so mdx (or any unified pipeline) renders live
plots.

```bash
npm i @mathplot/remark
```

Peer deps: `react`, `react-dom` ^18 || ^19 (for the JSX element the plugin emits when
combined with mdx). Depends on `unist-util-visit`.

## Usage with mdx

```js
import remarkMathPlot from '@mathplot/remark'

const processor = unified().use(remarkPlugins, [remarkMathPlot]) // e.g. in @mdx-js/rollup

// mdx.md:
//   ```mathplot
//   2d
//   y = sin(x)
//   x: -6..6
//   ```
//
// becomes:
//   <MathPlot code={"2d\ny = sin(x)\nx: -6..6"} />
```

Provide the implementation in your mdx scope:

```jsx
import { MathPlot } from '@mathplot/react'
import '@mathplot/react/styles.css'

// mdx components: { MathPlot }
```

## Options

```js
remarkMathPlot({ componentName: 'MathPlot' }) // default
```

All three fence shapes are handled:

- body form — `code` receives the entire fence body
- all-compact — ```mathplot 2d y=sin(x)``` becomes `<MathPlot infoString="2d y=sin(x)" />`
- compact + body — ```mathplot pie``` with CSV below becomes
  `<MathPlot infoString="pie" code="A, 3\nB, 4" />`

Non-mathplot code nodes pass through unchanged.

## License

MIT