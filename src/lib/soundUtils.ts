/**
 * Web Audio API Sound Utility for tactile feedback and audio effects.
 * Zero external dependencies, zero latency, works offline.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

const STORAGE_KEY = 'app_sound_enabled';

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) !== 'false';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('app_sound_changed', { detail: enabled }));
}

export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  if (next) {
    playTapSound();
  }
  return next;
}

/**
 * Yumuşak, hoş ve taktil dokunma/tıklama efekti (35ms nazik pop/klik)
 */
export function playTapSound(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // 580Hz'den 180Hz'e hızlı iniş (tok ve temiz ahşap/cam klik hissi)
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch {
    // Ignore audio errors silently
  }
}

/**
 * +30 Dakika Ekleme Sesi (Tatlı baloncuk/su damlası tınısı)
 */
export function playAddTimeSound(stage: number = 1): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreq = Math.min(880, 480 + (stage % 14) * 25);

    // 1. Ton
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.06);

    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.08);

    // 2. Tiz Yankı
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 1.5, now + 0.03);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.1);

    gain2.gain.setValueAtTime(0.06, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.03);
    osc2.stop(now + 0.12);
  } catch {
    // Ignore
  }
}

/**
 * Yıldız Kazanma / Ekran Kullanılmadı Sesi (Büyülü parıltı çanı)
 */
export function playStarSound(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // C6, E6, G6, C7 arpej
    const notes = [1046.5, 1318.5, 1567.98, 2093.0];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = now + idx * 0.045;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.1, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.2);
    });
  } catch {
    // Ignore
  }
}

/**
 * Başarı / Onaylama Sesi (Çift uyumlu pozitif çan)
 */
export function playSuccessSound(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chords = [523.25, 659.25, 783.99]; // C Major triad

    chords.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    });
  } catch {
    // Ignore
  }
}

/**
 * Kilit Açma/Kapama Sesi (Mekanik metalik klik)
 */
export function playLockSound(isLocked: boolean): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(isLocked ? 380 : 540, now);
    osc.frequency.setValueAtTime(isLocked ? 280 : 720, now + 0.03);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch {
    // Ignore
  }
}
