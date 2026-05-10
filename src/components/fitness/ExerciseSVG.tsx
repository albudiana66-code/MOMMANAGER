import React from 'react';

const P = '#E91E8C';
const W = 'rgba(255,255,255,0.90)';
const D = 'rgba(255,255,255,0.28)';

// Filled rounded-rect limb, centered at (x,y), rotated by a°
function Limb({ x, y, w, h, a = 0, f = W, r }: {
  x: number; y: number; w: number; h: number; a?: number; f?: string; r?: number;
}) {
  const rx = r ?? Math.min(w / 2, 5.5);
  return (
    <rect
      x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} fill={f}
      transform={`translate(${x},${y})${a ? ` rotate(${a})` : ''}`}
    />
  );
}

// Head (filled circle)
function Hd({ x, y, r = 10, f = W }: { x: number; y: number; r?: number; f?: string }) {
  return <circle cx={x} cy={y} r={r} fill={f} />;
}

// Divider + labels
function Frame({ muscle }: { muscle: string }) {
  return (
    <>
      <line x1="131" y1="8" x2="131" y2="104" stroke={D} strokeWidth={0.5} />
      <text x="65" y="110" textAnchor="middle" fontSize="7.5" fill={D} fontWeight="700">START</text>
      <text x="197" y="110" textAnchor="middle" fontSize="7.5" fill={D} fontWeight="700">END</text>
      <text x="130" y="6" textAnchor="middle" fontSize="7" fill={P} fontWeight="600">{muscle.toUpperCase()}</text>
    </>
  );
}

// ── Reusable standing figure (local coords, head at 0,14 — ground at y≈104) ──
interface SC {
  arm?: string; leg?: string; torso?: string;
  armL?: string; armR?: string; foreL?: string; foreR?: string;
  thighL?: string; thighR?: string; calfL?: string; calfR?: string;
}
function Stand(c: SC = {}) {
  const { arm = W, leg = W, torso = W } = c;
  const al = c.armL ?? arm; const ar = c.armR ?? arm;
  const fl = c.foreL ?? arm; const fr = c.foreR ?? arm;
  const tl = c.thighL ?? leg; const tr = c.thighR ?? leg;
  const cl = c.calfL ?? leg; const cr = c.calfR ?? leg;
  return (
    <>
      <Hd x={0} y={14} />
      <Limb x={0} y={26} w={8} h={10} f={torso} />
      <Limb x={0} y={38} w={22} h={20} r={6} f={torso} />
      <Limb x={0} y={53} w={20} h={14} r={5} f={torso} />
      <Limb x={-16} y={37} w={9} h={22} a={9} f={al} />
      <Limb x={16} y={37} w={9} h={22} a={-9} f={ar} />
      <Limb x={-20} y={57} w={8} h={20} a={5} f={fl} />
      <Limb x={20} y={57} w={8} h={20} a={-5} f={fr} />
      <Limb x={-9} y={67} w={11} h={26} a={3} f={tl} />
      <Limb x={9} y={67} w={11} h={26} a={-3} f={tr} />
      <Limb x={-10} y={89} w={10} h={22} a={2} f={cl} />
      <Limb x={10} y={89} w={10} h={22} a={-2} f={cr} />
      <Limb x={-11} y={101} w={14} h={7} r={3} a={-3} />
      <Limb x={11} y={101} w={14} h={7} r={3} a={3} />
    </>
  );
}

// ── 1. PUSH-UP ────────────────────────────────────────────────
function PushupFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Chest • Triceps" />
      {/* START – high plank, arms straight */}
      <g transform="translate(65,0)">
        <Hd x={-43} y={37} r={9} />
        <Limb x={-35} y={45} w={9} h={9} />
        <Limb x={0} y={52} w={52} h={17} a={5} r={6} />
        <Limb x={-28} y={67} w={10} h={28} />
        <Limb x={25} y={56} w={10} h={26} a={8} />
        <Limb x={36} y={72} w={9} h={14} a={6} />
        <Limb x={-28} y={80} w={13} h={7} r={3} />
        <Limb x={42} y={80} w={13} h={7} r={3} />
      </g>
      {/* END – low, arms bent, chest active */}
      <g transform="translate(197,0)">
        <Hd x={-43} y={56} r={9} />
        <Limb x={-35} y={63} w={9} h={9} />
        <Limb x={0} y={70} w={52} h={17} a={4} r={6} f={P} />
        <Limb x={-34} y={63} w={10} h={20} a={30} f={P} />
        <Limb x={-44} y={77} w={9} h={18} a={-6} f={P} />
        <Limb x={25} y={74} w={10} h={26} a={7} />
        <Limb x={36} y={84} w={9} h={12} a={5} />
        <Limb x={-44} y={85} w={13} h={7} r={3} />
        <Limb x={42} y={84} w={13} h={7} r={3} />
      </g>
    </svg>
  );
}

