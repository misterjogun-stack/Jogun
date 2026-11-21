// 경기 규칙, 셔틀콕 물리, 선수 움직임, AI. 화면 그리기와는 분리되어 있다.
// 좌표: x = 옆(내 뒤에서 볼 때 오른쪽이 +), y = 높이, z = 내 쪽 엔드라인(0)에서 상대 엔드라인(13.4)까지. 단위는 미터.

export const COURT = { L: 13.4, NET_Z: 6.7, HW: 2.59, DHW: 3.05, NET_H: 1.55, NET_BOTTOM: 0.79, SHORT: 1.98, LONG: 0.76 };
const { L, NET_Z, HW, DHW, NET_H } = COURT;
const G = 9.8, DRAG = 0.22;   // 셔틀콕은 공기 저항이 커서 종단 속도가 약 6.7m/s
export const DT = 1 / 240;

export const DIFF = {
  easy:   { aiSpeed: 2.6, aiReact: 0.5,  aiReach: 0.85, aiErr: 0.36, smash: 0.03, aim: "toMe", meSpeed: 9.5, meReach: 1.75, buffer: 0.6,  meNoise: 0.0 },
  normal: { aiSpeed: 4.0, aiReact: 0.3,  aiReach: 1.0,  aiErr: 0.15, smash: 0.2,  aim: "any",  meSpeed: 5.4, meReach: 1.4,  buffer: 0.42, meNoise: 0.25 },
  hard:   { aiSpeed: 6.2, aiReact: 0.16, aiReach: 1.15, aiErr: 0.05, smash: 0.42, aim: "away", meSpeed: 4.3, meReach: 1.15, buffer: 0.3,  meNoise: 0.45 },
};
export const SHOT_NAME = { clear: "CLEAR", lift: "LIFT", drive: "DRIVE", drop: "DROP", net: "NET SHOT", smash: "SMASH", long: "LONG SERVE", short: "SHORT SERVE" };

export const rand = (a, b) => a + Math.random() * (b - a);
export const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
const distH = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function stepBody(p, v, dt) {
  const sp = Math.hypot(v.x, v.y, v.z);
  v.x -= DRAG * sp * v.x * dt;
  v.y -= (G + DRAG * sp * v.y) * dt;
  v.z -= DRAG * sp * v.z * dt;
  p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
}
const crossesNet = (z0, z1) => (z0 - NET_Z) * (z1 - NET_Z) <= 0 && z0 !== z1;
export function simulate(p0, v0, maxT = 6) {
  const p = { ...p0 }, v = { ...v0 };
  const pts = [];
  let t = 0, net = false, netY = null;
  for (let i = 0; t < maxT; i++) {
    const z0 = p.z;
    stepBody(p, v, DT); t += DT;
    if (netY == null && crossesNet(z0, p.z)) {
      netY = p.y;
      if (p.y < NET_H + 0.03 && Math.abs(p.x) < DHW) net = true;
    }
    if (i % 3 === 0) pts.push({ t, x: p.x, y: p.y, z: p.z });
    if (p.y <= 0) break;
  }
  return { pts, land: { x: p.x, z: p.z, t }, net, netY };
}
// 목표 지점에 떨어지는 속도를 찾는다. 네트에 걸리면 각도를 올려 다시 찾는다.
export function solveShot(from, target, elevDeg, { allowNet = false, maxSpeed = 46 } = {}) {
  let dx = target.x - from.x, dz = target.z - from.z;
  const Dist = Math.hypot(dx, dz) || 0.01; dx /= Dist; dz /= Dist;
  let elev = elevDeg, best = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    const e = (elev * Math.PI) / 180;
    let lo = 1, hi = maxSpeed, sim = null, v = null;
    for (let i = 0; i < 22; i++) {
      const s = (lo + hi) / 2;
      v = { x: dx * Math.cos(e) * s, y: Math.sin(e) * s, z: dz * Math.cos(e) * s };
      sim = simulate(from, v);
      const got = (sim.land.x - from.x) * dx + (sim.land.z - from.z) * dz;
      if (got < Dist) lo = s; else hi = s;
    }
    best = { v, sim };
    if (allowNet || (!sim.net && (sim.netY == null || sim.netY > NET_H + 0.12))) return best;
    elev += 5;
  }
  return best;
}

