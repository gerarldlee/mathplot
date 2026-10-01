import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  createHeatmap,
  createLine,
  createSurface,
  normalizeEquation,
  type HeatmapData,
  type LineData,
  type SurfaceMarker,
  type SurfaceSettings,
} from '@mathplot/core'
import { Heatmap2DPlot, Line2DPlot, Surface3DPlot } from '@mathplot/react'
import {
  equationTemplates,
  genericAxisLabels,
  getEquationTemplate,
  plotModeDescriptions,
  type AnimationMode,
  type AnimationSettings,
  type AxisLabels,
  type EquationTemplate,
  type PlotMode,
} from './templates'
import './App.css'

interface SurfaceDraft {
  equation: string
  xMin: string
  xMax: string
  yMin: string
  yMax: string
  resolution: string
}

type LineMarker = { x: number }
type PlotMarker = SurfaceMarker | LineMarker

interface PlotStateBase {
  templateId: string
  equation: string
  settings: SurfaceSettings
  axisLabels: AxisLabels
  animation: AnimationSettings
  notice?: string
}

interface SurfacePlotState extends PlotStateBase {
  mode: 'surface3d'
  surface: ReturnType<typeof createSurface>
  marker: SurfaceMarker
}

interface LinePlotState extends PlotStateBase {
  mode: 'line2d'
  line: LineData
  marker: LineMarker
}

interface HeatmapPlotState extends PlotStateBase {
  mode: 'heatmap2d'
  heatmap: HeatmapData
  marker: SurfaceMarker
}

type PlotState = SurfacePlotState | LinePlotState | HeatmapPlotState

const defaultSettings: SurfaceSettings = {
  x: { min: -6, max: 6 },
  y: { min: -6, max: 6 },
  resolution: 64,
}

const defaultDraft: SurfaceDraft = {
  equation: 'sin(x) * cos(y) + 0.2 * x',
  xMin: '-6',
  xMax: '6',
  yMin: '-6',
  yMax: '6',
  resolution: '64',
}

const defaultAnimation: AnimationSettings = {
  mode: 'time',
  speed: 1,
  playing: false,
}

const defaultPlot: SurfacePlotState = {
  mode: 'surface3d',
  templateId: 'custom',
  equation: defaultDraft.equation,
  settings: defaultSettings,
  surface: createSurface(defaultDraft.equation, defaultSettings),
  marker: { x: 0, y: 0 },
  axisLabels: genericAxisLabels,
  animation: defaultAnimation,
}

