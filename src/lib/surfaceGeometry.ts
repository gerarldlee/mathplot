import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { SurfaceData } from './surface'

export function createSurfaceGeometry(surface: SurfaceData) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(surface.positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(surface.colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

export function updateSurfaceGeometry(geometry: BufferGeometry, surface: SurfaceData) {
  const position = geometry.getAttribute('position')
  const color = geometry.getAttribute('color')

  if (!position || position.array.length !== surface.positions.length) {
    geometry.setAttribute('position', new Float32BufferAttribute(surface.positions, 3))
  } else {
    position.array.set(surface.positions)
    position.needsUpdate = true
  }

  if (!color || color.array.length !== surface.colors.length) {
    geometry.setAttribute('color', new Float32BufferAttribute(surface.colors, 3))
  } else {
    color.array.set(surface.colors)
    color.needsUpdate = true
  }

  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
}