const DEPTH_ME = { clear: 12.3, lift: 12.1, drive: 11.0, drop: 8.4, net: 7.7, smash: 10.8 };
const DEPTH_AI = { clear: 1.2, lift: 1.3, drive: 2.4, drop: 4.9, net: 5.4, smash: 2.6 };
const ELEV = { clear: 48, lift: 55, drive: 7, drop: 6, net: 28, smash: -19 };

export class Match {
  // opts: { diff, points, games, getAim() -> 0..1 }, emit(event, data)
  constructor(opts, emit) {
    this.opts = opts; this.emit = emit;
    this.me = { side: "me", x: 0.9, z: 4.4, tx: 0.9, tz: 4.4, plan: null, swingT: -9, swingKind: "clear", walk: 0, speed: 0, lunge: 0, home: { x: 0, z: 3.3 } };
    this.ai = { side: "ai", x: -0.9, z: 9.3, tx: -0.9, tz: 9.3, plan: null, swingT: -9, swingKind: "clear", walk: 0, speed: 0, lunge: 0, home: { x: 0, z: 10.1 } };
    this.sh = { p: { x: 0.9, y: 0.95, z: 4.6 }, v: { x: 0, y: 0, z: 0 }, state: "held", lastHitter: null, flightT: 0, netted: false, type: null, willOut: false, land: null, speed: 0 };
    this.phase = "idle"; this.server = "me";
    this.score = { me: 0, ai: 0 }; this.games = { me: 0, ai: 0 }; this.gameNo = 1;
    this.t = 0; this.timer = 0;
    this.rally = 0; this.stats = { longest: 0, smashes: 0, perfects: 0, topSpeed: 0 };
    this.pending = null; this.auto = false; this.autoSkill = 1;
  }
  get d() { return DIFF[this.opts.diff]; }
  ent(s) { return s === "me" ? this.me : this.ai; }
  other(s) { return s === "me" ? "ai" : "me"; }

  start() {
    this.score = { me: 0, ai: 0 }; this.games = { me: 0, ai: 0 }; this.gameNo = 1;
    this.rally = 0; this.stats = { longest: 0, smashes: 0, perfects: 0, topSpeed: 0 };
    this.server = "me";
    this.placeForServe("me", true);
    this.phase = "countdown"; this.timer = 1.8;
    this.emit("countdown", {});
  }
  placeForServe(server, teleport) {
    const sc = this.score[server];
    const even = sc % 2 === 0;
    // 점수가 짝수면 오른쪽, 홀수면 왼쪽 서비스 코트에서 서브. 받는 사람은 대각선.
    let mx, ax;
    if (server === "me") { mx = even ? 0.9 : -0.9; ax = -mx; } else { ax = even ? -0.9 : 0.9; mx = -ax; }
    const { me, ai, sh } = this;
    me.tx = mx; me.tz = server === "me" ? 4.5 : 4.2;
    ai.tx = ax; ai.tz = server === "ai" ? 8.9 : 9.2;
    me.plan = null; ai.plan = null;
    if (teleport) { me.x = me.tx; me.z = me.tz; ai.x = ai.tx; ai.z = ai.tz; }
    sh.state = "held"; sh.lastHitter = null; sh.netted = false; sh.willOut = false; sh.land = null;
    sh.v = { x: 0, y: 0, z: 0 };
    if (teleport) this.holdShuttle();
  }
  holdShuttle() {
    const s = this.ent(this.server);
    const dir = this.server === "me" ? 1 : -1;
    this.sh.p = { x: s.x - 0.32 * dir, y: 1.0, z: s.z + 0.3 * dir };
  }

