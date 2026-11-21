// 야구 타격 게임의 규칙과 물리. 화면 그리기와는 분리되어 있다.
// 좌표(미터): 홈플레이트 (0,0,0), x = 1루 쪽(+), y = 높이, z = 투수·외야 쪽(+). 투수판은 z = 18.44.

export const FIELD = { MOUND_Z: 18.44, BASE: 27.43, ZONE: { x0: -0.22, x1: 0.22, y0: 0.5, y1: 1.08 }, CONTACT_Z: 0.35 };
export const DT = 1 / 240;
const G = 9.8, DRAG = 0.0058; // 야구공 공기 저항 (k = ρ·Cd·A / 2m)

export const DIFF = {
  easy:   { speed: [20, 23], types: ["four"], window: 0.17, ev: 5, zoneRate: 0.92, park: 0.8 },
  normal: { speed: [26, 31], types: ["four", "four", "change", "curve"], window: 0.12, ev: 2, zoneRate: 0.8, park: 0.9 },
  hard:   { speed: [32, 38], types: ["four", "four", "change", "curve", "slider"], window: 0.085, ev: 0, zoneRate: 0.7, park: 1 },
};
export const PITCH_NAME = { four: "FASTBALL", change: "CHANGE-UP", curve: "CURVE", slider: "SLIDER" };
export const RESULT = {
  hr: { label: "HOME RUN!", pts: 1000 }, triple: { label: "TRIPLE!", pts: 500 }, double: { label: "DOUBLE!", pts: 300 },
  single: { label: "SINGLE!", pts: 150 }, out: { label: "OUT", pts: 30 }, foul: { label: "FOUL", pts: 0 },
  strike: { label: "STRIKE", pts: 0 }, swingmiss: { label: "SWING & MISS", pts: 0 }, ball: { label: "BALL", pts: 0 },
};

export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// 담장 거리: 파울 폴 쪽은 가깝고 가운데는 멀다. 쉬움은 담장이 가깝다.
export function fenceDist(angleDeg, park = 1) { return (98 + 22 * Math.cos((angleDeg * Math.PI) / 90)) * park; }
export const FENCE_H = 3;

