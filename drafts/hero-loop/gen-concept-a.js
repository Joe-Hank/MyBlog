// motion-svg · Concept A "二进制与美学之间" — generator
// composition: compare-split · mood: precise
// Declared palette mapped 1:1 to live site index.html :root tokens (NOT ad-hoc):
//   bg #121212(--bg) surface #1a1a1a(--bg-surface) border #2a2a2a(--border)
//   digit-cold #444 / muted #555(--text-muted) · accent #f7c948(--accent) accent-dim #c9a233(--accent-dim)
// Type scale: digits = body-lg(28), labels = body(22)  [<=4 sizes]
// Hero loop = seamless infinite cycle (deviates from one-shot enter/exit by design: it's a perpetual hero bg)
const fs = require('fs');
const path = require('path');

const W = 1600, H = 900;
const SEAM = 810;            // compare-split center (820 - safe)

// ---- deterministic binary field (no RNG, fixed seed mask) ----
const SEED = '1001011100100111010110010011101101001011100101101001110100101101';
function bit(c, r) { return SEED[(c * 7 + r * 3 + c * r) % SEED.length]; }

const COLS = [
  { x: 90,  dur: 11, cold: '#3a3a3a' },
  { x: 230, dur: 8,  cold: '#444'    },
  { x: 370, dur: 13, cold: '#4a4a4a' },
  { x: 510, dur: 9,  cold: '#555'    },
  { x: 650, dur: 7,  cold: '#6b5a2e' },  // warming toward seam
  { x: 778, dur: 10, cold: '#8a7430' },  // warmest, nearest collapse
];
const ROWS = 22, LH = 44, FS = 28;
const TILE = ROWS * LH;             // 968 >= 900 -> seamless single-tile scroll

function column(col, ci) {
  // one tile = ROWS tspans; duplicate the tile, scroll group by -TILE
  function tile(yOff) {
    let t = `<text x="${col.x}" y="${yOff + FS}" font-family="'JetBrains Mono',monospace" font-size="${FS}" fill="${col.cold}" opacity="0.55">`;
    for (let r = 0; r < ROWS; r++) {
      const dy = r === 0 ? 0 : LH;
      t += `<tspan x="${col.x}" dy="${dy}">${bit(ci, r)}</tspan>`;
    }
    return t + `</text>`;
  }
  return `  <g class="col c${ci}" style="--dur:${col.dur}s">
    ${tile(0)}
    ${tile(TILE)}
  </g>`;
}

const columns = COLS.map(column).join('\n');

// ---- right-zone geo-orb (binary condensed into form) ----
const CX = 1175, CY = 450;
function poly(r, n, rot) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2 + (rot * Math.PI) / 180;
    pts.push(`${(CX + r * Math.cos(a)).toFixed(1)},${(CY + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}
function vdots(r, n, rot, rad) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2 + (rot * Math.PI) / 180;
    s += `<circle cx="${(CX + r * Math.cos(a)).toFixed(1)}" cy="${(CY + r * Math.sin(a)).toFixed(1)}" r="${rad}" fill="#f7c948"/>`;
  }
  return s;
}
function spokes(r1, r2, n) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    s += `<line x1="${(CX + r1 * Math.cos(a)).toFixed(1)}" y1="${(CY + r1 * Math.sin(a)).toFixed(1)}" x2="${(CX + r2 * Math.cos(a)).toFixed(1)}" y2="${(CY + r2 * Math.sin(a)).toFixed(1)}" stroke="#c9a233" stroke-width="1" opacity="0.3"/>`;
  }
  return s;
}

const svg = `<!-- composition: compare-split · mood: precise -->
<!-- focal: binary field (0-810) ↔ geo-orb (${CX},${CY}) · seam x=${SEAM} -->
<!-- palette: declared, mapped to live site index.html :root tokens -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="二进制坍缩成几何形态的循环动画">
<defs>
  <linearGradient id="seamGlow" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#f7c948" stop-opacity="0"/>
    <stop offset="50%" stop-color="#f7c948" stop-opacity="0.9"/>
    <stop offset="100%" stop-color="#f7c948" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#f7c948" stop-opacity="0.28"/>
    <stop offset="55%" stop-color="#c9a233" stop-opacity="0.08"/>
    <stop offset="100%" stop-color="#f7c948" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="scanBar" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#f7c948" stop-opacity="0"/>
    <stop offset="50%" stop-color="#f7c948" stop-opacity="0.5"/>
    <stop offset="100%" stop-color="#f7c948" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="leftClip"><rect x="0" y="0" width="${SEAM}" height="${H}"/></clipPath>
  <filter id="soft"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs>

<style>
  .bg{fill:#121212}
  text{font-weight:500}
  /* binary columns scroll seamlessly */
  .col{animation:scroll var(--dur) linear infinite}
  @keyframes scroll{from{transform:translateY(0)}to{transform:translateY(-${TILE}px)}}
  /* seam breathes */
  .seam{animation:breathe 6s ease-in-out infinite}
  @keyframes breathe{0%,100%{opacity:.28}50%{opacity:.6}}
  /* orb rotation (two layers, opposite for parallax) + breathing */
  .orb-cw{transform-box:fill-box;transform-origin:center;animation:spin 30s linear infinite}
  .orb-ccw{transform-box:fill-box;transform-origin:center;animation:spin-r 24s linear infinite}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes spin-r{from{transform:rotate(0)}to{transform:rotate(-360deg)}}
  .orb-wrap{transform-box:fill-box;transform-origin:center;animation:pulse 8s ease-in-out infinite}
  @keyframes pulse{0%,100%{transform:scale(.985)}50%{transform:scale(1.02)}}
  .glow{transform-box:fill-box;transform-origin:center;animation:glow 8s ease-in-out infinite}
  @keyframes glow{0%,100%{opacity:.65}50%{opacity:1}}
  .core{transform-box:fill-box;transform-origin:center;animation:core 4s ease-in-out infinite}
  @keyframes core{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.5);opacity:1}}
  /* scan sweep binary -> form */
  .scan{animation:sweep 7s linear infinite}
  @keyframes sweep{from{transform:translateX(-220px)}to{transform:translateX(1720px)}}
  @media (prefers-reduced-motion: reduce){
    *{animation-duration:.01ms!important;animation-iteration-count:1!important}
  }
