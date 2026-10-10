import React, { useEffect, useRef, useState } from 'react';

interface TransparentMascotVideoProps {
  /** Yeşil veya mavi ekran zeminli mp4 dosyasının yolu */
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
  /** Üstten kırpma oranı (0-1). Kedinin kepi/üstü kesilmemesi için güvenli default 0.08 */
  cropTop?: number;
  /** Alttan kırpma oranı (0-1). Kedinin ayakları kesilmemesi için güvenli default 0.08 */
  cropBottom?: number;
  /** Silinecek arka plan rengi türü ('blue' | 'green' | 'auto') */
  chromaKeyType?: 'blue' | 'green' | 'auto';
  /** Video tamamlandığında tetiklenecek callback (loop=false olduğunda kullanışlıdır) */
  onEnded?: () => void;
}

/**
 * TransparentMascotVideo
 *
 * Yeşil veya mavi ekran zeminli bir mp4 videosunu şeffaf arka planlı
 * gibi gösterir. MP4/H.264 tarayıcıda gerçek alfa kanalı taşımadığı için
 * (WebM+VP9 alfa da iOS Safari'de güvenilir çalışmıyor), video gizlice
 * oynatılır ve her kare bir <canvas> üzerine çizilip arka plan pikselleri
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
  cropTop = 0.08,
  cropBottom = 0.08,
  chromaKeyType = 'auto',
  onEnded,
}) => {
  const isBlueKey = chromaKeyType === 'blue' || (chromaKeyType !== 'green' && src.includes('kss'));
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const [hasDrawnFrame, setHasDrawnFrame] = useState(false);
  const hasDrawnRef = useRef(false);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Mobil ve WebKit kısıtlamaları için inline oynatmayı zorla
    video.defaultMuted = muted;
    video.muted = muted;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x5-playsinline', '');

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let cancelled = false;

    const drawFrame = () => {
      if (cancelled) return;

      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Üst ve alt güvenli oranla kırpılarak kedinin kepi (üst) ve ayakları (alt) hiçbir zaman kesilmez
        const topRatio = Math.max(0, Math.min(0.4, cropTop));
        const bottomRatio = Math.max(0, Math.min(0.5, cropBottom));
        const sy = Math.round(video.videoHeight * topRatio);
        const sh = Math.max(1, Math.round(video.videoHeight * (1 - topRatio - bottomRatio)));
        const sx = 0;
        const sw = video.videoWidth;

        const w = renderWidth;
        const h = Math.max(1, Math.round(sh * (renderWidth / sw)));

        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }

        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);

        const frame = ctx.getImageData(0, 0, w, h);
        const data = frame.data;

        // Zemin şeffaflaştırma: Mavi zeminli (kss.mp4) videolarda YEŞİL renklere KESİNLİKLE dokunulmaz!
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (isBlueKey) {
            // YALNIZCA MAVİ ZEMİN SİLİNİR (Yeşil kuş ve tüm yeşil tonlar tamamen korunur)
            const blueOverGreen = b - g;
            const blueOverRed = b - r;
            if (blueOverGreen >= 14 && blueOverRed >= 48 && b >= 180 && g >= 160) {
              data[i + 3] = 0;
            } else if (blueOverGreen >= 8 && blueOverRed >= 34 && b >= 170 && g >= 150) {
              const alpha = 1 - (blueOverGreen - 8) / (14 - 8);
              data[i + 3] = Math.max(0, Math.min(255, Math.round(alpha * 255)));
              data[i + 2] = Math.max(r, g); // Mavi yansımasını azalt
            }
          } else {
            // YEŞİL EKRAN SİLME (Yeşil perdeli videolar ve kullan.mp4 zümrüt yeşil perde için)
            const maxRB = r > b ? r : b;
            const greenDominance = g - maxRB;
            const greenOverRed = g - r;
            const greenOverBlue = g - b;

            if (greenDominance > 33 || (greenOverRed > 75 && greenOverBlue > 38 && g > 95)) {
              data[i + 3] = 0;
            } else if (greenDominance > 16 || (greenOverRed > 50 && greenOverBlue > 22 && g > 80)) {
              const alpha =
                greenDominance > 16
                  ? 1 - (greenDominance - 16) / (33 - 16)
                  : 1 - (greenOverBlue - 22) / (38 - 22);
              data[i + 3] = Math.max(0, Math.min(255, Math.round(alpha * 255)));
              data[i + 1] = Math.min(g, maxRB + 10);
            }
          }
        }

        ctx.putImageData(frame, 0, 0);

        if (!hasDrawnRef.current) {
          hasDrawnRef.current = true;
          setHasDrawnFrame(true);
        }
      }

      rafIdRef.current = requestAnimationFrame(drawFrame);
    };

    const startLoop = () => {
      if (rafIdRef.current == null) {
        rafIdRef.current = requestAnimationFrame(drawFrame);
      }
    };

    const handleCanPlay = () => {
      if (autoPlay && video) {
        video.muted = muted;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Sesli oynatma engellenirse sessiz başlat
            if (!video.muted) {
              video.muted = true;
              video.play().catch(() => {});
            }
          });
        }
      }
      startLoop();
    };

    const handleVideoEnded = () => {
      if (onEndedRef.current) {
        onEndedRef.current();
      }
    };

    video.addEventListener('loadeddata', handleCanPlay);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleVideoEnded);

    if (video.readyState >= 2) {
      handleCanPlay();
    }

    const handleFirstInteraction = () => {
      if (video) {
        video.muted = muted;
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
    };

    window.addEventListener('touchstart', handleFirstInteraction, { once: true, passive: true });
    window.addEventListener('click', handleFirstInteraction, { once: true });

    return () => {
      cancelled = true;
      video.removeEventListener('loadeddata', handleCanPlay);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleVideoEnded);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [src, autoPlay, loop, muted, renderWidth, cropTop, cropBottom, isBlueKey]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Gerçek video gizli oynatılır; görünen şey aşağıdaki işlenmiş canvas'tır */}
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        // @ts-ignore
        webkit-playsinline="true"
        // @ts-ignore
        x5-playsinline="true"
        controls={false}
        disablePictureInPicture
        // @ts-ignore
        disableRemotePlayback
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        className="fixed -top-[9999px] -left-[9999px] w-px h-px opacity-0 pointer-events-none -z-50"
        style={{ background: 'transparent' }}
      />
      <canvas
        ref={canvasRef}
        className={`max-w-full max-h-full w-auto h-auto object-contain pointer-events-none select-none transition-opacity duration-200 block ${
          hasDrawnFrame ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ maxHeight: '100%', maxWidth: '100%' }}
      />
    </div>
  );
};