export class Round {
  // opts: { diff, pitches }, emit(event, data)
  constructor(opts, emit) {
    this.opts = opts; this.emit = emit;
    this.phase = "idle"; this.t = 0; this.timer = 0;
    this.ball = { p: { x: 0, y: 0, z: 18 }, v: { x: 0, y: 0, z: 0 }, a: { x: 0, y: -G, z: 0 }, state: "held" };
    this.pitch = null; this.swing = null; this.batter = { swingT: -9 }; this.pitcher = { windT: -9, relT: -9 };
    this.n = 0; this.score = 0; this.log = []; this.stats = { hr: 0, hits: 0, longest: 0, perfect: 0, topEv: 0 };
    this.auto = false; this.autoSkill = 1; this.landing = null;
  }
  get d() { return DIFF[this.opts.diff]; }
  start() {
    this.n = 0; this.score = 0; this.log = []; this.stats = { hr: 0, hits: 0, longest: 0, perfect: 0, topEv: 0 };
    this.nextPitch(1.6);
    this.emit("start", {});
  }
  nextPitch(delay = 1.2) {
    this.phase = "wait"; this.timer = delay; this.swing = null; this.landing = null;
    const b = this.ball; b.state = "held"; b.p = { x: 0.45, y: 1.0, z: 18.2 }; b.v = { x: 0, y: 0, z: 0 };
  }
  // 투수가 던질 공: 목표 지점과 속도를 정하고, 그 점을 지나도록 처음 속도를 계산한다.
  makePitch() {
    const d = this.d;
    const type = d.types[Math.floor(Math.random() * d.types.length)];
    let speed = rand(d.speed[0], d.speed[1]);
    const acc = { x: 0, y: -G, z: 0 };
    if (type === "change") { speed *= 0.8; acc.y -= 2; }
    if (type === "curve") { speed *= 0.85; acc.x = -5; acc.y -= 6; }
    if (type === "slider") { speed *= 0.9; acc.x = -8; acc.y -= 2; }
    const Z = FIELD.ZONE, inZone = Math.random() < d.zoneRate;
    const tx = inZone ? rand(Z.x0 + 0.04, Z.x1 - 0.04) : (Math.random() < 0.5 ? rand(-0.55, -0.3) : rand(0.3, 0.55));
    const ty = inZone ? rand(Z.y0 + 0.08, Z.y1 - 0.06) : (Math.random() < 0.5 ? rand(0.2, 0.4) : rand(1.15, 1.35));
    const p0 = { x: 0.45, y: 1.82, z: 17.2 };
    const T = (p0.z - FIELD.CONTACT_Z) / speed;
    const tgt = { x: tx, y: ty, z: FIELD.CONTACT_Z };
    const v0 = {
      x: (tgt.x - p0.x - 0.5 * acc.x * T * T) / T,
      y: (tgt.y - p0.y - 0.5 * acc.y * T * T) / T,
      z: -speed,
    };
    return { type, speed, p0, v0, acc, T, tgt, inZone: tx >= Z.x0 && tx <= Z.x1 && ty >= Z.y0 && ty <= Z.y1 };
  }
  // 휘두르기: { power (1 이상) }
  doSwing(sw) {
    if (this.phase !== "pitch" && this.phase !== "windup") return;
    if (this.swing) return;
    this.swing = { t: this.t, power: sw.power || 1.2 };
    this.batter.swingT = this.t;
    if (this.phase !== "pitch") { this.swing.dt = -1; this.emit("swing", sw); return; } // 너무 일찍
    // 방망이가 공 지나가는 자리에 닿는 시각 = 휘두른 시각 + 0.12초
    const contactT = this.t + 0.12;
    const arrive = this.pitch.relT + this.pitch.T;
    const dt = contactT - arrive;                 // - 빠름, + 늦음
    const w = this.d.window;
    this.swing.dt = dt;
    if (Math.abs(dt) > w * 1.15) this.swing.miss = true;
    else this.swing.hitAt = arrive;               // 공이 그 자리에 오면 맞는다
    this.emit("swing", sw);
  }
  hit() {
    const d = this.d, sw = this.swing, p = this.pitch;
    const e = clamp(sw.dt / d.window, -1.15, 1.15);
    const q = clamp(1 - Math.pow(Math.abs(e), 1.4), 0, 1);
    const zoneBonus = p.inZone ? 1 : 0.8;
    const pw = clamp(0.9 + (sw.power - 1) * 0.12, 0.9, 1.12);
    const ev = (25 + 24 * q * zoneBonus + d.ev) * pw;                   // m/s
    let la = q > 0.82 ? rand(22, 34) : 14 + gauss() * 14 + (q - 0.5) * 10; // 띄우는 각도
    la = clamp(la, -12, 62);
    const spray = e * 42 + gauss() * 4;                                    // 빠르면 왼쪽(당겨치기)
    if (Math.abs(e) > 0.9) la = clamp(la + rand(-25, 30), -15, 75);
    const LA = (la * Math.PI) / 180, SP = (spray * Math.PI) / 180;
    const b = this.ball;
    b.state = "batted"; b.a = { x: 0, y: -G, z: 0 };
    b.v = { x: ev * Math.cos(LA) * Math.sin(SP), y: ev * Math.sin(LA), z: ev * Math.cos(LA) * Math.cos(SP) };
    this.batted = { ev, la, spray, q, maxH: 0, t0: this.t, wall: false };
    this.phase = "batted";
    if (q > 0.85) this.stats.perfect++;
    this.stats.topEv = Math.max(this.stats.topEv, ev * 3.6);
    this.emit("hit", { ev: ev * 3.6, la, spray, q, perfect: q > 0.85, pos: { ...b.p } });
  }
  finish(kind, extra = {}) {
    const r = RESULT[kind];
    this.score += r.pts + (kind === "hr" ? Math.round((extra.dist || 0) * 5) : 0);
    if (kind === "hr") this.stats.hr++;
    if (["hr", "triple", "double", "single"].includes(kind)) this.stats.hits++;
    if (extra.dist && kind !== "foul") this.stats.longest = Math.max(this.stats.longest, extra.dist);
    this.log.push(kind);
    this.n++;
    this.phase = "result"; this.timer = kind === "hr" ? 3.6 : kind === "ball" || kind === "strike" || kind === "swingmiss" ? 1.3 : 2.4;
    this.emit("result", { kind, label: r.label, ...extra, n: this.n });
  }
  judgeBatted() {
    const b = this.ball, bt = this.batted, d = this.d;
    const dist = Math.hypot(b.p.x, b.p.z);
    const ang = (Math.atan2(b.p.x, b.p.z) * 180) / Math.PI;
    const foul = Math.abs(ang) > 45 || b.p.z < 0;
    if (foul) return this.finish("foul", { dist: Math.round(dist) });
    const R = fenceDist(ang, d.park);
    if (bt.wall) return this.finish(Math.random() < 0.2 ? "triple" : "double", { dist: Math.round(dist) });
    const la = bt.la;
    let kind;
    if (la < 10) kind = bt.ev > 36 && Math.random() < 0.6 ? "single" : Math.random() < 0.35 ? "single" : "out";
    else if (la < 25) kind = dist > R * 0.72 ? "double" : Math.random() < 0.75 ? "single" : "out";
    else if (la > 50) kind = "out";
    else kind = dist > R * 0.86 ? (Math.random() < 0.5 ? "double" : "out") : "out";
    this.finish(kind, { dist: Math.round(dist) });
  }
  step() {
    const d = this.d, b = this.ball;
    this.t += DT;
    if (this.phase === "wait") {
      this.timer -= DT;
      if (this.timer <= 0) { this.phase = "windup"; this.timer = 1.35; this.pitcher.windT = this.t; this.emit("windup", {}); }
    } else if (this.phase === "windup") {
      this.timer -= DT;
      if (this.timer <= 0) {
        this.pitch = this.makePitch(); this.pitch.relT = this.t; this.pitcher.relT = this.t;
        b.state = "pitch"; b.p = { ...this.pitch.p0 }; b.v = { ...this.pitch.v0 }; b.a = { ...this.pitch.acc };
        this.phase = "pitch";
        // 너무 일찍 휘두른 경우: 헛스윙
        if (this.swing) this.swing.miss = true;
        this.emit("pitch", { type: this.pitch.type, speed: this.pitch.speed * 3.6 });
        if (this.auto) this.planAuto();
      }
    } else if (this.phase === "pitch") {
      if (this.autoAt != null && this.t >= this.autoAt) { this.autoAt = null; this.doSwing({ power: 1.6 }); }
      b.v.x += b.a.x * DT; b.v.y += b.a.y * DT; b.v.z += b.a.z * DT;
      b.p.x += b.v.x * DT; b.p.y += b.v.y * DT; b.p.z += b.v.z * DT;
      if (this.swing && this.swing.hitAt != null && this.t >= this.swing.hitAt) { this.hit(); return; }
      if (b.p.z < -0.9) {
        b.state = "caught";
        this.emit("catch", {});
        if (this.swing) this.finish("swingmiss", { early: this.swing.dt < 0 });
        else this.finish(this.pitch.inZone ? "strike" : "ball");
      }
    } else if (this.phase === "batted") {
      const sp = Math.hypot(b.v.x, b.v.y, b.v.z);
      b.v.x -= DRAG * sp * b.v.x * DT; b.v.y -= (G + DRAG * sp * b.v.y) * DT; b.v.z -= DRAG * sp * b.v.z * DT;
      b.p.x += b.v.x * DT; b.p.y += b.v.y * DT; b.p.z += b.v.z * DT;
      const bt = this.batted;
      bt.maxH = Math.max(bt.maxH, b.p.y);
      const dist = Math.hypot(b.p.x, b.p.z), ang = (Math.atan2(b.p.x, b.p.z) * 180) / Math.PI;
      const R = fenceDist(clamp(ang, -45, 45), d.park);
      if (Math.abs(ang) <= 45 && dist >= R && !bt.overFence && !bt.wall) {
        if (b.p.y > FENCE_H) { bt.overFence = true; }
        else { // 담장에 맞고 튕김
          bt.wall = true; const k = R / dist;
          b.p.x *= k * 0.995; b.p.z *= k * 0.995; b.v.x *= -0.25; b.v.z *= -0.25;
          this.emit("wall", {});
        }
      }
      if (bt.overFence && (b.p.y <= 0 || dist > R + 30)) {
        const total = Math.round(dist + (b.p.y > 0 ? 0 : 0));
        this.landing = { x: b.p.x, z: b.p.z };
        return this.finish("hr", { dist: Math.round(Math.max(total, R + 2)), ev: bt.ev * 3.6 });
      }
      if (b.p.y <= 0) {
        b.p.y = 0;
        this.landing = { x: b.p.x, z: b.p.z };
        this.emit("land", { x: b.p.x, z: b.p.z });
        this.judgeBatted();
      }
    } else if (this.phase === "result") {
      this.timer -= DT;
      // 땅에 떨어진 공은 조금 굴러가다 선다
      if (b.state === "batted" && b.p.y <= 0) { b.v.x *= 0.96; b.v.z *= 0.96; b.v.y = 0; b.p.x += b.v.x * DT; b.p.z += b.v.z * DT; }
      if (this.timer <= 0) {
        if (this.n >= this.opts.pitches) { this.phase = "over"; this.emit("over", { score: this.score, stats: { ...this.stats } }); }
        else this.nextPitch();
      }
    }
  }
  // 자동 점검: 사람처럼 가끔 늦거나 빠르게 휘두른다
  planAuto() {
    if (Math.random() > this.autoSkill + 0.05) { this.autoAt = null; return; }
    const err = (1 - this.autoSkill) * 0.25 * (Math.random() * 2 - 1) + (Math.random() - 0.5) * 0.03;
    this.autoAt = this.pitch.relT + this.pitch.T - 0.12 + err;
  }
  // 공이 지금 칠 수 있는 자리 근처인지 (안내 표시용)
  ballNearPlate() {
    if (this.phase !== "pitch") return 0;
    const left = this.pitch.relT + this.pitch.T - this.t;
    return left;
  }
}
