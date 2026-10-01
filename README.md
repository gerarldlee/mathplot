# mathplot

Live, interactive math plots from a markdown fence. Write a ```mathplot code block and get a
plot — a 2D function line, a heatmap, a 3D surface, or a bar/line/pie chart — rendered by the
integration layer of your choice.

````markdown
```mathplot
2d
y = sin(x) * exp(-x^2/8)
x: -8..8
```
````

The repo is an npm-workspaces monorepo:

| Package | npm name | Purpose |
| --- | --- | --- |
| [`packages/core`](packages/core) | `@mathplot/core` | Equation evaluation (mathjs), samplers, chart CSV parsing, fence parser |
| [`packages/react`](packages/react) | `@mathplot/react` | React components for every plot type + `MathPlotCodeFence` for react-markdown |
| [`packages/markdown`](packages/markdown) | `@mathplot/markdown` | `mountAll(root)` — mount live plots onto rendered mathplot fences in any HTML |
| [`packages/remark-mathplot`](packages/remark-mathplot) | `@mathplot/remark-mathplot` | remark plugin → `<MathPlot>` JSX for mdx/unified pipelines |
| [`packages/web-components`](packages/web-components) | `@mathplot/web-components` | `mathplot-plot` custom elements with shadow DOM |
| [`packages/site`](packages/site) | `@mathplot/site` (private) | Landing page + PlotEq playground (this repo's docs site) |

## Packages

### @mathplot/react

```jsx
import ReactMarkdown from 'react-markdown'
import { MathPlotCodeFence } from '@mathplot/react'
import '@mathplot/react/styles.css'

<ReactMarkdown components={{ code: MathPlotCodeFence }}>{markdown}</ReactMarkdown>
```

Or render a spec directly:

```jsx
import { MathPlot } from '@mathplot/react'

<MathPlot code={'2d\ny = sin(x)\nx: -6..6'} />
```

### @minimal-integration

Every integration path returns/renders the same `MathPlotSpec` from `@mathplot/core`:

- `@mathplot/markdown` — `mountAll(document.body)` after your markdown renders to HTML.
- `@mathplot/remark-mathplot` — add the plugin to your remark pipeline; mathplot code nodes
  become `<MathPlot>` JSX elements (mdx v2+).
- `@mathplot/web-components` — `registerMathPlotElements()` then use
  `<mathplot-plot>2d
y = sin(x)
x: -6..6</mathplot-plot>` anywhere.

## Fence syntax

Two forms converge on one spec. **Body form** (type on the first line, `key: value` options,
payload below):

````markdown
```mathplot
3d
z = sin(x + t) * cos(y - t)
x: -6..6
y: -6..6
animate: time
play: true
```
````

**Compact form** (everything on the fence opener; quote values containing spaces):

````markdown
```mathplot 2d y="sin(x) * cos(3x)" x=-6..6 resolution=96```
````

### Types

- `2d` (aliases `function`, `plot`, `line2d`) — y = f(x) line
- `heatmap` (aliases `map`, `heatmap2d`) — z = f(x, y) color grid
- `3d` (aliases `surface`, `surface3d`) — interactive surface
- `bar` / `line` / `pie` — charts from inline CSV

### Options

| Option | Applies to | Example |
| --- | --- | --- |
| `x: min..max` | 2d, heatmap, 3d | `x: -6..6` (inline `x=-6..6`) |
| `y: min..max` | heatmap, 3d | `y: -6..6` — in compact form `y=sin(x)` is the *equation*; only `y=-2..2` (a `..` range) is a range |
| `resolution: n` | 2d, heatmap, 3d | `resolution: 96` (integer 8–128) |
| `animate: time \| window` | 2d, heatmap, 3d | `animate: time` — equation may use `t` |
| `speed: n` | 2d, heatmap, 3d | `speed: 2` (positive number) |
| `play`/`autoplay: bool` | 2d, heatmap, 3d | `play: true` (requires `animate`) |
| `title: text` | all | `title: Quarterly revenue` |

Charts take their data as inline CSV in the body — optional title row, optional header row,
`#` comments. See `packages/core` docs for the exact rules.

## Development

```bash
npm install
npm test        # vitest in every package (core builds first)
npm run build   # build every package
npm run dev     # landing page + playground on one dev server
```

The playground (the classic PlotEq calculator) lives at `#/playground` on the site.

## License

MIT