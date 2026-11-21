// 실사풍 그래픽. 벌레·소품·파리채를 처음 한 번만 정성껏 그려서(캐시) 두고, 매 프레임에는 그 그림을 찍기만 한다.
// 벌레는 위에서 내려다본 모습(화면 위에 앉은 진짜 파리처럼)으로 그리고, 움직이는 방향으로 몸을 돌린다.
const TAU = Math.PI * 2;
const cache = new Map();
const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
function mk(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); }
function rrect(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }

// ═════════════ 벌레 색 ═════════════
const PAL = {
  fly: { thorax: ["#3c3c40", "#8e8d8a"], abd: ["#3e3528", "#a8976f"], eye: ["#4a0f08", "#c4462a"], stripes: true, hair: "#141110", head: "#2a2420", frons: "#d9d0b4" },
  big: { thorax: ["#06332a", "#2fb27a"], abd: ["#052e28", "#3ccf92"], eye: ["#4a0f08", "#d4552f"], metal: "rgba(70,140,255,0.35)", hair: "#0a0a0a", head: "#0b2a22", frons: "#b9c9c0" },
  golden: { thorax: ["#5e3800", "#ffd350"], abd: ["#5e3800", "#ffe27a"], eye: ["#4a1400", "#e0662c"], metal: "rgba(255,250,200,0.45)", hair: "#2e1d00", head: "#5a3a00", frons: "#fff0b8" },
  boss: { thorax: ["#170c24", "#6c4b8c"], abd: ["#150a20", "#7d5b9c"], eye: ["#50000e", "#ff3b4d"], metal: "rgba(200,110,255,0.4)", hair: "#070707", head: "#1a0f26", frons: "#c9b6dc" },
};
const WING = { fly: [0.95, 0.32, 0.12, 0.14, 0.4], big: [0.95, 0.33, 0.12, 0.15, 0.42], golden: [0.95, 0.32, 0.12, 0.14, 0.4], boss: [0.95, 0.34, 0.12, 0.15, 0.42], mosquito: [0.86, 0.13, 0.13, 0.07, 0.09], bee: [0.8, 0.25, 0.16, 0.15, 0.22] };

// 다리: 붙는 곳에서 마디마다 각도와 길이를 따라 이어 그린다. ang 은 몸 앞(+x)에서 옆으로 벌어진 각도.
function leg(c, x, y, s, segs, w0, color, rings) {
  let px = x, py = y * s;
  c.lineCap = "round"; c.lineJoin = "round";
  segs.forEach(([a, len], i) => {
    const nx = px + Math.cos(a) * len, ny = py + Math.sin(a) * len * s;
    const w = w0 * (1 - i * 0.28);
    c.strokeStyle = color; c.lineWidth = w; c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke();
    if (i === 0) { c.strokeStyle = "rgba(255,255,255,0.13)"; c.lineWidth = w * 0.35; c.beginPath(); c.moveTo(px, py - w * 0.2 * s); c.lineTo(nx, ny - w * 0.2 * s); c.stroke(); }
    if (rings && i > 0) { c.strokeStyle = "rgba(240,240,240,0.9)"; c.lineWidth = w * 1.05; for (const k of [0.25, 0.6]) { const ax = px + (nx - px) * k, ay = py + (ny - py) * k; c.beginPath(); c.moveTo(ax, ay); c.lineTo(px + (nx - px) * (k + 0.08), py + (ny - py) * (k + 0.08)); c.stroke(); } }
    px = nx; py = ny;
  });
}
function hairs(c, r, n, cx, cy, rx, ry, len, color, w, outward = true) {
  c.strokeStyle = color; c.lineWidth = w; c.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, k = outward ? 0.85 + r() * 0.2 : Math.sqrt(r());
    const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
    const d = outward ? a + (r() - 0.5) * 0.6 : a + Math.PI * (0.7 + r() * 0.6);
    const l = len * (0.6 + r() * 0.6);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(d) * l, y + Math.sin(d) * l); c.stroke();
  }
}
// 둥근 몸통 한 덩어리: 그라데이션 + 잔무늬 + 가장자리 어둡게 + 반사광
function blob(c, r, x, y, rx, ry, cols, opt = {}) {
  c.save();
  ell(c, x, y, rx, ry);
  const g = c.createRadialGradient(x - rx * 0.25, y - ry * 0.4, rx * 0.05, x, y, Math.max(rx, ry) * 1.05);
  g.addColorStop(0, cols[1]); g.addColorStop(0.55, mixHex(cols[0], cols[1], 0.45)); g.addColorStop(1, cols[0]);
  c.fillStyle = g; c.fill();
  c.clip();
  if (opt.inner) opt.inner();
  if (opt.metal) {
    const m = c.createLinearGradient(x, y - ry, x, y + ry);
    m.addColorStop(0, "rgba(0,0,0,0)"); m.addColorStop(0.45, opt.metal); m.addColorStop(0.7, "rgba(0,0,0,0)");
    c.globalCompositeOperation = "screen"; c.fillStyle = m; c.fillRect(x - rx, y - ry, rx * 2, ry * 2); c.globalCompositeOperation = "source-over";
  }
  for (let i = 0; i < 160; i++) { // 잔무늬
    const a = r() * TAU, k = Math.sqrt(r());
    c.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.07)";
    c.fillRect(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k, 0.025, 0.025);
  }
  const e = c.createRadialGradient(x, y, Math.min(rx, ry) * 0.5, x, y, Math.max(rx, ry));
  e.addColorStop(0, "rgba(0,0,0,0)"); e.addColorStop(1, "rgba(0,0,0,0.5)");
  c.fillStyle = e; c.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  const sp = c.createRadialGradient(x - rx * 0.15, y - ry * 0.45, 0, x - rx * 0.15, y - ry * 0.45, rx * 0.5);
  sp.addColorStop(0, `rgba(255,255,255,${opt.metal ? 0.6 : 0.28})`); sp.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = sp; c.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  c.restore();
}
function mixHex(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}