  // ── 휘두르기 입력: { dirX, dirY (+ = 아래로), power (1 이상), force? } ──
  swing(sw) {
    if (this.phase !== "rally" && this.phase !== "serve") return;
    this.pending = { ...sw, t: this.t };
    this.me.swingT = this.t;
    this.me.swingKind = sw.force || (sw.dirY > 0.45 ? "smash" : sw.dirY < -0.3 ? "clear" : "drive");
    this.emit("swing", sw);
  }
  hittableByMe() {
    const { sh, me } = this;
    return sh.state === "fly" && sh.lastHitter === "ai" && !sh.netted && !sh.willOut && sh.p.z < NET_Z - 0.05 &&
      sh.p.y > 0.2 && sh.p.y < 2.95 && distH(me, sh.p) < this.d.meReach;
  }

  hitShuttle(by, type, target, elev, opt = {}) {
    const { sh } = this;
    const shot = solveShot(sh.p, target, elev, { maxSpeed: type === "smash" ? 92 : 46, ...opt });
    sh.v = { ...shot.v }; sh.state = "fly"; sh.lastHitter = by; sh.flightT = 0; sh.netted = false; sh.type = type;
    const l = shot.sim.land;
    sh.willOut = !shot.sim.net && (Math.abs(l.x) > HW + 0.05 || l.z < -0.05 || l.z > L + 0.05);
    sh.land = shot.sim.net ? null : { x: l.x, z: l.z };
    sh.speed = Math.hypot(sh.v.x, sh.v.y, sh.v.z);
    const hitter = this.ent(by), recv = this.ent(this.other(by));
    hitter.plan = null; hitter.swingT = this.t; hitter.swingKind = type;
    // 밖으로 나갈 공은 받지 않고 그냥 둔다.
    recv.plan = sh.willOut ? null : this.planIntercept(shot.sim, recv);
    sh.autoOk = Math.random() < this.autoSkill; sh.autoLag = this.autoSkill < 1 ? gauss() * 0.12 : 0;
    sh.outCalled = false;
    this.phase = "rally";
    this.rally++;
    if (type === "smash" && by === "me") this.stats.smashes++;
    if (by === "me") this.stats.topSpeed = Math.max(this.stats.topSpeed, sh.speed * 3.6);
    this.emit("hit", { by, type, speed: sh.speed * 3.6, pos: { ...sh.p } });
  }
  planIntercept(sim, e) {
    const d = this.d, isAi = e.side === "ai";
    const speed = isAi ? d.aiSpeed : d.meSpeed;
    const react = isAi ? d.aiReact : 0.05;
    const reach = isAi ? d.aiReach : d.meReach * 0.5;
    let best = null;
    for (const s of sim.pts) {
      const mine = isAi ? s.z > NET_Z + 0.25 : s.z < NET_Z - 0.25;
      if (!mine || s.y > 2.65 || s.y < 0.4) continue;
      const need = Math.max(0, Math.hypot(s.x - e.x, s.z - e.z) - reach);
      const can = speed * Math.max(0, s.t - react);
      if (need <= can) return { ...s, react, miss: false };
      if (!best || need - can < best.short) best = { ...s, react, miss: true, short: need - can };
    }
    if (!best) { const l = sim.land; best = { t: l.t, x: l.x, y: 0, z: l.z, react, miss: true }; }
    return best;
  }
  shotKind(sw, contactY) {
    if (sw.force) {
      if (sw.force === "smash" && contactY < 1.5) return "drive";
      if (sw.force === "clear" && contactY < 1.0) return "lift";
      if (sw.force === "drop" && contactY < 1.0) return "net";
      return sw.force;
    }
    if (contactY > 1.7 && sw.dirY > 0.45) return "smash";
    if (sw.dirY < -0.3) return contactY < 1.0 ? "lift" : "clear";
    if (sw.power < 1.45) return contactY < 1.0 ? "net" : "drop";
    return "drive";
  }
  meHit(sw) {
    const d = this.d, { sh, me } = this;
    const type = this.shotKind(sw, sh.p.y);
    const quality = me.plan ? 1 - Math.min(1, Math.abs(sh.flightT - me.plan.t) / 0.45) : 0.5;
    if (quality > 0.78) { this.stats.perfects++; this.emit("perfect", { pos: { ...sh.p } }); }
    const noise = d.meNoise * (1 - quality * 0.7);
    let tx = (this.opts.getAim() - 0.5) * 2 * 2.2 + clamp(sw.dirX || 0, -1, 1) * 0.5 + gauss() * noise;
    // 세게 휘두를수록 클리어는 더 깊게, 스매시는 더 멀리(더 빠르게) 간다.
    let tz = DEPTH_ME[type] + gauss() * noise * 0.8 + (type === "clear" ? clamp((sw.power - 1.5) * 0.3, -0.6, 0.6) : type === "smash" ? clamp((sw.power - 1) * 0.7, 0, 1.6) : 0);
    const easy = this.opts.diff === "easy";
    tx = clamp(tx, easy ? -2.2 : -2.95, easy ? 2.2 : 2.95);
    tz = easy ? clamp(tz, 7.4, 12.9) : clamp(tz, 7.2, 13.9);
    this.hitShuttle("me", type, { x: tx, z: tz }, ELEV[type]);
  }
  meServe(sw) {
    const strong = (sw.force ? sw.force === "clear" || sw.force === "smash" : sw.dirY < 0 && sw.power > 1.35);
    const tx = -Math.sign(this.me.x || 1) * 1.3 + (this.opts.getAim() - 0.5) * 0.8;
    if (strong) this.hitShuttle("me", "long", { x: tx, z: 12.2 }, 50);
    else this.hitShuttle("me", "short", { x: tx, z: 8.9 }, 24);
  }
  aiHit() {
    const d = this.d, { sh, me } = this;
    const h = sh.p.y, r = Math.random();
    let type;
    if (h > 1.9) type = r < d.smash ? "smash" : r < d.smash + 0.25 ? "drop" : "clear";
    else if (h > 1.0) type = r < 0.45 ? (this.opts.diff === "easy" ? "clear" : "drive") : r < 0.7 ? "drop" : "clear";
    else type = r < 0.65 ? "lift" : "net";
    let tx;
    if (d.aim === "toMe") tx = clamp(me.x * 0.5 + gauss() * 0.6, -1.7, 1.7);
    else if (d.aim === "away") tx = -Math.sign(me.x || (Math.random() - 0.5)) * rand(1.1, 2.2);
    else tx = rand(-2.1, 2.1);
    let tz = DEPTH_AI[type] + gauss() * 0.3;
    if (this.opts.diff === "easy") tz = clamp(tz, 1.6, 5.2);
    if (Math.random() < d.aiErr) {
      if (Math.random() < 0.5) { tz = -0.7; type = "clear"; }
      else if (Math.random() < 0.5) tx = Math.sign(tx || 1) * 3.2;
      else { this.hitShuttle("ai", "drive", { x: tx, z: NET_Z - 0.6 }, -4, { allowNet: true }); return; }
    }
    this.hitShuttle("ai", type, { x: tx, z: tz }, ELEV[type]);
  }
  aiServe() {
    const easy = this.opts.diff === "easy";
    const long = Math.random() < (easy ? 0.85 : 0.5);
    const tx = -Math.sign(this.ai.x || 1) * 1.3;
    if (long) this.hitShuttle("ai", "long", { x: tx, z: easy ? 2.0 : 1.2 }, 50);
    else this.hitShuttle("ai", "short", { x: tx, z: 4.5 }, 24);
  }

