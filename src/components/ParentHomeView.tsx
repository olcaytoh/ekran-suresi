import React, { useState, useRef } from 'react';
import { Clock, Star } from 'lucide-react';
import { StageGaugeDial } from './StageGaugeDial';
import { TransparentMascotVideo } from './TransparentMascotVideo';

interface ParentHomeViewProps {
  currentStage: number; // 0 to 14
  onUpdateStage: (newStage: number) => Promise<void>;
  unusedDays?: number; // 0 to 7
  onUpdateUnusedDays?: (newUnusedDays: number) => Promise<void>;
  isUpdating: boolean;
  onNavigateToStages?: () => void;
  onOpenParentGuide?: () => void;
  studentName?: string;
  userId?: string;
}

export const ParentHomeView: React.FC<ParentHomeViewProps> = ({
  currentStage,
  onUpdateStage,
  unusedDays = 0,
  onUpdateUnusedDays,
  isUpdating,
  onNavigateToStages,
  studentName,
  userId,
}) => {
  const totalMinutes = currentStage * 30;
  const clampedUnusedDays = Math.min(7, Math.max(0, unusedDays || 0));
  const [isPlayingKullanVideo, setIsPlayingKullanVideo] = useState(false);
  const hasAddedStarForCurrentVideoRef = useRef(false);

  const todayKey = new Date().toISOString().slice(0, 10);
  const storageKey = `unused_day_clicked_${userId || studentName || 'default'}`;

  const [lastClickedDate, setLastClickedDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) || '';
    }
    return '';
  });

  // Eğer yıldız sayısı 0'a sıfırlandıysa veya geri alındıysa bugünkü kilidi de esnek tutalım
  const isAlreadyClickedToday = clampedUnusedDays > 0 && lastClickedDate === todayKey;

  const handleTriggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch {
        // ignore
      }
    }
  };

  const handleAddThirtyMin = async () => {
    if (currentStage >= 14 || isUpdating) return;
    handleTriggerHaptic();
    await onUpdateStage(currentStage + 1);
  };

  const finalizeUnusedDayStar = async () => {
    if (hasAddedStarForCurrentVideoRef.current) return;
    hasAddedStarForCurrentVideoRef.current = true;
    setIsPlayingKullanVideo(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, todayKey);
    }
    setLastClickedDate(todayKey);

    if (onUpdateUnusedDays && clampedUnusedDays < 7) {
      await onUpdateUnusedDays(clampedUnusedDays + 1);
    }
  };

  const handleAddUnusedDay = () => {
    if (
      clampedUnusedDays >= 7 ||
      isUpdating ||
      !onUpdateUnusedDays ||
      isPlayingKullanVideo ||
      isAlreadyClickedToday
    ) {
      return;
    }
    handleTriggerHaptic();
    hasAddedStarForCurrentVideoRef.current = false;
    setIsPlayingKullanVideo(true);
  };

  return (
    <div className="relative flex flex-col items-center justify-between gap-1.5 sm:gap-2 w-full flex-1 min-h-0 select-none">
      {/* "Kullanmadı" Butonuna Tıklanınca Şeffaf Arka Planla Oynatılan kullan.mp4 Video Katmanı */}
      {isPlayingKullanVideo && (
        <div
          onClick={finalizeUnusedDayStar}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px] animate-in fade-in duration-200 cursor-pointer"
          title="Geçmek için dokunun"
        >
          <div className="relative w-full max-w-[340px] sm:max-w-[400px] h-[72vh] max-h-[560px] flex items-center justify-center pointer-events-none">
            <TransparentMascotVideo
              src="/kullan.mp4"
              chromaKeyType="green"
              autoPlay={true}
              loop={false}
              muted={false}
              cropTop={0.02}
              cropBottom={0.02}
              renderWidth={420}
              onEnded={finalizeUnusedDayStar}
              className="w-full h-full drop-shadow-[0_16px_36px_rgba(0,0,0,0.45)]"
            />
          </div>
        </div>
      )}
      {/* Durum Dashboard Ana Cam Kartı (Glassmorphism Kart Efekti) */}
      <div
        className="relative w-full rounded-[24px] sm:rounded-[28px] px-2 sm:px-3 pt-0.5 sm:pt-1 pb-1 sm:pb-1.5 select-none flex flex-col items-center flex-1 justify-between min-h-0 overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.20)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          boxShadow:
            '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.5), inset 0 -1px 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Üstteki hafif parlama efekti */}
        <div
          className="absolute top-0 left-0 right-0 h-[40%] pointer-events-none rounded-t-[24px] sm:rounded-t-[28px]"
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.25), transparent)',
          }}
        />

        {/* 4 Kademeli Speedometer/Gauge Kadran Göstergesi (Üst Bölüm) */}
        <StageGaugeDial
          currentStage={currentStage}
          totalMinutes={totalMinutes}
          onNavigateToStages={onNavigateToStages}
          studentName={studentName}
          className="my-auto flex-shrink-0 max-w-[420px] sm:max-w-[480px] max-h-[168px] sm:max-h-[192px] w-full"
        />

        {/* İnce Cam Ayırıcı Çizgi */}
        <div className="relative z-10 w-full flex items-center justify-center my-0 px-3 flex-shrink-0">
          <div className="w-full h-[1px] bg-white/25" />
        </div>

        {/* 4 Renk Bölgesi Butonları: 11.png (kodlanmış), 11a.png, 11b.png, 11c.png (Alt Bölüm) */}
        <div className="relative z-10 w-full mb-0.5 flex-shrink-0 select-none">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-[325px] sm:max-w-[360px] mx-auto select-none">
            {/* 1. Güvenli Alan (11.png ve hemen dışındaki yeşil çizgi) */}
            <button
              type="button"
              onClick={onNavigateToStages}
              aria-label="Güvenli Alan (0-2s)"
              className={`relative flex items-center justify-center rounded-2xl p-0.5 cursor-pointer focus:outline-hidden transition-all duration-150 active:scale-95 ring-2 ring-emerald-500 ${
                currentStage <= 4
                  ? 'scale-[1.04] drop-shadow-md shadow-md shadow-emerald-500/30'
                  : 'hover:scale-[1.03] opacity-90 hover:opacity-100'
              }`}
            >
              <img
                src="/11.png"
                alt="Güvenli Alan"
                className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
                draggable={false}
              />
            </button>

            {/* 2. Dengeli Süre */}
            <button
              type="button"
              onClick={onNavigateToStages}
              aria-label="Dengeli Süre (2-4s)"
              className={`relative flex items-center justify-center rounded-2xl p-0.5 cursor-pointer focus:outline-hidden transition-all duration-150 active:scale-95 ${
                currentStage >= 5 && currentStage <= 8
                  ? 'ring-2 ring-yellow-400 scale-[1.04] drop-shadow-md shadow-md shadow-yellow-400/30'
                  : 'hover:scale-[1.03] opacity-90 hover:opacity-100'
              }`}
            >
              <img
                src="/11a.png"
                alt="Dengeli Süre"
                className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
                draggable={false}
              />
            </button>

            {/* 3. Dikkat Sınırı */}
            <button
              type="button"
              onClick={onNavigateToStages}
              aria-label="Dikkat Sınırı (4-6s)"
              className={`relative flex items-center justify-center rounded-2xl p-0.5 cursor-pointer focus:outline-hidden transition-all duration-150 active:scale-95 ${
                currentStage >= 9 && currentStage <= 13
                  ? 'scale-[1.04] drop-shadow-md'
                  : 'hover:scale-[1.03] opacity-90 hover:opacity-100'
              }`}
            >
              <img
                src="/11b.png"
                alt="Dikkat Sınırı"
                className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
                draggable={false}
              />
            </button>

            {/* 4. Kırmızı Sınır */}
            <button
              type="button"
              onClick={onNavigateToStages}
              aria-label="Kırmızı Sınır (7+s)"
              className={`relative flex items-center justify-center rounded-2xl p-0.5 cursor-pointer focus:outline-hidden transition-all duration-150 active:scale-95 ${
                currentStage >= 14
                  ? 'scale-[1.04] drop-shadow-md'
                  : 'hover:scale-[1.03] opacity-90 hover:opacity-100'
              }`}
            >
              <img
                src="/11c.png"
                alt="Kırmızı Sınır"
                className="w-full h-auto object-contain pointer-events-none drop-shadow-sm"
                draggable={false}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Alt Butonlar: +30 dk Ekle & Kullanmadı (Sayfa renkleriyle uyumlu parlak 3D jel görünümü) */}
      <div className="w-full flex items-center justify-center gap-2.5 pt-0.5 pb-1 flex-shrink-0">
        {/* 1. +30 dk Ekle Butonu (Sayfa mor/viyole temasıyla uyumlu 3D jel) */}
        <button
          type="button"
          id="btn-add-thirty-min-main"
          onClick={handleAddThirtyMin}
          disabled={currentStage >= 14 || isUpdating}
          className="relative overflow-hidden flex-1 py-2.5 sm:py-3 px-3 rounded-[22px] active:scale-95 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:outline-hidden select-none"
          style={{
            background: 'linear-gradient(180deg, #a855f7 0%, #7c3aed 48%, #4c1d95 100%)',
            border: '2px solid rgba(255, 255, 255, 0.80)',
            boxShadow:
              '0 8px 20px rgba(124, 58, 237, 0.50), 0 4px 10px rgba(0, 0, 0, 0.28), inset 0 1px 2px rgba(255, 255, 255, 0.85), inset 0 -2px 4px rgba(0, 0, 0, 0.35)',
          }}
          title={currentStage >= 14 ? 'Maksimum sınıra ulaşıldı (14/14)' : '+30 Dakika Ekle'}
        >
          {/* Üst Cam Parlama Alanı (Specular Gel Highlight) */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-1 top-0.5 h-[48%] rounded-t-[18px]"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.20) 45%, rgba(255,255,255,0) 100%)',
            }}
          />
          <Clock
            className="relative z-10 w-4 h-4 text-white shrink-0"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.65))' }}
          />
          <span
            className="relative z-10 tracking-tight whitespace-nowrap"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.65))' }}
          >
            +30 dk Ekle
          </span>
        </button>

        {/* 2. Kullanmadı Butonu (Sayfa fuşya/mürdüm temasıyla uyumlu 3D jel) */}
        <button
          type="button"
          id="btn-unused-day-main"
          onClick={handleAddUnusedDay}
          disabled={clampedUnusedDays >= 7 || isUpdating || isPlayingKullanVideo || isAlreadyClickedToday}
          className="relative overflow-hidden flex-1 py-2.5 sm:py-3 px-3 rounded-[22px] active:scale-95 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:outline-hidden select-none"
          style={{
            background: 'linear-gradient(180deg, #e879f9 0%, #c026d3 48%, #701a75 100%)',
            border: '2px solid rgba(255, 255, 255, 0.80)',
            boxShadow:
              '0 8px 20px rgba(192, 38, 211, 0.50), 0 4px 10px rgba(0, 0, 0, 0.28), inset 0 1px 2px rgba(255, 255, 255, 0.85), inset 0 -2px 4px rgba(0, 0, 0, 0.35)',
          }}
          title={
            clampedUnusedDays >= 7
              ? 'Haftalık maksimum 7 yıldız eklendi'
              : isAlreadyClickedToday
              ? 'Bugün için ekran kullanılmadı yıldızı zaten eklendi (Günde 1 kez tıklanabilir)'
              : 'Bugün ekran kullanılmadı (+1 Yıldız)'
          }
        >
          {/* Üst Cam Parlama Alanı (Specular Gel Highlight) */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-1 top-0.5 h-[48%] rounded-t-[18px]"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.20) 45%, rgba(255,255,255,0) 100%)',
            }}
          />
          <Star
            className="relative z-10 w-4 h-4 fill-amber-300 text-amber-200 shrink-0"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.65))' }}
          />
          <span
            className="relative z-10 tracking-tight whitespace-nowrap"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.65))' }}
          >
            Kullanmadı
          </span>
        </button>
      </div>
    </div>
  );
};