// ── 파리 종류 (집파리·금파리·황금파리·파리왕) ──
function flyBody(c, kind, pose) {
  const p = PAL[kind], r = rng(kind.length * 977 + (pose === "land" ? 1 : 2));
  const land = pose === "land";
  const lc = p.hair;
  const L = land ? 1 : 0.62;
  for (const s of [-1, 1]) {
    leg(c, 0.3, 0.16, s, [[0.75, 0.3 * L], [0.35, 0.36 * L], [0.2, 0.24 * L]], 0.07, lc);
    leg(c, 0.14, 0.2, s, [[1.55, 0.32 * L], [land ? 1.85 : 2.1, 0.38 * L], [2.0, 0.24 * L]], 0.07, lc);
    leg(c, 0.0, 0.18, s, [[2.25, 0.34 * L], [2.65, 0.42 * L], [2.85, 0.26 * L]], 0.07, lc);
  }
  // 배
  blob(c, r, -0.42, 0, 0.56, 0.44, p.abd, {
    metal: p.metal,
    inner: () => {
      if (p.stripes) {
        c.fillStyle = "rgba(20,15,10,0.55)"; c.fillRect(-1, -0.045, 1.1, 0.09);
        for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { ell(c, -0.12 - i * 0.22, s * 0.2, 0.1, 0.12, s * 0.3); c.fillStyle = "rgba(25,18,12,0.42)"; c.fill(); }
      }
      c.strokeStyle = "rgba(0,0,0,0.28)"; c.lineWidth = 0.022;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(-0.05 - i * 0.22, 0, 0.12, 0.46, 0, -Math.PI / 2, Math.PI / 2); c.stroke(); }
    },
  });
  hairs(c, r, 40, -0.42, 0, 0.56, 0.44, 0.045, lc, 0.011);
  hairs(c, r, 14, -0.42, 0, 0.4, 0.32, 0.03, "rgba(10,8,6,0.55)", 0.009, false);
  // 가슴
  blob(c, r, 0.13, 0, 0.36, 0.33, p.thorax, {
    metal: p.metal,
    inner: () => {
      if (p.stripes) { c.strokeStyle = "rgba(12,10,8,0.78)"; c.lineWidth = 0.055; for (const y of [-0.21, -0.075, 0.075, 0.21]) { c.beginPath(); c.moveTo(-0.22, y * 0.85); c.quadraticCurveTo(0.12, y * 1.08, 0.46, y * 0.75); c.stroke(); } }
    },
  });
  ell(c, -0.2, 0, 0.1, 0.15); c.fillStyle = mixHex(p.thorax[0], p.thorax[1], 0.3); c.fill();
  hairs(c, r, 12, 0.13, 0, 0.3, 0.28, 0.06, lc, 0.011, false);
  hairs(c, r, 22, 0.13, 0, 0.36, 0.33, 0.07, lc, 0.012);
  // 머리와 겹눈
  ell(c, 0.55, 0, 0.17, 0.3); c.fillStyle = p.head; c.fill();
  for (const s of [-1, 1]) {
    c.save();
    ell(c, 0.58, s * 0.155, 0.16, 0.15, s * 0.35);
    const g = c.createRadialGradient(0.6, s * 0.155 - 0.05, 0.01, 0.58, s * 0.155, 0.18);
    g.addColorStop(0, p.eye[1]); g.addColorStop(1, p.eye[0]);
    c.fillStyle = g; c.fill(); c.clip();
    c.fillStyle = "rgba(0,0,0,0.2)";
    for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) { c.beginPath(); c.arc(0.58 + i * 0.022 + (j % 2) * 0.011, s * 0.155 + j * 0.02, 0.006, 0, TAU); c.fill(); }
    const h = c.createRadialGradient(0.57, s * 0.155 - 0.06, 0, 0.57, s * 0.155 - 0.06, 0.07);
    h.addColorStop(0, "rgba(255,255,255,0.55)"); h.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = h; c.fillRect(0.4, s * 0.155 - 0.2, 0.36, 0.4);
    c.restore();
  }
  ell(c, 0.62, 0, 0.11, 0.032); c.fillStyle = p.frons; c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1;
  c.strokeStyle = lc; c.lineWidth = 0.02;
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0.7, s * 0.03); c.lineTo(0.78, s * 0.06); c.stroke(); }
}
// ── 모기 (흰 줄무늬 숲모기) ──
function mosquitoBody(c, pose) {
  const r = rng(pose === "land" ? 31 : 32), land = pose === "land";
  const lc = "#151210";
  for (const s of [-1, 1]) {
    leg(c, 0.22, 0.1, s, [[0.55, 0.42], [land ? 0.3 : 0.45, 0.55], [0.12, 0.48]], 0.032, lc, true);
    leg(c, 0.15, 0.12, s, [[1.6, 0.46], [land ? 1.95 : 2.2, 0.58], [2.05, 0.5]], 0.032, lc, true);
    leg(c, 0.07, 0.1, s, [[2.4, 0.48], [land ? 2.75 : 2.55, 0.62], [land ? 2.95 : 2.3, 0.55]], 0.032, lc, true);
  }
  // 배: 가늘고 길게, 흰 띠
  blob(c, r, -0.48, 0, 0.55, 0.115, ["#0d0b0a", "#4a4440"], {
    inner: () => { c.fillStyle = "rgba(235,235,230,0.85)"; for (let i = 0; i < 7; i++) c.fillRect(-0.08 - i * 0.14, -0.2, 0.028, 0.4); },
  });
  hairs(c, r, 30, -0.48, 0, 0.55, 0.115, 0.04, "rgba(200,190,170,0.5)", 0.008);
  // 가슴: 검은 바탕에 은빛 무늬
  blob(c, r, 0.17, 0, 0.21, 0.165, ["#0e0c0b", "#3d3833"], {
    inner: () => {
      c.strokeStyle = "rgba(235,235,235,0.9)"; c.lineWidth = 0.025;
      c.beginPath(); c.moveTo(0.02, 0); c.lineTo(0.34, 0); c.stroke();
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0.3, s * 0.03); c.quadraticCurveTo(0.12, s * 0.15, 0.02, s * 0.06); c.stroke(); }
    },
  });
  // 머리, 눈, 더듬이, 주둥이
  ell(c, 0.42, 0, 0.11, 0.11); c.fillStyle = "#121010"; c.fill();
  for (const s of [-1, 1]) { ell(c, 0.44, s * 0.06, 0.08, 0.065); const g = c.createRadialGradient(0.45, s * 0.06 - 0.02, 0, 0.44, s * 0.06, 0.09); g.addColorStop(0, "#5a6470"); g.addColorStop(1, "#0b0b0d"); c.fillStyle = g; c.fill(); }
  c.strokeStyle = "#1a1714"; c.lineCap = "round";
  c.lineWidth = 0.028; c.beginPath(); c.moveTo(0.5, 0); c.lineTo(1.32, 0.02); c.stroke();
  c.lineWidth = 0.02; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0.5, s * 0.02); c.lineTo(0.78, s * 0.04); c.stroke(); }
  for (const s of [-1, 1]) {
    c.strokeStyle = "#1a1714"; c.lineWidth = 0.014; c.beginPath(); c.moveTo(0.5, s * 0.04); c.lineTo(0.82, s * 0.24); c.stroke();
    c.strokeStyle = "rgba(60,55,50,0.7)"; c.lineWidth = 0.008;
    for (let k = 0.15; k < 1; k += 0.12) { const x = 0.5 + 0.32 * k, y = s * (0.04 + 0.2 * k); c.beginPath(); c.moveTo(x - 0.04, y + s * 0.04); c.lineTo(x + 0.04, y - s * 0.04); c.stroke(); }
  }
}
// ── 꿀벌 ──
function beeBody(c, pose) {
  const r = rng(pose === "land" ? 51 : 52), land = pose === "land";
  const lc = "#2a1c12";
  const L = land ? 1 : 0.7;
  for (const s of [-1, 1]) {
    leg(c, 0.3, 0.15, s, [[0.8, 0.26 * L], [0.45, 0.3 * L], [0.3, 0.2 * L]], 0.065, lc);
    leg(c, 0.17, 0.18, s, [[1.6, 0.3 * L], [1.95, 0.34 * L], [2.1, 0.22 * L]], 0.065, lc);
    leg(c, 0.05, 0.16, s, [[2.3, 0.32 * L], [2.65, 0.4 * L], [2.85, 0.24 * L]], 0.075, lc);
    // 뒷다리 꽃가루 바구니
    const a1 = 2.3, a2 = 2.65, bx = 0.05 + Math.cos(a1) * 0.32 * L + Math.cos(a2) * 0.2 * L, by = s * (0.16 + Math.sin(a1) * 0.32 * L + Math.sin(a2) * 0.2 * L);
    ell(c, bx, by, 0.09, 0.06, a2 * s); const pg = c.createRadialGradient(bx - 0.02, by - 0.02, 0, bx, by, 0.1); pg.addColorStop(0, "#ffd56a"); pg.addColorStop(1, "#d98a16"); c.fillStyle = pg; c.fill();
  }
  // 배: 황금색과 갈색 띠
  blob(c, r, -0.42, 0, 0.52, 0.37, ["#7a4a14", "#e6a640"], {
    inner: () => {
      for (let i = 0; i < 5; i++) { const x = -0.04 - i * 0.19; c.fillStyle = "rgba(40,22,10,0.88)"; c.beginPath(); c.ellipse(x - 0.06, 0, 0.055, 0.5, 0, 0, TAU); c.fill(); c.fillStyle = "rgba(255,225,150,0.25)"; c.beginPath(); c.ellipse(x - 0.0, 0, 0.02, 0.5, 0, 0, TAU); c.fill(); }
    },
  });
  hairs(c, r, 90, -0.42, 0, 0.52, 0.37, 0.05, "rgba(240,200,120,0.55)", 0.012);
  c.fillStyle = "#24160c"; c.beginPath(); c.moveTo(-0.92, -0.03); c.lineTo(-1.02, 0); c.lineTo(-0.92, 0.03); c.fill();
  // 가슴: 복슬복슬한 털
  blob(c, r, 0.17, 0, 0.29, 0.29, ["#3a2410", "#9a6a30"]);
  for (const col of ["rgba(120,80,35,0.9)", "rgba(200,150,80,0.75)", "rgba(235,195,120,0.6)"]) hairs(c, r, 120, 0.17, 0, 0.3, 0.3, 0.07, col, 0.016, false);
  hairs(c, r, 70, 0.17, 0, 0.29, 0.29, 0.07, "rgba(220,180,110,0.7)", 0.014);
  // 머리
  ell(c, 0.53, 0, 0.15, 0.22); c.fillStyle = "#1d130c"; c.fill();
  for (const s of [-1, 1]) { ell(c, 0.53, s * 0.14, 0.12, 0.08, s * 0.25); const g = c.createRadialGradient(0.55, s * 0.14 - 0.03, 0, 0.53, s * 0.14, 0.13); g.addColorStop(0, "#6a5a4c"); g.addColorStop(1, "#140d08"); c.fillStyle = g; c.fill(); }
  hairs(c, r, 30, 0.53, 0, 0.12, 0.12, 0.04, "rgba(220,180,110,0.6)", 0.01, false);
  c.strokeStyle = "#1a110a"; c.lineWidth = 0.022; c.lineCap = "round";
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0.64, s * 0.05); c.lineTo(0.78, s * 0.12); c.lineTo(0.92, s * 0.08); c.stroke(); }
}
// 날개 한 장 (밑동이 원점, +x 쪽으로 뻗음)
function wingShape(c, kind) {
  const [L, Wd] = WING[kind];
  const bee = kind === "bee", mos = kind === "mosquito";
  const path = () => { c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(L * 0.25, -Wd * 0.95, L * 0.85, -Wd * 1.05, L, -Wd * 0.15); c.bezierCurveTo(L * 1.02, Wd * 0.4, L * 0.6, Wd * 0.75, L * 0.12, Wd * 0.3); c.closePath(); };
  path();
  const g = c.createLinearGradient(0, 0, L, 0);
  if (bee) { g.addColorStop(0, "rgba(150,120,80,0.45)"); g.addColorStop(1, "rgba(170,150,120,0.22)"); }
  else { g.addColorStop(0, "rgba(220,226,236,0.42)"); g.addColorStop(0.5, "rgba(205,214,230,0.24)"); g.addColorStop(1, "rgba(200,208,226,0.17)"); }
  c.fillStyle = g; c.fill();
  c.save(); c.clip();
  const ir = c.createLinearGradient(0, -Wd, L * 0.4, Wd);
  ir.addColorStop(0, "rgba(255,120,210,0.13)"); ir.addColorStop(0.5, "rgba(120,255,200,0.12)"); ir.addColorStop(1, "rgba(120,160,255,0.14)");
  c.fillStyle = ir; c.fillRect(0, -Wd * 1.2, L * 1.1, Wd * 2.4);
  c.strokeStyle = bee ? "rgba(60,40,20,0.6)" : "rgba(45,38,32,0.55)"; c.lineWidth = mos ? 0.008 : 0.012;
  for (const k of [-0.75, -0.4, -0.05, 0.3]) { c.beginPath(); c.moveTo(0.02, k * Wd * 0.2); c.quadraticCurveTo(L * 0.5, k * Wd * 1.05, L * 0.98, k * Wd * 0.55); c.stroke(); }
  c.beginPath(); c.moveTo(L * 0.42, -Wd * 0.35); c.lineTo(L * 0.46, Wd * 0.05); c.moveTo(L * 0.62, -Wd * 0.5); c.lineTo(L * 0.66, -Wd * 0.05); c.stroke();
  c.restore();
  path(); c.strokeStyle = mos ? "rgba(70,60,50,0.55)" : "rgba(60,50,40,0.35)"; c.lineWidth = 0.012; c.stroke();
  if (mos) { c.fillStyle = "rgba(60,55,50,0.5)"; for (let k = 0.15; k < 1; k += 0.05) c.fillRect(L * k, Wd * (0.38 - k * 0.32), 0.012, 0.012); }
}