// ── 2. SQUAT ──────────────────────────────────────────────────
function SquatFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Quads • Glutes • Hamstrings" />
      <g transform="translate(65,0)"><Stand /></g>
      {/* END – deep squat */}
      <g transform="translate(197,0)">
        <Hd x={0} y={30} />
        <Limb x={0} y={40} w={8} h={8} />
        <Limb x={-2} y={52} w={22} h={18} a={4} r={6} />
        <Limb x={-3} y={65} w={20} h={14} a={4} r={5} />
        <Limb x={-20} y={48} w={9} h={22} a={-35} />
        <Limb x={20} y={48} w={9} h={22} a={35} />
        <Limb x={-28} y={60} w={8} h={20} a={-32} />
        <Limb x={28} y={60} w={8} h={20} a={32} />
        <Limb x={-23} y={73} w={12} h={28} a={87} f={P} />
        <Limb x={23} y={73} w={12} h={28} a={-87} f={P} />
        <Limb x={-37} y={88} w={10} h={24} a={-14} f={P} />
        <Limb x={37} y={88} w={10} h={24} a={14} f={P} />
        <Limb x={-37} y={101} w={14} h={7} r={3} />
        <Limb x={37} y={101} w={14} h={7} r={3} />
      </g>
    </svg>
  );
}

// ── 3. LUNGE ──────────────────────────────────────────────────
function LungeFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Quads • Glutes • Hip Flexors" />
      <g transform="translate(65,0)"><Stand /></g>
      {/* END – lunge */}
      <g transform="translate(197,0)">
        <Hd x={0} y={14} />
        <Limb x={0} y={26} w={8} h={10} />
        <Limb x={0} y={38} w={22} h={20} r={6} />
        <Limb x={0} y={53} w={20} h={14} r={5} />
        <Limb x={-14} y={37} w={9} h={20} a={9} />
        <Limb x={14} y={37} w={9} h={20} a={-9} />
        <Limb x={-16} y={54} w={8} h={14} a={-18} />
        <Limb x={16} y={54} w={8} h={14} a={18} />
        {/* front leg */}
        <Limb x={-12} y={68} w={12} h={28} a={-15} f={P} />
        <Limb x={-18} y={92} w={10} h={22} a={-4} f={P} />
        <Limb x={-20} y={104} w={14} h={7} r={3} />
        {/* back leg */}
        <Limb x={16} y={70} w={12} h={28} a={22} f={P} />
        <Limb x={27} y={93} w={10} h={22} a={28} f={P} />
        <Limb x={25} y={104} w={12} h={7} r={3} a={10} />
      </g>
    </svg>
  );
}

// ── 4. PLANK ──────────────────────────────────────────────────
function PlankFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Core • Abs • Shoulders" />
      {/* START – high plank */}
      <g transform="translate(65,0)">
        <Hd x={-43} y={37} r={9} />
        <Limb x={-35} y={45} w={9} h={9} />
        <Limb x={0} y={52} w={52} h={17} a={5} r={6} />
        <Limb x={-28} y={67} w={10} h={28} />
        <Limb x={25} y={56} w={10} h={26} a={8} />
        <Limb x={36} y={72} w={9} h={14} a={6} />
        <Limb x={-28} y={80} w={13} h={7} r={3} />
        <Limb x={42} y={80} w={13} h={7} r={3} />
      </g>
      {/* END – forearm plank, core active */}
      <g transform="translate(197,0)">
        <Hd x={-43} y={42} r={9} />
        <Limb x={-35} y={50} w={9} h={9} />
        <Limb x={0} y={57} w={52} h={17} a={6} r={6} f={P} />
        <Limb x={-36} y={61} w={10} h={20} a={26} />
        <Limb x={-22} y={74} w={24} h={10} r={4} />
        <Limb x={25} y={61} w={10} h={26} a={8} />
        <Limb x={36} y={77} w={9} h={14} a={6} />
        <Limb x={42} y={84} w={13} h={7} r={3} />
      </g>
    </svg>
  );
}

