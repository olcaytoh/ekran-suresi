import React from 'react';

type Accent = 'rose' | 'indigo' | 'emerald' | 'cyan' | 'amber';

const ACCENTS: Record<Accent, { tile: string; kicker: string }> = {
  rose: { tile: 'bg-rose-500/15 text-rose-600 ring-rose-500/25', kicker: 'text-rose-600' },
  indigo: { tile: 'bg-indigo-500/15 text-indigo-600 ring-indigo-500/25', kicker: 'text-indigo-600' },
  emerald: { tile: 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/25', kicker: 'text-emerald-600' },
  cyan: { tile: 'bg-cyan-500/15 text-cyan-600 ring-cyan-500/25', kicker: 'text-cyan-600' },
  amber: { tile: 'bg-amber-500/15 text-amber-600 ring-amber-500/25', kicker: 'text-amber-600' },
};

interface SectionHeadingProps {
  icon: React.ReactNode;
  /** Üstteki küçük, büyük harfli etiket (ör. KURUM YÖNETİMİ) */
  kicker?: string;
  title: string;
  subtitle?: string;
  /** Başlığın yanındaki küçük durum rozetleri */
  badges?: React.ReactNode;
  accent?: Accent;
}

/** Bölüm başlığı: ikon kutusu + küçük etiket + kalın başlık + soluk alt yazı */
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  icon,
  kicker,
  title,
  subtitle,
  badges,
  accent = 'indigo',
}) => {
  const a = ACCENTS[accent];
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={`w-11 h-11 rounded-2xl ring-1 flex items-center justify-center flex-shrink-0 ${a.tile}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        {kicker && (
          <div className={`text-[10px] font-extrabold uppercase tracking-[0.14em] ${a.kicker}`}>
            {kicker}
          </div>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="text-[15px] font-bold text-slate-900 leading-tight tracking-tight">{title}</h3>
          {badges}
        </div>
        {subtitle && (
          <p className="text-[12px] text-slate-600 font-medium leading-snug mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