</style>

<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>

<!-- blueprint grid (left) -->
<g clip-path="url(#leftClip)" stroke="#2a2a2a" stroke-width="1" opacity="0.5">
  <line x1="0" y1="225" x2="${SEAM}" y2="225"/><line x1="0" y1="450" x2="${SEAM}" y2="450"/><line x1="0" y1="675" x2="${SEAM}" y2="675"/>
  <line x1="160" y1="0" x2="160" y2="${H}"/><line x1="440" y1="0" x2="440" y2="${H}"/><line x1="720" y1="0" x2="720" y2="${H}"/>
</g>

<!-- binary rain (left, cold) -->
<g clip-path="url(#leftClip)">
${columns}
</g>

<!-- collapse seam -->
<g class="seam">
  <rect x="${SEAM - 80}" y="0" width="160" height="${H}" fill="url(#seamGlow)"/>
</g>
<line x1="${SEAM}" y1="40" x2="${SEAM}" y2="${H - 40}" stroke="#2a2a2a" stroke-width="1.5" stroke-dasharray="6 10"/>

<!-- geo-orb (right): binary condensed into elegant form -->
<rect class="glow" x="${CX - 320}" y="${CY - 320}" width="640" height="640" fill="url(#orbGlow)"/>
<g class="orb-wrap">
  <g class="orb-cw" fill="none" stroke-linecap="round">
    <circle cx="${CX}" cy="${CY}" r="232" stroke="#c9a233" stroke-width="1.5" opacity="0.45"/>
    ${spokes(40, 232, 12)}
    <polygon points="${poly(210, 6, 0)}" stroke="#f7c948" stroke-width="2.5"/>
    <polygon points="${poly(180, 3, 0)}" stroke="#c9a233" stroke-width="1.5" opacity="0.7"/>
    <polygon points="${poly(180, 3, 180)}" stroke="#c9a233" stroke-width="1.5" opacity="0.7"/>
    ${vdots(210, 6, 0, 5)}
  </g>
  <g class="orb-ccw" fill="none" stroke-linecap="round">
    <polygon points="${poly(120, 6, 30)}" stroke="#f7c948" stroke-width="2.5" opacity="0.9"/>
    <circle cx="${CX}" cy="${CY}" r="70" stroke="#c9a233" stroke-width="1" opacity="0.5"/>
    ${vdots(120, 6, 30, 4)}
  </g>
  <circle class="core" cx="${CX}" cy="${CY}" r="11" fill="#f7c948"/>
</g>

<!-- scan sweep -->
<g class="scan"><rect x="0" y="0" width="160" height="${H}" fill="url(#scanBar)" filter="url(#soft)" opacity="0.7"/></g>

<!-- concept labels (subtle, sample only) -->
<text x="90" y="64" font-family="'JetBrains Mono',monospace" font-size="22" fill="#555" letter-spacing="3" opacity="0.5">// BINARY</text>
<text x="${W - 90}" y="64" text-anchor="end" font-family="'JetBrains Mono',monospace" font-size="22" fill="#c9a233" letter-spacing="3" opacity="0.5">AESTHETICS //</text>
</svg>
`;

const outDir = path.dirname(__filename);
fs.writeFileSync(path.join(outDir, 'concept-a-binary-aesthetics.svg'), svg, 'utf8');
console.log('wrote concept-a-binary-aesthetics.svg', svg.length, 'bytes');
