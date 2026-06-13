// motion-svg · Concept C "领域星图" — generator
// composition: radial · mood: precise
// Declared palette mapped 1:1 to live site index.html :root tokens:
//   bg #121212 surface #1a1a1a border #2a2a2a text-secondary #888
//   accent #f7c948(--accent) accent-dim #c9a233(--accent-dim)
// Icons: Lucide (from skill icons.md), NO emoji.
// Type scale: HAN = subhead(36), node labels = caption(18)  [<=4 sizes]
// Hero loop = seamless infinite (signals pulse forever)
const fs = require('fs');
const path = require('path');

const W = 1600, H = 900, CX = 800, CY = 450, R = 272, NR = 46;

const ICONS = {
  bot: `<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>`,
  gamepad: `<line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/>`,
  dollar: `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
  eye: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  sparkles: `<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>`,
  layers: `<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>`,
};

// 6 domains, start top (-90deg), clockwise, 60deg apart
const NODES = [
  { ang: -90, icon: 'bot',      label: 'AI 提效',   dur: 3.0 },
  { ang: -30, icon: 'gamepad',  label: '游戏制作',  dur: 3.4 },
  { ang: 30,  icon: 'dollar',   label: '游戏交易',  dur: 2.8 },
  { ang: 90,  icon: 'eye',      label: '虚拟现实',  dur: 3.6 },
  { ang: 150, icon: 'sparkles', label: 'UGC/AIGC', dur: 3.1 },
  { ang: 210, icon: 'layers',   label: '游戏平台',  dur: 3.3 },
];
NODES.forEach(n => {
  const a = (n.ang * Math.PI) / 180;
  n.x = +(CX + R * Math.cos(a)).toFixed(1);
  n.y = +(CY + R * Math.sin(a)).toFixed(1);
});

const icon = (name, x, y, s, stroke) =>
  `<g transform="translate(${x} ${y}) scale(${s}) translate(-12 -12)" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g>`;

const edges = NODES.map(n =>
  `<line x1="${CX}" y1="${CY}" x2="${n.x}" y2="${n.y}" stroke="#c9a233" stroke-width="1.5" opacity="0.22"/>`
).join('\n  ');

const dots = NODES.map((n, i) =>
  `<circle class="dot d${i}" r="5" fill="#f7c948"/>`
).join('\n  ');

const dotKeyframes = NODES.map((n, i) => `
  .d${i}{animation:td${i} ${n.dur}s linear infinite;animation-delay:${(i * 0.45).toFixed(2)}s}
  @keyframes td${i}{0%{transform:translate(${CX}px,${CY}px);opacity:0}12%{opacity:1}80%{opacity:1}100%{transform:translate(${n.x}px,${n.y}px);opacity:0}}`
).join('');

const nodeGroups = NODES.map((n, i) => `
  <g class="node n${i}" style="--d:${(i * 0.3).toFixed(2)}s">
    <circle cx="${n.x}" cy="${n.y}" r="${NR}" fill="#1a1a1a" stroke="#f7c948" stroke-width="2.5"/>
    <circle class="ring" cx="${n.x}" cy="${n.y}" r="${NR}" fill="none" stroke="#f7c948" stroke-width="1.5"/>
    ${icon(n.icon, n.x, n.y, 2.1, '#f7c948')}
    <text x="${n.x}" y="${n.y + NR + 34}" text-anchor="middle" font-family="'JetBrains Mono','PingFang SC',monospace" font-size="18" fill="#888" letter-spacing="1">${n.label}</text>
  </g>`
).join('');

const svg = `<!-- composition: radial · mood: precise -->
<!-- focal: HAN core (${CX},${CY}) · 6 domain nodes R=${R} -->
<!-- palette: declared, mapped to live site index.html :root tokens -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="以 HAN 为中心向多个领域辐射的星图循环动画">
<defs>
  <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#f7c948" stop-opacity="0.30"/>
    <stop offset="55%" stop-color="#c9a233" stop-opacity="0.08"/>
    <stop offset="100%" stop-color="#f7c948" stop-opacity="0"/>
  </radialGradient>
</defs>

<style>
  .bg{fill:#121212}
  text{font-weight:500}
  .rings{transform-box:fill-box;transform-origin:center;animation:spin 140s linear infinite}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  .glow{transform-box:fill-box;transform-origin:center;animation:breathe 7s ease-in-out infinite}
  @keyframes breathe{0%,100%{opacity:.6}50%{opacity:1}}
  .core{transform-box:fill-box;transform-origin:center;animation:corepulse 5s ease-in-out infinite}
  @keyframes corepulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
  .node{transform-box:fill-box;transform-origin:center;animation:bob 6s ease-in-out infinite;animation-delay:var(--d)}
  @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  .ring{transform-box:fill-box;transform-origin:center;animation:halo 3.2s ease-out infinite;animation-delay:var(--d)}
  @keyframes halo{0%{transform:scale(1);opacity:.5}70%{opacity:0}100%{transform:scale(1.5);opacity:0}}
  ${dotKeyframes}
  @media (prefers-reduced-motion: reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important}}
</style>

<rect class="bg" x="0" y="0" width="${W}" height="${H}"/>

<!-- radar rings (rotating, symmetric) -->
<g class="rings" stroke="#2a2a2a" fill="none">
  <circle cx="${CX}" cy="${CY}" r="120" stroke-width="1"/>
  <circle cx="${CX}" cy="${CY}" r="${R}" stroke-width="1" stroke-dasharray="3 12"/>
  <circle cx="${CX}" cy="${CY}" r="${R + 70}" stroke-width="1" stroke-dasharray="2 18" opacity="0.6"/>
</g>

<!-- edges -->
<g>
  ${edges}
</g>

<!-- traveling signals -->
<g>
  ${dots}
</g>

<!-- nodes -->
<g>${nodeGroups}
</g>

<!-- center: HAN core -->
<rect class="glow" x="${CX - 200}" y="${CY - 200}" width="400" height="400" fill="url(#coreGlow)"/>
<g class="core">
  <circle cx="${CX}" cy="${CY}" r="62" fill="#1a1a1a" stroke="#c9a233" stroke-width="1.5"/>
  <circle cx="${CX}" cy="${CY}" r="62" fill="none" stroke="#f7c948" stroke-width="4" stroke-dasharray="${(2 * Math.PI * 62 * 0.7).toFixed(0)} ${(2 * Math.PI * 62 * 0.3).toFixed(0)}" opacity="0.9"/>
  <text x="${CX}" y="${CY + 12}" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="36" font-weight="700" fill="#f7c948" letter-spacing="2">HAN</text>
</g>

<!-- corner tag -->
<text x="90" y="64" font-family="'JetBrains Mono',monospace" font-size="18" fill="#555" letter-spacing="3" opacity="0.55">// FIELD MAP</text>
</svg>
`;

fs.writeFileSync(path.join(path.dirname(__filename), 'concept-c-field-map.svg'), svg, 'utf8');
console.log('wrote concept-c-field-map.svg', svg.length, 'bytes');
