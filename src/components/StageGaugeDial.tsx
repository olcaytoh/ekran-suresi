import React from 'react';

interface StageGaugeDialProps {
  currentStage: number; // 0 to 14
  totalMinutes: number;
  onNavigateToStages?: () => void;
  className?: string;
}

// Polar to Cartesian coordinate converter
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
  const arcSweep = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${arcSweep} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export const StageGaugeDial: React.FC<StageGaugeDialProps> = ({
  currentStage,
  totalMinutes,
  onNavigateToStages,
  className = '',
}) => {
  const stage = Math.max(1, Math.min(14, currentStage || 1));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const spentText = `${hours > 0 ? `${hours}s ` : ''}${minutes > 0 || hours === 0 ? `${minutes}dk` : ''} harcandı`;

  // Zone Configurations matching exact design specifications
  let zoneName = 'Güvenli Alan';
  let zoneRange = '0-2';
  let zoneTitleColor = '#15803d'; // Rich forest emerald green
  let zonePrimary = '#16a34a'; // Vibrant green
  let zoneGradStart = '#22c55e';
  let zoneGradMid = '#15803d';
  let zoneGradEnd = '#0f4a25';
  let zoneGlowColor = 'rgba(22, 163, 74, 0.55)';

  if (stage >= 14) {
    zoneName = 'Kırmızı Sınır';
    zoneRange = '7+';
    zoneTitleColor = '#b91c1c';
    zonePrimary = '#dc2626';
    zoneGradStart = '#ef4444';
    zoneGradMid = '#b91c1c';
    zoneGradEnd = '#7f1d1d';
    zoneGlowColor = 'rgba(220, 38, 38, 0.55)';
  } else if (stage >= 9) {
    zoneName = 'Dikkat Sınırı';
    zoneRange = '4-6';
    zoneTitleColor = '#c2410c';
    zonePrimary = '#ea580c';
    zoneGradStart = '#f97316';
    zoneGradMid = '#c2410c';
    zoneGradEnd = '#7c2d12';
    zoneGlowColor = 'rgba(234, 88, 12, 0.55)';
  } else if (stage >= 5) {
    zoneName = 'Dengeli Süre';
    zoneRange = '2-4';
    zoneTitleColor = '#b45309';
    zonePrimary = '#d97706';
    zoneGradStart = '#f59e0b';
    zoneGradMid = '#b45309';
    zoneGradEnd = '#78350f';
    zoneGlowColor = 'rgba(217, 119, 6, 0.55)';
  }

  // Dial Geometry Parameters in 780 x 400 coordinate space
  const cx = 570;
  const cy = 200;
  const rBand = 140; // Center radius of white track
  const rOuterRim = 168; // Outer radius of colored arcs
  const startAngle = -140;
  const endAngle = 140;
  const totalAngleSpan = endAngle - startAngle; // 280°

  // 14 Stage points along the circular band
  const stagesData = Array.from({ length: 14 }, (_, i) => {
    const s = i + 1;
    const angle = startAngle + ((s - 0.5) / 14) * totalAngleSpan;
    const pt = polarToCartesian(cx, cy, rBand, angle);
    const tickInner = polarToCartesian(cx, cy, 155, angle);
    const tickOuter = polarToCartesian(cx, cy, 162, angle);
    return {
      stage: s,
      angle,
      pt,
      tickInner,
      tickOuter,
      formatted: s < 10 ? `0${s}` : `${s}`,
      isActive: s === stage,
    };
  });

  // Needle trigonometry based on active stage
  const activeStageData = stagesData.find((item) => item.stage === stage) || stagesData[3];
  const targetX = activeStageData.pt.x;
  const targetY = activeStageData.pt.y;

  // The needle pivot hub is located inside the left rounded end of the glossy pill badge
  const pivotX = 518;
  const pivotY = 200;

  const dx = targetX - pivotX;
  const dy = targetY - pivotY;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;

  return (
    <div
      onClick={onNavigateToStages}
      className={`relative w-full max-w-[580px] mx-auto select-none cursor-pointer group active:scale-[0.99] transition-transform duration-200 ${className}`}
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
      <svg
        viewBox="0 0 780 400"
        className="w-full h-auto overflow-visible select-none drop-shadow-[0_14px_36px_rgba(0,0,0,0.30)]"
        aria-hidden="true"
      >
        <defs>
          {/* Main Card Drop Shadow */}
          <filter id="card-soft-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodOpacity="0.22" floodColor="#000000" />
          </filter>

          {/* Capsule Pill Elevation Shadow */}
          <filter id="pill-depth-shadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="12" stdDeviation="10" floodOpacity="0.35" floodColor="#000000" />
          </filter>

          {/* Pivot Dome Shadow */}
          <filter id="hub-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodOpacity="0.4" floodColor="#000000" />
          </filter>

          {/* Needle Shadow */}
          <filter id="needle-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.25" floodColor="#000000" />
          </filter>

          {/* Needle Tip Halo Glow */}
          <filter id="tip-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Active Number Glow */}
          <filter id="active-num-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.4" floodColor={zonePrimary} />
          </filter>

          {/* White Satin Card Face Gradient */}
          <linearGradient id="white-card-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#fafcff" />
            <stop offset="100%" stopColor="#eef2f6" />
          </linearGradient>

          {/* White Dial Track Face Gradient */}
          <linearGradient id="white-dial-face" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          {/* Outer Chrome Bezel for Pill */}
          <linearGradient id="chrome-bezel-outer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#cbd5e1" />
            <stop offset="60%" stopColor="#64748b" />
            <stop offset="85%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Inner Chrome Bezel for Pill */}
          <linearGradient id="chrome-bezel-inner" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* 3D Glossy Jelly Gradient for Pill */}
          <linearGradient id="pill-body-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={zoneGradStart} />
            <stop offset="45%" stopColor={zoneGradMid} />
            <stop offset="100%" stopColor={zoneGradEnd} />
          </linearGradient>

          {/* Top Glass Specular Shine for Pill */}
          <linearGradient id="pill-glass-specular" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>

          {/* Pivot Dome Chrome Gradient */}
          <radialGradient id="hub-dome-chrome" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#cbd5e1" />
            <stop offset="75%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </radialGradient>

          {/* Needle Shaft Chrome Gradient */}
          <linearGradient id="needle-shaft-chrome" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#cbd5e1" />
            <stop offset="65%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Card Top Bevel Specular Line */}
          <linearGradient id="card-top-shine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="80%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* 1. OUTER COLORED ARC TRACKS (Green, Amber, Orange, Red) */}
        {/* Green Section: Stages 1 to 4 (-140° to -48°) */}
        <path
          d={describeArc(cx, cy, rOuterRim, -140, -48)}
          fill="none"
          stroke="#16834b"
          strokeWidth="15"
          strokeLinecap="round"
        />

        {/* Amber / Yellow Section: Stages 5 to 8 (-42° to 24°) */}
        <path
          d={describeArc(cx, cy, rOuterRim, -42, 24)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="15"
          strokeLinecap="round"
        />

        {/* Orange Section: Stages 9 to 13 (30° to 98°) */}
        <path
          d={describeArc(cx, cy, rOuterRim, 30, 98)}
          fill="none"
          stroke="#ea580c"
          strokeWidth="15"
          strokeLinecap="round"
        />

        {/* Red Section: Stage 14 (104° to 140°) */}
        <path
          d={describeArc(cx, cy, rOuterRim, 104, 140)}
          fill="none"
          stroke="#dc2626"
          strokeWidth="15"
          strokeLinecap="round"
        />

        {/* 2. MAIN UNIFIED WHITE BODY SHAPE (Integrated Left Banner Card & Circular Dial) */}
        <g filter="url(#card-soft-shadow)">
          {/* Base Circular Dial Ring Face */}
          <path
            d={describeArc(cx, cy, rBand, startAngle - 2, endAngle + 2)}
            fill="none"
            stroke="url(#white-dial-face)"
            strokeWidth="42"
            strokeLinecap="round"
          />

          {/* Inner Accent Hairline on Dial */}
          <path
            d={describeArc(cx, cy, 119, startAngle, endAngle)}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeOpacity="0.7"
          />

          {/* Left Horizontal White Satin Banner Card (Blending seamlessly into the dial) */}
          <rect
            x="48"
            y="126"
            width="535"
            height="148"
            rx="30"
            fill="url(#white-card-gradient)"
          />

          {/* Subtle Top Specular Shine on Left Card */}
          <path
            d="M 78 127 H 560"
            stroke="url(#card-top-shine)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* 3. RADIAL TICK MARKS ON DIAL RIM */}
        {stagesData.map(({ stage: s, tickInner, tickOuter }) => (
          <line
            key={`tick-${s}`}
            x1={tickInner.x.toFixed(2)}
            y1={tickInner.y.toFixed(2)}
            x2={tickOuter.x.toFixed(2)}
            y2={tickOuter.y.toFixed(2)}
            stroke="#aeb9c6"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ))}

        {/* 4. STAGE NUMBERS (01 to 14) ALONG THE CIRCULAR ARC */}
        {stagesData.map(({ stage: s, pt, angle, formatted, isActive }) => {
          return (
            <text
              key={`num-${s}`}
              x={pt.x.toFixed(2)}
              y={pt.y.toFixed(2)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isActive ? zonePrimary : '#1e293b'}
              fontSize={isActive ? '19' : '16'}
              fontWeight="900"
              fontFamily="Nunito, system-ui, -apple-system, sans-serif"
              filter={isActive ? 'url(#active-num-glow)' : undefined}
              transform={`rotate(${(angle + 90).toFixed(2)} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)})`}
            >
              {formatted}
            </text>
          );
        })}

        {/* 6. CENTER-RIGHT 3D GLOSSY CAPSULE PILL BADGE (0-2 SAAT) */}
        <g filter="url(#pill-depth-shadow)">
          {/* Outer Chrome Bezel Border */}
          <rect
            x="465"
            y="136"
            width="282"
            height="128"
            rx="64"
            fill="none"
            stroke="url(#chrome-bezel-outer)"
            strokeWidth="6"
          />

          {/* Inner Chrome Bezel Border */}
          <rect
            x="468"
            y="139"
            width="276"
            height="122"
            rx="61"
            fill="none"
            stroke="url(#chrome-bezel-inner)"
            strokeWidth="2.5"
          />

          {/* Main 3D Glossy Color Body */}
          <rect
            x="470"
            y="141"
            width="272"
            height="118"
            rx="59"
            fill="url(#pill-body-gradient)"
          />

          {/* Top Glass Specular Shine (Realistic Curved Gel Highlight) */}
          <path
            d="M 474 194 C 474 153 502 143 540 143 H 672 C 710 143 738 153 738 194 Q 606 164 474 194 Z"
            fill="url(#pill-glass-specular)"
          />

          {/* Subtle Bottom Ambient Inner Reflection */}
          <path
            d="M 500 252 Q 606 242 712 252"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.3"
          />
        </g>

        {/* 5. 3D CHROME NEEDLE / POINTER EXTENDING FROM PIVOT TO ACTIVE STAGE (Üst Katmanda) */}
        <g
          className="transition-all duration-500 ease-out"
          style={{ transformOrigin: `${pivotX}px ${pivotY}px` }}
        >
          {/* Needle Drop Shadow */}
          <line
            x1={pivotX}
            y1={pivotY}
            x2={targetX}
            y2={targetY}
            stroke="#000000"
            strokeOpacity="0.28"
            strokeWidth="10"
            strokeLinecap="round"
            transform="translate(0, 5)"
          />

          {/* Needle Chrome Body (Tapered 3D Metallic Polygon) */}
          <polygon
            points={`
              ${(pivotX + perpX * 5.5).toFixed(2)},${(pivotY + perpY * 5.5).toFixed(2)}
              ${(targetX + perpX * 2.2).toFixed(2)},${(targetY + perpY * 2.2).toFixed(2)}
              ${(targetX - perpX * 2.2).toFixed(2)},${(targetY - perpY * 2.2).toFixed(2)}
              ${(pivotX - perpX * 5.5).toFixed(2)},${(pivotY - perpY * 5.5).toFixed(2)}
            `}
            fill="url(#needle-shaft-chrome)"
            filter="url(#needle-shadow)"
          />

          {/* Center Specular Highlight Line down the Needle */}
          <line
            x1={pivotX}
            y1={pivotY}
            x2={targetX}
            y2={targetY}
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Glowing Circular Ring Pointer at the Needle Tip */}
          <circle
            cx={targetX}
            cy={targetY}
            r="12"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.2"
            filter="url(#tip-glow)"
          />
          <circle
            cx={targetX}
            cy={targetY}
            r="12"
            fill="none"
            stroke={zonePrimary}
            strokeWidth="2"
          />
          <circle
            cx={targetX}
            cy={targetY}
            r="4.2"
            fill="#ffffff"
          />
        </g>

        {/* 7. CHROME NEEDLE PIVOT HUB DOME (Anchored inside left lobe of pill badge) */}
        <g filter="url(#hub-shadow)">
          {/* Chrome Base Ring */}
          <circle
            cx={pivotX}
            cy={pivotY}
            r="23"
            fill="#e2e8f0"
            stroke="#ffffff"
            strokeWidth="2.5"
          />
          {/* 3D Chrome Dome */}
          <circle
            cx={pivotX}
            cy={pivotY}
            r="16.5"
            fill="url(#hub-dome-chrome)"
          />
          {/* Specular Glint Reflection */}
          <ellipse
            cx={pivotX - 4.5}
            cy={pivotY - 4.5}
            rx="4.5"
            ry="3.2"
            fill="#ffffff"
            opacity="0.9"
          />
          {/* Center Pin Axis */}
          <circle
            cx={pivotX}
            cy={pivotY}
            r="4.5"
            fill="#1e293b"
          />
        </g>

        {/* 8. TIME RANGE & "SAAT" TEXT INSIDE CAPSULE PILL */}
        <g>
          {/* Large Time Range Number (e.g. 0-2 / 2-4 / 4-6 / 7+) */}
          <text
            x="646"
            y="190"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ffffff"
            fontSize="54"
            fontWeight="900"
            fontFamily="Nunito, system-ui, -apple-system, sans-serif"
            letterSpacing="-0.02em"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            }}
          >
            {zoneRange}
          </text>

          {/* Unit Label: "SAAT" */}
          <text
            x="646"
            y="234"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ffffff"
            fontSize="21"
            fontWeight="900"
            fontFamily="Nunito, system-ui, -apple-system, sans-serif"
            letterSpacing="0.22em"
            style={{
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
            }}
          >
            SAAT
          </text>
        </g>

        {/* 9. LEFT BANNER SECTION CONTENT */}
        <g>
          {/* Zone Title: "Güvenli Alan" / "Dengeli Süre" / "Dikkat Sınırı" / "Kırmızı Sınır" */}
          <text
            x="84"
            y="185"
            fill={zoneTitleColor}
            fontSize="38"
            fontWeight="900"
            fontFamily="Nunito, system-ui, -apple-system, sans-serif"
            letterSpacing="-0.02em"
            style={{
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.06))',
            }}
          >
            {zoneName}
          </text>

          {/* Subtitle Row: "Kademe X" Pill Badge + Divider + Duration Text */}
          {/* Kademe Pill Badge */}
          <rect
            x="84"
            y="214"
            width="122"
            height="34"
            rx="17"
            fill={zonePrimary}
          />
          <text
            x="145"
            y="232"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ffffff"
            fontSize="16"
            fontWeight="800"
            fontFamily="Nunito, system-ui, -apple-system, sans-serif"
          >
            Kademe {stage}
          </text>

          {/* Vertical Separator Line */}
          <line
            x1="222"
            y1="219"
            x2="222"
            y2="243"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Spent Duration Text */}
          <text
            x="238"
            y="232"
            dominantBaseline="central"
            fill="#475569"
            fontSize="18"
            fontWeight="700"
            fontFamily="Nunito, system-ui, -apple-system, sans-serif"
          >
            {spentText}
          </text>
        </g>
      </svg>
    </div>
  );
};
