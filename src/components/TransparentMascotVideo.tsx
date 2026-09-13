import React, { useRef, useEffect } from 'react';

interface TransparentMascotVideoProps {
  src?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  width?: number;
  height?: number;
}

/**
 * TransparentMascotVideo renders a video or fallback animation
 * for the playful cat mascot.
 */
export const TransparentMascotVideo: React.FC<TransparentMascotVideoProps> = ({
  src = '/mascot.mp4',
  className = '',
  autoPlay = true,
  loop = true,
  muted = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && autoPlay) {
      videoRef.current.play().catch(() => {
        // Autoplay may be restricted by browser policies
      });
    }
  }, [autoPlay]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        className="w-full h-full object-contain pointer-events-none select-none"
      />
    </div>
  );
};