function canAutoPlay() {
  return (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function' ||
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function templateToDraft(template: EquationTemplate): SurfaceDraft {
  return {
    equation: template.expression,
    xMin: String(template.settings.x.min),
    xMax: String(template.settings.x.max),
    yMin: String(template.settings.y.min),
    yMax: String(template.settings.y.max),
    resolution: String(template.settings.resolution),
  }
}

function getSettings(draft: SurfaceDraft, mode: PlotMode) {
  const xMin = Number(draft.xMin)
  const xMax = Number(draft.xMax)
  const yMin = Number(draft.yMin)
  const yMax = Number(draft.yMax)
  const resolution = Number(draft.resolution)
  const hasGridDomain = mode !== 'line2d'

  if (draft.xMin.trim() === '' || !Number.isFinite(xMin)) {
    throw new Error('Enter a valid X minimum.')
  }

  if (draft.xMax.trim() === '' || !Number.isFinite(xMax)) {
    throw new Error('Enter a valid X maximum.')
  }

  if (hasGridDomain && draft.yMin.trim() === '') {
    throw new Error('Enter a valid Y minimum.')
  }

  if (hasGridDomain && !Number.isFinite(yMin)) {
    throw new Error('Enter a valid Y minimum.')
  }

  if (hasGridDomain && draft.yMax.trim() === '') {
    throw new Error('Enter a valid Y maximum.')
  }

  if (hasGridDomain && !Number.isFinite(yMax)) {
    throw new Error('Enter a valid Y maximum.')
  }

  if (xMax <= xMin) {
    throw new Error('X maximum must be greater than X minimum.')
  }

  if (hasGridDomain && yMax <= yMin) {
    throw new Error('Y maximum must be greater than Y minimum.')
  }

  if (![32, 48, 64, 96].includes(resolution)) {
    throw new Error('Choose a supported resolution.')
  }

  return {
    x: { min: xMin, max: xMax },
    y: {
      min: hasGridDomain ? yMin : -6,
      max: hasGridDomain ? yMax : 6,
    },
    resolution,
  } satisfies SurfaceSettings
}

function getMarkerForSettings(
  settings: SurfaceSettings,
  mode: PlotMode,
  currentMarker?: PlotMarker,
  center = false,
): PlotMarker {
  const centerX = (settings.x.min + settings.x.max) / 2
  const centerY = (settings.y.min + settings.y.max) / 2

  if (mode === 'line2d') {
    return {
      x: center
        ? centerX
        : Math.min(Math.max(currentMarker?.x ?? centerX, settings.x.min), settings.x.max),
    }
  }

  const surfaceMarker = currentMarker && 'y' in currentMarker ? currentMarker : undefined

  return {
    x: center
      ? centerX
      : Math.min(Math.max(surfaceMarker?.x ?? centerX, settings.x.min), settings.x.max),
    y: center
      ? centerY
      : Math.min(Math.max(surfaceMarker?.y ?? centerY, settings.y.min), settings.y.max),
  }
}

const markerSliderStep = 0.1

type DomainAxis = 'x' | 'y'

function MarkerSlider({
  label,
  value,
  range,
  onChange,
}: {
  label: string
  value: number
  range: { min: number; max: number }
  onChange: (value: number) => void
}) {
  const percent = ((value - range.min) / (range.max - range.min)) * 100

  return (
    <div className="range-slider marker-slider" role="group" aria-label={`${label} marker slider`}>
      <span
        className="range-slider-fill"
        style={{ left: '0%', right: `${100 - percent}%` }}
        aria-hidden="true"
      />
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={markerSliderStep}
        value={value}
        aria-label={`${label} position`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

function RangeControl({
  label,
  minId,
  maxId,
  minLabel,
  maxLabel,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  label: string
  minId: string
  maxId: string
  minLabel: string
  maxLabel: string
  minValue: string
  maxValue: string
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
}) {
  return (
    <div className="range-control">
      <span className="field-label">{label}</span>
      <div className="range-inputs">
        <label htmlFor={minId}>
          <span>{minLabel}</span>
          <input
            id={minId}
            type="number"
            inputMode="decimal"
            value={minValue}
            aria-label={`${label} ${minLabel.toLowerCase()}`}
            onChange={(event) => onMinChange(event.target.value)}
          />
        </label>
        <span className="range-dash" aria-hidden="true">
          —
        </span>
        <label htmlFor={maxId}>
          <span>{maxLabel}</span>
          <input
            id={maxId}
            type="number"
            inputMode="decimal"
            value={maxValue}
            aria-label={`${label} ${maxLabel.toLowerCase()}`}
            onChange={(event) => onMaxChange(event.target.value)}
          />
        </label>
      </div>
    </div>
  )
}

function formatDomainValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function PlotRangeControls({
  mode,
  settings,
  marker,
  axisLabels,
  onChange,
}: {
  mode: PlotMode
  settings: SurfaceSettings
  marker: PlotMarker
  axisLabels: AxisLabels
  onChange: (axis: DomainAxis, value: number) => void
}) {
  return (
    <div className="plot-range-controls" role="group" aria-label="Plot marker controls">
      <div className="plot-range-control">
        <div className="plot-range-heading">
          <span>{axisLabels.x} marker</span>
          <output aria-live="polite">
            {formatDomainValue(marker.x)} · [{formatDomainValue(settings.x.min)},{' '}
            {formatDomainValue(settings.x.max)}]
          </output>
        </div>
        <MarkerSlider
          label="X"
          value={marker.x}
          range={settings.x}
          onChange={(value) => onChange('x', value)}
        />
      </div>
      {mode !== 'line2d' && 'y' in marker && (
        <div className="plot-range-control">
          <div className="plot-range-heading">
            <span>{axisLabels.y} marker</span>
            <output aria-live="polite">
              {formatDomainValue(marker.y)} · [{formatDomainValue(settings.y.min)},{' '}
              {formatDomainValue(settings.y.max)}]
            </output>
          </div>
          <MarkerSlider
            label="Y"
            value={marker.y}
            range={settings.y}
            onChange={(value) => onChange('y', value)}
          />
        </div>
      )}
    </div>
  )
}

function AnimationControls({
  mode,
  animation,
  onToggle,
  onModeChange,
  onSpeedChange,
  onReset,
}: {
  mode: PlotMode
  animation: AnimationSettings
  onToggle: () => void
  onModeChange: (mode: AnimationMode) => void
  onSpeedChange: (speed: number) => void
  onReset: () => void
}) {
  const speedId = useId()
  const modeName = useId()
  const actionLabel = animation.playing ? 'Pause animation' : 'Play animation'

  return (
    <div className="animation-control">
      <div className="section-title">
        <span>Animation</span>
        <span className="section-line" />
      </div>
      <div className="animation-actions">
        <button
          type="button"
          className={animation.playing ? 'animation-play active' : 'animation-play'}
          aria-label={actionLabel}
          aria-pressed={animation.playing}
          onClick={onToggle}
        >
          {animation.playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6v12M15 6v12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m8 5 11 7-11 7Z" />
            </svg>
          )}
          <span>{animation.playing ? 'Pause' : 'Play'}</span>
        </button>
        <button
          type="button"
          className="animation-reset"
          aria-label="Reset animation time"
          onClick={onReset}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4v6h6M20 20v-6h-6" />
            <path d="M5.5 15a7 7 0 0 0 11.7 2.6L20 14M4 10l2.8-3.6A7 7 0 0 1 18.5 9" />
          </svg>
          Reset time
        </button>
      </div>
      <fieldset className="animation-modes">
        <legend>Mode</legend>
        <label>
          <input
            type="radio"
            name={modeName}
            checked={animation.mode === 'time'}
            onChange={() => onModeChange('time')}
          />
          <span>
            Time <code>t</code>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name={modeName}
            checked={animation.mode === 'window'}
            onChange={() => onModeChange('window')}
          />
          <span>Moving window</span>
        </label>
      </fieldset>
      <div className="speed-control">
        <label htmlFor={speedId}>
          <span>Speed</span>
          <output htmlFor={speedId}>{animation.speed.toFixed(2)}×</output>
        </label>
        <input
          id={speedId}
          type="range"
          min="0.25"
          max="3"
          step="0.25"
          value={animation.speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
        />
      </div>
      <p className="animation-help">
        {animation.mode === 'time'
          ? 'Time advances t; include t in the equation to create motion.'
          : mode === 'line2d'
            ? 'X sample values advance through the domain and wrap at its limits.'
            : 'X and Y sample values advance through the domain and wrap at its limits.'}
      </p>
    </div>
  )
}

function App() {
  const equationId = useId()
  const plotModeName = useId()
  const templateId = useId()
  const xMinId = useId()
  const xMaxId = useId()
  const yMinId = useId()
  const yMaxId = useId()
  const resolutionId = useId()
  const errorId = useId()
  const [draft, setDraft] = useState<SurfaceDraft>(defaultDraft)
  const [selectedTemplateId, setSelectedTemplateId] = useState('custom')
  const [plot, setPlot] = useState<PlotState>(defaultPlot)
  const [error, setError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [animationResetKey, setAnimationResetKey] = useState(0)
  const plotRef = useRef(plot)
  const selectedTemplate = getEquationTemplate(selectedTemplateId)

  useEffect(() => {
    plotRef.current = plot
  }, [plot])

  const updateDraft = (field: keyof SurfaceDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setSelectedTemplateId('custom')
    setError(null)
  }

  const applyDraft = (
    nextDraft: SurfaceDraft,
    mode: PlotMode,
    template?: EquationTemplate,
  ) => {
    try {
      const equation = normalizeEquation(nextDraft.equation, mode === 'line2d' ? 'y' : 'z')
      const settings = getSettings(nextDraft, mode)
      const currentPlot = plotRef.current
      const nextAnimation = template
        ? {
            mode: template.animation.mode,
            speed: 1,
            playing: template.animation.autoPlay && canAutoPlay(),
          }
        : currentPlot.animation
      const marker = getMarkerForSettings(
        settings,
        mode,
        currentPlot.marker,
        Boolean(template) || mode !== currentPlot.mode,
      )
      const base = {
        templateId: template?.id ?? 'custom',
        equation,
        settings,
        axisLabels: template?.axisLabels ?? genericAxisLabels,
        animation: nextAnimation,
        notice: template?.notice,
      }
      let nextPlot: PlotState

      if (mode === 'line2d') {
        nextPlot = {
          ...base,
          mode,
          line: createLine(equation, settings),
          marker: marker as LineMarker,
        }
      } else if (mode === 'heatmap2d') {
        nextPlot = {
          ...base,
          mode,
          heatmap: createHeatmap(equation, settings),
          marker: marker as SurfaceMarker,
        }
      } else {
        nextPlot = {
          ...base,
          mode,
          surface: createSurface(equation, settings),
          marker: marker as SurfaceMarker,
        }
      }

      plotRef.current = nextPlot
      setPlot(nextPlot)
      setAnimationResetKey((current) => current + 1)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to plot that equation.')
    }
  }

  const updatePlotMarker = (axis: DomainAxis, value: number) => {
    const currentPlot = plotRef.current

    if (currentPlot.mode === 'line2d') {
      if (axis === 'y') {
        return
      }

      const nextPlot: LinePlotState = {
        ...currentPlot,
        marker: {
          x: Math.min(Math.max(value, currentPlot.settings.x.min), currentPlot.settings.x.max),
        },
      }
      plotRef.current = nextPlot
      setPlot(nextPlot)
      return
    }

    const range = currentPlot.settings[axis]
    const nextPlot: PlotState = {
      ...currentPlot,
      marker: {
        ...currentPlot.marker,
        [axis]: Math.min(Math.max(value, range.min), range.max),
      },
    }

    plotRef.current = nextPlot
    setPlot(nextPlot)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    applyDraft(
      draft,
      plotRef.current.mode,
      plotRef.current.mode === 'surface3d' ? getEquationTemplate(selectedTemplateId) : undefined,
    )
  }

  const selectTemplate = (id: string) => {
    if (plotRef.current.mode !== 'surface3d') {
      return
    }

    const template = getEquationTemplate(id)

    if (!template) {
      return
    }

    const nextDraft = templateToDraft(template)
    setSelectedTemplateId(template.id)
    applyDraft(nextDraft, 'surface3d', template)
  }

  const changePlotMode = (mode: PlotMode) => {
    const currentPlot = plotRef.current

    if (mode === currentPlot.mode) {
      return
    }

    const nextDraft: SurfaceDraft = {
      ...draft,
      equation:
        mode === 'line2d'
          ? 'sin(x)'
          : mode === 'heatmap2d'
            ? 'sin(x) * cos(y) + 0.2 * x'
            : defaultDraft.equation,
    }

    setDraft(nextDraft)
    setSelectedTemplateId('custom')
    applyDraft(nextDraft, mode)
  }

  const resetMarker = () => {
    const currentPlot = plotRef.current

    if (currentPlot.mode === 'line2d') {
      const nextPlot: LinePlotState = {
        ...currentPlot,
        marker: {
          x: (currentPlot.settings.x.min + currentPlot.settings.x.max) / 2,
        },
      }
      plotRef.current = nextPlot
      setPlot(nextPlot)
      return
    }

    const nextPlot: PlotState = {
      ...currentPlot,
      marker: {
        x: (currentPlot.settings.x.min + currentPlot.settings.x.max) / 2,
        y: (currentPlot.settings.y.min + currentPlot.settings.y.max) / 2,
      },
    }
    plotRef.current = nextPlot
    setPlot(nextPlot)
  }

  const updateAnimation = (changes: Partial<AnimationSettings>) => {
    setPlot((current) => ({
      ...current,
      animation: { ...current.animation, ...changes },
    }))
  }

  const resetCalculator = () => {
    setDraft(defaultDraft)
    setSelectedTemplateId('custom')
    plotRef.current = defaultPlot
    setPlot(defaultPlot)
    setError(null)
    setResetKey((current) => current + 1)
    setAnimationResetKey((current) => current + 1)
  }

  const handleAnimationError = (message: string) => {
    updateAnimation({ playing: false })
    setError(`Animation paused: ${message}`)
  }

  const resetView = () => {
    if (plotRef.current.mode === 'surface3d') {
      setResetKey((current) => current + 1)
    } else {
      resetMarker()
    }
  }

  const equationPrefix = plot.mode === 'line2d' ? 'y =' : 'z ='
  const plotNoun = plot.mode === 'surface3d' ? 'surface' : plot.mode === 'line2d' ? 'line' : 'heatmap'
  const sampleData =
    plot.mode === 'surface3d'
      ? plot.surface
      : plot.mode === 'line2d'
        ? plot.line
        : plot.heatmap

  return (
    <div className="app-shell">
      <header className="topbar">
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
            <small>2D and 3D function plotter</small>
          </span>
        </a>
        <button className="reset-button" type="button" onClick={resetCalculator}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 4v6h6M20 20v-6h-6" />
            <path d="M5.5 15a7 7 0 0 0 11.7 2.6L20 14M4 10l2.8-3.6A7 7 0 0 1 18.5 9" />
          </svg>
          Reset
        </button>
      </header>

      <main className="workspace" id="top">
        <aside className="controls-panel">
          <div className="panel-heading">
            <span className="eyebrow">Function</span>
            <h1>
              {plot.mode === 'surface3d'
                ? 'Shape a surface'
                : plot.mode === 'line2d'
                  ? 'Draw a function'
                  : 'Map a function'}
            </h1>
            <p>{plotModeDescriptions[plot.mode]}</p>
          </div>

          <fieldset className="plot-mode-field">
            <legend>Plot type</legend>
            <div className="plot-mode-options">
              <label>
                <input
                  type="radio"
                  name={plotModeName}
                  checked={plot.mode === 'surface3d'}
                  onChange={() => changePlotMode('surface3d')}
                />
                <span>3D surface</span>
              </label>
              <label>
                <input
                  type="radio"
                  name={plotModeName}
                  checked={plot.mode === 'line2d'}
                  onChange={() => changePlotMode('line2d')}
                />
                <span>2D line</span>
              </label>
              <label>
                <input
                  type="radio"
                  name={plotModeName}
                  checked={plot.mode === 'heatmap2d'}
                  onChange={() => changePlotMode('heatmap2d')}
                />
                <span>2D heatmap</span>
              </label>
            </div>
          </fieldset>

          <form onSubmit={handleSubmit} noValidate>
            <div className="equation-field">
              <label htmlFor={equationId}>Equation</label>
              <div className="equation-input">
                <span>{plot.mode === 'line2d' ? 'y =' : 'z ='}</span>
                <input
                  id={equationId}
                  type="text"
                  value={draft.equation}
                  onChange={(event) => updateDraft('equation', event.target.value)}
                  aria-describedby={`${errorId} equation-help`}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <p className="field-help" id="equation-help">
                {plot.mode === 'line2d'
                  ? 'Use x, plus t for Time mode.'
                  : 'Use x and y, plus t for Time mode.'}
              </p>
            </div>

            {plot.mode === 'surface3d' ? (
              <div className="template-field">
                <label htmlFor={templateId}>Sample template</label>
                <select
                  id={templateId}
                  value={selectedTemplateId}
                  onChange={(event) => selectTemplate(event.target.value)}
                >
                  <option value="custom">Custom equation</option>
                  {equationTemplates.map((template) => (
                    <option value={template.id} key={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <div className="template-summary" aria-live="polite">
                  <span>{selectedTemplate?.name ?? 'Custom'}</span>
                  <p>
                    {selectedTemplate?.description ??
                      'Your current expression, domain, and axis settings.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="template-field template-field-disabled">
                <span className="field-label">Sample template</span>
                <div className="template-summary">
                  <span>Custom equation</span>
                  <p>Templates are currently available in 3D surface mode.</p>
                </div>
              </div>
            )}

            <div className="control-section">
              <div className="section-title">
                <span>Domain</span>
                <span className="section-line" />
              </div>
              <RangeControl
                label="X range"
                minId={xMinId}
                maxId={xMaxId}
                minLabel="Minimum"
                maxLabel="Maximum"
                minValue={draft.xMin}
                maxValue={draft.xMax}
                onMinChange={(value) => updateDraft('xMin', value)}
                onMaxChange={(value) => updateDraft('xMax', value)}
              />
              {plot.mode !== 'line2d' && (
                <RangeControl
                  label="Y range"
                  minId={yMinId}
                  maxId={yMaxId}
                  minLabel="Minimum"
                  maxLabel="Maximum"
                  minValue={draft.yMin}
                  maxValue={draft.yMax}
                  onMinChange={(value) => updateDraft('yMin', value)}
                  onMaxChange={(value) => updateDraft('yMax', value)}
                />
              )}
            </div>

            <div className="resolution-field">
              <label htmlFor={resolutionId}>
                <span>{plot.mode === 'line2d' ? 'Samples' : 'Resolution'}</span>
                <span className="resolution-value">
                  {Number(draft.resolution)}
                  {plot.mode === 'line2d' ? ' points' : ` × ${Number(draft.resolution)}`}
                </span>
              </label>
              <select
                id={resolutionId}
                value={draft.resolution}
                onChange={(event) => updateDraft('resolution', event.target.value)}
              >
                <option value="32">
                  Fast · {plot.mode === 'line2d' ? '32 points' : '32 × 32'}
                </option>
                <option value="48">
                  Balanced · {plot.mode === 'line2d' ? '48 points' : '48 × 48'}
                </option>
                <option value="64">
                  Detailed · {plot.mode === 'line2d' ? '64 points' : '64 × 64'}
                </option>
                <option value="96">
                  Ultra · {plot.mode === 'line2d' ? '96 points' : '96 × 96'}
                </option>
              </select>
            </div>

            <AnimationControls
              mode={plot.mode}
              animation={plot.animation}
              onToggle={() => updateAnimation({ playing: !plot.animation.playing })}
              onModeChange={(mode) => updateAnimation({ mode })}
              onSpeedChange={(speed) => updateAnimation({ speed })}
              onReset={() => setAnimationResetKey((current) => current + 1)}
            />

            {error && (
              <div className="error-message" id={errorId} role="alert">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 8v5M12 17h.01" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button className="plot-button" type="submit">
              <span>
                {plot.mode === 'surface3d'
                  ? 'Plot surface'
                  : plot.mode === 'line2d'
                    ? 'Plot line'
                    : 'Plot heatmap'}
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M14 7l5 5-5 5" />
              </svg>
            </button>
          </form>

          <div className="syntax-help">
            <span>Supports</span>
            <div>
              {['x', 'y', 't', 'sin', 'cos', 'tan', 'sqrt', 'abs', 'ln', 'log', 'exp', 'π'].map(
                (item) => (
                  <code key={item}>{item}</code>
                ),
              )}
            </div>
          </div>
        </aside>

        <section className="graph-panel" aria-labelledby="current-equation">
          <div className="graph-header">
            <div>
              <div className="graph-kicker">
                <span
                  className={plot.animation.playing ? 'status-dot playing' : 'status-dot'}
                />
                {plot.animation.playing ? `Animating ${plotNoun}` : `${plotNoun[0].toUpperCase()}${plotNoun.slice(1)} ready`}
                {plot.templateId !== 'custom' &&
                  ` · ${getEquationTemplate(plot.templateId)?.name ?? 'Template'}`}
              </div>
              <h2 id="current-equation">
                <span>{equationPrefix}</span> {plot.equation}
              </h2>
            </div>
            <button
              type="button"
              className="view-button"
              onClick={resetView}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 4v6h6M20 20v-6h-6" />
                <path d="M5.5 15a7 7 0 0 0 11.7 2.6L20 14M4 10l2.8-3.6A7 7 0 0 1 18.5 9" />
              </svg>
              {plot.mode === 'surface3d' ? 'Reset view' : 'Reset marker'}
            </button>
          </div>

          <div className="plot-area">
            {plot.mode === 'surface3d' ? (
              <Surface3DPlot
                equation={plot.equation}
                initialSurface={plot.surface}
                settings={plot.settings}
                marker={plot.marker}
                axisLabels={plot.axisLabels}
                animation={plot.animation}
                animationResetKey={animationResetKey}
                resetKey={resetKey}
                onAnimationError={handleAnimationError}
              />
            ) : plot.mode === 'line2d' ? (
              <Line2DPlot
                equation={plot.equation}
                initialData={plot.line}
                settings={plot.settings}
                marker={plot.marker}
                axisLabels={plot.axisLabels}
                animation={plot.animation}
                animationResetKey={animationResetKey}
                onAnimationError={handleAnimationError}
              />
            ) : (
              <Heatmap2DPlot
                equation={plot.equation}
                initialData={plot.heatmap}
                settings={plot.settings}
                marker={plot.marker}
                axisLabels={plot.axisLabels}
                animation={plot.animation}
                animationResetKey={animationResetKey}
                onAnimationError={handleAnimationError}
              />
            )}
            <PlotRangeControls
              mode={plot.mode}
              settings={plot.settings}
              marker={plot.marker}
              axisLabels={plot.axisLabels}
              onChange={updatePlotMarker}
            />
            {plot.notice && <div className="model-notice">{plot.notice}</div>}
            <div className="plot-instructions">
              {plot.mode === 'surface3d' ? (
                <>
                  <span>Drag to rotate</span>
                  <span>Scroll to zoom</span>
                </>
              ) : (
                <span>Use the position handles to inspect values</span>
              )}
            </div>
          </div>

          <footer className="graph-footer">
            <div>
              <span className="metric-label">Domain</span>
              <strong>
                {plot.axisLabels.x} [{plot.settings.x.min}, {plot.settings.x.max}]
                {plot.mode !== 'line2d' &&
                  ` · ${plot.axisLabels.y} [${plot.settings.y.min}, ${plot.settings.y.max}]`}
              </strong>
            </div>
            <div>
              <span className="metric-label">Samples</span>
              <strong>
                {sampleData.definedSamples.toLocaleString()} /{' '}
                {sampleData.totalSamples.toLocaleString()}
              </strong>
            </div>
            <div>
              <span className="metric-label">Animation</span>
              <strong>
                {plot.animation.mode === 'time'
                  ? 'Time t'
                  : plot.mode === 'line2d'
                    ? 'Moving x'
                    : 'Moving x/y'}{' '}
                · {plot.animation.playing ? 'Playing' : 'Paused'}
              </strong>
            </div>
          </footer>
        </section>
      </main>
    </div>
  )
}

export default App