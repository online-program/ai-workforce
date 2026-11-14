import React, { useRef, useMemo, useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Fallback boundary to catch any WebGL context loss or initialization issues
interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Footer 3D WebGL fallback activated:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * 3D Pulsating Orb and Ring Assembly for Footer
 */
function FooterOrbMesh() {
  const coreRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Group>(null);
  const ring2Ref = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Generate gentle ambient stardust particles
  const particlePositions = useMemo(() => {
    const count = 64;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 2.0 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.7; // slight vertical compression
      pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    // Clamp delta to prevent jumps on tab focus return
    const dt = Math.min(delta, 0.1);
    const t = state.clock.getElapsedTime();

    // 1. Core rotation & pulsation
    if (coreRef.current) {
      coreRef.current.rotation.y += dt * 0.15;
      coreRef.current.rotation.x = Math.sin(t * 0.35) * 0.12;

      // Subtle breathing pulsation
      const scale = 1.0 + Math.sin(t * 0.9) * 0.045;
      coreRef.current.scale.set(scale, scale, scale);
    }

    // 2. Wireframe cage counter-rotation
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y -= dt * 0.1;
      wireframeRef.current.rotation.z = Math.cos(t * 0.4) * 0.1;

      const cageScale = 1.0 + Math.sin(t * 0.9 + 0.3) * 0.04;
      wireframeRef.current.scale.set(cageScale * 1.45, cageScale * 1.45, cageScale * 1.45);
    }

    // 3. Ring 1 (Celestial Equator)
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += dt * 0.12;
      ring1Ref.current.rotation.x = Math.PI / 3.8 + Math.sin(t * 0.4) * 0.06;
    }

    // 4. Ring 2 (Polar Astrolabe)
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= dt * 0.09;
      ring2Ref.current.rotation.y += dt * 0.08;
    }

    // 5. Orbital Particles
    if (particlesRef.current) {
      particlesRef.current.rotation.y += dt * 0.04;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Dynamic Lighting System with Natural Red, Green & Blue Tones */}
      <ambientLight intensity={0.4} color="#0f172a" />
      
      {/* Natural Blue: Deep intelligence & precision */}
      <pointLight position={[-3.5, 2.0, 2.5]} intensity={3.5} distance={8} color="#3b82f6" />
      
      {/* Natural Green: Vitality & autonomous uptime */}
      <pointLight position={[3.5, -1.8, 2.0]} intensity={2.8} distance={8} color="#10b981" />
      
      {/* Natural Red/Coral: Subtle warm chromatic rim accent */}
      <pointLight position={[0, 3.2, -1.5]} intensity={2.2} distance={7} color="#f43f5e" />

      {/* Main Core Sphere */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1.2, 48, 48]} />
        <meshStandardMaterial
          color="#090d16"
          roughness={0.25}
          metalness={0.88}
          emissive="#0c192c"
          emissiveIntensity={0.45}
          transparent
          opacity={0.82}
        />
      </mesh>

      {/* Subtle Outer Geodesic Lattice Shell */}
      <mesh ref={wireframeRef}>
        <icosahedronGeometry args={[1.0, 2]} />
        <meshBasicMaterial
          color="#60a5fa"
          wireframe
          transparent
          opacity={0.14}
        />
      </mesh>

      {/* Ring 1: Celestial Equator with subtle blue accent */}
      <group ref={ring1Ref}>
        <mesh>
          <ringGeometry args={[1.9, 1.93, 64]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Ring 2: Tilted Astrolabe Ring with subtle emerald accent */}
      <group ref={ring2Ref} rotation={[Math.PI / 2.5, 0, Math.PI / 6]}>
        <mesh>
          <ringGeometry args={[2.25, 2.27, 64]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Orbiting Stardust Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.032}
          color="#93c5fd"
          transparent
          opacity={0.45}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

interface FooterR3FOrbProps {
  className?: string;
}

export const FooterR3FOrb: React.FC<FooterR3FOrbProps> = ({ className = '' }) => {
  const [canRenderWebGL, setCanRenderWebGL] = useState(true);

  // Check WebGL availability safely on mount
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setCanRenderWebGL(false);
      }
    } catch {
      setCanRenderWebGL(false);
    }
  }, []);

  // Graceful CSS Fallback
  const cssFallback = (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      <div className="w-72 h-72 rounded-full bg-gradient-to-tr from-blue-950/20 via-emerald-950/15 to-rose-950/10 blur-3xl animate-pulse" />
    </div>
  );

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
      aria-hidden="true"
    >
      {canRenderWebGL ? (
        <WebGLErrorBoundary fallback={cssFallback}>
          <div className="w-full h-full relative">
            <Canvas
              camera={{ position: [0, 0, 5.2], fov: 42 }}
              gl={{
                antialias: true,
                alpha: true,
                powerPreference: 'low-power',
                failIfMajorPerformanceCaveat: false,
              }}
              dpr={[1, 1.5]}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              <FooterOrbMesh />
            </Canvas>

            {/* Precision Optical Contrast Scrim to Ensure Complete Text Readability */}
            <div className="absolute inset-0 bg-radial from-transparent via-black/60 to-black pointer-events-none z-[1]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 pointer-events-none z-[1]" />
          </div>
        </WebGLErrorBoundary>
      ) : (
        cssFallback
      )}
    </div>
  );
};
