import React from 'react';

interface Section3DProps {
  className?: string;
  size?: number;
}

/**
 * Section 02 3D Signature: Fragmented Prism Lattice
 * Palette: Pure White, Deep Black, Bright Glowing Gold (#ffffff)
 */
export const Section3DPrism: React.FC<Section3DProps> = ({
  className = '',
  size = 380,
}) => (
  <div
    style={{ width: `${size}px`, height: `${size}px`, perspective: '800px' }}
    className={`relative flex items-center justify-center pointer-events-none ${className}`}
  >
    <svg
      viewBox="0 0 400 400"
      fill="none"
      className="w-full h-full animate-[spin_40s_linear_infinite] opacity-35"
    >
      <defs>
        <linearGradient id="prismGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#737373" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#262626" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <polygon
        points="200,40 340,310 60,310"
        stroke="url(#prismGrad)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <polygon
        points="200,100 300,280 100,280"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1"
      />
      <circle cx="200" cy="190" r="10" fill="#ffffff" className="opacity-80 animate-ping" />
      <circle cx="200" cy="190" r="5" fill="#ffffff" />
      <line x1="200" y1="40" x2="200" y2="310" stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" />
    </svg>
  </div>
);

/**
 * Section 03 3D Signature: Dual Counter-Rotating Accelerator Rings
 * Palette: Pure White, Deep Black, Bright Glowing Gold (#ffffff)
 */
export const Section3DRings: React.FC<Section3DProps> = ({
  className = '',
  size = 420,
}) => (
  <div
    style={{ width: `${size}px`, height: `${size}px`, perspective: '900px' }}
    className={`relative flex items-center justify-center pointer-events-none ${className}`}
  >
    <svg viewBox="0 0 400 400" fill="none" className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="ring3DGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <g className="origin-center animate-[spin_28s_linear_infinite]">
        <ellipse
          cx="200"
          cy="200"
          rx="170"
          ry="65"
          transform="rotate(-30 200 200)"
          stroke="url(#ring3DGrad)"
          strokeWidth="1.5"
          className="opacity-60"
        />
        <circle cx="340" cy="130" r="4" fill="#ffffff" />
      </g>
      <g className="origin-center animate-[spin_36s_linear_infinite_reverse]">
        <ellipse
          cx="200"
          cy="200"
          rx="150"
          ry="70"
          transform="rotate(40 200 200)"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.2"
          strokeDasharray="6 6"
          className="opacity-50"
        />
        <circle cx="60" cy="240" r="3.5" fill="#ffffff" />
      </g>
    </svg>
  </div>
);

/**
 * Section 04 3D Signature: Neural Matrix Node
 */
export const Section3DMatrix: React.FC<Section3DProps> = ({
  className = '',
  size = 380,
}) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`relative flex items-center justify-center pointer-events-none ${className}`}
  >
    <svg viewBox="0 0 400 400" fill="none" className="w-full h-full opacity-40">
      <circle cx="200" cy="200" r="140" stroke="rgba(255, 215, 0, 0.3)" strokeWidth="1" strokeDasharray="3 6" />
      <circle cx="200" cy="200" r="90" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
      <g className="origin-center animate-[spin_50s_linear_infinite]">
        <rect x="150" y="150" width="100" height="100" rx="20" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
        <circle cx="150" cy="150" r="4" fill="#ffffff" />
        <circle cx="250" cy="150" r="4" fill="#ffffff" />
        <circle cx="250" cy="250" r="4" fill="#ffffff" />
        <circle cx="150" cy="250" r="4" fill="#ffffff" />
      </g>
    </svg>
  </div>
);

/**
 * Section 05 3D Signature: Helical Pipeline Beacon
 */
