// 벌레 움직임, 찰싹 판정, 점수, 그리기(벌레·소품·파리채·효과). 단위 S = 화면 짧은 쪽의 1/10.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;

export const STAGES = {
  kitchen: { name: "부엌", tint: "rgba(255,200,120,0.10)", mix: { fly: 6, big: 1, golden: 0.25 }, max: 1, bg: ["#f6e7cf", "#e9cfa7"] },
  camp: { name: "캠핑장 밤", tint: "rgba(20,30,80,0.38)", mix: { mosquito: 5, fly: 2, golden: 0.2 }, max: 1, bg: ["#0d1638", "#1d2b55"] },
  picnic: { name: "피크닉", tint: "rgba(120,220,120,0.08)", mix: { fly: 4, bee: 2.2, big: 1, golden: 0.3 }, max: 1.15, bg: ["#bfe6ff", "#9fd98a"] },
  boss: { name: "파리왕", tint: "rgba(60,0,90,0.30)", mix: { fly: 3 }, max: 0.7, bg: ["#2a0f3d", "#4a1d5e"], boss: true },
};
export const DIFF = {
  easy: { speed: 0.7, count: 4, flee: false, hp: 8 },
  normal: { speed: 1, count: 6, flee: true, hp: 12 },
  hard: { speed: 1.35, count: 8, flee: true, hp: 16 },
};
const KIND = {
  fly: { r: 0.32, speed: 2.4, pts: 100, hp: 1 },
  mosquito: { r: 0.24, speed: 1.4, pts: 150, hp: 1 },
  big: { r: 0.52, speed: 1.4, pts: 300, hp: 2 },
  bee: { r: 0.38, speed: 1.1, pts: -200, hp: 1 },
  golden: { r: 0.32, speed: 3.6, pts: 1000, hp: 1 },
  boss: { r: 1.5, speed: 1.2, pts: 3000, hp: 12 },
};

