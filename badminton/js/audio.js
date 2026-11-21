// 효과음은 파일 없이 Web Audio 로 합성한다.
// 라켓 타격은 여러 겹: 날카로운 "딱"(고음 잡음) + 줄 울림(좁은 대역 잡음) + 몸통 "퍽"(빠르게 내려가는 음) + 스매시 저음 쿵.
// 모든 소리는 경기장 울림(리버브)과 좌우 위치(패닝)를 거친다.
let ctx = null, master = null, wet = null, noise = null, shaper = null, amb = null;
let volume = 1;

export function setVolume(v) {
  volume = v;
  if (master) master.gain.setTargetAtTime(0.9 * v, ctx.currentTime, 0.05);
}
export function haptic(ms) { try { navigator.vibrate?.(ms); } catch {} }

export function initAudio() {
  if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.15;
  master = ctx.createGain(); master.gain.value = 0.9 * volume;
  master.connect(comp); comp.connect(ctx.destination);
  // 경기장 울림
  const len = Math.floor(ctx.sampleRate * 2.2);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < 400 ? i / 400 : 1);
  }
  const conv = ctx.createConvolver(); conv.buffer = ir;
  wet = ctx.createGain(); wet.gain.value = 0.32;
  wet.connect(conv); conv.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  // 스매시용 찌그러뜨림
  shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 4); }
  shaper.curve = curve;
}
const ok = () => ctx && volume > 0;

// out: 소리가 나갈 곳(패닝, 리버브 양 포함)
function bus(pan = 0, rev = 0.3) {
  const g = ctx.createGain();
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(master); } else g.connect(master);
  const s = ctx.createGain(); s.gain.value = rev; g.connect(s); s.connect(wet);
  return g;
}
function nz({ out, t = ctx.currentTime, dur, type = "bandpass", freq, q = 1, gain, attack = 0.001, sweepTo, sweepTime, loop = false }) {
  const src = ctx.createBufferSource(); src.buffer = noise; src.loop = loop;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + (sweepTime || dur));
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(out);
  src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  return g;
}
function osc({ out, t = ctx.currentTime, dur, type = "sine", freq, to, toTime, gain, attack = 0.001 }) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + (toTime || dur));
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
  return o;
}

