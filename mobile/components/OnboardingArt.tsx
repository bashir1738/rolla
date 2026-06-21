import React from 'react';
import Svg, {
  Circle, Ellipse, Rect, Path, G, Defs, LinearGradient, Stop, Line,
} from 'react-native-svg';

// Brand palette
const FOREST = '#1A3C2B';
const GOLD = '#D4A017';
const CREAM = '#FAF6EE';
const TERRACOTTA = '#C1440E';
const SAGE = '#8FA98C';
const CARD = '#FFFFFF';

// Warm brown skin tones (varied so the group reads as diverse Black people)
const SKINS = ['#6F4A2F', '#8B5A2B', '#5C3A21', '#7A4E2D', '#4E3320'];
const HAIR = '#241409';

/**
 * Flat-illustration person with natural/afro hair and brown skin.
 * Drawn in a 100x120 local space; scale via the parent <G transform>.
 */
function Person({
  x = 0, y = 0, scale = 1, skin = SKINS[0], top = FOREST, hair = HAIR, hairStyle = 'afro',
}: {
  x?: number; y?: number; scale?: number; skin?: string; top?: string; hair?: string;
  hairStyle?: 'afro' | 'braids' | 'fade';
}) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* shoulders / top */}
      <Path d="M14,118 C14,86 30,76 50,76 C70,76 86,86 86,118 Z" fill={top} />
      <Path d="M14,118 C14,86 30,76 50,76 C70,76 86,86 86,118 Z" fill={top} />
      {/* neck */}
      <Rect x="42" y="60" width="16" height="22" rx="7" fill={skin} />

      {/* hair back layer */}
      {hairStyle === 'afro' && <Circle cx="50" cy="34" r="32" fill={hair} />}
      {hairStyle === 'fade' && <Path d="M20,40 C20,12 80,12 80,40 C80,30 20,30 20,40 Z" fill={hair} />}
      {hairStyle === 'braids' && (
        <>
          <Circle cx="50" cy="30" r="28" fill={hair} />
          {[26, 38, 50, 62, 74].map((bx) => (
            <Rect key={bx} x={bx - 2} y="50" width="4" height="26" rx="2" fill={hair} />
          ))}
        </>
      )}

      {/* face */}
      <Circle cx="50" cy="42" r="23" fill={skin} />

      {/* hair front (hairline) */}
      {hairStyle === 'afro' && (
        <Path d="M27,40 C27,20 73,20 73,40 C66,30 34,30 27,40 Z" fill={hair} />
      )}

      {/* simple friendly face */}
      <Circle cx="42" cy="42" r="2.6" fill={FOREST} />
      <Circle cx="58" cy="42" r="2.6" fill={FOREST} />
      <Path d="M43,50 Q50,56 57,50" stroke={FOREST} strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </G>
  );
}

// Coin with a subtle inner ring
function Coin({ cx, cy, r = 12 }: { cx: number; cy: number; r?: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={GOLD} />
      <Circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke={CREAM} strokeWidth={r * 0.14} opacity={0.7} />
    </G>
  );
}

// ── Scene 1: Savings circle — a group of Black people behind a gold pot ────────
export function SavingsCircleArt({ size = 300 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 320 300">
      {/* soft ground */}
      <Ellipse cx="160" cy="248" rx="128" ry="26" fill={FOREST} opacity={0.06} />

      {/* people */}
      <Person x={26}  y={36}  scale={1.0} skin={SKINS[1]} top={TERRACOTTA} hairStyle="afro" />
      <Person x={196} y={36}  scale={1.0} skin={SKINS[2]} top={SAGE} hairStyle="braids" />
      <Person x={112} y={6}   scale={1.15} skin={SKINS[0]} top={FOREST} hairStyle="afro" />

      {/* coins dropping into the pot */}
      <Coin cx={160} cy={150} r={11} />
      <Coin cx={188} cy={128} r={8} />
      <Coin cx={132} cy={132} r={7} />

      {/* pot */}
      <G>
        {/* rim */}
        <Rect x="96" y="168" width="128" height="26" rx="13" fill={GOLD} />
        {/* body */}
        <Path d="M104,186 C104,250 120,278 160,278 C200,278 216,250 216,186 Z" fill={GOLD} />
        {/* fill line / shading */}
        <Path d="M111,210 C120,250 134,272 160,272 C186,272 200,250 209,210 Z" fill="#B8890F" opacity={0.5} />
        {/* handles */}
        <Circle cx="98" cy="210" r="16" fill="none" stroke={GOLD} strokeWidth="9" />
        <Circle cx="222" cy="210" r="16" fill="none" stroke={GOLD} strokeWidth="9" />
      </G>
    </Svg>
  );
}

// ── Scene 2: Growth — a Black person beside a rising chart + coins ─────────────
export function GrowthArt({ size = 300 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 320 300">
      <Ellipse cx="160" cy="258" rx="128" ry="24" fill={FOREST} opacity={0.06} />

      {/* chart card */}
      <Rect x="150" y="70" width="150" height="150" rx="20" fill={CARD} stroke="#E7DFCD" strokeWidth="2" />
      {/* bars */}
      <Rect x="170" y="160" width="22" height="40" rx="6" fill={SAGE} />
      <Rect x="202" y="132" width="22" height="68" rx="6" fill={GOLD} />
      <Rect x="234" y="100" width="22" height="100" rx="6" fill={FOREST} />
      {/* trend line */}
      <Path d="M170,150 L205,124 L240,92" stroke={TERRACOTTA} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="240" cy="92" r="6" fill={TERRACOTTA} />

      {/* person */}
      <Person x={28} y={70} scale={1.4} skin={SKINS[0]} top={FOREST} hairStyle="afro" />

      {/* coin stack */}
      <Coin cx={120} cy={250} r={14} />
      <Coin cx={120} cy={236} r={14} />
      <Coin cx={120} cy={222} r={14} />
    </Svg>
  );
}

// ── Scene 3: Trust — a Black person with a shield/lock ─────────────────────────
export function TrustArt({ size = 300 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 320 300">
      <Ellipse cx="160" cy="258" rx="128" ry="24" fill={FOREST} opacity={0.06} />

      {/* person */}
      <Person x={36} y={62} scale={1.45} skin={SKINS[3]} top={SAGE} hairStyle="braids" />

      {/* shield */}
      <G>
        <Path
          d="M214,70 L280,92 C280,150 256,196 214,214 C172,196 148,150 148,92 Z"
          fill={FOREST}
        />
        <Path
          d="M214,70 L280,92 C280,150 256,196 214,214 C172,196 148,150 148,92 Z"
          fill="none" stroke={GOLD} strokeWidth="3"
        />
        {/* lock body */}
        <Rect x="194" y="128" width="40" height="34" rx="7" fill={GOLD} />
        {/* shackle */}
        <Path d="M201,128 L201,118 C201,108 227,108 227,118 L227,128" fill="none" stroke={GOLD} strokeWidth="6" />
        {/* keyhole */}
        <Circle cx="214" cy="142" r="5" fill={FOREST} />
        <Rect x="212" y="144" width="4" height="10" rx="2" fill={FOREST} />
      </G>
    </Svg>
  );
}