export class Game {
  constructor(opts, emit) {
    this.opts = opts; this.emit = emit; // { stage, diff, time, duo }
    this.bugs = []; this.fx = []; this.bumps = []; this.t = 0; this.phase = "idle";
    this.W = 1; this.H = 1; this.S = 1;
  }
  get st() { return STAGES[this.opts.stage]; }
  get d() { return DIFF[this.opts.diff]; }
  resize(W, H) { this.W = W; this.H = H; this.S = Math.min(W, H) / 10; this.spots = this.landingSpots(); }
  start() {
    this.bugs = []; this.fx = []; this.bumps = []; this.t = 0;
    this.left = this.opts.time; this.phase = "play";
    this.players = this.opts.duo ? [newPlayer(), newPlayer()] : [newPlayer()];
    this.golden = 0; this.spawnT = 0; this.goldenT = rand(12, 20);
    if (this.st.boss) this.spawnBoss();
    this.emit("start", {});
  }
  // 소품 위 앉을 자리 (화면 아래쪽)
  landingSpots() {
    const { W, H } = this;
    const st = this.opts.stage;
    if (st === "kitchen") return [{ x: W * 0.22, y: H * 0.8 }, { x: W * 0.3, y: H * 0.76 }, { x: W * 0.72, y: H * 0.74 }, { x: W * 0.8, y: H * 0.78 }];
    if (st === "picnic") return [{ x: W * 0.25, y: H * 0.82 }, { x: W * 0.62, y: H * 0.8 }, { x: W * 0.8, y: H * 0.86 }];
    if (st === "camp") return [{ x: W * 0.82, y: H * 0.62 }];
    return [];
  }
  pickKind() {
    const mix = this.st.mix, entries = Object.entries(mix);
    const total = entries.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total;
    for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
    return "fly";
  }
  spawn(kind) {
    const { W, H, S } = this;
    const k = KIND[kind], side = Math.floor(Math.random() * 3);
    const x = side === 0 ? -S : side === 1 ? W + S : rand(W * 0.1, W * 0.9);
    const y = side === 2 ? -S : rand(H * 0.25, H * 0.7);
    const b = { kind, x, y, vx: 0, vy: 0, r: k.r * S, hp: k.hp, t: 0, mode: "fly", wing: Math.random() * 6, hist: [], tx: rand(W * 0.15, W * 0.85), ty: rand(H * 0.25, H * 0.75), retarget: rand(0.4, 1.2), approach: 0, dizzy: 0, life: kind === "golden" ? 6 : kind === "bee" ? rand(9, 14) : 999, face: 1, hover: 0 };
    this.bugs.push(b);
    if (kind === "golden") this.emit("golden", {});
    return b;
  }
  spawnBoss() {
    const b = this.spawn("boss");
    b.x = this.W / 2; b.y = -this.S * 2; b.hp = b.maxHp = this.d.hp;
    this.boss = b;
  }
  alive() { return this.bugs.filter((b) => b.mode !== "dead"); }
  update(dt, hands) {
    if (this.phase !== "play") { this.updateFx(dt); return; }
    const { W, H, S } = this, d = this.d;
    this.t += dt;
    this.left -= dt;
    if (this.golden > 0) this.golden -= dt;
    for (const p of this.players) if (this.t - p.lastHit > 2.2) p.combo = 0;
    // 새 벌레
    const want = Math.round(d.count * this.st.max * (this.opts.duo ? 1.4 : 1));
    const live = this.alive().filter((b) => b.kind !== "boss").length;
    this.spawnT -= dt;
    if (live < want && this.spawnT <= 0) { let k = this.pickKind(); if (k === "golden") k = "fly"; this.spawn(k); this.spawnT = rand(0.25, 0.9); }
    this.goldenT -= dt;
    if (this.goldenT <= 0 && this.st.mix.golden) { this.spawn("golden"); this.goldenT = rand(14, 24); }
    if (this.boss && this.boss.mode !== "dead" && Math.random() < dt / 3) { const f = this.spawn("fly"); f.x = this.boss.x; f.y = this.boss.y; }
    // 벌레 움직임
    for (const b of this.bugs) {
      b.t += dt; b.wing += dt * (b.kind === "mosquito" ? 70 : 45);
      if (b.mode === "dead") { b.vy += S * 9 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.spin = (b.spin || 0) + dt * 9; b.fade = (b.fade ?? 1) - dt * 0.9; continue; }
      b.hist.push({ t: this.t, x: b.x, y: b.y });
      while (b.hist.length && this.t - b.hist[0].t > 0.3) b.hist.shift();
      const k = KIND[b.kind];
      let sp = k.speed * S * d.speed * (b.dizzy > 0 ? 0.3 : 1);
      b.dizzy = Math.max(0, b.dizzy - dt);
      b.life -= dt;
      if (b.life <= 0 && b.mode !== "leave") { b.mode = "leave"; b.tx = b.x < W / 2 ? -S * 3 : W + S * 3; b.ty = rand(H * 0.1, H * 0.5); }
      // 파리채가 천천히 가까이 오면 도망간다 (보통·어려움)
      if (d.flee && (b.kind === "fly" || b.kind === "golden") && b.mode !== "leave") {
        let near = false;
        for (const h of hands) if (Math.hypot(h.x - b.x, h.y - b.y) < S * 1.4 && (h.speed || 0) < 0.6) near = true;
        b.hover = near ? b.hover + dt : 0;
        if (b.hover > 0.55) { b.mode = "fly"; b.hover = 0; b.tx = clamp(b.x + rand(-1, 1) * W * 0.5, W * 0.08, W * 0.92); b.ty = clamp(b.y + rand(-1, 1) * H * 0.4, H * 0.22, H * 0.85); b.boost = 0.6; this.emit("flee", { b }); }
      }
      if (b.boost > 0) { b.boost -= dt; sp *= 2.2; }
      if (b.kind === "boss") {
        b.tx = W / 2 + Math.sin(b.t * 0.5) * W * 0.3; b.ty = H * 0.45 + Math.sin(b.t * 1.0) * H * 0.16;
      } else if (b.kind === "mosquito" && b.mode !== "leave") {
        // 모기는 화면 가운데(얼굴)로 천천히 다가온다
        b.approach += dt / (7 / d.speed);
        b.retarget -= dt;
        if (b.retarget <= 0) { b.tx = W * 0.5 + rand(-0.25, 0.25) * W; b.ty = H * 0.42 + rand(-0.15, 0.15) * H; b.retarget = rand(0.5, 1.2); }
        if (b.approach >= 1) { this.bite(b); continue; }
      } else if (b.kind === "bee") {
        if (b.mode !== "leave") { b.retarget -= dt; if (b.retarget <= 0) { b.tx = rand(W * 0.1, W * 0.9); b.ty = rand(H * 0.3, H * 0.75); b.retarget = rand(1.5, 3); } }
      } else if (b.mode === "land") {
        b.landT -= dt; b.vx = 0; b.vy = 0;
        if (b.landT <= 0) { b.mode = "fly"; b.tx = rand(W * 0.1, W * 0.9); b.ty = rand(H * 0.22, H * 0.6); }
        continue;
      } else if (b.mode !== "leave") {
        b.retarget -= dt;
        if (b.retarget <= 0) {
          const spots = this.spots;
          if (b.kind === "fly" && spots.length && Math.random() < 0.3) { const s = spots[Math.floor(Math.random() * spots.length)]; b.tx = s.x + rand(-S, S) * 0.5; b.ty = s.y; b.goLand = true; }
          else { b.tx = rand(W * 0.08, W * 0.92); b.ty = rand(H * 0.2, H * 0.82); b.goLand = false; }
          b.retarget = rand(0.5, 1.4);
        }
      }
      // 목표 쪽으로 (파리는 지그재그)
      const dx = b.tx - b.x, dy = b.ty - b.y, dist = Math.hypot(dx, dy) || 1;
      const zig = b.kind === "fly" || b.kind === "golden" ? Math.sin(b.t * 13) * 0.9 : b.kind === "bee" ? Math.sin(b.t * 3) * 0.4 : 0.15;
      const ux = dx / dist, uy = dy / dist;
      const ax = (ux - uy * zig) * sp, ay = (uy + ux * zig) * sp + (b.kind === "bee" ? Math.cos(b.t * 4) * S * 0.6 : 0);
      b.vx = lerp(b.vx, ax, clamp(dt * 4, 0, 1)); b.vy = lerp(b.vy, ay, clamp(dt * 4, 0, 1));
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (Math.abs(b.vx) > 1) b.face = Math.sign(b.vx);
      if (b.goLand && dist < S * 0.25) { b.mode = "land"; b.landT = rand(1.2, 2.6); b.goLand = false; }
      if (b.mode === "leave" && (b.x < -S * 2.5 || b.x > W + S * 2.5)) b.gone = true;
    }
    this.bugs = this.bugs.filter((b) => !b.gone && !(b.mode === "dead" && (b.fade <= 0 || b.y > this.H + this.S * 3)));
    for (const bp of this.bumps) bp.life -= dt;
    this.bumps = this.bumps.filter((b) => b.life > 0);
    this.updateFx(dt);
    if (this.left <= 0 || (this.boss && this.boss.mode === "dead" && this.t - this.boss.deadT > 2.5)) {
      this.left = Math.max(0, this.left); this.phase = "over";
      this.emit("over", { players: this.players, bossWin: this.boss ? this.boss.mode === "dead" : null });
    }
  }
  bite(b) {
    const p = this.players[this.ownerAt(b.x)];
    p.score = Math.max(0, p.score - 50); p.bites++; p.combo = 0;
    this.bumps.push({ x: b.x + rand(-1, 1) * this.S * 0.4, y: b.y + this.S * 0.3, life: 4, r: this.S * rand(0.35, 0.5) });
    b.mode = "leave"; b.approach = 0; b.tx = b.x < this.W / 2 ? -this.S * 3 : this.W + this.S * 3; b.ty = this.H * 0.2;
    this.emit("bite", { x: b.x, y: b.y });
  }
  ownerAt(x) { return this.opts.duo && x > this.W / 2 ? 1 : 0; }
  // 찰싹: 파리채 머리(가로 0.8S, 세로 1.0S) 안에 들어온 벌레를 잡는다.
  // 카메라 지연을 생각해서 지금 위치와 0.12초 전 위치 둘 다 본다.
  swat(sw) {
    if (this.phase !== "play") return;
    const S = this.S, owner = sw.owner ?? this.ownerAt(sw.x), p = this.players[owner];
    const hx = S * 0.95, hy = S * 1.15;
    const hits = [];
    for (const b of this.bugs) {
      if (b.mode === "dead") continue;
      const past = b.hist.find((h) => this.t - h.t <= 0.12) || b;
      const inside = (x, y) => Math.abs(x - sw.x) < hx + b.r * 0.5 && Math.abs(y - sw.y) < hy + b.r * 0.5;
      if (inside(b.x, b.y) || inside(past.x, past.y)) hits.push(b);
    }
    p.swats++;
    this.fx.push({ type: "ring", x: sw.x, y: sw.y, life: 0.35, max: 0.35, hit: hits.length > 0 });
    if (!hits.length) { this.emit("miss", sw); return; }
    let gained = 0, bee = false, kills = 0;
    for (const b of hits) {
      const k = KIND[b.kind];
      if (b.kind === "bee") {
        bee = true; p.score = Math.max(0, p.score + k.pts); p.combo = 0; p.bees++;
        b.mode = "leave"; b.tx = b.x < this.W / 2 ? -S * 3 : this.W + S * 3; b.boost = 1;
        this.fx.push({ type: "text", x: b.x, y: b.y, text: "꿀벌은 안 돼요! -200", color: "#ffd84a", life: 1.3, max: 1.3 });
        continue;
      }
      b.hp--;
      if (b.hp > 0) { b.dizzy = 1.4; b.flash = 0.2; this.fx.push({ type: "stars", x: b.x, y: b.y, life: 0.6, max: 0.6, c: "#ffffff" }); if (b.kind === "boss") { gained += 100; this.emit("bossHit", { hp: b.hp, max: b.maxHp }); } continue; }
      b.mode = "dead"; b.vx = rand(-1, 1) * S; b.vy = -S * 2.5; b.deadT = this.t;
      kills++;
      p.combo++; p.lastHit = this.t; p.best = Math.max(p.best, p.combo);
      const mult = Math.min(5, 1 + Math.floor((p.combo - 1) / 3)) * (this.golden > 0 ? 2 : 1);
      const pts = k.pts * mult;
      gained += pts;
      p.caught[b.kind] = (p.caught[b.kind] || 0) + 1;
      if (b.kind === "golden") this.golden = 6;
      this.fx.push({ type: "stars", x: b.x, y: b.y, life: 0.7, max: 0.7, c: b.kind === "golden" ? "#ffd84a" : "#ffffff" });
      this.fx.push({ type: "text", x: b.x, y: b.y - S * 0.4, text: `+${pts}${mult > 1 ? ` ×${mult}` : ""}`, color: b.kind === "golden" ? "#ffd84a" : owner ? "#ffb066" : "#8fd0ff", life: 1, max: 1 });
      if (b.kind === "boss") { gained += Math.round(this.left * 20); this.emit("bossDown", {}); }
    }
    p.score += gained;
    if (kills) p.hits += kills;
    this.emit("hit", { kills, bee, combo: p.combo, owner, multi: kills >= 2, golden: hits.some((b) => b.kind === "golden" && b.mode === "dead") });
  }
  updateFx(dt) {
    for (const f of this.fx) f.life -= dt;
    this.fx = this.fx.filter((f) => f.life > 0);
  }
  // 가장 가까운 벌레들의 소리 정보
  buzzers() {
    return this.alive().filter((b) => b.kind !== "bee" || true).slice(0, 12).map((b) => ({ kind: b.kind, pan: clamp((b.x / this.W) * 2 - 1, -1, 1), near: b.kind === "mosquito" ? 0.3 + b.approach * 0.9 : b.mode === "land" ? 0 : 0.5 }));
  }
}
function newPlayer() { return { score: 0, combo: 0, best: 0, lastHit: -9, hits: 0, swats: 0, bites: 0, bees: 0, caught: {} }; }