function sprite(key, ext, draw, rpx) {
  const q = DPR() * 1.25, k = `${key}:${Math.ceil(rpx)}:${q}`;
  let s = cache.get(k);
  if (s) return s;
  const size = ext * 2 * rpx * q, c = mk(size, size), x = c.getContext("2d");
  x.translate(size / 2, size / 2); x.scale(rpx * q, rpx * q);
  draw(x);
  s = { c, ext };
  cache.set(k, s);
  if (cache.size > 160) cache.delete(cache.keys().next().value);
  return s;
}
function bodySprite(kind, pose, rpx) {
  return sprite(`b:${kind}:${pose}`, 2.6, (c) => (kind === "mosquito" ? mosquitoBody(c, pose) : kind === "bee" ? beeBody(c, pose) : flyBody(c, kind, pose)), rpx);
}
function wingSprite(kind, rpx) { return sprite(`w:${kind}`, 1.1, (c) => wingShape(c, kind), rpx); }
function silhouette(kind, rpx) {
  return sprite(`s:${kind}`, 2.6, (c) => {
    c.fillStyle = "#000";
    if (kind === "mosquito") { ell(c, -0.3, 0, 0.75, 0.13); c.fill(); for (const s of [-1, 1]) for (const a of [0.5, 1.7, 2.6]) { c.strokeStyle = "#000"; c.lineWidth = 0.03; c.beginPath(); c.moveTo(0.1, 0); c.lineTo(0.1 + Math.cos(a) * 1.3, s * Math.sin(a) * 1.3); c.stroke(); } }
    else { ell(c, -0.2, 0, 0.85, 0.45); c.fill(); }
  }, rpx);
}

