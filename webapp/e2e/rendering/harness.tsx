import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { ModelViewer3D } from '../../src/components/artwork/ModelViewer3D'
import { PedestalSculpture } from '../../src/components/hall3d/PedestalSculpture'

const model = '/e2e/fixtures/models/Avocado.glb'
function Harness() {
  const [url, setUrl] = useState(model + '?version=1')
  const [hovered, setHovered] = useState(false)
  const hall = new URLSearchParams(location.search).has('hall')
  return <>
    <button onClick={() => setUrl('/missing.glb')}>Missing model</button>
    <button onClick={() => setUrl(model + '?version=2')}>Replace model</button>
    <button onClick={() => setUrl('/unsupported.obj')}>Unsupported model</button>
    <button onClick={() => setHovered(!hovered)}>Hover sculpture</button>
    <div style={{ width: 900, height: 650 }}>
      {hall ? <Canvas camera={{ position: [0, 1, 4] }} onCreated={({ scene }) => { (window as any).__testScene = scene }}>
        <ambientLight intensity={2} />
        <PedestalSculpture
          artwork={{ id: 'test', title: 'Test', modelUrl: url, posterUrl: null, mediaType: 'MODEL_3D' }}
          position={[0, 0, 0]} hovered={hovered} onHover={setHovered} onClick={() => {}} />
      </Canvas> : <ModelViewer3D modelUrl={url} />}
    </div>
  </>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>)