// ═════════════════ 그리기 ═════════════════
export function drawBackdrop(g, W, H, stage, camOn) {
  const st = STAGES[stage];
  if (!camOn) {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, st.bg[0]); gr.addColorStop(1, st.bg[1]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (stage === "kitchen") { // 타일 벽
      g.strokeStyle = "rgba(160,120,80,0.15)"; g.lineWidth = 2;
      const s = Math.min(W, H) / 8;
      for (let x = 0; x < W; x += s) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H * 0.7); g.stroke(); }
      for (let y = 0; y < H * 0.7; y += s) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.fillStyle = "#cfe7f7"; g.fillRect(W * 0.38, H * 0.1, W * 0.24, H * 0.3); g.strokeStyle = "#fff"; g.lineWidth = 8; g.strokeRect(W * 0.38, H * 0.1, W * 0.24, H * 0.3);
    } else if (stage === "camp") { // 별
      g.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 90; i++) { const x = (i * 97) % W, y = ((i * 53) % (H * 0.55)); g.fillRect(x, y, 2, 2); }
      g.fillStyle = "#0a1022"; g.beginPath(); g.moveTo(0, H * 0.7); for (let x = 0; x <= W; x += W / 12) g.lineTo(x, H * 0.62 - Math.sin(x * 0.01) * H * 0.06 - ((x * 7) % 40)); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    } else if (stage === "picnic") { // 구름, 언덕
      g.fillStyle = "rgba(255,255,255,0.85)";
      for (const [cx, cy, r] of [[0.2, 0.15, 0.06], [0.26, 0.13, 0.05], [0.7, 0.2, 0.07], [0.77, 0.18, 0.05]]) { g.beginPath(); g.arc(W * cx, H * cy, Math.min(W, H) * r, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#86c96f"; g.beginPath(); g.ellipse(W * 0.3, H * 0.75, W * 0.5, H * 0.2, 0, Math.PI, 0); g.fill();
      g.fillStyle = "#79bd62"; g.beginPath(); g.ellipse(W * 0.8, H * 0.78, W * 0.45, H * 0.2, 0, Math.PI, 0); g.fill();
    }
  } else {
    g.fillStyle = st.tint; g.fillRect(0, 0, W, H);
  }
  // 가장자리 어둡게
  const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, stage === "camp" || stage === "boss" ? "rgba(0,0,20,0.6)" : "rgba(0,0,0,0.25)");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}