// ── 5. DEADLIFT ───────────────────────────────────────────────
function DeadliftFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Hamstrings • Back • Glutes" />
      {/* START – standing, arms and bar pink */}
      <g transform="translate(65,0)">
        <Stand armL={P} armR={P} foreL={P} foreR={P} />
        <Limb x={0} y={78} w={42} h={9} r={3} f={P} />
      </g>
      {/* END – hinge forward, flat back */}
      <g transform="translate(197,0)">
        <Hd x={-38} y={29} r={9} />
        <Limb x={-30} y={37} w={9} h={9} />
        <Limb x={-5} y={37} w={46} h={17} r={6} f={P} />
        <Limb x={-18} y={52} w={10} h={22} f={P} />
        <Limb x={-6} y={52} w={10} h={22} f={P} />
        <Limb x={-12} y={63} w={38} h={9} r={3} f={P} />
        <Limb x={12} y={68} w={12} h={26} a={4} />
        <Limb x={22} y={68} w={12} h={26} a={7} />
        <Limb x={13} y={90} w={10} h={22} a={3} />
        <Limb x={23} y={90} w={10} h={22} a={4} />
        <Limb x={14} y={102} w={14} h={7} r={3} a={2} />
        <Limb x={24} y={102} w={14} h={7} r={3} a={3} />
      </g>
    </svg>
  );
}

// ── 6. BICEP CURL ─────────────────────────────────────────────
function BicepCurlFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Biceps • Forearms" />
      {/* START – arm down, dumbbell at side */}
      <g transform="translate(65,0)">
        <Stand armR={P} foreR={P} />
        <Limb x={24} y={68} w={18} h={8} r={3} f={P} />
      </g>
      {/* END – arm fully curled up */}
      <g transform="translate(197,0)">
        <Hd x={0} y={14} />
        <Limb x={0} y={26} w={8} h={10} />
        <Limb x={0} y={38} w={22} h={20} r={6} />
        <Limb x={0} y={53} w={20} h={14} r={5} />
        <Limb x={-16} y={37} w={9} h={22} a={9} />
        <Limb x={-20} y={57} w={8} h={20} a={5} />
        <Limb x={16} y={37} w={9} h={22} a={-9} f={P} />
        <Limb x={17} y={24} w={8} h={20} a={-4} f={P} />
        <Limb x={18} y={13} w={18} h={8} r={3} f={P} />
        <Limb x={-9} y={67} w={11} h={26} a={3} />
        <Limb x={9} y={67} w={11} h={26} a={-3} />
        <Limb x={-10} y={89} w={10} h={22} a={2} />
        <Limb x={10} y={89} w={10} h={22} a={-2} />
        <Limb x={-11} y={101} w={14} h={7} r={3} a={-3} />
        <Limb x={11} y={101} w={14} h={7} r={3} a={3} />
      </g>
    </svg>
  );
}

// ── 7. SHOULDER PRESS ─────────────────────────────────────────
function ShoulderPressFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Shoulders • Triceps" />
      {/* START – arms at ear level, elbows bent */}
      <g transform="translate(65,0)">
        <Hd x={0} y={14} />
        <Limb x={0} y={26} w={8} h={10} />
        <Limb x={0} y={38} w={22} h={20} r={6} />
        <Limb x={0} y={53} w={20} h={14} r={5} />
        <Limb x={-22} y={34} w={9} h={20} a={90} f={P} />
        <Limb x={-23} y={22} w={8} h={20} f={P} />
        <Limb x={22} y={34} w={9} h={20} a={-90} f={P} />
        <Limb x={23} y={22} w={8} h={20} f={P} />
        <Limb x={-24} y={12} w={18} h={7} r={3} f={P} />
        <Limb x={24} y={12} w={18} h={7} r={3} f={P} />
        <Limb x={-9} y={67} w={11} h={26} a={3} />
        <Limb x={9} y={67} w={11} h={26} a={-3} />
        <Limb x={-10} y={89} w={10} h={22} a={2} />
        <Limb x={10} y={89} w={10} h={22} a={-2} />
        <Limb x={-11} y={101} w={14} h={7} r={3} a={-3} />
        <Limb x={11} y={101} w={14} h={7} r={3} a={3} />
      </g>
      {/* END – arms fully extended overhead */}
      <g transform="translate(197,0)">
        <Hd x={0} y={14} />
        <Limb x={0} y={26} w={8} h={10} />
        <Limb x={0} y={38} w={22} h={20} r={6} />
        <Limb x={0} y={53} w={20} h={14} r={5} />
        <Limb x={-13} y={22} w={9} h={24} a={12} f={P} />
        <Limb x={-13} y={4} w={8} h={20} a={8} f={P} />
        <Limb x={13} y={22} w={9} h={24} a={-12} f={P} />
        <Limb x={13} y={4} w={8} h={20} a={-8} f={P} />
        <Limb x={-14} y={-5} w={18} h={7} r={3} f={P} />
        <Limb x={14} y={-5} w={18} h={7} r={3} f={P} />
        <Limb x={-9} y={67} w={11} h={26} a={3} />
        <Limb x={9} y={67} w={11} h={26} a={-3} />
        <Limb x={-10} y={89} w={10} h={22} a={2} />
        <Limb x={10} y={89} w={10} h={22} a={-2} />
        <Limb x={-11} y={101} w={14} h={7} r={3} a={-3} />
        <Limb x={11} y={101} w={14} h={7} r={3} a={3} />
      </g>
    </svg>
  );
}