// 매 프레임 벌레 그리기
export function drawBugReal(g, b, S, t) {
  const sc = b.kind === "mosquito" ? 0.7 + b.approach * 0.9 : 1;
  const r = b.r * sc, base = b.r * (b.kind === "mosquito" ? 1.6 : 1);
  const dead = b.mode === "dead", flying = !dead && b.mode !== "land";
  if (!dead) {
    const sp = Math.hypot(b.vx, b.vy);
    if (b.head == null) b.head = Math.atan2(b.vy || -1, b.vx || 0.3);
    if (sp > S * 0.25) b.head += angDiff(Math.atan2(b.vy, b.vx), b.head) * (b.kind === "fly" || b.kind === "golden" ? 0.22 : 0.12);
  }
  const alpha = dead ? Math.max(0, b.fade ?? 1) : 1;
  const kind = b.kind === "boss" ? "boss" : b.kind;
  // 빛나는 벌레
  if (kind === "golden" || kind === "boss") {
    const gl = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 2.4);
    gl.addColorStop(0, kind === "golden" ? `rgba(255,215,90,${0.5 * alpha})` : `rgba(190,80,255,${0.32 * alpha})`); gl.addColorStop(1, "rgba(255,215,90,0)");
    g.fillStyle = gl; g.beginPath(); g.arc(b.x, b.y, r * 2.4, 0, TAU); g.fill();
  }
  // 그림자 (날고 있으면 멀리, 앉아 있으면 바로 밑에)
  if (!dead) {
    const alt = flying ? 1 : 0.12, sh = silhouette(kind === "boss" ? "fly" : kind, base);
    g.save();
    g.globalAlpha = flying ? 0.13 : 0.34;
    g.translate(b.x + r * 0.3 * alt + r * 0.06, b.y + r * 0.9 * alt + r * 0.08);
    g.rotate(b.head); g.scale(r / base * (flying ? 0.85 : 1), r / base * (flying ? 0.85 : 1));
    const e = sh.ext * base;
    g.drawImage(sh.c, -e, -e, e * 2, e * 2);
    g.restore();
  }
  g.save();
  g.translate(b.x, b.y + (flying ? Math.sin(b.t * 18) * r * 0.05 : 0));
  g.globalAlpha = alpha;
  if (dead) { g.rotate(b.spin || 0); g.scale(1.32, 0.58); } // 납작하게 눌림
  g.rotate(b.head ?? 0);
  const k = r / base;
  g.scale(k, k);
  const body = bodySprite(kind, flying ? "fly" : "land", base), e = body.ext * base;
  g.drawImage(body.c, -e, -e, e * 2, e * 2);
  if (b.flash > 0) { b.flash -= 0.016; g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.6 * alpha; g.drawImage(body.c, -e, -e, e * 2, e * 2); g.globalCompositeOperation = "source-over"; g.globalAlpha = alpha; }
  if (dead) { g.fillStyle = "rgba(20,10,5,0.25)"; g.beginPath(); g.ellipse(-base * 0.2, 0, base * 0.7, base * 0.4, 0, 0, TAU); g.fill(); }
  // 날개
  const wing = wingSprite(kind, base), we = wing.ext * base;
  const [, , ax, ay, rest] = WING[kind];
  for (const s of [-1, 1]) {
    g.save();
    g.translate(ax * base, s * ay * base);
    if (s < 0) g.scale(1, -1);
    if (flying) {
      // 빠른 날갯짓은 흐릿한 부채꼴로 보인다
      const ph = b.wing;
      for (let i = 0; i < 8; i++) {
        const a = Math.PI - 0.4 - (0.5 + 0.5 * Math.sin(ph + i * 0.45)) * 1.4;
        g.save(); g.rotate(a); g.globalAlpha = alpha * 0.17; g.drawImage(wing.c, -we, -we, we * 2, we * 2); g.restore();
      }
    } else {
      const jit = dead ? Math.sin((b.spin || 0) * 3 + s) * 0.25 : 0;
      g.rotate(Math.PI - rest + jit);
      g.drawImage(wing.c, -we, -we, we * 2, we * 2);
    }
    g.restore();
  }
  g.restore();
  // 파리왕 왕관 (항상 똑바로)
  if (kind === "boss" && !dead) crown(g, b.x, b.y - r * 0.95, r * 0.42, t);
  if (kind === "golden" && !dead) {
    for (let i = 0; i < 2; i++) { const a = t * 3 + i * Math.PI; twinkle(g, b.x + Math.cos(a) * r * 1.2, b.y + Math.sin(a) * r * 0.7, r * 0.22 * (0.6 + 0.4 * Math.sin(t * 9 + i))); }
  }
  if (b.dizzy > 0 && !dead) {
    g.fillStyle = "#ffe66d";
    for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; twinkle(g, b.x + Math.cos(a) * r, b.y - r * 0.9 + Math.sin(a) * r * 0.3, r * 0.2); }
  }
}
function twinkle(g, x, y, s) {
  const gr = g.createRadialGradient(x, y, 0, x, y, s);
  gr.addColorStop(0, "rgba(255,255,230,1)"); gr.addColorStop(1, "rgba(255,230,120,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x, y, x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.fill();
}
function crown(g, x, y, w, t) {
  g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2) * 0.08);
  const gr = g.createLinearGradient(0, -w, 0, w * 0.2);
  gr.addColorStop(0, "#fff3b0"); gr.addColorStop(0.4, "#f2c230"); gr.addColorStop(1, "#9a6a08");
  g.fillStyle = gr; g.strokeStyle = "#6a4500"; g.lineWidth = Math.max(1, w * 0.06);
  g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -w * 0.75); g.lineTo(-w * 0.5, -w * 0.35); g.lineTo(0, -w * 0.95); g.lineTo(w * 0.5, -w * 0.35); g.lineTo(w, -w * 0.75); g.lineTo(w, 0); g.closePath(); g.fill(); g.stroke();
  for (const [gx, col] of [[-0.5, "#e8304a"], [0, "#2f7dff"], [0.5, "#e8304a"]]) { g.fillStyle = col; g.beginPath(); g.arc(gx * w, -w * 0.18, w * 0.11, 0, TAU); g.fill(); g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.arc(gx * w - w * 0.03, -w * 0.21, w * 0.035, 0, TAU); g.fill(); }
  g.restore();
}