export function drawProps(g, W, H, stage, t) {
  const S = Math.min(W, H) / 10;
  if (stage === "kitchen") {
    g.fillStyle = "#b57a46"; g.fillRect(0, H * 0.84, W, H * 0.16);
    g.fillStyle = "#c98c55"; g.fillRect(0, H * 0.84, W, H * 0.025);
    // 수박
    g.save(); g.translate(W * 0.25, H * 0.86);
    g.fillStyle = "#2f8a3a"; g.beginPath(); g.arc(0, 0, S * 1.3, Math.PI, 0); g.fill();
    g.fillStyle = "#f4f7e6"; g.beginPath(); g.arc(0, 0, S * 1.15, Math.PI, 0); g.fill();
    g.fillStyle = "#ef4b5a"; g.beginPath(); g.arc(0, 0, S * 1.05, Math.PI, 0); g.fill();
    g.fillStyle = "#2b1d1d"; for (let i = 0; i < 9; i++) { const a = Math.PI + 0.3 + i * 0.3; g.beginPath(); g.ellipse(Math.cos(a) * S * 0.65, Math.sin(a) * S * 0.6, S * 0.05, S * 0.09, a, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // 케이크
    g.save(); g.translate(W * 0.76, H * 0.85);
    g.fillStyle = "#f6d7a8"; g.fillRect(-S * 0.9, -S * 0.9, S * 1.8, S * 0.9);
    g.fillStyle = "#ffffff"; g.fillRect(-S * 0.95, -S * 1.05, S * 1.9, S * 0.25);
    g.fillStyle = "#ff6b8a"; for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(i * S * 0.35, -S * 1.12, S * 0.13, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#e9a6b8"; g.fillRect(-S * 0.9, -S * 0.5, S * 1.8, S * 0.12);
    g.restore();
  } else if (stage === "camp") {
    // 텐트
    g.fillStyle = "#e07b39"; g.beginPath(); g.moveTo(W * 0.04, H); g.lineTo(W * 0.18, H * 0.66); g.lineTo(W * 0.32, H); g.fill();
    g.fillStyle = "#8a3f16"; g.beginPath(); g.moveTo(W * 0.15, H); g.lineTo(W * 0.18, H * 0.78); g.lineTo(W * 0.21, H); g.fill();
    // 랜턴 빛
    const lx = W * 0.82, ly = H * 0.66, f = 1 + Math.sin(t * 9) * 0.03;
    const gl = g.createRadialGradient(lx, ly, 0, lx, ly, S * 3.2 * f);
    gl.addColorStop(0, "rgba(255,220,140,0.75)"); gl.addColorStop(0.25, "rgba(255,190,90,0.3)"); gl.addColorStop(1, "rgba(255,190,90,0)");
    g.fillStyle = gl; g.beginPath(); g.arc(lx, ly, S * 3.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3a3f4a"; g.fillRect(lx - S * 0.25, ly + S * 0.3, S * 0.5, S * 0.12); g.fillRect(lx - S * 0.03, ly - S * 0.6, S * 0.06, S * 0.25);
    g.fillStyle = "#ffe9a8"; g.beginPath(); g.roundRect ? g.roundRect(lx - S * 0.22, ly - S * 0.35, S * 0.44, S * 0.65, S * 0.1) : g.rect(lx - S * 0.22, ly - S * 0.35, S * 0.44, S * 0.65); g.fill();
  } else if (stage === "picnic") {
    // 체크무늬 돗자리
    g.save(); g.translate(W * 0.5, H * 0.9); g.scale(1, 0.35);
    const n = 8, s = W * 0.09;
    for (let i = -n; i < n; i++) for (let j = -3; j < 3; j++) { g.fillStyle = (i + j) % 2 ? "#e9445a" : "#fdf3f3"; g.fillRect(i * s, j * s, s, s); }
    g.restore();
    // 바구니
    g.fillStyle = "#b4773b"; g.beginPath(); g.roundRect ? g.roundRect(W * 0.55, H * 0.74, S * 1.6, S * 1.0, S * 0.2) : g.rect(W * 0.55, H * 0.74, S * 1.6, S); g.fill();
    g.strokeStyle = "#8a5a28"; g.lineWidth = S * 0.12; g.beginPath(); g.arc(W * 0.55 + S * 0.8, H * 0.74, S * 0.7, Math.PI, 0); g.stroke();
    // 꽃
    for (const [x, c] of [[0.1, "#ff6b8a"], [0.18, "#ffd84a"], [0.88, "#ff9f43"], [0.94, "#c084fc"]]) {
      g.fillStyle = c; for (let i = 0; i < 5; i++) { const a = i * 1.256 + t; g.beginPath(); g.arc(W * x + Math.cos(a) * S * 0.18, H * 0.95 + Math.sin(a) * S * 0.18, S * 0.12, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#fff4b0"; g.beginPath(); g.arc(W * x, H * 0.95, S * 0.1, 0, Math.PI * 2); g.fill();
    }
  }
}
export function drawBug(g, b, S, t) {
  const r = b.r * (b.kind === "mosquito" ? 0.7 + b.approach * 0.9 : 1);
  g.save();
  g.translate(b.x, b.y);
  g.globalAlpha = b.mode === "dead" ? Math.max(0, b.fade ?? 1) : 1;
  if (b.mode === "dead") { g.rotate(b.spin || 0); g.scale(1.3, 0.55); }
  g.scale(b.face || 1, 1);
  const flap = b.mode === "land" ? 0.15 : Math.abs(Math.sin(b.wing));
  const flash = b.flash > 0 ? (b.flash -= 0.016, true) : false;
  if (b.kind === "golden" || b.kind === "boss") {
    const gl = g.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
    gl.addColorStop(0, b.kind === "golden" ? "rgba(255,220,80,0.55)" : "rgba(200,80,255,0.35)"); gl.addColorStop(1, "rgba(255,220,80,0)");
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 2.2, 0, Math.PI * 2); g.fill();
  }
  // 날개
  const wingC = b.kind === "bee" ? "rgba(235,245,255,0.75)" : "rgba(220,235,255,0.6)";
  g.fillStyle = wingC; g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = Math.max(1, r * 0.05);
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * r * 0.15 - r * 0.1, -r * 0.45); g.rotate(s * 0.5 - 0.2); g.scale(1, 0.35 + flap * 0.65);
    g.beginPath(); g.ellipse(0, -r * 0.45, r * (b.kind === "mosquito" ? 0.35 : 0.5), r * 0.75, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  }
  // 몸통
  let body = "#3c3f4a", belly = "#5a5f6e";
  if (b.kind === "big") { body = "#2f7d4f"; belly = "#46a56b"; }
  if (b.kind === "golden") { body = "#e6a817"; belly = "#ffd84a"; }
  if (b.kind === "mosquito") { body = "#8a6a4f"; belly = "#a88768"; }
  if (b.kind === "boss") { body = "#4a2a6a"; belly = "#6e3f96"; }
  if (flash) { body = belly = "#ffffff"; }
  if (b.kind === "mosquito") {
    g.strokeStyle = body; g.lineWidth = Math.max(1, r * 0.08); g.lineCap = "round";
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-r * 0.1 + i * r * 0.2, r * 0.1); g.lineTo(-r * 0.3 + i * r * 0.3 + s * r * 0.4, r * 0.9); g.stroke(); }
    g.fillStyle = body; g.beginPath(); g.ellipse(-r * 0.35, 0, r * 0.6, r * 0.22, -0.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(r * 0.5, 0); g.lineTo(r * 1.15, r * 0.25); g.stroke();
  } else if (b.kind === "bee") {
    g.fillStyle = "#ffcf33"; g.beginPath(); g.ellipse(0, 0, r * 0.85, r * 0.62, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#2b2420"; for (const x of [-0.35, 0.05]) { g.fillRect(r * x, -r * 0.6, r * 0.2, r * 1.2); }
    g.beginPath(); g.moveTo(-r * 0.85, 0); g.lineTo(-r * 1.15, 0.05 * r); g.lineTo(-r * 0.85, r * 0.12); g.fill();
  } else {
    g.fillStyle = belly; g.beginPath(); g.ellipse(-r * 0.25, r * 0.05, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = body; g.beginPath(); g.ellipse(-r * 0.3, 0, r * 0.62, r * 0.48, 0, 0, Math.PI * 2); g.fill();
    if (b.mode === "land") { g.strokeStyle = body; g.lineWidth = Math.max(1, r * 0.07); for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-r * 0.4 + i * r * 0.3, r * 0.4); g.lineTo(-r * 0.55 + i * r * 0.35, r * 0.75); g.stroke(); } }
  }
  // 머리와 눈
  const hx = b.kind === "mosquito" ? r * 0.35 : r * 0.45;
  g.fillStyle = b.kind === "bee" ? "#2b2420" : body; g.beginPath(); g.arc(hx, -r * 0.05, r * (b.kind === "mosquito" ? 0.22 : 0.36), 0, Math.PI * 2); g.fill();
  const er = r * (b.kind === "mosquito" ? 0.13 : b.kind === "bee" ? 0.16 : 0.24);
  const eyeC = b.kind === "big" ? "#c0392b" : b.kind === "golden" ? "#7a3d00" : b.kind === "boss" ? "#ff3355" : b.kind === "bee" ? "#ffffff" : "#b3343f";
  for (const ey of [-1, 1]) {
    const ex = hx + r * 0.12, yy = -r * 0.05 + ey * er * 0.85;
    g.fillStyle = eyeC; g.beginPath(); g.arc(ex, yy, er, 0, Math.PI * 2); g.fill();
    if (b.mode === "dead") { g.strokeStyle = "#fff"; g.lineWidth = Math.max(1, er * 0.3); g.beginPath(); g.moveTo(ex - er * 0.5, yy - er * 0.5); g.lineTo(ex + er * 0.5, yy + er * 0.5); g.moveTo(ex + er * 0.5, yy - er * 0.5); g.lineTo(ex - er * 0.5, yy + er * 0.5); g.stroke(); }
    else { g.fillStyle = b.kind === "bee" ? "#2b2420" : "#ffffff"; g.beginPath(); g.arc(ex + er * 0.3, yy - er * 0.3, er * (b.kind === "bee" ? 0.55 : 0.35), 0, Math.PI * 2); g.fill(); }
  }
  if (b.kind === "bee" && b.mode !== "dead") { g.strokeStyle = "#2b2420"; g.lineWidth = Math.max(1, r * 0.06); g.beginPath(); g.arc(hx + r * 0.22, r * 0.12, r * 0.12, 0.2, Math.PI - 0.2); g.stroke(); }
  if (b.kind === "big" || b.kind === "boss") { g.strokeStyle = "#1a1a1a"; g.lineWidth = Math.max(2, r * 0.08); g.beginPath(); g.moveTo(hx - r * 0.05, -r * 0.45); g.lineTo(hx + r * 0.35, -r * 0.3); g.stroke(); }
  if (b.kind === "boss") { // 왕관
    g.fillStyle = "#ffd84a"; g.beginPath(); const cx = hx, cy = -r * 0.45, w = r * 0.5;
    g.moveTo(cx - w, cy); g.lineTo(cx - w, cy - w * 0.8); g.lineTo(cx - w * 0.5, cy - w * 0.4); g.lineTo(cx, cy - w); g.lineTo(cx + w * 0.5, cy - w * 0.4); g.lineTo(cx + w, cy - w * 0.8); g.lineTo(cx + w, cy); g.closePath(); g.fill();
  }
  g.restore();
  // 어지러움 별
  if (b.dizzy > 0 && b.mode !== "dead") {
    g.fillStyle = "#ffe66d";
    for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; star(g, b.x + Math.cos(a) * r, b.y - r * 0.9 + Math.sin(a) * r * 0.3, r * 0.18); }
  }
}
function star(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
export function drawFx(g, game, S) {
  for (const f of game.fx) {
    const k = 1 - f.life / f.max;
    if (f.type === "ring") {
      g.strokeStyle = f.hit ? `rgba(255,240,140,${1 - k})` : `rgba(255,255,255,${0.6 * (1 - k)})`;
      g.lineWidth = S * 0.1 * (1 - k) + 1;
      g.beginPath(); g.arc(f.x, f.y, S * (0.6 + k * 1.2), 0, Math.PI * 2); g.stroke();
    } else if (f.type === "stars") {
      g.fillStyle = f.c; g.globalAlpha = 1 - k;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; star(g, f.x + Math.cos(a) * S * (0.3 + k * 1.3), f.y + Math.sin(a) * S * (0.3 + k * 1.3), S * 0.16 * (1 - k * 0.5)); }
      g.globalAlpha = 1;
    } else if (f.type === "text") {
      g.globalAlpha = Math.min(1, (1 - k) * 2);
      g.font = `900 ${Math.round(S * 0.45)}px "Barlow Condensed", "Noto Sans KR", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      g.lineWidth = S * 0.08; g.strokeStyle = "rgba(10,12,24,0.75)"; g.strokeText(f.text, f.x, f.y - k * S * 0.8);
      g.fillStyle = f.color; g.fillText(f.text, f.x, f.y - k * S * 0.8);
      g.globalAlpha = 1;
    }
  }
  // 모기 물린 자국
  for (const bp of game.bumps) {
    g.globalAlpha = Math.min(1, bp.life);
    const gr = g.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, bp.r);
    gr.addColorStop(0, "rgba(255,90,110,0.95)"); gr.addColorStop(0.6, "rgba(255,120,140,0.6)"); gr.addColorStop(1, "rgba(255,150,160,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(bp.x, bp.y, bp.r, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  }
}
// 파리채: 손잡이 + 그물 머리. 찰싹 순간에는 납작하게 눌린다.
export function drawSwatter(g, h, S, color, swatK) {
  const ang = (h.dir ?? -Math.PI / 2) + Math.PI / 2; // 손목에서 손가락 쪽
  g.save();
  g.translate(h.x, h.y);
  g.rotate(ang * 0.6);
  const squash = swatK > 0 ? 1 - Math.sin(swatK * Math.PI) * 0.25 : 1;
  g.scale(1 + (1 - squash) * 0.6, squash);
  const hw = S * 0.95, hh = S * 1.15;
  // 손잡이
  g.strokeStyle = "#6b4a2b"; g.lineWidth = S * 0.16; g.lineCap = "round";
  g.beginPath(); g.moveTo(0, hh * 0.9); g.lineTo(0, hh * 2.3); g.stroke();
  g.strokeStyle = color; g.lineWidth = S * 0.2; g.beginPath(); g.moveTo(0, hh * 1.85); g.lineTo(0, hh * 2.3); g.stroke();
  // 머리
  const x0 = -hw, y0 = -hh, w = hw * 2, hgt = hh * 2;
  g.fillStyle = "rgba(255,255,255,0.12)";
  g.beginPath(); g.roundRect ? g.roundRect(x0, y0, w, hgt, S * 0.35) : g.rect(x0, y0, w, hgt); g.fill();
  g.save(); g.clip();
  g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = Math.max(1, S * 0.03);
  for (let x = x0; x <= x0 + w; x += S * 0.2) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + hgt); g.stroke(); }
  for (let y = y0; y <= y0 + hgt; y += S * 0.2) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y); g.stroke(); }
  g.restore();
  g.strokeStyle = color; g.lineWidth = S * 0.14;
  g.beginPath(); g.roundRect ? g.roundRect(x0, y0, w, hgt, S * 0.35) : g.rect(x0, y0, w, hgt); g.stroke();
  g.restore();
}
