// 효과음은 파일 없이 Web Audio 로 만든다.
let actx = null, master = null, noise = null, enabled = true;
export function setSound(on) { enabled = on; }
export function initAudio() {
  if (actx) { if (actx.state === "suspended") actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  actx = new AC();
  master = actx.createGain(); master.gain.value = 0.85;
  const comp = actx.createDynamicsCompressor();
  master.connect(comp); comp.connect(actx.destination);
  noise = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
const ok = () => actx && enabled;
function burst({ dur, freq, q = 1, gain, type = "bandpass", sweepTo, attack = 0.002, loop = false }) {
  const t = actx.currentTime;
  const src = actx.createBufferSource(); src.buffer = noise; src.loop = loop;
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t, Math.random()); src.stop(t + dur + 0.05);
}
function tone(freq, dur, gain, type = "sine", when = 0, slideTo) {
  const t = actx.currentTime + when;
  const o = actx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
export const sfx = {
  hit(p) { if (!ok()) return; burst({ dur: 0.06 + p * 0.06, freq: 2800, q: 1.4, gain: 0.6 * p }); tone(340, 0.09, 0.35 * p, "triangle", 0, 140); },
  smash() { if (!ok()) return; burst({ dur: 0.16, freq: 3200, q: 0.9, gain: 0.8 }); tone(180, 0.18, 0.4, "sawtooth", 0, 60); burst({ dur: 0.35, freq: 900, q: 0.6, gain: 0.25, sweepTo: 200 }); },
  swoosh() { if (ok()) burst({ dur: 0.22, freq: 500, q: 0.8, gain: 0.13, sweepTo: 2800, attack: 0.05 }); },
  land() { if (ok()) { burst({ dur: 0.09, freq: 380, type: "lowpass", gain: 0.3 }); tone(110, 0.08, 0.18); } },
  net() { if (ok()) { burst({ dur: 0.3, freq: 900, q: 3, gain: 0.25 }); tone(180, 0.2, 0.08, "square", 0, 120); } },
  point(win) { if (!ok()) return; (win ? [523, 659, 784, 1047] : [440, 349]).forEach((f, i) => tone(f, 0.24, 0.16, "triangle", i * 0.09)); },
  crowd(level) {
    if (!ok()) return;
    const t = actx.currentTime;
    const src = actx.createBufferSource(); src.buffer = noise; src.loop = true;
    const f = actx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 760; f.Q.value = 0.5;
    const g = actx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18 * level, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random()); src.stop(t + 2.5);
  },
  whistle() { if (ok()) { tone(2400, 0.35, 0.08, "sine"); tone(2520, 0.35, 0.05, "sine"); } },
};
