import { Grid, Html, Line, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { ACESFilmicToneMapping, DoubleSide, type Mesh } from 'three'
import {
  createSurfacePointSampler,
  createSurfaceSampler,
  type AxisRange,
  type SurfaceData,
  type SurfaceMarker,
  type SurfaceSettings,
} from '@mathplot/core'
import { createSurfaceGeometry, updateSurfaceGeometry } from './surfaceGeometry'
import type { AnimationMode, AxisLabels } from './types'

export interface Surface3DPlotProps {
  equation: string
  settings: SurfaceSettings
  axisLabels?: AxisLabels
  initialSurface?: SurfaceData
  marker?: SurfaceMarker
  animation?: {
    mode: AnimationMode
    speed: number
    playing: boolean
  }
  animationResetKey?: number
  resetKey?: number
  onAnimationError?: (message: string) => void
}

interface ViewBounds {
  cameraPosition: [number, number, number]
  target: [number, number, number]
  distance: number
  xCenter: number
  yCenter: number
  zMin: number
  zMax: number
}

function getViewBounds(
  surface: SurfaceData,
  xRange: AxisRange,
  yRange: AxisRange,
): ViewBounds {
  const zFloor = Math.min(0, surface.renderZMin)
  const zCeiling = Math.max(0, surface.renderZMax)
  const zPadding = Math.max((zCeiling - zFloor) * 0.08, 0.5)
  const zMin = zFloor - zPadding
  const zMax = zCeiling + zPadding
  const xCenter = (xRange.min + xRange.max) / 2
  const yCenter = (yRange.min + yRange.max) / 2
  const zCenter = (zMin + zMax) / 2
  const maxDimension = Math.max(
    xRange.max - xRange.min,
    yRange.max - yRange.min,
    zMax - zMin,
    2,
  )
  const distance = maxDimension * 1.65

  return {
    cameraPosition: [
      xCenter + distance * 0.82,
      zCenter + distance * 0.68,
      yCenter + distance * 0.92,
    ],
    target: [xCenter, zCenter, yCenter],
    distance,
    xCenter,
    yCenter,
    zMin,
    zMax,
  }
}

function getGridStep(span: number) {
  const roughStep = span / 10
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const normalized = roughStep / magnitude

  if (normalized > 5) return 10 * magnitude
  if (normalized > 2) return 5 * magnitude
  return 2 * magnitude
}

function CameraController({ bounds, resetKey }: { bounds: ViewBounds; resetKey: number }) {
  const { camera } = useThree()
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const boundsRef = useRef(bounds)

  useEffect(() => {
    boundsRef.current = bounds
  }, [bounds])

  useEffect(() => {
    const nextBounds = boundsRef.current
    camera.position.set(...nextBounds.cameraPosition)
    camera.lookAt(...nextBounds.target)
    camera.updateProjectionMatrix()

    if (controls.current) {
      controls.current.target.set(...nextBounds.target)
      controls.current.update()
    }
  }, [camera, resetKey])

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      minDistance={bounds.distance * 0.2}
      maxDistance={bounds.distance * 5}
      maxPolarAngle={Math.PI * 0.92}
      target={bounds.target}
    />
  )
}

function CoordinateAxes({
  bounds,
  axisLabels,
}: {
  bounds: ViewBounds
  axisLabels: AxisLabels
}) {
  const labelPadding = Math.max(bounds.distance * 0.045, 0.2)
  const arrowSize = Math.max(bounds.distance * 0.018, 0.08)
  const xEnd: [number, number, number] = [bounds.distance, 0, 0]
  const yEnd: [number, number, number] = [0, 0, bounds.distance]
  const zEnd: [number, number, number] = [0, bounds.distance, 0]

  return (
    <group>
      <Line
        points={[
          [-bounds.distance, 0, 0],
          [bounds.distance, 0, 0],
        ]}
        color="#fb7185"
        lineWidth={1.5}
      />
      <Line
        points={[
          [0, 0, -bounds.distance],
          [0, 0, bounds.distance],
        ]}
        color="#38bdf8"
        lineWidth={1.5}
      />
      <Line
        points={[
          [0, bounds.zMin, 0],
          [0, bounds.zMax, 0],
        ]}
        color="#facc15"
        lineWidth={1.5}
      />
      <mesh position={xEnd} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[arrowSize, arrowSize * 2.4, 12]} />
        <meshBasicMaterial color="#fb7185" />
      </mesh>
      <mesh position={yEnd} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[arrowSize, arrowSize * 2.4, 12]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      <mesh position={zEnd}>
        <coneGeometry args={[arrowSize, arrowSize * 2.4, 12]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>
      <Html
        center
        position={[bounds.distance + labelPadding, 0, 0]}
        className="axis-label axis-label-x"
      >
        {axisLabels.x}
      </Html>
      <Html
        center
        position={[0, 0, bounds.distance + labelPadding]}
        className="axis-label axis-label-y"
      >
        {axisLabels.y}
      </Html>
      <Html
        center
        position={[0, bounds.zMax + labelPadding, 0]}
        className="axis-label axis-label-z"
      >
        {axisLabels.z}
      </Html>
    </group>
  )
}