// ── 8. LAT PULLDOWN ───────────────────────────────────────────
function LatPulldownFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Lats • Upper Back • Biceps" />
      {/* START – seated, arms reaching up */}
      <g transform="translate(65,0)">
        <Hd x={0} y={14} />
        <Limb x={0} y={26} w={8} h={10} />
        <Limb x={0} y={38} w={22} h={20} r={6} />
        <Limb x={0} y={53} w={20} h={14} r={5} />
        <Limb x={-14} y={22} w={9} h={24} a={13} f={P} />
        <Limb x={-12} y={3} w={8} h={20} a={9} f={P} />
        <Limb x={14} y={22} w={9} h={24} a={-13} f={P} />
        <Limb x={12} y={3} w={8} h={20} a={-9} f={P} />
        <Limb x={0} y={-5} w={50} h={7} r={3} f={P} />
        <Limb x={-17} y={65} w={11} h={26} a={86} />
        <Limb x={17} y={65} w={11} h={26} a={-86} />
        <Limb x={-31} y={84} w={10} h={22} a={-10} />
        <Limb x={31} y={84} w={10} h={22} a={10} />
        <Limb x={-33} y={96} w={14} h={7} r={3} />
        <Limb x={33} y={96} w={14} h={7} r={3} />
        <Limb x={0} y={65} w={28} h={7} r={3} f={D} />
      </g>
      {/* END – bar pulled to chest, back engaged */}
      <g transform="translate(197,0)">
        <Hd x={0} y={14} />
        <Limb x={0} y={26} w={8} h={10} />
        <Limb x={0} y={38} w={22} h={20} r={6} f={P} />
        <Limb x={0} y={53} w={20} h={14} r={5} />
        <Limb x={-17} y={30} w={9} h={22} a={-26} f={P} />
        <Limb x={-24} y={43} w={8} h={18} a={52} f={P} />
        <Limb x={17} y={30} w={9} h={22} a={26} f={P} />
        <Limb x={24} y={43} w={8} h={18} a={-52} f={P} />
        <Limb x={0} y={43} w={46} h={7} r={3} f={P} />
        <Limb x={-17} y={65} w={11} h={26} a={86} />
        <Limb x={17} y={65} w={11} h={26} a={-86} />
        <Limb x={-31} y={84} w={10} h={22} a={-10} />
        <Limb x={31} y={84} w={10} h={22} a={10} />
        <Limb x={-33} y={96} w={14} h={7} r={3} />
        <Limb x={33} y={96} w={14} h={7} r={3} />
        <Limb x={0} y={65} w={28} h={7} r={3} f={D} />
      </g>
    </svg>
  );
}

