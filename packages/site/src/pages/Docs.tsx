import { MathPlot, type MathPlotProps } from '@mathplot/react'
import './Docs.css'

function DocsFence({ label, source, plotProps }: { label: string; source: string; plotProps: MathPlotProps }) {
  return (
    <figure className="docs-example">
      <figcaption>{label}</figcaption>
      <pre className="fence-source">
        <code>{source}</code>
      </pre>
      <div className="fence-result">
        <MathPlot {...plotProps} />
      </div>
    </figure>
  )
}

function fenced(body: string) {
  return `\`\`\`mathplot\n${body}\n\`\`\``
}

export default function Docs() {
  return (
    <div className="docs">
      <header className="docs-topbar">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <path d="M7 25V8M7 25h19" />
              <path d="m9 22 5-8 4 5 5-9" />
              <path d="M7 19c5-6 10-2 15-8" />
            </svg>
          </span>
          <span>
            <strong>mathplot</strong>
            <small>documentation</small>
          </span>
        </a>
        <nav className="landing-nav" aria-label="Docs">
          <a href="#/">Home</a>
          <a href="#fence">Fence</a>
          <a href="#types">Types</a>
          <a href="#options">Options</a>
          <a href="#charts">Charts</a>
          <a href="#api">API</a>
        </nav>
      </header>

      <main className="docs-main">
        <h1>Documentation</h1>
        <p className="docs-lede">
          A <code>mathplot</code> fence turns into a live plot. Both a multi-line body form
          and a one-line compact form are supported; both parse into the same
          <code> MathPlotSpec</code>.
        </p>

        <h2 id="fence">Writing a fence</h2>
        <p>
          Fences use <code>```mathplot</code> as the info string. Everything after that is
          either on the following lines (body form) or on the same line (compact form).
        </p>

        <div className="docs-grid">
          <DocsFence
            label="Body form: type first, then key: value options, then the payload"
            source={fenced('3d\nz = sin(x) * cos(y)\nx: -6..6\ny: -6..6\nanimate: time')}
            plotProps={{ code: '3d\nz = sin(x) * cos(y)\nx: -6..6\ny: -6..6\nanimate: time' }}
          />
          <DocsFence
            label="Compact form: everything on the opener line; quote values with spaces"
            source="```mathplot 2d y=sin(x) x=-6..6 resolution=96```"
            plotProps={{ code: '', infoString: '2d y=sin(x) x=-6..6 resolution=96' }}
          />
        </div>

        <h2 id="types">Plot types</h2>
        <p>Every type accepts aliases, so <code>plot</code>, <code>function2d</code>, and <code>2d</code> are the same thing.</p>
        <table className="docs-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Aliases</th>
              <th>Renders</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>2d</code></td>
              <td><code>function</code>, <code>plot</code>, <code>line2d</code>, <code>2d-function</code>, <code>function2d</code></td>
              <td>y = f(x) line</td>
              <td>equation in <code>x</code> (and <code>t</code> when animating)</td>
            </tr>
            <tr>
              <td><code>heatmap</code></td>
              <td><code>map</code>, <code>heatmap2d</code></td>
              <td>z = f(x, y) color grid</td>
              <td>equation in <code>x</code>, <code>y</code></td>
            </tr>
            <tr>
              <td><code>3d</code></td>
              <td><code>surface</code>, <code>surface3d</code>, <code>function3d</code>, <code>3d-function</code></td>
              <td>interactive z = f(x, y) surface</td>
              <td>equation in <code>x</code>, <code>y</code></td>
            </tr>
            <tr>
              <td><code>bar</code></td>
              <td><code>barchart</code>, <code>bar-chart</code></td>
              <td>grouped bars</td>
              <td>CSV rows</td>
            </tr>
            <tr>
              <td><code>line</code></td>
            <td><code>linechart</code>, <code>line-chart</code></td>
              <td>category line chart</td>
              <td>CSV rows</td>
            </tr>
            <tr>
              <td><code>pie</code></td>
              <td><code>piechart</code>, <code>pie-chart</code></td>
              <td>pie / donut</td>
              <td>CSV rows of label, value</td>
            </tr>
          </tbody>
        </table>

        <h2 id="options">Options</h2>
        <table className="docs-table">
          <thead>
            <tr>
              <th>Option</th>
              <th>Applies to</th>
              <th>Values</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>x: min..max</code></td>
              <td>2d, heatmap, 3d</td>
              <td>numeric range, e.g. <code>x: -6..6</code> (default <code>-6..6</code>)</td>
            </tr>
            <tr>
              <td><code>y: min..max</code></td>
              <td>heatmap, 3d</td>
              <td>numeric range (default <code>-6..6</code>; note: in compact form <code>y=sin(x)</code> is the equation, only a <code>..</code> range counts)</td>
            </tr>
            <tr>
              <td><code>resolution: n</code></td>
              <td>2d, heatmap, 3d</td>
              <td>integer 8–128 (default 64)</td>
            </tr>
            <tr>
              <td><code>animate: time | window</code></td>
            <td>2d, heatmap, 3d</td>
              <td><code>time</code> exposes the <code>t</code> variable; <code>window</code> slides the sample window</td>
            </tr>
            <tr>
              <td><code>speed: n</code></td>
              <td>animated plots</td>
              <td>positive multiplier (default 1)</td>
            </tr>
            <tr>
              <td><code>play: true | false</code></td>
              <td>animated plots</td>
              <td>start playing immediately (requires <code>animate</code>; default true when <code>animate</code> is given)</td>
            </tr>
            <tr>
              <td><code>title: text</code></td>
              <td>all</td>
              <td>display title (charts also infer it from the CSV above the data)</td>
            </tr>
          </tbody>
        </table>

        <div className="docs-grid">
          <DocsFence
            label="Animate with t"
            source={fenced('2d\ny = sin(x + t)\nanimate: time\nplay: true\nspeed: 2')}
            plotProps={{ code: '2d\ny = sin(x + t)\nanimate: time\nplay: true\nspeed: 2' }}
          />
          <DocsFence
            label="Moving-window heatmap"
            source={fenced('heatmap\ncos(x * 0.5 + t) * sin(y)\nanimate: window\ny: -4..4')}
            plotProps={{ code: 'heatmap\ncos(x * 0.5 + t) * sin(y)\nanimate: window\ny: -4..4' }}
          />
        </div>

        <h2 id="charts">Charts from CSV</h2>
        <p>
          Bar and line charts take rows of <code>label, series1, series2, …</code>. A leading
          all-text row is treated as the header naming the series. A single comma-less first
          line becomes the title (charts only; <code>title:</code> always wins).
        </p>
        <div className="docs-grid">
          <DocsFence
            label="Grouped bar chart with header row"
            source={fenced('bar\nQuarter, Revenue, Costs\nQ1, 120, 60\nQ2, 180, 75\nQ3, 150, 90')}
            plotProps={{ code: 'bar\nQuarter, Revenue, Costs\nQ1, 120, 60\nQ2, 180, 75\nQ3, 150, 90' }}
          />
          <DocsFence
            label="Line chart, no header (series auto-named)"
            source={fenced('line\nJan, 300\nFeb, 420\nMar, 390\nApr, 520')}
            plotProps={{ code: 'line\nJan, 300\nFeb, 420\nMar, 390\nApr, 520' }}
          />
          <DocsFence
            label="Pie with title line"
            source={fenced('pie\nBrowser share\nChrome, 65\nFirefox, 20\nOther, 15')}
            plotProps={{ code: 'pie\nBrowser share\nChrome, 65\nFirefox, 20\nOther, 15' }}
          />
          <DocsFence
            label="Quoted CSV cells and # comments"
            source={fenced('bar\n# monthly figures\nRegion, Sales\n"North, Inc", 210\nSouth, 160')}
            plotProps={{ code: 'bar\n# monthly figures\nRegion, Sales\n"North, Inc", 210\nSouth, 160' }}
          />
        </div>

        <h2 id="api">Using the packages in code</h2>
        <h3>React</h3>
        <pre className="fence-source">
          <code>{`import { MathPlot, Line2DPlot, Surface3DPlot, BarChart } from '@mathplot/react'
import '@mathplot/react/styles.css'

<MathPlot code={'bar\nA, 3\nB, 4'} />
// or spec-driven:
<BarChart title="Demo" data={{ labels: ['A', 'B'], series: [{ name: 'v', values: [3, 4] }] }} />`}</code>
        </pre>
        <p>
          Plot components accept <code>marker</code>, <code>animation</code>,{' '}
          <code>axisLabels</code> and <code>onAnimationError</code>; <code>Surface3DPlot</code>{' '}
          additionally takes <code>showEquation</code>, <code>initialSurface</code> and{' '}
          <code>resetKey</code>. Plotting failures render as an inline alert rather than
          crashing your app (error boundary in <code>&lt;MathPlot&gt;</code>).
        </p>

        <h3>markdown / HTML</h3>
        <pre className="fence-source">
          <code>{`import { mountAll } from '@mathplot/markdown'
import '@mathplot/markdown/styles-injection'

const result = mountAll(document.body)
// result.mounted, result.dispose()`}</code>
        </pre>

        <h3>remark / mdx</h3>
        <pre className="fence-source">
          <code>{`import remarkMathPlot from '@mathplot/remark-mathplot'

// in your unified pipeline: .use(remarkMathPlot)
// mathplot fences become <MathPlot code={…} infoString={…} /> JSX`}</code>
        </pre>

        <h3>Custom elements</h3>
        <pre className="fence-source">
          <code>{`import { registerMathPlotElements } from '@mathplot/web-components'
import '@mathplot/web-components/styles'`}</code>
        </pre>
        <pre className="fence-source">
          <code>{`<mathplot-plot>2d y=sin(x) x=-6..6</mathplot-plot>

<mathplot-bar>
  Quarter, Revenue, Costs
  Q1, 120, 60
  Q2, 180, 75
</mathplot-bar>`}</code>
        </pre>

        <h3>Headless core</h3>
        <pre className="fence-source">
          <code>{`import { parseMathPlotFence, createLine } from '@mathplot/core'

const spec = parseMathPlotFence('2d y=sin(x) x=-6..6')
const data = createLine('sin(x)', { x: { min: -6, max: 6 }, y: { min: -6, max: 6 }, resolution: 64 })`}</code>
        </pre>
      </main>
    </div>
  )
}