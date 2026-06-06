import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Module-level ref-counted cache: one env map shared across all R3F Canvases.
// This avoids creating/destroying PMREM textures on every mount/unmount cycle
// which fragments GPU memory and can trigger context loss.

let cachedTexture: THREE.Texture | null = null
let refCount = 0

/** Provides a shared, ref-counted PMREM environment map for PBR materials. */
export function useEnvironmentMap() {
  const { scene, gl } = useThree()
  const disposed = useRef(false)

  useEffect(() => {
    if (cachedTexture) {
      refCount++
      scene.environment = cachedTexture
      scene.background = new THREE.Color('#0b0b0d')
      return () => {
        refCount--
        if (refCount <= 0 && cachedTexture && !disposed.current) {
          cachedTexture.dispose()
          cachedTexture = null
          refCount = 0
        }
        scene.environment = null
      }
    }

    // First mount: generate the PMREM env map
    const boxScene = new THREE.Scene()
    boxScene.background = new THREE.Color('#444444')
    boxScene.add(new THREE.AmbientLight('#888888', 1))

    // Small area light to simulate a softbox from above
    const softLight = new THREE.PointLight('#ffffff', 2, 10)
    softLight.position.set(0, 3, 2)
    boxScene.add(softLight)

    const pmrem = new THREE.PMREMGenerator(gl as THREE.WebGLRenderer)
    pmrem.compileEquirectangularShader()
    const env = pmrem.fromScene(boxScene, 0.04)
    pmrem.dispose()

    cachedTexture = env.texture
    refCount = 1
    scene.environment = cachedTexture
    scene.background = new THREE.Color('#0b0b0d')

    return () => {
      refCount--
      disposed.current = true
      if (refCount <= 0 && cachedTexture) {
        cachedTexture.dispose()
        cachedTexture = null
        refCount = 0
      }
      scene.environment = null
    }
  }, [scene, gl])
}