// ── 9. GLUTE BRIDGE ───────────────────────────────────────────
function GluteBridgeFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Glutes • Hamstrings • Core" />
      {/* START – lying flat, knees bent */}
      <g transform="translate(65,0)">
        <Hd x={-38} y={80} r={9} />
        <Limb x={-8} y={88} w={44} h={16} r={6} />
        <Limb x={-24} y={90} w={8} h={20} a={-5} f={D} />
        <Limb x={20} y={72} w={10} h={24} a={-46} />
        <Limb x={32} y={88} w={9} h={22} a={22} />
        <Limb x={28} y={66} w={10} h={24} a={-50} f={D} />
        <Limb x={38} y={82} w={9} h={22} a={18} f={D} />
        <Limb x={36} y={98} w={14} h={7} r={3} />
        <Limb x={44} y={96} w={14} h={7} r={3} f={D} />
      </g>
      {/* END – hips raised (glutes pink) */}
      <g transform="translate(197,0)">
        <Hd x={-38} y={88} r={9} />
        <Limb x={-20} y={92} w={22} h={14} r={5} />
        <Limb x={2} y={78} w={14} h={30} a={-48} f={P} />
        <Limb x={-26} y={93} w={8} h={18} a={-4} f={D} />
        <Limb x={16} y={80} w={10} h={26} a={-12} f={P} />
        <Limb x={14} y={70} w={10} h={26} a={-16} f={D} />
        <Limb x={28} y={92} w={10} h={22} a={-2} />
        <Limb x={20} y={92} w={10} h={22} a={2} f={D} />
        <Limb x={30} y={104} w={14} h={7} r={3} />
        <Limb x={22} y={104} w={14} h={7} r={3} f={D} />
      </g>
    </svg>
  );
}

// ── 10. MOUNTAIN CLIMBERS ─────────────────────────────────────
function MountainClimberFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Core • Hip Flexors • Cardio" />
      {/* START – high plank */}
      <g transform="translate(65,0)">
        <Hd x={-43} y={37} r={9} />
        <Limb x={-35} y={45} w={9} h={9} />
        <Limb x={0} y={52} w={52} h={17} a={5} r={6} />
        <Limb x={-28} y={67} w={10} h={28} />
        <Limb x={25} y={56} w={10} h={26} a={8} />
        <Limb x={36} y={72} w={9} h={14} a={6} />
        <Limb x={-28} y={80} w={13} h={7} r={3} />
        <Limb x={42} y={80} w={13} h={7} r={3} />
      </g>
      {/* END – knee tucked to chest */}
      <g transform="translate(197,0)">
        <Hd x={-43} y={37} r={9} />
        <Limb x={-35} y={45} w={9} h={9} />
        <Limb x={0} y={52} w={52} h={17} a={5} r={6} f={P} />
        <Limb x={-28} y={67} w={10} h={28} />
        <Limb x={25} y={56} w={10} h={26} a={8} f={D} />
        <Limb x={36} y={72} w={9} h={14} a={6} f={D} />
        {/* knee tucked in */}
        <Limb x={8} y={60} w={10} h={26} a={-40} f={P} />
        <Limb x={-4} y={70} w={9} h={22} a={-30} f={P} />
        <Limb x={-28} y={80} w={13} h={7} r={3} />
        <Limb x={42} y={80} w={13} h={7} r={3} f={D} />
      </g>
    </svg>
  );
}

// ── 11. BURPEE ────────────────────────────────────────────────
function BurpeeFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Full Body • Cardio • Power" />
      <g transform="translate(65,0)"><Stand /></g>
      {/* END – explosive jump, arms overhead */}
      <g transform="translate(197,0)">
        <Hd x={0} y={12} />
        <Limb x={0} y={24} w={8} h={10} />
        <Limb x={0} y={36} w={22} h={20} r={6} />
        <Limb x={0} y={51} w={20} h={14} r={5} />
        <Limb x={-12} y={20} w={9} h={24} a={14} f={P} />
        <Limb x={-10} y={1} w={8} h={20} a={10} f={P} />
        <Limb x={12} y={20} w={9} h={24} a={-14} f={P} />
        <Limb x={10} y={1} w={8} h={20} a={-10} f={P} />
        {/* feet off ground slightly */}
        <Limb x={-9} y={65} w={11} h={24} a={6} />
        <Limb x={9} y={65} w={11} h={24} a={-6} />
        <Limb x={-12} y={84} w={10} h={18} a={10} />
        <Limb x={12} y={84} w={10} h={18} a={-10} />
        <Limb x={-14} y={96} w={14} h={7} r={3} a={6} />
        <Limb x={14} y={96} w={14} h={7} r={3} a={-6} />
      </g>
    </svg>
  );
}

