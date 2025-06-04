import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import Canvas3D from '../../components/Canvas3D';
import { R2Mapping, R2Functions, Vec2 } from '../../lib/R2Mapping';

interface DemoProps {
  count?: number;
}

const mappings: { [key: string]: R2Mapping } = {
  identity: new R2Mapping(R2Functions.identity),
  square: new R2Mapping(R2Functions.complexSquare),
  sqrt: new R2Mapping(R2Functions.complexSqrt),
  swirl: new R2Mapping(R2Functions.swirl)
};

export default function R2MappingDemo({ count = 10000 }: DemoProps) {
  const [mappingName, setMappingName] = useState<keyof typeof mappings>('identity');
  const materialRef = useRef<THREE.PointsMaterial>();
  const geomRef = useRef<THREE.BufferGeometry>();

  useEffect(() => {
    if (!geomRef.current) return;
    const geometry = geomRef.current;
    const side = Math.sqrt(count);
    const positions = new Float32Array(count * 3);
    let i = 0;
    for (let ix = 0; ix < side; ix++) {
      for (let iy = 0; iy < side; iy++) {
        const x = (ix / side - 0.5) * 4;
        const y = (iy / side - 0.5) * 4;
        const mapped = mappings[mappingName].map({ x, y });
        positions[3 * i] = mapped.x;
        positions[3 * i + 1] = 0;
        positions[3 * i + 2] = mapped.y;
        i++;
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.attributes.position.needsUpdate = true;
  }, [mappingName, count]);

  const onMount = React.useCallback((ctx: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; }) => {
    const { scene, camera } = ctx;
    camera.position.z = 5;

    const geometry = new THREE.BufferGeometry();
    geomRef.current = geometry;

    const material = new THREE.PointsMaterial({ color: '#00ffaa', size: 0.05 });
    materialRef.current = material;

    const points = new THREE.Points(geometry, material);
    scene.add(points);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <Canvas3D onMount={onMount} />
      <div style={{ position: 'absolute', top: 10, left: 10, color: 'white', fontFamily: 'monospace' }}>
        <select value={mappingName} onChange={e => setMappingName(e.target.value as any)}>
          {Object.keys(mappings).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