  awardPoint(winner, reason) {
    if (this.phase === "point" || this.phase === "over" || this.phase === "gameover") return;
    this.stats.longest = Math.max(this.stats.longest, this.rally);
    this.rally = 0;
    this.score[winner]++;
    this.server = winner;
    this.me.plan = null; this.ai.plan = null; this.pending = null;
    const gameWon = this.score[winner] >= this.opts.points;
    if (gameWon) {
      this.games[winner]++;
      const need = Math.ceil(this.opts.games / 2);
      if (this.games[winner] >= need) { this.phase = "over"; this.timer = 2.2; }
      else { this.phase = "gameover"; this.timer = 2.6; }
    } else {
      this.phase = "point"; this.timer = 1.9;
      this.placeForServe(this.server, false);
    }
    this.emit("point", { winner, reason, gameWon, matchWon: this.phase === "over" });
  }
  landShuttle() {
    const { sh } = this, p = sh.p, hitter = sh.lastHitter;
    p.y = 0;
    if (!hitter) return;
    if (sh.netted) { this.emit("land", { x: p.x, z: p.z, in: false, net: true }); this.awardPoint(this.other(hitter), "NET"); return; }
    const inside = Math.abs(p.x) <= HW + 0.02 && p.z >= -0.02 && p.z <= L + 0.02;
    this.emit("land", { x: p.x, z: p.z, in: inside });
    if (!inside) { this.awardPoint(this.other(hitter), "OUT"); return; }
    const landedSide = p.z > NET_Z ? "ai" : "me";
    this.awardPoint(this.other(landedSide), "IN");
  }