interface SurfaceMarkerProps {
  equation: string
  settings: SurfaceSettings
  marker: SurfaceMarker
  surface: SurfaceData
  animation: Surface3DPlotProps['animation']
  timeRef: { current: number }
  size: number
}

function SurfaceMarker({
  equation,
  settings,
  marker,
  surface,
  animation,
  timeRef,
  size,
}: SurfaceMarkerProps) {
  const meshRef = useRef<Mesh>(null)
  const pointSampler = useMemo(() => createSurfacePointSampler(equation), [equation])

  useFrame(() => {
    const mesh = meshRef.current

    if (!mesh) {
      return
    }

    const time = animation?.playing ? timeRef.current : 0
    const context =
      animation?.playing && animation.mode === 'window'
        ? { time, xOffset: time * 0.8, yOffset: -time * 0.55 }
        : { time }
    const rawZ = pointSampler(settings, marker.x, marker.y, context)

    if (rawZ === null) {
      mesh.visible = false
      return
    }

    const z = Math.max(surface.renderZMin, Math.min(surface.renderZMax, rawZ))
    mesh.position.set(marker.x, z, marker.y)
    mesh.visible = true
  })

  return (
    <mesh
      ref={meshRef}
      position={[marker.x, surface.renderZMin, marker.y]}
      renderOrder={10}
    >
      <sphereGeometry args={[size, 20, 20]} />
      <meshBasicMaterial color="#fde047" depthTest={false} toneMapped={false} />
    </mesh>
  )
}

interface SurfaceSceneProps {
  surface: SurfaceData
  initialSurface: SurfaceData
  settings: SurfaceSettings
  marker: SurfaceMarker
  equation: string
  axisLabels: AxisLabels
  animation: Surface3DPlotProps['animation']
  timeRef: { current: number }
  resetKey: number
}

function SurfaceScene({
  surface,
  initialSurface,
  settings,
  marker,
  equation,
  axisLabels,
  animation,
  timeRef,
  resetKey,
}: SurfaceSceneProps) {
  const invalidate = useThree((state) => state.invalidate)
  const bounds = useMemo(
    () => getViewBounds(initialSurface, settings.x, settings.y),
    [initialSurface, settings.x, settings.y],
  )
  const [geometry] = useState(() => createSurfaceGeometry(surface))

  useEffect(() => {
    updateSurfaceGeometry(geometry, surface)
    invalidate()
  }, [geometry, invalidate, surface])

  useEffect(() => () => geometry.dispose(), [geometry])

  const xSpan = settings.x.max - settings.x.min
  const ySpan = settings.y.max - settings.y.min
  const gridStep = getGridStep(Math.max(xSpan, ySpan))

  return (
    <>
      <color attach="background" args={['#090c16']} />
      <fog attach="fog" args={['#090c16', bounds.distance * 2, bounds.distance * 5]} />
      <ambientLight intensity={0.75} />
      <directionalLight
        color="#ffffff"
        intensity={2.2}
        position={[
          bounds.xCenter + bounds.distance,
          bounds.zMax + bounds.distance,
          bounds.yCenter + bounds.distance,
        ]}
      />
      <directionalLight color="#7dd3fc" intensity={1.1} position={[-8, 4, -10]} />
      <pointLight color="#c084fc" intensity={20} position={[4, 5, 4]} />
      <CameraController bounds={bounds} resetKey={resetKey} />
      <Grid
        args={[xSpan * 1.08, ySpan * 1.08]}
        position={[bounds.xCenter, -0.015, bounds.yCenter]}
        cellSize={gridStep}
        cellThickness={0.7}
        cellColor="#252b3d"
        sectionSize={gridStep * 5}
        sectionThickness={1.2}
        sectionColor="#3a435d"
        fadeDistance={bounds.distance * 2.4}
        fadeStrength={1.4}
        infiniteGrid={false}
      />
      <CoordinateAxes bounds={bounds} axisLabels={axisLabels} />
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          side={DoubleSide}
          roughness={0.34}
          metalness={0.08}
        />
      </mesh>
      <SurfaceMarker
        equation={equation}
        settings={settings}
        marker={marker}
        surface={surface}
        animation={animation}
        timeRef={timeRef}
        size={Math.max(bounds.distance * 0.018, 0.06)}
      />
    </>
  )
}

