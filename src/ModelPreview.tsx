import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, useProgress } from '@react-three/drei';
import { DoubleSide, MeshStandardMaterial, OrthographicCamera, type Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { assetStem, assetUrl, type ColorId, type Palette } from './data';
import type { Theme } from './theme';

function Model({ url, palette, meshColorIds }: { url: string; palette: Palette; meshColorIds: ColorId[] }) {
  const gltf = useLoader(GLTFLoader, url);
  const invalidate = useThree((state) => state.invalidate);
  // The studio GLB carries validated solids and material-intent vertex colours.
  // Clone the geometry once. Palette changes only update the material colours.
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    let fallbackIndex = 0;
    clone.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const matchedIndex = /^part-(\d+)$/.exec(mesh.name);
      const partIndex = matchedIndex ? Number(matchedIndex[1]) : fallbackIndex;
      fallbackIndex += 1;
      const colorId = meshColorIds[partIndex];
      if (!colorId) throw new Error('The model has an unknown colour region.');
      mesh.userData.colorId = colorId;
      mesh.geometry = mesh.geometry.clone();
      if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
      const materials = Array.isArray(mesh.material) ? mesh.material.map((material) => material.clone()) : [mesh.material.clone()];
      for (const material of materials) {
        material.side = DoubleSide;
        material.vertexColors = false;
        if (material instanceof MeshStandardMaterial) {
          material.emissiveIntensity = 0.27;
        }
        material.needsUpdate = true;
      }
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    });
    return clone;
  }, [gltf.scene, meshColorIds]);
  useLayoutEffect(() => {
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const colorId = mesh.userData.colorId as ColorId;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) if (material instanceof MeshStandardMaterial) {
        material.color.set(palette[colorId]);
        material.emissive.set(palette[colorId]);
      }
    });
    invalidate();
  }, [scene, palette, invalidate]);
  useEffect(() => () => {
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => material.dispose());
    });
  }, [scene]);
  return <primitive object={scene} />;
}

function FitCamera({ onPlate }: { onPlate: boolean }) {
  const { camera, size, invalidate } = useThree();
  const previousFit = useRef<number | null>(null);
  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return;
    // The geometry is in millimetres. Fit its 100 mm height to the available canvas.
    const fit = Math.min(size.height * 0.0073, size.width * 0.0095) * (onPlate ? 0.86 : 1);
    camera.zoom = previousFit.current === null ? fit : camera.zoom * fit / previousFit.current;
    previousFit.current = fit;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.height, size.width, onPlate, invalidate]);
  return null;
}

export function ModelPreview({ designId, paletteId, palette, meshColorIds, onPlate, theme }: {
  designId: string;
  paletteId: string;
  palette: Palette;
  meshColorIds: ColorId[];
  onPlate: boolean;
  theme: Theme;
}) {
  const url = assetUrl(`${assetStem(designId, paletteId)}.glb`);
  const { active } = useProgress();
  const [viewVersion, setViewVersion] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void containerRef.current?.requestFullscreen();
  };
  return (
    <div className="model-preview" ref={containerRef} aria-label={onPlate ? '3D tag resting face up on a generic print plate grid' : 'Interactive 3D model preview'}>
      <Canvas key={`${onPlate ? 'plate' : 'model'}-${viewVersion}`} orthographic camera={{ position: onPlate ? [75, -95, 120] : [76, -108, 145], up: onPlate ? [0, 0, 1] : [0, 1, 0], zoom: onPlate ? 1.8 : 2.1, near: 0.1, far: 1000 }} gl={{ antialias: true }}>
        <FitCamera onPlate={onPlate} />
        <color attach="background" args={[theme === 'dark' ? '#16202c' : '#f5f3f0']} />
        <ambientLight intensity={1.9} />
        <directionalLight position={[30, 20, 100]} intensity={2.6} />
        <directionalLight position={[-40, -50, 50]} intensity={1.2} />
        {onPlate && <>
          <mesh position={[0, 0, -0.12]} receiveShadow><planeGeometry args={[180, 180]} /><meshStandardMaterial color={theme === 'dark' ? '#263344' : '#e1e5e8'} roughness={1} /></mesh>
          <gridHelper args={[180, 18, theme === 'dark' ? '#718098' : '#8797a5', theme === 'dark' ? '#405063' : '#c5cdd3']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.1]} />
        </>}
        <Suspense fallback={null}><Model key={url} url={url} palette={palette} meshColorIds={meshColorIds} /></Suspense>
        <OrbitControls target={[0, 0, 1]} enablePan={false} minDistance={80} maxDistance={350} />
      </Canvas>
      {active && <span className="model-status" role="status">Loading model…</span>}
      <span className="model-hint">{onPlate ? 'Face up · 10 mm reference grid' : 'Drag to rotate · scroll to zoom'}</span>
      <div className="model-actions"><button type="button" onClick={() => setViewVersion((version) => version + 1)} aria-label="Reset 3D view" title="Reset 3D view">↺</button><button type="button" onClick={toggleFullscreen} aria-label="Toggle full screen preview" title="Toggle full screen preview">⛶</button></div>
    </div>
  );
}
