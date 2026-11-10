import { useId } from "react";

export type LumiMood = "happy" | "thinking" | "victory" | "encouraging" | "cold" | "laughing" | "angry" | "shaking";

const DK = "#2a1850";
const PAL = {
  nor: ["var(--lumi-body-light)", "var(--lumi-body-mid)", "var(--lumi-body-deep)"],
  glow: ["#fff6b0", "#ffb066", "#ff6fb0"],
  cold: ["#e3f0fb", "#a9c1e0", "#8296c6"],
  angry: ["#ffc9c9", "#ff8f9d", "#d46bd8"],
} as const satisfies Record<string, readonly [string, string, string]>;
const TENT = [
  "M62 118 Q52 150 66 175 Q76 195 62 215",
  "M86 122 Q78 152 90 178 Q98 198 86 220",
  "M114 122 Q122 152 110 178 Q102 198 114 220",
  "M138 118 Q148 150 134 175 Q124 195 138 215",
];

function Stroke({ d, w = 4.5 }: { d: string; w?: number }) {
  return <path d={d} fill="none" stroke={DK} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
}

function OpenEyes({ r = 13, lookUp = false }: { r?: number; lookUp?: boolean }) {
  const oy = lookUp ? -5 : 0;
  return (
    <>
      {[76, 124].map((cx) => (
        <g className="lumi-eye" key={cx}>
          <circle cx={cx} cy={84} r={r} fill={DK} />
          <circle cx={cx + 4} cy={79 + oy} r={5} fill="#fff" />
          <circle cx={cx - 4} cy={90 + oy} r={2.5} fill="#fff" />
        </g>
      ))}
    </>
  );
}

export function Lumi({ mood = "happy", size = 160, className = "" }: { mood?: LumiMood; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const p: readonly [string, string, string] = mood === "victory" ? PAL.glow : mood === "cold" ? PAL.cold : mood === "angry" ? PAL.angry : PAL.nor;
  const anim = mood === "victory" ? "lumi-hop" : mood === "thinking" ? "lumi-tilt" : mood === "laughing" ? "lumi-laugh" : mood === "angry" ? "lumi-rumble" : mood === "shaking" ? "lumi-shake" : mood === "cold" ? "lumi-shiver" : "lumi-float";

  let face;
  if (mood === "happy")
    face = (<><Stroke d="M64 90 Q76 72 88 90" w={5} /><Stroke d="M112 90 Q124 72 136 90" w={5} /><Stroke d="M90 104 Q100 114 110 104" /></>);
  else if (mood === "thinking")
    face = (<><OpenEyes r={11} lookUp /><Stroke d="M90 110 Q100 106 110 110" /><text x="160" y="20" fontSize="26" fill="#fff" fontWeight={900}>?</text></>);
  else if (mood === "victory")
    face = (<><Stroke d="M64 90 Q76 72 88 90" w={5} /><Stroke d="M112 90 Q124 72 136 90" w={5} /><path d="M88 102 Q100 126 112 102Z" fill={DK} /><path d="M94 112 Q100 119 106 112Z" fill="#ff6fa8" /><text x="20" y="30" fontSize="22">⭐</text><text x="160" y="40" fontSize="20">✨</text></>);
  else if (mood === "cold")
    face = (<><OpenEyes r={12} /><Stroke d="M88 112 L93 107 L99 112 L105 107 L112 112" /></>);
  else if (mood === "laughing")
    face = (<><Stroke d="M64 76 L87 86 L64 96" w={5} /><Stroke d="M136 76 L113 86 L136 96" w={5} /><path d="M78 99 Q100 134 122 99Z" fill={DK} /><path d="M89 115 Q100 126 111 115Z" fill="#ff6fa8" /><path d="M64 98 Q58 112 66 118 Q74 112 64 98Z M136 98 Q142 112 134 118 Q126 112 136 98Z" fill="#7ec8ff" /></>);
  else if (mood === "angry")
    face = (<><OpenEyes r={10} /><Stroke d="M58 64 L92 78" w={5.5} /><Stroke d="M108 78 L142 64" w={5.5} /><ellipse cx="100" cy="112" rx="11" ry="10" fill={DK} /><path d="M94 116 Q100 121 106 116Z" fill="#ff6fa8" /><path d="M138 34 Q146 36 144 44 M152 34 Q144 36 146 44 M138 54 Q146 52 144 46 M152 54 Q144 52 146 46" stroke="#ff2d3d" strokeWidth={4} fill="none" /></>);
  else if (mood === "shaking")
    face = (<><Stroke d="M62 86 L90 86 M110 86 L138 86" w={5.5} /><Stroke d="M86 110 Q93 104 100 110 T114 110" /><path d="M148 44 Q140 62 150 68 Q160 62 148 44Z" fill="#7ec8ff" /></>);
  else
    face = (<><OpenEyes r={13} /><Stroke d="M88 104 Q100 118 112 104" /><text x="150" y="30" fontSize="22">💪</text></>);

  return (
    <svg viewBox="0 -26 200 256" width={size} height={size * 1.28} className={className} role="img" aria-label={`Lumi ${mood}`} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`b${id}`} cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor={p[0]} /><stop offset=".6" stopColor={p[1]} /><stop offset="1" stopColor={p[2]} />
        </radialGradient>
        <linearGradient id={`t${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p[1]} /><stop offset="1" stopColor={p[2]} />
        </linearGradient>
      </defs>
      <circle cx="100" cy="90" r="96" fill={p[1]} opacity=".12" />
      <g className={anim}>
        <g>
          {TENT.map((d, i) => (
            <path key={i} className="lumi-t" style={{ animationDelay: `-${i * 0.6}s` }} d={d} stroke={`url(#t${id})`} strokeWidth={9} fill="none" strokeLinecap="round" />
          ))}
        </g>
        <g className="lumi-bell">
          <path d="M26 108 Q26 18 100 18 Q174 18 174 108 Q174 128 152 124 Q132 136 112 124 Q100 134 88 124 Q68 136 48 124 Q26 128 26 108Z" fill={`url(#b${id})`} />
          <ellipse cx="68" cy="45" rx="20" ry="9" fill="#fff" opacity=".55" transform="rotate(-25 68 45)" />
          <circle cx="52" cy="62" r="5" fill="#fff" opacity=".35" />
          <ellipse cx="52" cy="100" rx="11" ry="7" fill="#ff6fa8" opacity=".55" />
          <ellipse cx="148" cy="100" rx="11" ry="7" fill="#ff6fa8" opacity=".55" />
          {face}
        </g>
        {mood === "victory" && <g className="lumi-sparkles">{[18,50,150,180].map((x, i) => <rect key={x} x={x} y={i % 2 ? -5 : 10} width={7} height={12} rx={2} fill={p[i % 3]} />)}</g>}
        {mood === "laughing" && <g className="lumi-sparkles"><text x="15" y="20" fill="#fff" fontSize={18}>HA</text><text x="155" y="30" fill="#ffe066" fontSize={22}>HA</text></g>}
        {mood === "angry" && <g className="lumi-steam">{[78,100,122].map((x) => <circle key={x} cx={x} cy={8} r={7} fill="#fff" opacity={0.7} />)}</g>}
        {mood === "shaking" && <text x="64" y="-6" fill="#fff" fontSize={16}>ck ck ck…</text>}
      </g>
    </svg>
  );
}