  moveEnt(e, dt, speed) {
    const dx = e.tx - e.x, dz = e.tz - e.z, d = Math.hypot(dx, dz);
    if (d < 0.01) { e.speed = lerp(e.speed, 0, 0.1); return; }
    const st = Math.min(d, speed * dt);
    e.x += (dx / d) * st; e.z += (dz / d) * st;
    e.walk += st * 4.2;
    e.speed = lerp(e.speed, st / dt, 0.15);
  }
  step() {
    const d = this.d, { sh, me, ai } = this;
    this.t += DT;
    if (sh.state === "fly" || sh.state === "net") {
      const z0 = sh.p.z;
      stepBody(sh.p, sh.v, DT);
      sh.flightT += DT;
      if (sh.state === "fly" && crossesNet(z0, sh.p.z) && sh.p.y < NET_H + 0.03 && Math.abs(sh.p.x) < DHW) {
        sh.state = "net"; sh.netted = true;
        sh.p.z = NET_Z + (sh.lastHitter === "me" ? -0.06 : 0.06);
        sh.v = { x: sh.v.x * 0.1, y: Math.min(0, sh.v.y) * 0.2, z: sh.lastHitter === "me" ? -0.5 : 0.5 };
        this.emit("net", {});
      }
      if (sh.willOut && !sh.outCalled && sh.lastHitter === "ai" && sh.p.z < NET_Z) { sh.outCalled = true; this.emit("outcall", {}); }
      if (sh.p.y <= 0) { sh.state = "ground"; this.landShuttle(); }
    }
    // 선수 움직임: 칠 자리로 뛰어간다. 셔틀콕이 오른손 쪽에 오도록 살짝 비켜 선다.
    if (me.plan && sh.lastHitter === "ai") { me.tx = me.plan.x - 0.38; me.tz = me.plan.z - 0.32; }
    else if (this.phase === "rally" && sh.lastHitter === "me") { me.tx = lerp(me.tx, me.home.x, 0.02); me.tz = lerp(me.tz, me.home.z, 0.02); }
    if (ai.plan && sh.lastHitter === "me") {
      if (sh.flightT >= ai.plan.react) { ai.tx = ai.plan.x + 0.38; ai.tz = ai.plan.z + 0.32; }
    } else if (this.phase === "rally" && sh.lastHitter === "ai") { ai.tx = lerp(ai.tx, ai.home.x, 0.02); ai.tz = lerp(ai.tz, ai.home.z, 0.02); }
    this.moveEnt(me, DT, this.phase === "rally" ? d.meSpeed : 2.5);
    this.moveEnt(ai, DT, this.phase === "rally" ? d.aiSpeed : 2.5);
    me.z = clamp(me.z, -0.5, NET_Z - 0.4); ai.z = clamp(ai.z, NET_Z + 0.4, L + 0.5);
    // 낮은 공을 받을 때는 런지 자세
    for (const e of [me, ai]) {
      const p = e.plan;
      const want = p && !p.miss && sh.state === "fly" && p.y < 1.15 && p.t - sh.flightT < 0.45 ? 1 : 0;
      e.lunge = lerp(e.lunge, want, want ? 0.04 : 0.02);
    }
    if (this.phase === "serve" || this.phase === "countdown" || (this.phase === "point" && this.timer < 0.7)) this.holdShuttle();

    // 상대(AI) 치기
    if (sh.state === "fly" && sh.lastHitter === "me" && !sh.netted && ai.plan && sh.p.z > NET_Z + 0.05) {
      if (sh.flightT >= ai.plan.t - 1e-6 && distH(ai, sh.p) < d.aiReach + 0.45 && sh.p.y > 0.25 && sh.p.y < 2.9) this.aiHit();
    }
    // 내 치기: 휘두른 동작은 잠깐 기억했다가 칠 수 있게 되면 친다.
    if (this.pending && this.t - this.pending.t > d.buffer) this.pending = null;
    if (this.auto && this.hittableByMe() && sh.autoOk !== false && (!me.plan || sh.flightT >= me.plan.t - 0.05 + (sh.autoLag || 0))) this.pending = this.fakeSwing();
    if (this.pending && this.hittableByMe()) { const sw = this.pending; this.pending = null; this.meHit(sw); }

    if (this.phase === "countdown" || this.phase === "point" || this.phase === "gameover" || this.phase === "over") {
      this.timer -= DT;
      if (this.timer <= 0) {
        if (this.phase === "over") { this.phase = "idle"; this.emit("match", { winner: this.games.me > this.games.ai ? "me" : "ai" }); return; }
        if (this.phase === "gameover") {
          this.gameNo++; this.score = { me: 0, ai: 0 };
          this.placeForServe(this.server, true);
          this.emit("newgame", { gameNo: this.gameNo });
        }
        this.phase = "serve";
        this.timer = this.server === "ai" ? rand(0.9, 1.4) : 0;
        this.pending = null;
        this.emit("serve", { server: this.server });
      }
    } else if (this.phase === "serve") {
      if (this.server === "ai") { this.timer -= DT; if (this.timer <= 0) this.aiServe(); }
      else {
        if (this.auto && !this.pending) this.pending = this.fakeSwing(true);
        if (this.pending) { const sw = this.pending; this.pending = null; this.meServe(sw); }
      }
    }
  }
  fakeSwing(serve) {
    if (serve) return { t: this.t, dirX: 0, dirY: -1, power: 2 };
    const r = Math.random();
    this.autoAim = rand(0.12, 0.88);
    if (r < 0.4) return { t: this.t, dirX: rand(-0.3, 0.3), dirY: -0.95, power: 2 };
    if (r < 0.7) return { t: this.t, dirX: 0, dirY: 0.95, power: 2 };
    return { t: this.t, dirX: 0.95, dirY: 0, power: 1.8 };
  }
  // 셔틀콕이 내 코트에 떨어질 자리 (안내 원 표시용)
  incomingLanding() {
    const { sh } = this;
    if (sh.state !== "fly" || sh.lastHitter !== "ai" || sh.netted || !sh.land) return null;
    return sh.land;
  }
}