// ═════════════ 소품 ═════════════
function propsLayer(W, H, stage) {
  const q = DPR(), k = `p:${stage}:${W}x${H}:${q}`;
  let c = cache.get(k);
  if (c) return c;
  c = mk(W * q, H * q);
  const x = c.getContext("2d");
  x.scale(q, q);
  const S = Math.min(W, H) / 10, r = rng(7);
  if (stage === "kitchen") { table(x, W, H, S, r); shadow(x, W * 0.25, H * 0.865, S * 1.5, S * 0.18); watermelon(x, W * 0.25, H * 0.86, S * 1.3, r); shadow(x, W * 0.76, H * 0.86, S * 1.3, S * 0.2); cake(x, W * 0.76, H * 0.86, S, r); }
  else if (stage === "camp") { ground(x, W, H, S, r); tent(x, W, H, S); lanternBody(x, W * 0.82, H * 0.66, S); }
  else if (stage === "picnic") { blanket(x, W, H, S, r); shadow(x, W * 0.55 + S * 0.8, H * 0.74 + S * 1.0, S * 1.0, S * 0.18); basket(x, W * 0.55, H * 0.74, S, r); for (const [fx, col] of [[0.08, "#ffffff"], [0.16, "#ffd84a"], [0.88, "#ffffff"], [0.95, "#ff8fb0"]]) flower(x, W * fx, H * 0.95, S, col, r); }
  cache.set(k, c);
  return c;
}
function shadow(c, x, y, rx, ry) {
  const g = c.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, "rgba(0,0,0,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
  c.save(); c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y); c.fillStyle = g; c.beginPath(); c.arc(x, y, rx, 0, TAU); c.fill(); c.restore();
}
function table(c, W, H, S, r) {
  const y0 = H * 0.84;
  const g = c.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, "#9b6236"); g.addColorStop(1, "#5e3518");
  c.fillStyle = g; c.fillRect(0, y0, W, H - y0);
  c.save(); c.beginPath(); c.rect(0, y0, W, H - y0); c.clip();
  for (let i = 0; i < 70; i++) { // 나뭇결
    const y = y0 + r() * (H - y0), amp = 2 + r() * 5, f = 0.004 + r() * 0.01, ph = r() * 9;
    c.strokeStyle = `rgba(${r() < 0.5 ? "50,25,8" : "190,130,80"},${0.12 + r() * 0.18})`; c.lineWidth = 0.6 + r() * 1.6;
    c.beginPath(); for (let xx = 0; xx <= W; xx += 12) c.lineTo(xx, y + Math.sin(xx * f + ph) * amp); c.stroke();
  }
  for (let xx = r() * 120; xx < W; xx += W * (0.18 + r() * 0.1)) { c.fillStyle = "rgba(30,15,5,0.45)"; c.fillRect(xx, y0, 2, H - y0); }
  c.restore();
  c.fillStyle = "rgba(255,220,180,0.35)"; c.fillRect(0, y0, W, 2);
  const e = c.createLinearGradient(0, y0, 0, y0 + S * 0.4); e.addColorStop(0, "rgba(0,0,0,0.25)"); e.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = e; c.fillRect(0, y0 + 2, W, S * 0.4);
}
function watermelon(c, x, y, R, r) {
  c.save(); c.translate(x, y);
  const half = (rad) => { c.beginPath(); c.arc(0, 0, rad, Math.PI, 0); c.closePath(); };
  half(R); let g = c.createRadialGradient(-R * 0.3, -R * 0.6, R * 0.1, 0, 0, R); g.addColorStop(0, "#3f8a3a"); g.addColorStop(1, "#14401a"); c.fillStyle = g; c.fill();
  c.save(); half(R); c.clip(); c.strokeStyle = "rgba(8,35,10,0.6)"; c.lineWidth = R * 0.07;
  for (let a = Math.PI + 0.15; a < TAU; a += 0.32) { c.beginPath(); for (let k = 0.9; k <= 1.05; k += 0.03) c.lineTo(Math.cos(a + Math.sin(k * 30) * 0.05) * R * k, Math.sin(a + Math.sin(k * 30) * 0.05) * R * k); c.stroke(); }
  c.restore();
  half(R * 0.9); g = c.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 0.9); g.addColorStop(0, "#f3fbe6"); g.addColorStop(1, "#a7d58e"); c.fillStyle = g; c.fill();
  half(R * 0.83); g = c.createRadialGradient(0, -R * 0.15, R * 0.05, 0, 0, R * 0.83); g.addColorStop(0, "#ff4a5c"); g.addColorStop(0.8, "#ea2f45"); g.addColorStop(1, "#ff8f8a"); c.fillStyle = g; c.fill();
  c.save(); half(R * 0.83); c.clip();
  for (let i = 0; i < 700; i++) { const a = Math.PI + r() * Math.PI, d = Math.sqrt(r()) * R * 0.82; c.fillStyle = r() < 0.5 ? "rgba(255,200,200,0.22)" : "rgba(150,0,20,0.18)"; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, R * (0.008 + r() * 0.012), 0, TAU); c.fill(); }
  c.restore();
  for (const [rr, n] of [[0.58, 7], [0.36, 4]]) for (let i = 0; i < n; i++) {
    const a = Math.PI + (i + 0.5) / n * Math.PI, sx = Math.cos(a) * R * rr, sy = Math.sin(a) * R * rr;
    c.save(); c.translate(sx, sy); c.rotate(a + Math.PI / 2);
    c.beginPath(); c.moveTo(0, -R * 0.07); c.quadraticCurveTo(R * 0.05, R * 0.02, 0, R * 0.05); c.quadraticCurveTo(-R * 0.05, R * 0.02, 0, -R * 0.07);
    const sg = c.createLinearGradient(-R * 0.04, 0, R * 0.04, 0); sg.addColorStop(0, "#3a1a10"); sg.addColorStop(1, "#0e0604"); c.fillStyle = sg; c.fill();
    c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath(); c.ellipse(-R * 0.012, -R * 0.02, R * 0.008, R * 0.02, 0, 0, TAU); c.fill();
    c.restore();
  }
  const sh = c.createLinearGradient(0, -R, 0, 0); sh.addColorStop(0, "rgba(255,255,255,0.18)"); sh.addColorStop(0.4, "rgba(255,255,255,0)"); half(R * 0.83); c.fillStyle = sh; c.fill();
  c.restore();
}
function cake(c, x, y, S, r) {
  c.save(); c.translate(x, y);
  // 접시
  let g = c.createLinearGradient(0, -S * 0.1, 0, S * 0.1); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#c9cdd4");
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, S * 1.35, S * 0.16, 0, 0, TAU); c.fill();
  const w = S * 1.7, x0 = -w / 2, layers = [["sponge", 0.32], ["cream", 0.1], ["jam", 0.06], ["cream", 0.06], ["sponge", 0.3], ["top", 0.14]];
  let yy = -S * 0.03;
  for (const [type, h0] of layers) {
    const h = S * h0; yy -= h;
    if (type === "sponge") {
      g = c.createLinearGradient(0, yy, 0, yy + h); g.addColorStop(0, "#f7d9a0"); g.addColorStop(1, "#e2ae66"); c.fillStyle = g; c.fillRect(x0, yy, w, h);
      for (let i = 0; i < 110; i++) { c.fillStyle = r() < 0.7 ? "rgba(170,110,40,0.35)" : "rgba(255,245,215,0.5)"; c.beginPath(); c.ellipse(x0 + r() * w, yy + r() * h, S * (0.008 + r() * 0.02), S * (0.006 + r() * 0.012), 0, 0, TAU); c.fill(); }
    } else if (type === "jam") { g = c.createLinearGradient(0, yy, 0, yy + h); g.addColorStop(0, "#e2304a"); g.addColorStop(1, "#9c1028"); c.fillStyle = g; c.fillRect(x0, yy, w, h); }
    else { g = c.createLinearGradient(0, yy, 0, yy + h); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#ece4d8"); c.fillStyle = g; c.fillRect(x0, yy, w, h); }
  }
  // 위 크림이 흘러내린 모양
  c.fillStyle = "#fffaf3"; c.beginPath(); c.moveTo(x0, yy);
  for (let i = 0; i <= 8; i++) { const xx = x0 + (w * i) / 8; c.lineTo(xx, yy + S * (0.12 + (i % 2 ? 0.08 : 0.02))); }
  c.lineTo(x0 + w, yy); c.closePath(); c.fill();
  c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(x0 + w - S * 0.12, yy, S * 0.12, -yy - S * 0.03);
  c.fillStyle = "rgba(255,255,255,0.35)"; c.fillRect(x0, yy, S * 0.06, -yy - S * 0.03);
  // 딸기
  for (const [sx, sz] of [[-0.35, 0.95], [0.32, 1.05]]) strawberry(c, sx * S, yy - S * 0.02, S * 0.3 * sz, r);
  c.restore();
}
function strawberry(c, x, y, s, r) {
  c.save(); c.translate(x, y);
  c.beginPath(); c.moveTo(0, -s * 0.9); c.bezierCurveTo(s * 0.9, -s * 1.0, s * 0.8, -s * 0.1, 0, s * 0.25); c.bezierCurveTo(-s * 0.8, -s * 0.1, -s * 0.9, -s * 1.0, 0, -s * 0.9);
  const g = c.createRadialGradient(-s * 0.25, -s * 0.65, s * 0.05, 0, -s * 0.4, s * 0.9); g.addColorStop(0, "#ff6a74"); g.addColorStop(0.6, "#d8142c"); g.addColorStop(1, "#8a0614");
  c.fillStyle = g; c.fill();
  for (let i = 0; i < 18; i++) { const a = r() * TAU, d = Math.sqrt(r()) * s * 0.5; c.fillStyle = "#f6d36a"; c.beginPath(); c.ellipse(Math.cos(a) * d, -s * 0.4 + Math.sin(a) * d * 0.9, s * 0.03, s * 0.05, a, 0, TAU); c.fill(); }
  c.fillStyle = "rgba(255,255,255,0.5)"; c.beginPath(); c.ellipse(-s * 0.3, -s * 0.6, s * 0.1, s * 0.18, -0.5, 0, TAU); c.fill();
  c.fillStyle = "#3e8f2a";
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.55; c.beginPath(); c.ellipse(Math.cos(a) * s * 0.25, -s * 0.9 + Math.sin(a) * s * 0.1, s * 0.25, s * 0.07, a, 0, TAU); c.fill(); }
  c.restore();
}
function ground(c, W, H, S, r) {
  const y0 = H * 0.86;
  const g = c.createLinearGradient(0, y0, 0, H); g.addColorStop(0, "rgba(10,25,12,0.7)"); g.addColorStop(1, "rgba(5,14,7,0.95)");
  c.fillStyle = g; c.fillRect(0, y0, W, H - y0);
  for (let i = 0; i < 500; i++) { const x = r() * W, y = y0 + r() * (H - y0) + 6, h = S * (0.12 + r() * 0.25); c.strokeStyle = `rgba(${20 + r() * 40},${50 + r() * 60},${20 + r() * 30},0.8)`; c.lineWidth = 1 + r(); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (r() - 0.5) * h, y - h * 0.6, x + (r() - 0.5) * h * 0.8, y - h); c.stroke(); }
}
function tent(c, W, H, S) {
  const ax = W * 0.18, ay = H * 0.64, lx = W * 0.03, rx = W * 0.33, by = H;
  c.save();
  c.beginPath(); c.moveTo(lx, by); c.lineTo(ax, ay); c.lineTo(rx, by); c.closePath();
  const g = c.createLinearGradient(lx, 0, rx, 0); g.addColorStop(0, "#7a3410"); g.addColorStop(0.45, "#d8742f"); g.addColorStop(0.55, "#c4621f"); g.addColorStop(1, "#6a2a0a");
  c.fillStyle = g; c.fill(); c.clip();
  c.strokeStyle = "rgba(255,200,150,0.25)"; c.lineWidth = 2;
  for (const t of [0.3, 0.6]) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(lx + (rx - lx) * t, by); c.stroke(); }
  for (let i = 0; i < 6; i++) { c.strokeStyle = "rgba(0,0,0,0.12)"; c.lineWidth = S * 0.08; c.beginPath(); c.moveTo(lx, ay + (by - ay) * (0.3 + i * 0.13)); c.quadraticCurveTo(ax, ay + (by - ay) * (0.36 + i * 0.13), rx, ay + (by - ay) * (0.3 + i * 0.13)); c.stroke(); }
  c.beginPath(); c.moveTo(ax - S * 0.6, by); c.lineTo(ax, ay + (by - ay) * 0.35); c.lineTo(ax + S * 0.6, by); c.closePath();
  const d = c.createLinearGradient(0, ay, 0, by); d.addColorStop(0, "#1a0a04"); d.addColorStop(1, "#3a1a0a"); c.fillStyle = d; c.fill();
  c.strokeStyle = "#c9c2b0"; c.lineWidth = 2; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(ax, ay + (by - ay) * 0.35); c.lineTo(ax, by); c.stroke(); c.setLineDash([]);
  c.restore();
  c.strokeStyle = "rgba(220,210,190,0.5)"; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(rx + S * 0.8, by - S * 0.1); c.moveTo(ax, ay); c.lineTo(lx - S * 0.6, by - S * 0.1); c.stroke();
}
function lanternBody(c, x, y, S) {
  c.save(); c.translate(x, y);
  c.strokeStyle = "#2a2d33"; c.lineWidth = S * 0.04; c.beginPath(); c.arc(0, -S * 0.55, S * 0.22, Math.PI, 0); c.stroke();
  let g = c.createLinearGradient(-S * 0.3, 0, S * 0.3, 0); g.addColorStop(0, "#1c1f24"); g.addColorStop(0.4, "#6a707a"); g.addColorStop(1, "#16181c");
  c.fillStyle = g; rrect(c, -S * 0.3, -S * 0.58, S * 0.6, S * 0.2, S * 0.06); c.fill(); rrect(c, -S * 0.32, S * 0.3, S * 0.64, S * 0.16, S * 0.05); c.fill();
  g = c.createLinearGradient(-S * 0.25, 0, S * 0.25, 0); g.addColorStop(0, "rgba(255,170,60,0.9)"); g.addColorStop(0.5, "rgba(255,248,214,1)"); g.addColorStop(1, "rgba(255,160,50,0.9)");
  c.fillStyle = g; rrect(c, -S * 0.25, -S * 0.4, S * 0.5, S * 0.72, S * 0.08); c.fill();
  c.strokeStyle = "rgba(30,32,36,0.85)"; c.lineWidth = S * 0.035; for (const xx of [-0.17, 0.17]) { c.beginPath(); c.moveTo(xx * S, -S * 0.4); c.lineTo(xx * S, S * 0.32); c.stroke(); }
  c.fillStyle = "rgba(255,255,255,0.5)"; c.fillRect(-S * 0.13, -S * 0.32, S * 0.04, S * 0.56);
  c.restore();
}
function blanket(c, W, H, S, r) {
  const y0 = H * 0.8, y1 = H * 1.02, tl = W * 0.12, tr = W * 0.88, bl = -W * 0.15, br = W * 1.15;
  const rows = 6, cols = 14;
  const P = (u, v) => { const yy = y0 + (y1 - y0) * Math.pow(v, 1.25), l = tl + (bl - tl) * v, rr = tr + (br - tr) * v; return [l + (rr - l) * u, yy]; };
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = P(j / cols, i / rows), b = P((j + 1) / cols, i / rows), cc = P((j + 1) / cols, (i + 1) / rows), d = P(j / cols, (i + 1) / rows);
    const odd = (i % 2) + (j % 2);
    c.fillStyle = odd === 2 ? "#b81d34" : odd === 1 ? "#e6808e" : "#fbf2ea";
    c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...cc); c.lineTo(...d); c.closePath(); c.fill();
  }
  c.save();
  c.beginPath(); c.moveTo(...P(0, 0)); c.lineTo(...P(1, 0)); c.lineTo(...P(1, 1)); c.lineTo(...P(0, 1)); c.closePath(); c.clip();
  for (let i = 0; i < 900; i++) { c.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)"; c.fillRect(r() * W, y0 + r() * (H - y0), 1 + r() * 3, 1); }
  for (let i = 0; i < 4; i++) { const xx = W * (0.15 + i * 0.24 + r() * 0.08); const fg = c.createLinearGradient(xx - S * 0.5, 0, xx + S * 0.5, 0); fg.addColorStop(0, "rgba(0,0,0,0)"); fg.addColorStop(0.5, "rgba(0,0,0,0.06)"); fg.addColorStop(0.6, "rgba(255,255,255,0.05)"); fg.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = fg; c.fillRect(xx - S * 0.5, y0, S, H - y0); }
  const top = c.createLinearGradient(0, y0, 0, y0 + S * 0.5); top.addColorStop(0, "rgba(0,0,0,0.25)"); top.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = top; c.fillRect(0, y0, W, S * 0.5);
  c.restore();
}
function basket(c, x, y, S, r) {
  const w = S * 1.6, h = S * 1.0;
  c.save(); c.translate(x, y);
  // 손잡이
  c.lineCap = "round";
  c.strokeStyle = "#6e4318"; c.lineWidth = S * 0.14; c.beginPath(); c.arc(w / 2, 0, S * 0.68, Math.PI, 0); c.stroke();
  c.strokeStyle = "#b07a3c"; c.lineWidth = S * 0.06; c.setLineDash([S * 0.08, S * 0.06]); c.beginPath(); c.arc(w / 2, 0, S * 0.68, Math.PI, 0); c.stroke(); c.setLineDash([]);
  // 몸통 (아래가 살짝 좁은 통)
  c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w - S * 0.12, h); c.lineTo(S * 0.12, h); c.closePath();
  c.fillStyle = "#5a3412"; c.fill(); c.save(); c.clip();
  const rowH = S * 0.13;
  for (let row = 0; row * rowH < h; row++) for (let col = -1; col * S * 0.2 < w + S * 0.2; col++) {
    const cx = col * S * 0.2 + (row % 2 ? S * 0.1 : 0), cy = row * rowH + rowH / 2;
    const g = c.createLinearGradient(cx, cy - rowH / 2, cx, cy + rowH / 2); g.addColorStop(0, "#d9a25c"); g.addColorStop(0.5, "#b07636"); g.addColorStop(1, "#6e4318");
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, S * 0.095, rowH * 0.45, 0, 0, TAU); c.fill();
  }
  const sh = c.createLinearGradient(0, 0, w, 0); sh.addColorStop(0, "rgba(0,0,0,0.35)"); sh.addColorStop(0.35, "rgba(0,0,0,0)"); sh.addColorStop(0.75, "rgba(255,230,180,0.12)"); sh.addColorStop(1, "rgba(0,0,0,0.4)");
  c.fillStyle = sh; c.fillRect(0, 0, w, h);
  c.restore();
  // 테두리
  const rg = c.createLinearGradient(0, -S * 0.08, 0, S * 0.1); rg.addColorStop(0, "#d9a25c"); rg.addColorStop(1, "#6e4318");
  c.fillStyle = rg; rrect(c, -S * 0.06, -S * 0.08, w + S * 0.12, S * 0.18, S * 0.08); c.fill();
  // 덮은 천
  c.fillStyle = "#e6808e"; c.beginPath(); c.moveTo(w * 0.15, -S * 0.06); c.quadraticCurveTo(w * 0.4, -S * 0.32, w * 0.62, -S * 0.08); c.closePath(); c.fill();
  c.restore();
}
function flower(c, x, y, S, col, r) {
  c.save(); c.translate(x, y);
  c.strokeStyle = "#2f6a24"; c.lineWidth = S * 0.05; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(S * 0.05, S * 0.3, 0, S * 0.7); c.stroke();
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.1;
    c.save(); c.rotate(a);
    const g = c.createLinearGradient(0, 0, S * 0.3, 0); g.addColorStop(0, col === "#ffffff" ? "#e9e4da" : col); g.addColorStop(1, col);
    c.fillStyle = g; c.beginPath(); c.ellipse(S * 0.17, 0, S * 0.15, S * 0.05, 0, 0, TAU); c.fill();
    c.strokeStyle = "rgba(0,0,0,0.08)"; c.lineWidth = 0.8; c.stroke();
    c.restore();
  }
  const cg = c.createRadialGradient(-S * 0.03, -S * 0.03, 0, 0, 0, S * 0.1); cg.addColorStop(0, "#ffe37a"); cg.addColorStop(1, "#d48a0a");
  c.fillStyle = cg; c.beginPath(); c.arc(0, 0, S * 0.09, 0, TAU); c.fill();
  c.fillStyle = "rgba(120,60,0,0.4)"; for (let i = 0; i < 14; i++) { const a = r() * TAU, d = r() * S * 0.07; c.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1.2, 1.2); }
  c.restore();
}
export function drawPropsReal(g, W, H, stage, t) {
  const S = Math.min(W, H) / 10;
  if (stage === "camp") { // 랜턴 불빛은 매번 일렁이게
    const lx = W * 0.82, ly = H * 0.62, f = 1 + Math.sin(t * 9) * 0.03 + Math.sin(t * 23) * 0.015;
    const gl = g.createRadialGradient(lx, ly, 0, lx, ly, S * 3.6 * f);
    gl.addColorStop(0, "rgba(255,214,140,0.6)"); gl.addColorStop(0.25, "rgba(255,180,90,0.25)"); gl.addColorStop(1, "rgba(255,180,90,0)");
    g.fillStyle = gl; g.beginPath(); g.arc(lx, ly, S * 3.6 * f, 0, TAU); g.fill();
  }
  const layer = propsLayer(W, H, stage);
  g.drawImage(layer, 0, 0, W, H);
}