export const sfx = {
  // 라켓 타격. power 0~1, x = 옆 위치(패닝), far = 상대 쪽이면 작고 울림 많게
  hit({ power = 0.7, smash = false, x = 0, far = false } = {}) {
    if (!ok()) return;
    const t = ctx.currentTime, v = far ? 0.55 : 1;
    const out = bus(x / 4, far ? 0.55 : 0.28);
    // 날카로운 "딱"
    nz({ out, t, dur: 0.03 + power * 0.015, type: "highpass", freq: 3200, q: 0.7, gain: 1.1 * v });
    nz({ out, t, dur: 0.05, type: "bandpass", freq: 5200, q: 1.5, gain: 0.5 * v });
    // 줄 울림
    nz({ out, t, dur: 0.14 + power * 0.06, type: "bandpass", freq: 2100 + power * 900, q: 9, gain: 0.55 * v, attack: 0.002 });
    // 몸통 "퍽"
    osc({ out, t, dur: 0.09, type: "sine", freq: 1300, to: 190, toTime: 0.05, gain: 0.85 * v });
    osc({ out, t, dur: 0.07, type: "triangle", freq: 420, to: 160, gain: 0.45 * v });
    if (smash) {
      // 쾅: 저음 + 찌그러진 잡음
      const ws = ctx.createWaveShaper(); ws.curve = shaper.curve;
      const crunch = ctx.createGain(); crunch.gain.value = 0.55 * v;
      ws.connect(crunch); crunch.connect(out);
      nz({ out: ws, t, dur: 0.16, type: "lowpass", freq: 2400, q: 0.8, gain: 0.9 });
      osc({ out, t, dur: 0.32, type: "sine", freq: 120, to: 42, toTime: 0.25, gain: 1.0 * v, attack: 0.002 });
      osc({ out, t: t + 0.005, dur: 0.18, type: "square", freq: 70, to: 40, gain: 0.18 * v });
      nz({ out, t, dur: 0.5, type: "bandpass", freq: 1800, q: 0.6, gain: 0.22 * v, sweepTo: 300 });
    }
  },
  // 휘두를 때 바람 소리. 세게 휘두를수록 크고 높게
  swoosh(power = 1) {
    if (!ok()) return;
    const t = ctx.currentTime, p = Math.min(2.2, power);
    const out = bus(0, 0.12);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const g = nz({ out: pan || out, t, dur: 0.24, type: "bandpass", freq: 380, q: 1.4, gain: 0.12 + p * 0.1, attack: 0.07, sweepTo: 1800 + p * 900, sweepTime: 0.2 });
    if (pan) { pan.pan.setValueAtTime(0.6, t); pan.pan.linearRampToValueAtTime(-0.6, t + 0.22); pan.connect(out); }
    return g;
  },
  land(x = 0, far = false) {
    if (!ok()) return;
    const t = ctx.currentTime, v = far ? 0.5 : 1, out = bus(x / 4, 0.25);
    nz({ out, t, dur: 0.1, type: "lowpass", freq: 320, q: 1, gain: 0.6 * v });
    osc({ out, t, dur: 0.11, freq: 150, to: 70, gain: 0.55 * v });
    nz({ out, t: t + 0.07, dur: 0.03, type: "highpass", freq: 4000, gain: 0.12 * v });
  },
  net() {
    if (!ok()) return;
    const t = ctx.currentTime, out = bus(0, 0.35);
    const g = nz({ out, t, dur: 0.45, type: "bandpass", freq: 1100, q: 2.2, gain: 0.5 });
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 32; lg.gain.value = 0.25; lfo.connect(lg); lg.connect(g.gain); lfo.start(t); lfo.stop(t + 0.5);
    osc({ out, t, dur: 0.12, freq: 160, to: 90, gain: 0.35 });
  },
  // 운동화 끽 소리
  squeak(x = 0, far = false) {
    if (!ok()) return;
    const t = ctx.currentTime, out = bus(x / 4, far ? 0.5 : 0.2), v = far ? 0.35 : 0.7;
    const f0 = 2300 + Math.random() * 900;
    const o = osc({ out, t, dur: 0.11, type: "sawtooth", freq: f0, to: f0 * 1.35, toTime: 0.05, gain: 0.05 * v, attack: 0.01 });
    o.frequency.exponentialRampToValueAtTime(f0 * 1.1, t + 0.1);
    nz({ out, t, dur: 0.09, type: "bandpass", freq: f0 * 1.2, q: 12, gain: 0.12 * v, attack: 0.01 });
  },
  perfect() {
    if (!ok()) return;
    const out = bus(0, 0.4), t = ctx.currentTime;
    [1568, 2093, 2637].forEach((f, i) => osc({ out, t: t + i * 0.045, dur: 0.3, type: "triangle", freq: f, gain: 0.12 }));
  },
  whistle() {
    if (!ok()) return;
    const t = ctx.currentTime, out = bus(-0.5, 0.45);
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 2750;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 42; lg.gain.value = 140;
    lfo.connect(lg); lg.connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.02); g.gain.setValueAtTime(0.22, t + 0.38); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);
    o.connect(g); g.connect(out); o.start(t); lfo.start(t); o.stop(t + 0.5); lfo.stop(t + 0.5);
    nz({ out, t, dur: 0.45, type: "bandpass", freq: 2750, q: 8, gain: 0.08, attack: 0.02 });
  },
  // 관중 환호와 박수
  cheer(level = 1) {
    if (!ok()) return;
    const t = ctx.currentTime;
    const out = bus(0, 0.6);
    nz({ out, t, dur: 2.4, type: "bandpass", freq: 650, q: 0.5, gain: 0.3 * level, attack: 0.25 });
    nz({ out, t, dur: 1.8, type: "bandpass", freq: 1400, q: 0.8, gain: 0.12 * level, attack: 0.2 });
    const claps = Math.round(260 * level);
    for (let i = 0; i < claps; i++) {
      const ct = t + 0.15 + Math.pow(Math.random(), 1.4) * 2.4;
      const cb = bus((Math.random() - 0.5) * 1.6, 0.4);
      nz({ out: cb, t: ct, dur: 0.018 + Math.random() * 0.02, type: "bandpass", freq: 900 + Math.random() * 1800, q: 1.2, gain: (0.05 + Math.random() * 0.08) * level });
    }
  },
  aww() {
    if (!ok()) return;
    const t = ctx.currentTime, out = bus(0, 0.6);
    nz({ out, t, dur: 1.4, type: "bandpass", freq: 800, q: 1.2, gain: 0.22, attack: 0.15, sweepTo: 320, sweepTime: 1.2 });
  },
  point(win) {
    if (!ok()) return;
    const out = bus(0, 0.3), t = ctx.currentTime;
    (win ? [523, 659, 784, 1047] : [440, 349]).forEach((f, i) => osc({ out, t: t + i * 0.08, dur: 0.26, type: "triangle", freq: f, gain: 0.14 }));
  },
  // 경기장 웅성거림 (계속)
  ambience(on) {
    if (!ctx) return;
    if (on && !amb) {
      const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 520; f.Q.value = 0.4;
      const g = ctx.createGain(); g.gain.value = 0;
      g.gain.setTargetAtTime(0.035, ctx.currentTime, 1);
      src.connect(f); f.connect(g); g.connect(master); src.start();
      amb = { src, g };
    } else if (!on && amb) {
      amb.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      const a = amb; amb = null; setTimeout(() => { try { a.src.stop(); } catch {} }, 1500);
    }
  },
};
