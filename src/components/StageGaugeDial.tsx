import React from 'react';

interface StageGaugeDialProps {
  currentStage: number; // 1 - 14
  totalMinutes: number;
  onNavigateToStages?: () => void;
  className?: string;
}

// Polar to Cartesian helper (angles in degrees, 0 = 3 o'clock)
function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

// SVG Arc path generator
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', r, r, 0, arcSweep, 1, end.x, end.y].join(' ');
}

export const StageGaugeDial: React.FC<StageGaugeDialProps> = ({
  currentStage,
  totalMinutes,
  onNavigateToStages,
  className = '',
}) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Active Zone configuration based on currentStage
  let zoneName = 'güvenli alan';
  let zoneTimeRange = '0-2';
  let zoneColor = '#16a34a'; // Vibrant emerald green
  let zoneBadgeBg = 'from-[#16a34a] via-[#15803d] to-[#14532d]'; // Green gradient for Güvenli Alan
  let zoneTextColor = '#15803d'; // Green title
  let zoneShadowColor = 'rgba(21, 128, 61, 0.45)';

  if (currentStage >= 14) {
    zoneName = 'kırmızı sınır';
    zoneTimeRange = '7+';
    zoneColor = '#dc2626';
    zoneBadgeBg = 'from-[#dc2626] via-[#b91c1c] to-[#7f1d1d]';
    zoneTextColor = '#b91c1c';
    zoneShadowColor = 'rgba(220, 38, 38, 0.45)';
  } else if (currentStage >= 9) {
    zoneName = 'dikkat sınırı';
    zoneTimeRange = '4-6';
    zoneColor = '#ea580c';
    zoneBadgeBg = 'from-[#f97316] via-[#ea580c] to-[#9a3412]';
    zoneTextColor = '#c2410c';
    zoneShadowColor = 'rgba(234, 88, 12, 0.45)';
  } else if (currentStage >= 5) {
    zoneName = 'dengeli süre';
    zoneTimeRange = '2-4';
    zoneColor = '#d97706';
    zoneBadgeBg = 'from-[#f59e0b] via-[#d97706] to-[#78350f]';
    zoneTextColor = '#b45309';
    zoneShadowColor = 'rgba(217, 119, 6, 0.45)';
  } else {
    // Stage 1 - 4: Güvenli Alan -> Yeşil (Green)
    zoneName = 'güvenli alan';
    zoneTimeRange = '0-2';
    zoneColor = '#16a34a';
    zoneBadgeBg = 'from-[#16a34a] via-[#15803d] to-[#14532d]';
    zoneTextColor = '#15803d';
    zoneShadowColor = 'rgba(21, 128, 61, 0.45)';
  }

  // Dial Geometry Parameters in 340x200 coordinate space
  const cx = 222;
  const cy = 100;
  const rOuter = 88;
  const rBand = 75;
  const rInner = 62;

  // 4 Zone arc angle boundaries (total span -128° to +128°)
  const startAngle = -128;
  const endAngle = 128;
  const totalAngleSpan = endAngle - startAngle; // 256°

  // 4 Zone segment definitions along the outer rim
  const zonesConfig = [
    { id: 1, name: 'Güvenli Alan', start: -128, end: -58, color: '#15803d', trackColor: '#166534' },
    { id: 2, name: 'Dengeli Süre', start: -54, end: 14, color: '#ca8a04', trackColor: '#854d0e' },
    { id: 3, name: 'Dikkat Sınırı', start: 18, end: 104, color: '#ea580c', trackColor: '#9a3412' },
    { id: 4, name: 'Kırmızı Sınır', start: 108, end: 128, color: '#dc2626', trackColor: '#991b1b' },
  ];

  // 14 Stage points along the band
  const stageAngles: { stage: number; angle: number; x: number; y: number; color: string }[] = [];
  for (let s = 1; s <= 14; s++) {
    // Normalized center angle for each stage
    const angle = startAngle + ((s - 0.5) / 14) * totalAngleSpan;
    const pt = polarToCartesian(cx, cy, rBand, angle);
    let color = '#15803d';
    if (s >= 14) color = '#b91c1c';
    else if (s >= 9) color = '#c2410c';
    else if (s >= 5) color = '#a16207';

    stageAngles.push({ stage: s, angle, x: pt.x, y: pt.y, color });
  }

  // Normalize currentStage for dial calculations (1-14, with 0 handled gracefully)
  const effectiveStage = Math.max(1, Math.min(14, currentStage || 1));

  // Current stage active angle for needle/pointer
  const activeStageObj = stageAngles.find((item) => item.stage === effectiveStage) || stageAngles[0];
  const activeAngle = activeStageObj.angle;
  const needleInner = polarToCartesian(cx, cy, rInner + 2, activeAngle);
  const needleOuter = polarToCartesian(cx, cy, rOuter + 4, activeAngle);

  return (
    <div
      onClick={onNavigateToStages}
      className={`relative w-full max-w-[340px] sm:max-w-[370px] h-[180px] sm:h-[200px] flex items-center justify-center mx-auto cursor-pointer group select-none transition-transform duration-200 active:scale-[0.98] ${className}`}
      title="Detaylı kademeleri görmek için tıklayın"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onNavigateToStages) {
          e.preventDefault();
          onNavigateToStages();
        }
      }}
    >
      {/* SVG Arc Gauge Dial */}
      <svg
        viewBox="0 0 340 200"
        className="w-full h-full drop-shadow-[0_8px_20px_rgba(0,0,0,0.30)] overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Dial Background Shadow */}
          <filter id="gauge-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.28" floodColor="#000" />
          </filter>

          {/* Glow filter for active stage */}
          <filter id="active-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Metallic / Satin Gradient for Dial Face */}
          <linearGradient id="white-band-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#fdfdfd" />
            <stop offset="100%" stopColor="#eaeef3" />
          </linearGradient>

          {/* Inner Accent Line Gradient (Dynamic matching active zone) */}
          <linearGradient id="inner-accent-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={zoneColor} stopOpacity="0.5" />
            <stop offset="50%" stopColor={zoneColor} stopOpacity="1" />
            <stop offset="100%" stopColor={zoneColor} stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* 1. Base White Dial Band (with soft bevel shadow) */}
        <path
          d={describeArc(cx, cy, rBand, startAngle - 2, endAngle + 2)}
          fill="none"
          stroke="url(#white-band-gradient)"
          strokeWidth="24"
          strokeLinecap="round"
          filter="url(#gauge-shadow)"
        />

        {/* 2. Outer 4-Zone Segments (Representing the 4 stages / kademeler) */}
        {zonesConfig.map((z) => (
          <path
            key={z.id}
            d={describeArc(cx, cy, rOuter, z.start, z.end)}
            fill="none"
            stroke={z.color}
            strokeWidth="7"
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        ))}

        {/* 3. Inner Red/Crimson Accent Track (matching the uploaded reference image) */}
        <path
          d={describeArc(cx, cy, rInner, startAngle + 4, endAngle - 4)}
          fill="none"
          stroke="url(#inner-accent-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* 4. Subtle Tick Marks between stages */}
        {stageAngles.map((pt, idx) => {
          if (idx === 0 || idx === 13) return null;
          const tickInner = polarToCartesian(cx, cy, rBand + 9, pt.angle);
          const tickOuter = polarToCartesian(cx, cy, rBand + 11.5, pt.angle);
          return (
            <line
              key={`tick-${pt.stage}`}
              x1={tickInner.x}
              y1={tickInner.y}
              x2={tickOuter.x}
              y2={tickOuter.y}
              stroke="#cbd5e1"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          );
        })}

        {/* 5. Stage Numbers along the curve (01, 02, ..., 14 with 2 digits) */}
        {stageAngles.map((pt) => {
          const formattedNum = pt.stage < 10 ? `0${pt.stage}` : `${pt.stage}`;
          const isCurrent = pt.stage === currentStage;
          // Rotate text tangent to the circle
          const rotationAngle = pt.angle + 90;

          return (
            <g
              key={`stage-${pt.stage}`}
              transform={`rotate(${rotationAngle}, ${pt.x}, ${pt.y})`}
            >
              {isCurrent && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="9"
                  fill={zoneColor}
                  opacity="0.22"
                  filter="url(#active-glow)"
                />
              )}
              <text
                x={pt.x}
                y={pt.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isCurrent ? pt.color : '#1e293b'}
                fontSize={isCurrent ? '11.5' : '10'}
                fontWeight={isCurrent ? '900' : '800'}
                fontFamily="system-ui, -apple-system, sans-serif"
                style={{
                  letterSpacing: '-0.5px',
                  filter: isCurrent ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' : undefined,
                }}
              >
                {formattedNum}
              </text>
            </g>
          );
        })}

        {/* 6. Active Pointer / Glowing Indicator Tick on the Dial */}
        <g filter="url(#active-glow)">
          <line
            x1={needleInner.x}
            y1={needleInner.y}
            x2={needleOuter.x}
            y2={needleOuter.y}
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle
            cx={needleOuter.x}
            cy={needleOuter.y}
            r="3"
            fill={zoneColor}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        </g>
      </svg>

      {/* Floating Horizontal Badge (Overlaid across the arc gauge, as in the user's reference image) */}
      <div className="absolute inset-0 flex items-center justify-start pointer-events-none px-1.5 sm:px-3">
        <div className="relative flex items-center w-full max-w-[325px] sm:max-w-[350px]">
          {/* Left Section: Satin White Metallic Card */}
          <div
            className="flex-1 h-[68px] sm:h-[74px] rounded-l-[22px] sm:rounded-l-[26px] rounded-r-none pl-3.5 sm:pl-4 pr-3 flex flex-col justify-center border border-white/90 border-r-0 shadow-[0_10px_25px_-4px_rgba(0,0,0,0.25)] relative z-10"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 60%, rgba(241,245,249,0.92) 100%)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* Title: güvenli alan / dengeli süre / dikkat sınırı / kırmızı sınır */}
            <span
              className="text-lg sm:text-[21px] font-black tracking-tight leading-none capitalize whitespace-nowrap truncate"
              style={{ color: zoneTextColor }}
            >
              {zoneName}
            </span>

            {/* Subline: Harcanan süre / Kademe bilgisi */}
            <div className="flex items-center gap-1.5 mt-1 text-[10px] sm:text-[11px] font-bold text-slate-500 whitespace-nowrap">
              <span
                className="font-extrabold px-1.5 py-0.5 rounded-md text-white text-[9.5px] leading-none transition-colors duration-300"
                style={{ backgroundColor: zoneColor }}
              >
                Kademe {currentStage}
              </span>
              <span>·</span>
              <span>
                {hours > 0 ? `${hours}s ` : ''}
                {minutes > 0 || hours === 0 ? `${minutes}dk` : ''} harcandı
              </span>
            </div>
          </div>

          {/* Right Section: Glossy 3D Pill Badge (0-2 saat / 2-4 saat vb. - Dynamic Zone Color) */}
          <div
            className={`w-[78px] sm:w-[86px] h-[74px] sm:h-[82px] rounded-[20px] sm:rounded-[24px] bg-gradient-to-br ${zoneBadgeBg} flex flex-col items-center justify-center text-white relative z-20 -ml-2.5 flex-shrink-0 select-none overflow-hidden transition-all duration-300`}
            style={{
              boxShadow: `0 10px 24px -3px ${zoneShadowColor}, inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.35)`,
            }}
          >
            {/* Gloss highlight on top half of badge */}
            <div
              className="absolute top-0 left-0 right-0 h-[45%] rounded-t-[20px] sm:rounded-t-[24px] pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 70%, transparent 100%)',
              }}
            />

            {/* Time range: 0-2 / 2-4 / 4-6 / 7+ */}
            <span className="relative z-10 text-2xl sm:text-[26px] font-black tracking-tight leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {zoneTimeRange}
            </span>

            {/* Unit: saat */}
            <span className="relative z-10 text-[11px] sm:text-xs font-black tracking-wider uppercase opacity-95 leading-tight mt-0.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
              saat
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