// ═════════════ 파리채 ═════════════
function swatterSprite(color, S) {
  const q = DPR(), k = `sw:${color}:${Math.round(S)}:${q}`;
  let s = cache.get(k);
  if (s) return s;
  const hw = S * 0.95, hh = S * 1.15, pad = S * 0.2;
  const Wd = (hw + pad) * 2, Ht = hh * 2 + hh * 1.5 + pad;
  const c = mk(Wd * q, Ht * q), x = c.getContext("2d");
  x.scale(q, q); x.translate(Wd / 2, hh + pad / 2);
  // 손잡이: 꼬인 철사
  const wg = x.createLinearGradient(-S * 0.05, 0, S * 0.05, 0); wg.addColorStop(0, "#5a5f66"); wg.addColorStop(0.45, "#e4e8ee"); wg.addColorStop(1, "#4a4f56");
  x.strokeStyle = wg; x.lineWidth = S * 0.09; x.lineCap = "round"; x.beginPath(); x.moveTo(0, hh * 0.92); x.lineTo(0, hh * 2.0); x.stroke();
  x.strokeStyle = "rgba(40,44,50,0.6)"; x.lineWidth = S * 0.015; for (let yy = hh; yy < hh * 1.95; yy += S * 0.07) { x.beginPath(); x.moveTo(-S * 0.04, yy); x.lineTo(S * 0.04, yy + S * 0.035); x.stroke(); }
  // 손잡이 끝 고무
  const gg = x.createLinearGradient(-S * 0.13, 0, S * 0.13, 0); gg.addColorStop(0, shade(color, -0.45)); gg.addColorStop(0.4, shade(color, 0.15)); gg.addColorStop(1, shade(color, -0.55));
  x.fillStyle = gg; rrect(x, -S * 0.12, hh * 1.88, S * 0.24, hh * 0.55, S * 0.1); x.fill();
  x.strokeStyle = "rgba(0,0,0,0.25)"; x.lineWidth = S * 0.02; for (let i = 1; i < 6; i++) { const yy = hh * 1.88 + (hh * 0.55 * i) / 6; x.beginPath(); x.moveTo(-S * 0.11, yy); x.lineTo(S * 0.11, yy); x.stroke(); }
  // 목 부분
  x.fillStyle = shade(color, -0.2); x.beginPath(); x.moveTo(-S * 0.22, hh * 0.9); x.lineTo(S * 0.22, hh * 0.9); x.lineTo(S * 0.07, hh * 1.18); x.lineTo(-S * 0.07, hh * 1.18); x.closePath(); x.fill();
  // 머리: 구멍 뚫린 플라스틱
  const hc = mk(Wd * q, (hh * 2 + pad) * q), hx = hc.getContext("2d");
  hx.scale(q, q); hx.translate(Wd / 2, hh + pad / 2);
  rrect(hx, -hw, -hh, hw * 2, hh * 2, S * 0.35);
  const pg = hx.createLinearGradient(-hw, -hh, hw, hh); pg.addColorStop(0, shade(color, 0.3)); pg.addColorStop(0.5, color); pg.addColorStop(1, shade(color, -0.35));
  hx.fillStyle = pg; hx.globalAlpha = 0.92; hx.fill(); hx.globalAlpha = 1;
  hx.globalCompositeOperation = "destination-out";
  const hs = S * 0.115, step = S * 0.19;
  for (let yy = -hh + S * 0.2; yy < hh - S * 0.2; yy += step) for (let xx = -hw + S * 0.2; xx < hw - S * 0.2; xx += step) { rrect(hx, xx, yy, hs, hs, hs * 0.3); hx.fill(); }
  hx.globalCompositeOperation = "source-over";
  rrect(hx, -hw, -hh, hw * 2, hh * 2, S * 0.35);
  hx.strokeStyle = shade(color, -0.3); hx.lineWidth = S * 0.13; hx.stroke();
  hx.strokeStyle = "rgba(255,255,255,0.45)"; hx.lineWidth = S * 0.03; rrect(hx, -hw + S * 0.04, -hh + S * 0.04, hw * 2 - S * 0.08, hh * 2 - S * 0.08, S * 0.32); hx.stroke();
  const sp = hx.createLinearGradient(-hw, -hh, -hw * 0.2, hh * 0.2); sp.addColorStop(0, "rgba(255,255,255,0.35)"); sp.addColorStop(1, "rgba(255,255,255,0)");
  hx.globalCompositeOperation = "source-atop"; hx.fillStyle = sp; hx.fillRect(-hw, -hh, hw * 2, hh * 2); hx.globalCompositeOperation = "source-over";
  x.drawImage(hc, -Wd / 2, -hh - pad / 2, Wd, hh * 2 + pad);
  // 그림자용 검은 실루엣
  const shc = mk(c.width, c.height), sx = shc.getContext("2d");
  sx.drawImage(c, 0, 0); sx.globalCompositeOperation = "source-in"; sx.fillStyle = "#000"; sx.fillRect(0, 0, shc.width, shc.height);
  s = { c, shc, Wd, Ht, ox: Wd / 2, oy: hh + pad / 2 };
  cache.set(k, s);
  return s;
}
function shade(hex, t) {
  const p = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const q = p.map((v) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t)));
  return `rgb(${q.join(",")})`;
}
export function drawSwatterReal(g, h, S, color, swatK) {
  const sp = swatterSprite(color, S);
  const ang = ((h.dir ?? -Math.PI / 2) + Math.PI / 2) * 0.6;
  const hit = swatK > 0 ? Math.sin(swatK * Math.PI) : 0;
  const squash = 1 - hit * 0.25;
  const place = (dx, dy, img, a) => {
    g.save(); g.translate(h.x + dx, h.y + dy); g.rotate(ang); g.scale(1 + (1 - squash) * 0.6, squash); g.globalAlpha = a;
    g.drawImage(img, -sp.ox, -sp.oy, sp.Wd, sp.Ht); g.restore();
  };
  const lift = 1 - hit; // 내리치는 순간 그림자와 겹친다
  place(S * 0.28 * lift + S * 0.04, S * 0.38 * lift + S * 0.04, sp.shc, 0.24);
  place(0, 0, sp.c, 1);
}
