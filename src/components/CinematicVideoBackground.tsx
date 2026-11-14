import React, { useRef, useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

interface CinematicVideoBackgroundProps {
  sources: string[];
  poster: string;
  className?: string;
  overlayOpacity?: string;
  brightness?: string;
  lazy?: boolean;
}

export const CinematicVideoBackground: React.FC<CinematicVideoBackgroundProps> = ({
  sources,
  poster,
  className = '',
  overlayOpacity = 'bg-black/40',
  brightness = 'brightness-[0.88] contrast-[1.12]',
  lazy = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(true); // Default to visible immediately

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Force muted property explicitly on the DOM element for browser policy compliance
    video.muted = true;

    if (shouldReduceMotion) {
      video.pause();
      return;
    }

    const playVideo = async () => {
      try {
        video.muted = true;
        await video.play();
        setIsLoaded(true);
      } catch (err) {
        console.debug('Autoplay playback notice:', err);
      }
    };

    playVideo();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !shouldReduceMotion) {
        playVideo();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', playVideo);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', playVideo);
    };
  }, [shouldReduceMotion]);

  return (
    <div className={`absolute inset-0 w-full h-full bg-black overflow-hidden pointer-events-none select-none z-0 ${className}`}>
      {/* High-res Pitch Dark Poster Fallback */}
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full object-cover object-center ${brightness} transition-opacity duration-700 z-0 ${
          shouldReduceMotion || hasError ? 'opacity-100' : 'opacity-40'
        }`}
      />

      {/* HTML5 Autoplay Looping Video Element */}
      {!shouldReduceMotion && !hasError && (
        <video
          ref={videoRef}
          autoPlay
          muted={true}
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          preload={lazy ? 'none' : 'auto'}
          poster={poster}
          onCanPlay={() => setIsLoaded(true)}
          onPlaying={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`absolute inset-0 w-full h-full object-cover object-center ${brightness} transition-opacity duration-500 z-0 opacity-100`}
        >
          {sources.map((src, idx) => (
            <source key={idx} src={src} type="video/mp4" />
          ))}
        </video>
      )}

      {/* Ambient Pitch Dark Overlays for Optimal Text Contrast */}
      <div className={`absolute inset-0 z-10 ${overlayOpacity}`} />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-transparent to-black/60" />
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 via-transparent to-transparent" />
    </div>
  );
};
