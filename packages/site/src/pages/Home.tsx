import { MathPlot, MathPlotCodeFence } from '@mathplot/react'
import type { MathPlotProps } from '@mathplot/react'
import './Home.css'

function FenceExample({
  label,
  source,
  plotProps,
}: {
  label: string
  source: string
  plotProps: MathPlotProps
}) {
  return (
    <figure className="fence-example">
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

const examples: { id: string; label: string; source: string; plotProps: MathPlotProps }[] = [
  {
    id: '2d',
    label: '2D function',
    source: fenced('2d\ny = sin(x) * exp(-x^2/8)\nx: -8..8'),
    plotProps: { code: '2d\ny = sin(x) * exp(-x^2/8)\nx: -8..8' },
  },
  {
    id: 'heatmap',
    label: '2D heatmap',
    source: fenced('heatmap\nsin(x) * cos(y)\nx: -6..6\ny: -6..6'),
    plotProps: { code: 'heatmap\nsin(x) * cos(y)\nx: -6..6\ny: -6..6' },
  },
  {
    id: '3d',
    label: '3D surface',
    source: fenced('3d\nz = sqrt(10^2 - x^2 - y^2)\nx: -8..8\ny: -8..8'),
    plotProps: { code: '3d\nz = sqrt(10^2 - x^2 - y^2)\nx: -8..8\ny: -8..8' },
  },
  {
    id: 'bar',
    label: 'Bar chart',
    source: fenced('bar\nQuarter, Revenue, Costs\nQ1, 120, 60\nQ2, 180, 75\nQ3, 150, 90'),
    plotProps: { code: 'bar\nQuarter, Revenue, Costs\nQ1, 120, 60\nQ2, 180, 75\nQ3, 150, 90' },
  },
  {
    id: 'line',
    label: 'Line chart',
    source: fenced('line\nMonth, Visitors\nJan, 300\nFeb, 420\nMar, 390\nApr, 520'),
    plotProps: { code: 'line\nMonth, Visitors\nJan, 300\nFeb, 420\nMar, 390\nApr, 520' },
  },
  {
    id: 'pie',
    label: 'Pie chart',
    source: fenced('pie\nBrowser share\nChrome, 65\nFirefox, 20\nOther, 15'),
    plotProps: { code: 'pie\nBrowser share\nChrome, 65\nFirefox, 20\nOther, 15' },
  },
  {
    id: 'animated',
    label: 'Animated surface',
    source: fenced('3d\nz = sin(x + t) * cos(y - t)\nx: -6..6\ny: -6..6\nanimate: time\nplay: true'),
    plotProps: {
      code: '3d\nz = sin(x + t) * cos(y - t)\nx: -6..6\ny: -6..6\nanimate: time\nplay: true',
    },
  },
  {
    id: 'compact',
    label: 'Compact one-liner',
    source: '```mathplot 2d y=sin(x) x=-6..6```',
    plotProps: { code: '', infoString: '2d y=sin(x) x=-6..6' },
  },
]

const packages = [
  {
    name: '@mathplot/core',
    install: 'npm i @mathplot/core',
    description:
      'Equation parsing, mathjs-backed evaluation, samplers for surfaces, lines and heatmaps, chart data parsing, and the mathplot fence parser.',
  },
  {
    name: '@mathplot/react',
    install: 'npm i @mathplot/react',
    description:
      'React components: Line2DPlot, Heatmap2DPlot, Surface3DPlot, BarChart, LineChart, PieChart, plus MathPlot and MathPlotCodeFence.',
  },
  {
    name: '@mathplot/markdown',
    install: 'npm i @mathplot/markdown',
    description:
      'Drop-in mountAll(root) that replaces every ```mathplot fence in rendered markdown HTML with a live plot.',
  },
  {
    name: '@mathplot/remark',
    install: 'npm i @mathplot/remark',
    description:
      'remark plugin that turns ```mathplot fences into <MathPlot> JSX nodes for mdx and unified pipelines.',
  },
  {
    name: '@mathplot/web',
    install: 'npm i @mathplot/web',
    description:
      'Framework-agnostic <mathplot-plot> and friends with shadow-DOM rendering and a raw-text fallback.',
  },
]

const quickStart = `import ReactMarkdown from 'react-markdown'
import { MathPlotCodeFence } from '@mathplot/react'
import '@mathplot/react/styles.css'

const markdown = \`
\`\`\`mathplot
bar
Quarter, Revenue, Costs
Q1, 120, 60
Q2, 180, 75
\`\`\`
\`

<ReactMarkdown components={{ code: MathPlotCodeFence }}>
  {markdown}
</ReactMarkdown>`

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-topbar">
        <a className="brand" href="#/" aria-label="mathplot home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <path d="M7 25V8M7 25h19" />
              <path d="m9 22 5-8 4 5 5-9" />
              <path d="M7 19c5-6 10-2 15-8" />
            </svg>
          </span>
          <span>
            <strong>mathplot</strong>
            <small>live plots in markdown</small>
          </span>
        </a>
        <nav className="landing-nav" aria-label="Site">
          <a href="#examples">Examples</a>
          <a href="#packages">Packages</a>
          <a href="#quickstart">Quick start</a>
          <a href="#/docs">Docs</a>
          <a
            href="https://github.com/gerarldlee/mathplot"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a className="landing-cta" href="#/playground">
            Open playground
          </a>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow">Open source · MIT</span>
            <h1 id="hero-title">Plot math directly from markdown.</h1>
            <p>
              Write a <code>mathplot</code> fence and get a live, interactive plot — 2D
              functions, heatmaps, 3D surfaces, and bar/line/pie charts. No images, no
              build-time magic: the same spec powers React components, remark pipelines, web
              components, and plain HTML pages.
            </p>
            <div className="hero-actions">
              <a className="hero-primary" href="#examples">
                See examples
              </a>
              <a className="hero-secondary" href="#/playground">
                Try the playground
              </a>
            </div>
          </div>
          <div className="hero-plot" aria-label="Live example plot">
            <MathPlot
              code={
                '3d\nz = sin(sqrt(x^2 + y^2)) * exp(-0.08 * (x^2 + y^2))\nx: -7..7\ny: -7..7'
              }
            />
          </div>
        </section>

        <section id="examples" className="landing-section" aria-labelledby="examples-title">
          <span className="eyebrow">All of it is just a fence</span>
          <h2 id="examples-title">Six plot types, one grammar</h2>
          <p className="section-lede">
            The first line names the type, <code>key: value</code> lines tune it, and the rest is
            the payload — an equation or inline CSV. Compact one-line fences work too, with
            quoted equations when needed.
          </p>
          <div className="fence-grid">
            {examples.map((example) => (
              <FenceExample
                key={example.id}
                label={example.label}
                source={example.source}
                plotProps={example.plotProps}
              />
            ))}
          </div>
        </section>

        <section id="packages" className="landing-section" aria-labelledby="packages-title">
          <span className="eyebrow">Pick your layer</span>
          <h2 id="packages-title">One core, five packages</h2>
          <p className="section-lede">
            Everything shares <code>@mathplot/core</code> and its <code>MathPlotSpec</code>, so a
            fence written for React renders identically in mdx or a static HTML page.
          </p>
          <div className="package-grid">
            {packages.map((pkg) => (
              <article className="package-card" key={pkg.name}>
                <h3>{pkg.name}</h3>
                <p>{pkg.description}</p>
                <code className="package-install">{pkg.install}</code>
              </article>
            ))}
          </div>
        </section>

        <section id="quickstart" className="landing-section" aria-labelledby="quickstart-title">
          <span className="eyebrow">Three ways in</span>
          <h2 id="quickstart-title">Quick start</h2>
          <div className="quickstart-grid">
            <div className="quickstart-step">
              <h3>React</h3>
              <pre className="fence-source">
                <code>{quickStart}</code>
              </pre>
            </div>
            <div className="quickstart-step">
              <h3>Any rendered HTML</h3>
              <pre className="fence-source">
                <code>{`import { mountAll } from '@mathplot/markdown'
import '@mathplot/markdown/styles-injection'

mountAll(document.body)`}</code>
              </pre>
            </div>
            <div className="quickstart-step">
              <h3>Web components</h3>
              <pre className="fence-source">
                <code>{`import { registerMathPlotElements } from '@mathplot/web'

registerMathPlotElements()

<mathplot-plot>
  2d
  y = sin(x) * cos(3x)
  x: -6..6
</mathplot-plot>`}</code>
              </pre>
            </div>
          </div>
          <div className="fence-example">
            <figcaption>Compact form works everywhere too</figcaption>
            <pre className="fence-source">
              <code>{'```mathplot 2d y=sin(x) x=-6..6```'}</code>
            </pre>
            <div className="fence-result">
              <MathPlotCodeFence className="language-mathplot" meta="2d y=sin(x) x=-6..6">
                {''}
              </MathPlotCodeFence>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>
          <strong>mathplot</strong> — MIT licensed, npm-workspaces monorepo.
        </span>
        <nav aria-label="Footer">
          <a href="#/docs">Docs</a>
          <a href="#/playground">Playground</a>
          <a href="#examples">Examples</a>
          <a href="#packages">Packages</a>
        </nav>
      </footer>
    </div>
  )
}