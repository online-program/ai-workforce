import React, { useEffect, useRef } from 'react';

interface IntelligenceCore3DProps {
  className?: string;
}

export const IntelligenceCore3D: React.FC<IntelligenceCore3DProps> = ({
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio || 600);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio || 600);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = (canvas.offsetWidth || 600) * window.devicePixelRatio;
      height = canvas.height = (canvas.offsetHeight || 600) * window.devicePixelRatio;
    };

    window.addEventListener('resize', handleResize);

    // Track visibility to conserve battery / GPU
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Interactive pointer influence on desktop
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      mouseRef.current.targetX = nx * 0.4;
      mouseRef.current.targetY = ny * 0.4;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 3D Geometry: Truncated Icosahedron / Geodesic Intelligence Node Structure
    // Golden ratio
    const phi = (1 + Math.sqrt(5)) / 2;
    const baseVertices = [
      [-1, phi, 0],
      [1, phi, 0],
      [-1, -phi, 0],
      [1, -phi, 0],
      [0, -1, phi],
      [0, 1, phi],
      [0, -1, -phi],
      [0, 1, -phi],
      [phi, 0, -1],
      [phi, 0, 1],
      [-phi, 0, -1],
      [-phi, 0, 1],
    ].map(([x, y, z]) => {
      const len = Math.sqrt(x * x + y * y + z * z);
      return [x / len, y / len, z / len];
    });

    // Outer secondary ring of satellite nodes
    const satelliteNodes = Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      return [Math.cos(angle) * 1.55, Math.sin(angle) * 0.4, Math.sin(angle) * 1.55];
    });

    // Edges between vertices within distance threshold
    const edges: [number, number][] = [];
    for (let i = 0; i < baseVertices.length; i++) {
      for (let j = i + 1; j < baseVertices.length; j++) {
        const [x1, y1, z1] = baseVertices[i];
        const [x2, y2, z2] = baseVertices[j];
        const d = Math.hypot(x1 - x2, y1 - y2, z1 - z2);
        if (d < 1.15) {
          edges.push([i, j]);
        }
      }
    }

    let rotX = 0.2;
    let rotY = 0.4;
    let rotZ = 0.1;
    let time = 0;

    const render = () => {
      if (!isVisibleRef.current) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Smooth damp mouse influence
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Autonomous rotation
      if (!prefersReducedMotion) {
        time += 0.008;
        rotX += 0.003 + mouseRef.current.y * 0.01;
        rotY += 0.005 + mouseRef.current.x * 0.01;
        rotZ += 0.002;
      }

      const cx = width / 2;
      const cy = height / 2;
      const baseScale = Math.min(width, height) * 0.28;
      const breath = 1 + Math.sin(time * 1.5) * 0.03;
      const scale = baseScale * breath;

      // Rotation matrix calculations
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosZ = Math.cos(rotZ);
      const sinZ = Math.sin(rotZ);

      const project = (v: number[]) => {
        let [x, y, z] = v;

        // Rotate Y
        let x1 = x * cosY + z * sinY;
        let y1 = y;
        let z1 = -x * sinY + z * cosY;

        // Rotate X
        let x2 = x1;
        let y2 = y1 * cosX - z1 * sinX;
        let z2 = y1 * sinX + z1 * cosX;

        // Rotate Z
        let x3 = x2 * cosZ - y2 * sinZ;
        let y3 = x2 * sinZ + y2 * cosZ;
        let z3 = z2;

        // Perspective projection
        const fov = 3.2;
        const pz = z3 + fov;
        const px = (x3 / pz) * scale + cx;
        const py = (y3 / pz) * scale + cy;

        return { x: px, y: py, z: z3, depth: pz };
      };

      // Draw background ambient core glow
      const coreGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, scale * 1.8);
      coreGrad.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
      coreGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.03)');
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Project vertices
      const projected = baseVertices.map(project);

      // Draw structural connecting struts (hairline edges)
      ctx.lineWidth = 1 * window.devicePixelRatio;
      for (const [i, j] of edges) {
        const p1 = projected[i];
        const p2 = projected[j];
        const avgZ = (p1.z + p2.z) / 2;
        const alpha = Math.max(0.06, Math.min(0.55, (avgZ + 1.2) * 0.28));

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Draw orbital satellite rings
      const projSats = satelliteNodes.map(project);
      for (let s = 0; s < projSats.length; s++) {
        const p1 = projSats[s];
        const p2 = projSats[(s + 1) % projSats.length];
        const alpha = Math.max(0.04, Math.min(0.3, (p1.z + 1.2) * 0.18));

        ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`;
        ctx.setLineDash([3 * window.devicePixelRatio, 4 * window.devicePixelRatio]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw node vertices
      for (const p of projected) {
        const nodeSize = Math.max(2, (p.z + 1.5) * 2.2) * window.devicePixelRatio;
        const alpha = Math.max(0.15, Math.min(0.9, (p.z + 1.2) * 0.45));

        // Outer vertex halo
        ctx.fillStyle = `rgba(52, 211, 153, ${alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, nodeSize * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Inner solid vertex
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, nodeSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Inner pulsating Core Nexus
      const corePulse = Math.sin(time * 3) * 3;
      const coreSize = (8 + corePulse) * window.devicePixelRatio;
      const nexusGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize * 2.5);
      nexusGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      nexusGrad.addColorStop(0.3, 'rgba(52, 211, 153, 0.6)');
      nexusGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      ctx.fillStyle = nexusGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreSize * 2.5, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative pointer-events-none select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain opacity-75 dark:opacity-60"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
