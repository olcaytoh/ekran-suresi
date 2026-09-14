import React, { useEffect, useRef } from 'react';

interface TransparentMascotVideoProps {
  /** Yeşil ekran (chroma key) zeminli mp4 dosyasının yolu */
  src?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  /**
   * Şeffaflaştırılacak canvas'ın maksimum genişliği (px).
   * Görsel boyut CSS ile küçük olduğu için performans amacıyla
   * gerçek video çözünürlüğünden düşük tutulur.
   */
  renderWidth?: number;
}

/**
 * TransparentMascotVideo
 *
 * Yeşil ekran (chroma key) zeminli bir mp4 videosunu şeffaf arka planlı
 * gibi gösterir. MP4/H.264 tarayıcıda gerçek alfa kanalı taşımadığı için
 * (WebM+VP9 alfa da iOS Safari'de güvenilir çalışmıyor), video gizlice
 * oynatılır ve her kare bir <canvas> üzerine çizilip yeşil pikseller
 * client-side olarak şeffaflaştırılır. Bu yöntem tüm modern tarayıcılarda
 * (Safari/iOS dahil) çalışır.
 */
export const TransparentMascotVideo: React.FC<TransparentMascotVideoProps> = ({
  src = '/mascot.mp4',
  className = '',
  autoPlay = true,
  loop = true,
  muted = true,
  renderWidth = 360,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let cancelled = false;

    const drawFrame = () => {
      if (cancelled) return;

      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const scale = renderWidth / video.videoWidth;
        const w = renderWidth;
        const h = Math.max(1, Math.round(video.videoHeight * scale));

        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }

        ctx.drawImage(video, 0, 0, w, h);

        const frame = ctx.getImageData(0, 0, w, h);
        const data = frame.data;

        // Yeşil zemini şeffaflaştır + kenarlarda yeşil sızıntısını (spill) azalt
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const maxRB = r > b ? r : b;
          const greenDominance = g - maxRB;

          if (greenDominance > 33) {
            data[i + 3] = 0;
          } else if (greenDominance > 16) {
            const alpha = 1 - (greenDominance - 16) / (33 - 16);
            data[i + 3] = Math.max(0, Math.min(255, Math.round(alpha * 255)));
            data[i + 1] = Math.min(g, maxRB + 10);
          }
        }

        ctx.putImageData(frame, 0, 0);
      }

      rafIdRef.current = requestAnimationFrame(drawFrame);
    };

    const startLoop = () => {
      if (rafIdRef.current == null) {
        rafIdRef.current = requestAnimationFrame(drawFrame);
      }
    };

    const handleCanPlay = () => {
      if (autoPlay) {
        video.play().catch(() => {
          // Autoplay may be restricted by browser policies
        });
      }
      startLoop();
    };

    video.addEventListener('loadeddata', handleCanPlay);
    if (video.readyState >= 2) {
      handleCanPlay();
    }

    return () => {
      cancelled = true;
      video.removeEventListener('loadeddata', handleCanPlay);
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [src, autoPlay, renderWidth]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      {/* Gerçek video gizli oynatılır; görünen şey aşağıdaki işlenmiş canvas'tır */}
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        preload="auto"
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full w-auto h-full object-contain pointer-events-none select-none"
      />
    </div>
  );
};