// ── 12. TRICEP DIP ────────────────────────────────────────────
function TricepDipFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Triceps • Chest • Shoulders" />
      {/* START – arms straight, elevated */}
      <g transform="translate(65,0)">
        <Hd x={0} y={20} />
        <Limb x={0} y={31} w={8} h={10} />
        <Limb x={0} y={43} w={22} h={20} r={6} />
        <Limb x={0} y={57} w={20} h={14} r={5} />
        <Limb x={-20} y={45} w={9} h={24} a={-10} f={P} />
        <Limb x={-22} y={66} w={8} h={20} a={-6} f={P} />
        <Limb x={20} y={45} w={9} h={24} a={10} f={P} />
        <Limb x={22} y={66} w={8} h={20} a={6} f={P} />
        <Limb x={-44} y={60} w={26} h={9} r={4} f={D} />
        <Limb x={44} y={60} w={26} h={9} r={4} f={D} />
        <Limb x={-11} y={68} w={11} h={22} a={-5} />
        <Limb x={11} y={68} w={11} h={22} a={5} />
        <Limb x={-12} y={86} w={10} h={18} a={-3} />
        <Limb x={12} y={86} w={10} h={18} a={3} />
        <Limb x={-13} y={96} w={14} h={7} r={3} a={-3} />
        <Limb x={13} y={96} w={14} h={7} r={3} a={3} />
      </g>
      {/* END – arms bent, body lowered */}
      <g transform="translate(197,0)">
        <Hd x={0} y={34} />
        <Limb x={0} y={45} w={8} h={10} />
        <Limb x={0} y={57} w={22} h={20} r={6} />
        <Limb x={0} y={71} w={20} h={14} r={5} />
        <Limb x={-22} y={54} w={9} h={22} a={-24} f={P} />
        <Limb x={-28} y={70} w={8} h={20} a={20} f={P} />
        <Limb x={22} y={54} w={9} h={22} a={24} f={P} />
        <Limb x={28} y={70} w={8} h={20} a={-20} f={P} />
        <Limb x={-44} y={60} w={26} h={9} r={4} f={D} />
        <Limb x={44} y={60} w={26} h={9} r={4} f={D} />
        <Limb x={-11} y={81} w={11} h={22} a={-5} />
        <Limb x={11} y={81} w={11} h={22} a={5} />
        <Limb x={-12} y={98} w={10} h={18} a={-3} />
        <Limb x={12} y={98} w={10} h={18} a={3} />
        <Limb x={-13} y={108} w={14} h={7} r={3} a={-3} />
        <Limb x={13} y={108} w={14} h={7} r={3} a={3} />
      </g>
    </svg>
  );
}

// ── 13. CALF RAISES ───────────────────────────────────────────
function CalfRaisesFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Calves • Ankles" />
      <g transform="translate(65,0)"><Stand /></g>
      {/* END – on tiptoes */}
      <g transform="translate(197,0)">
        <Hd x={0} y={10} />
        <Limb x={0} y={22} w={8} h={10} />
        <Limb x={0} y={34} w={22} h={20} r={6} />
        <Limb x={0} y={49} w={20} h={14} r={5} />
        <Limb x={-16} y={33} w={9} h={22} a={9} />
        <Limb x={16} y={33} w={9} h={22} a={-9} />
        <Limb x={-20} y={53} w={8} h={20} a={5} />
        <Limb x={20} y={53} w={8} h={20} a={-5} />
        <Limb x={-9} y={63} w={11} h={26} a={3} />
        <Limb x={9} y={63} w={11} h={26} a={-3} />
        <Limb x={-10} y={84} w={10} h={22} a={2} f={P} />
        <Limb x={10} y={84} w={10} h={22} a={-2} f={P} />
        {/* raised heels - feet angled on tiptoes */}
        <Limb x={-9} y={97} w={10} h={9} r={4} a={-28} f={P} />
        <Limb x={9} y={97} w={10} h={9} r={4} a={28} f={P} />
      </g>
    </svg>
  );
}

