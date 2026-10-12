import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TransparentMascotVideo } from './TransparentMascotVideo';

/** public klasörüne yüklenen güncelleme videosu (yeşil zeminli, zemin otomatik şeffaflaştırılır) */
export const UPDATE_VIDEO_SRC = '/guncelleme.mp4';

/** Uygulamanın Google Play Store sayfası */
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.olcico.ekransuresi';

interface UpdateAnnouncementOverlayProps {
  /** Kapatıldığında ya da Play Store açıldığında çağrılır */
  onDismiss: () => void;
}

/**
 * Yönetici "güncelleme duyurusu" gönderdiğinde tüm kullanıcılara ekranın ortasında
 * şeffaf zeminli, 1 kez oynayan video gösterir. Ekrana dokunulunca Play Store açılır.
 */
export const UpdateAnnouncementOverlay: React.FC<UpdateAnnouncementOverlayProps> = ({
  onDismiss,
}) => {
  const [ended, setEnded] = useState(false);

  const openStore = () => {
    window.open(PLAY_STORE_URL, '_blank');
    onDismiss();
  };

  return (
    <div
      onClick={openStore}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/25 backdrop-blur-[2px] animate-in fade-in duration-200 cursor-pointer select-none"
      role="button"
      tabIndex={0}
    >
      <button
        type="button"
        aria-label="Kapat"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="relative w-full max-w-[340px] sm:max-w-[400px] h-[72vh] max-h-[560px] flex items-center justify-center pointer-events-none">
        <TransparentMascotVideo
          src={UPDATE_VIDEO_SRC}
          chromaKeyType="green"
          autoPlay={true}
          loop={false}
          muted={false}
          cropTop={0.02}
          cropBottom={0.02}
          renderWidth={420}
          onEnded={() => setEnded(true)}
          className="w-full h-full drop-shadow-[0_16px_36px_rgba(0,0,0,0.45)]"
        />
      </div>

      <p
        className={`mt-3 px-4 py-2 rounded-full bg-white/90 text-slate-900 text-sm font-black shadow-lg transition-opacity ${
          ended ? 'opacity-100' : 'opacity-80'
        }`}
      >
        Güncellemek için dokunun 👆
      </p>
    </div>
  );
};