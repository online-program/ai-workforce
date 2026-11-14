import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Interactive3DObjectsProps {
  type?: 'torus' | 'cube' | 'pyramid';
  className?: string;
  wireframe?: boolean;
}

export const Interactive3DObjects: React.FC<Interactive3DObjectsProps> = ({
  type = 'torus',
  className = '',
  wireframe = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    } catch {
      gl = null;
    }

    if (!gl) {
      setHasWebGL(false);
      return;
    }

    let animId: number;
    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let mesh: THREE.Mesh;

    const init = () => {
      const w = container.clientWidth || 300;
      const h = container.clientHeight || 300;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
      camera.position.z = 5;

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Geometry selection
      let geo: THREE.BufferGeometry;
      if (type === 'torus') {
        geo = new THREE.TorusKnotGeometry(1, 0.35, 100, 16);
      } else if (type === 'cube') {
        geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
      } else {
        geo = new THREE.ConeGeometry(1.4, 2, 4);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.1,
        wireframe,
        transparent: true,
        opacity: 0.4,
      });

      mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      const light1 = new THREE.PointLight(0xffffff, 2, 10);
      light1.position.set(3, 3, 3);
      scene.add(light1);

      const light2 = new THREE.PointLight(0xffffff, 1, 10);
      light2.position.set(-3, -3, -3);
      scene.add(light2);
    };

    init();

    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (mesh) {
        mesh.rotation.x = t * 0.2;
        mesh.rotation.y = t * 0.3;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (renderer) renderer.dispose();
    };
  }, [type, wireframe]);

  if (!hasWebGL) return null;

  return (
    <div ref={containerRef} className={`relative flex items-center justify-center pointer-events-none ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