// ── 14. RUSSIAN TWIST ─────────────────────────────────────────
function RussianTwistFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Obliques • Core • Abs" />
      {/* START – V-sit, arms to right */}
      <g transform="translate(65,0)">
        <Hd x={0} y={36} />
        <Limb x={0} y={47} w={8} h={9} />
        <Limb x={2} y={57} w={20} h={20} a={-12} r={5} f={P} />
        <Limb x={-18} y={52} w={9} h={22} a={-20} f={P} />
        <Limb x={-8} y={62} w={8} h={18} a={-14} f={P} />
        <Limb x={10} y={60} w={9} h={22} a={16} />
        <Limb x={22} y={68} w={8} h={18} a={20} />
        {/* arms reaching right */}
        <Limb x={20} y={56} w={9} h={22} a={85} f={P} />
        <Limb x={34} y={58} w={8} h={18} a={80} f={P} />
        {/* legs raised */}
        <Limb x={-14} y={76} w={11} h={28} a={-44} />
        <Limb x={-26} y={90} w={10} h={22} a={-36} />
        <Limb x={14} y={76} w={11} h={28} a={44} f={D} />
        <Limb x={26} y={90} w={10} h={22} a={36} f={D} />
      </g>
      {/* END – arms twisted to left */}
      <g transform="translate(197,0)">
        <Hd x={0} y={36} />
        <Limb x={0} y={47} w={8} h={9} />
        <Limb x={-2} y={57} w={20} h={20} a={12} r={5} f={P} />
        <Limb x={18} y={52} w={9} h={22} a={20} f={P} />
        <Limb x={8} y={62} w={8} h={18} a={14} f={P} />
        <Limb x={-10} y={60} w={9} h={22} a={-16} />
        <Limb x={-22} y={68} w={8} h={18} a={-20} />
        {/* arms reaching left */}
        <Limb x={-20} y={56} w={9} h={22} a={-85} f={P} />
        <Limb x={-34} y={58} w={8} h={18} a={-80} f={P} />
        <Limb x={14} y={76} w={11} h={28} a={44} />
        <Limb x={26} y={90} w={10} h={22} a={36} />
        <Limb x={-14} y={76} w={11} h={28} a={-44} f={D} />
        <Limb x={-26} y={90} w={10} h={22} a={-36} f={D} />
      </g>
    </svg>
  );
}

// ── 15. LEG RAISES ────────────────────────────────────────────
function LegRaisesFigure() {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle="Abs • Hip Flexors • Core" />
      {/* START – lying flat, legs down */}
      <g transform="translate(65,0)">
        <Hd x={-38} y={80} r={9} />
        <Limb x={-4} y={88} w={46} h={16} r={6} />
        <Limb x={-24} y={90} w={8} h={20} a={-5} f={D} />
        <Limb x={18} y={92} w={14} h={26} a={87} />
        <Limb x={32} y={92} w={13} h={26} a={87} f={D} />
        <Limb x={18} y={104} w={14} h={7} r={3} />
        <Limb x={32} y={104} w={14} h={7} r={3} f={D} />
      </g>
      {/* END – legs raised to 90° */}
      <g transform="translate(197,0)">
        <Hd x={-38} y={88} r={9} />
        <Limb x={-4} y={94} w={46} h={14} r={6} />
        <Limb x={-24} y={94} w={8} h={18} a={-4} f={D} />
        <Limb x={14} y={76} w={13} h={28} a={0} f={P} />
        <Limb x={26} y={76} w={12} h={28} a={2} f={P} />
        <Limb x={14} y={54} w={12} h={26} a={0} f={P} />
        <Limb x={25} y={54} w={11} h={26} a={2} f={P} />
        <Limb x={14} y={38} w={10} h={10} r={4} f={P} />
        <Limb x={24} y={38} w={10} h={10} r={4} f={P} />
      </g>
    </svg>
  );
}

// ── Generic fallback ───────────────────────────────────────────
function GenericFigure({ muscle = 'FULL BODY' }: { muscle?: string }) {
  return (
    <svg viewBox="0 0 260 112" width="100%">
      <Frame muscle={muscle} />
      <g transform="translate(65,0)"><Stand /></g>
      <g transform="translate(197,0)">
        <Stand armL={P} armR={P} foreL={P} foreR={P} />
      </g>
    </svg>
  );
}

// ── Exercise data map ──────────────────────────────────────────
export type ExerciseInfo = {
  component: React.FC;
  muscle: string;
  mistakes: string[];
};

