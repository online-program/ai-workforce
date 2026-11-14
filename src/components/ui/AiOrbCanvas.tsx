import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export type OrbTheme = 'alpha' | 'omega' | 'pulse' | 'support' | 'operations';

interface AiOrbCanvasProps {
  theme?: OrbTheme;
  size?: number; // width & height in px or container fit
  className?: string;
  interactive?: boolean;
  intensity?: number;
}

const THEME_COLORS: Record<OrbTheme, { core: string; glow: string; particle: string; ring: string; light: number }> = {
  alpha: {
    core: '#ffffff',
    glow: '#e0e0e0',
    particle: '#ffffff',
    ring: '#999999',
    light: 0xffffff,
  },
  omega: {
    core: '#8b5cf6',
    glow: '#6366f1',
    particle: '#c084fc',
    ring: '#a855f7',
    light: 0xa855f7,
  },
  pulse: {
    core: '#10b981',
    glow: '#06b6d4',
    particle: '#34d399',
    ring: '#22d3ee',
    light: 0x10b981,
  },
  support: {
    core: '#f59e0b',
    glow: '#f97316',
    particle: '#fbbf24',
    ring: '#fdba74',
    light: 0xf59e0b,
  },
  operations: {
    core: '#3b82f6',
    glow: '#64748b',
    particle: '#60a5fa',
    ring: '#94a3b8',
    light: 0x3b82f6,
  },
};

export const AiOrbCanvas: React.FC<AiOrbCanvasProps> = ({
  theme = 'alpha',
  className = '',
  interactive = true,
  intensity = 1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useFallback2D, setUseFallback2D] = useState(false);

  // Mouse tracking state for 3D tilt
  const mousePos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Check WebGL availability
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    } catch {
      gl = null;
    }

    if (!gl) {
      setUseFallback2D(true);
      return;
    }

    let animationFrameId: number;
    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let coreSphere: THREE.Mesh;
    let wireframeOrb: THREE.Mesh;
    let particleSystem: THREE.Points;
    let ringGroup: THREE.Group;

    const themeConfig = THEME_COLORS[theme];

    // Initialize Three.js scene
    const initThree = () => {
      const width = container.clientWidth || 300;
      const height = container.clientHeight || 300;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.z = 6;

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(themeConfig.light, 3 * intensity, 20);
      pointLight.position.set(2, 3, 4);
      scene.add(pointLight);

      const backlight = new THREE.PointLight(themeConfig.light, 1.5 * intensity, 20);
      backlight.position.set(-3, -2, -2);
      scene.add(backlight);

      // Inner Core Mesh (Glowing Sphere)
      const coreGeo = new THREE.IcosahedronGeometry(1.2, 4);
      const coreMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(themeConfig.core),
        emissive: new THREE.Color(themeConfig.glow),
        emissiveIntensity: 0.6 * intensity,
        roughness: 0.1,
        metalness: 0.8,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        wireframe: false,
      });
      coreSphere = new THREE.Mesh(coreGeo, coreMat);
      scene.add(coreSphere);

      // Outer Wireframe Lattice
      const outerGeo = new THREE.IcosahedronGeometry(1.5, 2);
      const outerMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(themeConfig.ring),
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      });
      wireframeOrb = new THREE.Mesh(outerGeo, outerMat);
      scene.add(wireframeOrb);

      // Floating Orbital Rings
      ringGroup = new THREE.Group();
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(themeConfig.ring),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      });

      const ring1Geo = new THREE.RingGeometry(1.9, 1.95, 64);
      const ring1 = new THREE.Mesh(ring1Geo, ringMat);
      ring1.rotation.x = Math.PI / 3;
      ringGroup.add(ring1);

      const ring2Geo = new THREE.RingGeometry(2.2, 2.23, 64);
      const ring2 = new THREE.Mesh(ring2Geo, ringMat);
      ring2.rotation.y = Math.PI / 4;
      ringGroup.add(ring2);

      scene.add(ringGroup);

      // Surrounding Particle Field
      const particleCount = 180;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 1.6 + Math.random() * 1.2;

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const particleMat = new THREE.PointsMaterial({
        color: new THREE.Color(themeConfig.particle),
        size: 0.05,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      });

      particleSystem = new THREE.Points(particleGeo, particleMat);
      scene.add(particleSystem);
    };

    initThree();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Mouse tilt handling
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePos.current.targetX = x * 0.5;
      mousePos.current.targetY = y * 0.5;
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    // Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse interpolation
      mousePos.current.x += (mousePos.current.targetX - mousePos.current.x) * 0.05;
      mousePos.current.y += (mousePos.current.targetY - mousePos.current.y) * 0.05;

      if (coreSphere) {
        coreSphere.rotation.y = elapsedTime * 0.4;
        coreSphere.rotation.x = elapsedTime * 0.2 + mousePos.current.y * 0.3;
        coreSphere.rotation.z = mousePos.current.x * 0.3;

        // Breathing pulse effect
        const pulse = Math.sin(elapsedTime * 2) * 0.05 + 1.0;
        coreSphere.scale.set(pulse, pulse, pulse);
      }

      if (wireframeOrb) {
        wireframeOrb.rotation.y = -elapsedTime * 0.25;
        wireframeOrb.rotation.z = elapsedTime * 0.15;
      }

      if (ringGroup) {
        ringGroup.rotation.y = elapsedTime * 0.2;
        ringGroup.rotation.x = Math.sin(elapsedTime * 0.5) * 0.2 + mousePos.current.y * 0.4;
        ringGroup.rotation.z = mousePos.current.x * 0.4;
      }

      if (particleSystem) {
        particleSystem.rotation.y = elapsedTime * 0.1;
      }

      if (camera) {
        camera.position.x = mousePos.current.x * 0.4;
        camera.position.y = mousePos.current.y * 0.4;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (interactive) window.removeEventListener('mousemove', handleMouseMove);
      if (renderer) renderer.dispose();
    };
  }, [theme, intensity, interactive]);

  // Fallback 2D Canvas rendering for low-end / WebGL disabled devices
  useEffect(() => {
    if (!useFallback2D) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;
    const themeConfig = THEME_COLORS[theme];

    const render2D = () => {
      animId = requestAnimationFrame(render2D);
      angle += 0.02;

      const w = canvas.width || 300;
      const h = canvas.height || 300;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.3;

      ctx.clearRect(0, 0, w, h);

      // Glowing Radial Background
      const radialGlow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.8);
      radialGlow.addColorStop(0, themeConfig.core);
      radialGlow.addColorStop(0.5, themeConfig.glow);
      radialGlow.addColorStop(1, 'transparent');

      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = radialGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Core Orb
      const coreGrad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 2, cx, cy, radius);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.4, themeConfig.core);
      coreGrad.addColorStop(1, themeConfig.glow);

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = themeConfig.ring;
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.4, radius * 0.5, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    render2D();

    return () => cancelAnimationFrame(animId);
  }, [useFallback2D, theme]);

  return (
    <div ref={containerRef} className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />
    </div>
  );
};