export const Section3DHelix: React.FC<Section3DProps> = ({
  className = '',
  size = 400,
}) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`relative flex items-center justify-center pointer-events-none ${className}`}
  >
    <svg viewBox="0 0 400 400" fill="none" className="w-full h-full opacity-35">
      <g className="origin-center animate-[spin_35s_linear_infinite]">
        <path
          d="M100 200 Q200 100 300 200 T500 200"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M100 200 Q200 300 300 200 T500 200"
          stroke="rgba(255, 215, 0, 0.5)"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="200" cy="150" r="5" fill="#ffffff" />
        <circle cx="200" cy="250" r="5" fill="#ffffff" />
      </g>
    </svg>
  </div>
);

/**
 * Section 06 3D Signature: Hyper-Cube Data Vault
 */
export const Section3DVault: React.FC<Section3DProps> = ({
  className = '',
  size = 400,
}) => (
  <div
    style={{ width: `${size}px`, height: `${size}px`, perspective: '1000px' }}
    className={`relative flex items-center justify-center pointer-events-none ${className}`}
  >
    <svg viewBox="0 0 400 400" fill="none" className="w-full h-full opacity-40">
      <g className="origin-center animate-[spin_42s_linear_infinite]">
        {/* Outer Iso Cube */}
        <path
          d="M200 80 L320 150 L320 280 L200 350 L80 280 L80 150 Z"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.5"
        />
        <line x1="200" y1="80" x2="200" y2="215" stroke="rgba(255,255,255,0.3)" />
        <line x1="320" y1="150" x2="200" y2="215" stroke="rgba(255,255,255,0.3)" />
        <line x1="80" y1="150" x2="200" y2="215" stroke="rgba(255,255,255,0.3)" />
        <line x1="200" y1="215" x2="200" y2="350" stroke="rgba(255,255,255,0.3)" />

        {/* Inner Core Vault Glow */}
        <circle cx="200" cy="215" r="16" fill="#ffffff" className="opacity-70 animate-pulse" />
        <circle cx="200" cy="215" r="7" fill="#ffffff" />
      </g>
    </svg>
  </div>
);

/**
 * Section 07 3D Signature: Decision Crystal Polyhedron
 */
export const Section3DBeacon: React.FC<Section3DProps> = ({
  className = '',
  size = 380,
}) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`relative flex items-center justify-center pointer-events-none ${className}`}
  >
    <svg viewBox="0 0 400 400" fill="none" className="w-full h-full opacity-35">
      <g className="origin-center animate-[spin_30s_linear_infinite_reverse]">
        <polygon points="200,60 320,160 270,330 130,330 80,160" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.2" />
        <polygon points="200,120 270,180 240,280 160,280 130,180" stroke="rgba(255, 215, 0, 0.6)" strokeWidth="1" />
        <circle cx="200" cy="200" r="5" fill="#ffffff" />
      </g>
    </svg>
  </div>
);

/**
 * Section 08 3D Signature: Constellation Node Cluster
 */
export const Section3DCluster: React.FC<Section3DProps> = ({
  className = '',
  size = 400,
}) => (
  <div
    style={{ width: `${size}px`, height: `${size}px` }}
    className={`relative flex items-center justify-center pointer-events-none ${className}`}
  >
    <svg viewBox="0 0 400 400" fill="none" className="w-full h-full opacity-35">
      <g className="origin-center animate-[spin_48s_linear_infinite]">
        <circle cx="200" cy="200" r="120" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" strokeDasharray="4 8" />
        <line x1="120" y1="120" x2="280" y2="280" stroke="rgba(255,255,255,0.2)" />
        <line x1="280" y1="120" x2="120" y2="280" stroke="rgba(255,255,255,0.2)" />
        <circle cx="120" cy="120" r="5" fill="#ffffff" />
        <circle cx="280" cy="120" r="5" fill="#ffffff" />
        <circle cx="280" cy="280" r="5" fill="#ffffff" />
        <circle cx="120" cy="280" r="5" fill="#ffffff" />
        <circle cx="200" cy="200" r="7" fill="#ffffff" />
      </g>
    </svg>
  </div>
);