export const EXERCISE_DATA: Record<string, ExerciseInfo> = {
  'push-up': { component: PushupFigure, muscle: 'Chest & Triceps', mistakes: ['Hips sagging or raised too high', 'Elbows flaring out wide', 'Not reaching full range of motion'] },
  'pushup': { component: PushupFigure, muscle: 'Chest & Triceps', mistakes: ['Hips sagging or raised too high', 'Elbows flaring out wide', 'Not reaching full range of motion'] },
  'push up': { component: PushupFigure, muscle: 'Chest & Triceps', mistakes: ['Hips sagging or raised too high', 'Elbows flaring out wide', 'Not reaching full range of motion'] },
  'squat': { component: SquatFigure, muscle: 'Quads & Glutes', mistakes: ['Knees caving inward', 'Heels rising off the floor', 'Rounding the lower back'] },
  'lunge': { component: LungeFigure, muscle: 'Quads & Glutes', mistakes: ['Front knee going past the toes', 'Torso leaning too far forward', 'Losing balance — fix gaze straight ahead'] },
  'plank': { component: PlankFigure, muscle: 'Core & Abs', mistakes: ['Hips too high or sagging', 'Holding breath instead of breathing', 'Head drooping down'] },
  'deadlift': { component: DeadliftFigure, muscle: 'Hamstrings & Back', mistakes: ['Rounding the lower back', 'Bar drifting away from the body', 'Jerking the bar off the floor'] },
  'bicep curl': { component: BicepCurlFigure, muscle: 'Biceps', mistakes: ['Swinging the body for momentum', 'Not controlling the lowering phase', 'Elbows moving away from torso'] },
  'bicep': { component: BicepCurlFigure, muscle: 'Biceps', mistakes: ['Swinging the body for momentum', 'Not controlling the lowering phase', 'Elbows moving away from torso'] },
  'curl': { component: BicepCurlFigure, muscle: 'Biceps', mistakes: ['Swinging the body for momentum', 'Not controlling the lowering phase', 'Elbows moving away from torso'] },
  'shoulder press': { component: ShoulderPressFigure, muscle: 'Shoulders & Triceps', mistakes: ['Arching the lower back', 'Not fully extending elbows at top', 'Pressing forward instead of straight up'] },
  'overhead press': { component: ShoulderPressFigure, muscle: 'Shoulders & Triceps', mistakes: ['Arching the lower back', 'Not fully extending elbows at top', 'Pressing forward instead of straight up'] },
  'lat pulldown': { component: LatPulldownFigure, muscle: 'Lats & Upper Back', mistakes: ['Leaning back too far', 'Pulling with arms instead of lats', 'Raising shoulders toward ears'] },
  'glute bridge': { component: GluteBridgeFigure, muscle: 'Glutes & Hamstrings', mistakes: ['Hyperextending the lower back at top', 'Feet too far or close to hips', 'Knees collapsing inward'] },
  'hip thrust': { component: GluteBridgeFigure, muscle: 'Glutes & Hamstrings', mistakes: ['Hyperextending the lower back at top', 'Feet too far or close to hips', 'Knees collapsing inward'] },
  'mountain climber': { component: MountainClimberFigure, muscle: 'Core & Cardio', mistakes: ['Hips bouncing up and down', 'Losing the flat back position', 'Moving too fast with poor control'] },
  'burpee': { component: BurpeeFigure, muscle: 'Full Body', mistakes: ['Not lowering chest to floor on the way down', 'Jumping feet too wide', 'Landing with locked straight knees'] },
  'tricep dip': { component: TricepDipFigure, muscle: 'Triceps', mistakes: ['Shrugging shoulders toward ears', 'Leaning too far forward', 'Elbows flaring outward'] },
  'tricep': { component: TricepDipFigure, muscle: 'Triceps', mistakes: ['Shrugging shoulders toward ears', 'Leaning too far forward', 'Elbows flaring outward'] },
  'dip': { component: TricepDipFigure, muscle: 'Triceps', mistakes: ['Shrugging shoulders toward ears', 'Leaning too far forward', 'Elbows flaring outward'] },
  'calf raise': { component: CalfRaisesFigure, muscle: 'Calves', mistakes: ['No pause at the top', 'Rolling feet inward/outward', 'Using momentum instead of control'] },
  'russian twist': { component: RussianTwistFigure, muscle: 'Obliques & Core', mistakes: ['Rounding the back', 'Rotating only the arms not the torso', 'Moving too fast without control'] },
  'leg raise': { component: LegRaisesFigure, muscle: 'Abs & Hip Flexors', mistakes: ['Lower back arching off the floor', 'Legs dropping too fast', 'Using momentum instead of muscle control'] },
};

// ── Keyword lookup ─────────────────────────────────────────────
export function getExerciseInfo(name: string): ExerciseInfo {
  const lower = name.toLowerCase();
  for (const [key, data] of Object.entries(EXERCISE_DATA)) {
    if (lower.includes(key)) return data;
  }
  return {
    component: () => <GenericFigure muscle={name} />,
    muscle: 'Full Body',
    mistakes: ['Using too much momentum', 'Not maintaining proper posture', 'Skipping the full range of motion'],
  };
}