function SurfacePlotRuntime(props: Surface3DPlotProps) {
  const [animatedSurface, setAnimatedSurface] = useState(props.initialSurface!)
  const timeRef = useRef(0)
  const sample = useMemo(() => createSurfaceSampler(props.equation), [props.equation])
  const errorHandlerRef = useRef(props.onAnimationError)
  const surface = props.animation?.playing ? animatedSurface : props.initialSurface!

  useEffect(() => {
    errorHandlerRef.current = props.onAnimationError
  }, [props.onAnimationError])

  useEffect(() => {
    if (!props.animation?.playing) {
      return
    }

    let frameId = 0
    let lastSample = performance.now()
    const frameDuration = 1 / 24

    const updateSurface = (now: number) => {
      const elapsed = Math.min((now - lastSample) / 1000, 0.1)

      if (document.visibilityState !== 'hidden' && elapsed >= frameDuration) {
        timeRef.current = (timeRef.current + elapsed * (props.animation?.speed ?? 1)) % 10000
        lastSample = now

        try {
          const time = timeRef.current
          const nextSurface = sample(
            props.settings,
            props.animation?.mode === 'window'
              ? { time, xOffset: time * 0.8, yOffset: -time * 0.55 }
              : { time },
          )

          setAnimatedSurface(nextSurface)
        } catch (cause) {
          errorHandlerRef.current?.(
            cause instanceof Error
              ? cause.message
              : 'Animation stopped because the surface could not be sampled.',
          )
          return
        }
      }

      frameId = requestAnimationFrame(updateSurface)
    }

    frameId = requestAnimationFrame(updateSurface)

    return () => cancelAnimationFrame(frameId)
  }, [
    props.animation?.mode,
    props.animation?.playing,
    props.animation?.speed,
    props.settings,
    sample,
  ])

  const initialBounds = getViewBounds(
    props.initialSurface!,
    props.settings.x,
    props.settings.y,
  )

  return (
    <>
      <Canvas
        aria-label="Interactive three-dimensional surface graph"
        role="img"
        camera={{
          position: initialBounds.cameraPosition,
          fov: 42,
          near: Math.max(initialBounds.distance / 1000, 0.001),
          far: Math.max(initialBounds.distance * 30, 100),
        }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 1.08
        }}
        fallback={<div className="webgl-fallback">WebGL is required to view the 3D graph.</div>}
      >
        <SurfaceScene
          surface={surface}
          initialSurface={props.initialSurface!}
          settings={props.settings}
          marker={props.marker!}
          equation={props.equation}
          axisLabels={props.axisLabels ?? { x: 'x', y: 'y', z: 'z' }}
          animation={props.animation}
          timeRef={timeRef}
          resetKey={props.resetKey ?? 0}
        />
      </Canvas>
      <div
        className="z-legend"
        aria-label={`${props.axisLabels?.z ?? 'z'} color legend`}
      >
        <span>{props.axisLabels?.z ?? 'z'}</span>
        <div className="legend-gradient" />
        <div>
          <span>{surface.zMax.toFixed(2)}</span>
          <span>{surface.zMin.toFixed(2)}</span>
        </div>
      </div>
      {surface.clipped && (
        <div className="clip-notice">Tall values clipped for a clearer view</div>
      )}
    </>
  )
}

export function Surface3DPlot(props: Surface3DPlotProps) {
  const initialSurface = useMemo(
    () => props.initialSurface ?? createSurfaceSampler(props.equation)(props.settings),
    [props.initialSurface, props.equation, props.settings],
  )
  const runtimeKey = [
    props.equation,
    props.settings.resolution,
    props.axisLabels?.x,
    props.axisLabels?.y,
    props.axisLabels?.z,
    props.animationResetKey,
  ].join(':')

  return (
    <SurfacePlotRuntime
      key={runtimeKey}
      {...props}
      initialSurface={initialSurface}
    />
  )
}

export default Surface3DPlot