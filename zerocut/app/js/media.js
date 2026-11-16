// 사진·영상 분석: 영상에서 잘 나온 장면을 골라 고화질 이미지로 뽑고, 숏폼에 쓸 구간 점수를 남긴다.

const SAMPLE_W = 160;

function waitEvent(el, ev, ms = 15000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { cleanup(); reject(new Error(`${ev} 시간 초과`)); }, ms);
    const ok = () => { cleanup(); resolve(); };
    const bad = () => { cleanup(); reject(new Error('미디어를 읽을 수 없습니다')); };
    function cleanup() { clearTimeout(t); el.removeEventListener(ev, ok); el.removeEventListener('error', bad); }
    el.addEventListener(ev, ok, { once: true });
    el.addEventListener('error', bad, { once: true });
  });
}

export async function loadVideo(url) {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
  v.src = url;
  await waitEvent(v, 'loadeddata');
  return v;
}

async function seek(v, t) {
  if (Math.abs(v.currentTime - t) < 0.01) return;
  const p = waitEvent(v, 'seeked', 8000);
  v.currentTime = t;
  await p;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 읽을 수 없습니다'));
    img.src = url;
  });
}

// 선명도(라플라시안 분산) · 밝기 · 이전 장면과의 차이
function frameStats(ctx, w, h, prevGray) {
  const { data } = ctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[j] = g; sum += g;
  }
  const mean = sum / gray.length;
  let lapSum = 0, lapSq = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      lapSum += l; lapSq += l * l; n++;
    }
  }
  const lapMean = lapSum / n;
  const sharp = lapSq / n - lapMean * lapMean;
  let diff = 0;
  if (prevGray && prevGray.length === gray.length) {
    for (let i = 0; i < gray.length; i += 3) diff += Math.abs(gray[i] - prevGray[i]);
    diff /= gray.length / 3;
  }
  return { gray, mean, sharp, diff };
}

function scoreOf(s) {
  // 너무 어둡거나 하얗게 날아간 장면은 감점
  const exposure = 1 - Math.min(1, Math.abs(s.mean - 128) / 128) ** 2;
  return Math.log1p(s.sharp) * (0.35 + 0.65 * exposure);
}

async function canvasToBlob(canvas, type = 'image/jpeg', q = 0.92) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, q));
}

function fitSize(w, h, maxSide) {
  const k = Math.min(1, maxSide / Math.max(w, h));
  return [Math.round(w * k), Math.round(h * k)];
}

/**
 * 영상 분석. onProgress(0..1)
 * 반환: { duration, w, h, samples:[{t,score,diff}], picks:[{t,score}] }
 */
export async function analyzeVideo(url, { maxPicks = 6, onProgress } = {}) {
  const v = await loadVideo(url);
  const duration = v.duration;
  const w = v.videoWidth, h = v.videoHeight;
  const sh = Math.max(2, Math.round(SAMPLE_W * h / w));
  const c = document.createElement('canvas'); c.width = SAMPLE_W; c.height = sh;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const step = Math.max(0.4, duration / 200);
  const samples = [];
  let prev = null;
  for (let t = Math.min(0.15, duration / 2); t < duration - 0.05; t += step) {
    await seek(v, t);
    ctx.drawImage(v, 0, 0, SAMPLE_W, sh);
    const s = frameStats(ctx, SAMPLE_W, sh, prev);
    prev = s.gray;
    samples.push({ t: +t.toFixed(2), score: scoreOf(s), diff: s.diff, mean: s.mean });
    onProgress && onProgress(Math.min(1, t / duration));
  }
  // 점수 높은 순으로, 서로 너무 가깝지 않은 장면만
  const minGap = Math.max(1.2, duration / (maxPicks * 1.6));
  const sorted = [...samples].sort((a, b) => b.score - a.score);
  const picks = [];
  for (const s of sorted) {
    if (picks.length >= maxPicks) break;
    if (picks.every((p) => Math.abs(p.t - s.t) >= minGap)) picks.push(s);
  }
  picks.sort((a, b) => a.t - b.t);
  v.removeAttribute('src'); v.load();
  return { duration, w, h, samples, picks };
}

/** 영상의 t초 장면을 원본 해상도(긴 변 최대 2160) JPEG로 */
export async function grabFrame(url, t, maxSide = 2160) {
  const v = await loadVideo(url);
  await seek(v, t);
  const [w, h] = fitSize(v.videoWidth, v.videoHeight, maxSide);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(v, 0, 0, w, h);
  const blob = await canvasToBlob(c);
  v.removeAttribute('src'); v.load();
  return { blob, w, h };
}

/** 사진 정리: 방향 보정된 상태로 긴 변 최대 2160 JPEG + 점수 */
export async function analyzePhoto(url) {
  const img = await loadImage(url);
  const [w, h] = fitSize(img.naturalWidth, img.naturalHeight, 2160);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  const sw = SAMPLE_W, shh = Math.max(2, Math.round(SAMPLE_W * h / w));
  const sc = document.createElement('canvas'); sc.width = sw; sc.height = shh;
  const sctx = sc.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0, sw, shh);
  const s = frameStats(sctx, sw, shh, null);
  const blob = await canvasToBlob(c);
  return { blob, w, h, score: scoreOf(s) };
}

/** AI에 보낼 작은 JPEG(base64) */
export async function smallJpegBase64(url, maxSide = 768) {
  const img = await loadImage(url);
  const [w, h] = fitSize(img.naturalWidth, img.naturalHeight, maxSide);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.82).split(',')[1];
}

export async function thumbDataUrl(url, maxSide = 360) {
  const img = await loadImage(url);
  const [w, h] = fitSize(img.naturalWidth, img.naturalHeight, maxSide);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.78);
}

/** 영상 분석 결과에서 숏폼용 구간(움직임 있고 선명한 곳) 고르기 */
export function pickSegments(analysis, count, segLen) {
  const { samples, duration } = analysis;
  if (!samples.length) return [];
  const len = Math.min(segLen, duration);
  // 각 시작점의 구간 점수 = 구간 안 선명도 평균 + 약간의 움직임 가산
  const cands = samples.map((s) => {
    const inside = samples.filter((x) => x.t >= s.t && x.t < s.t + len);
    const sc = inside.reduce((a, x) => a + x.score + Math.min(x.diff, 40) / 40, 0) / Math.max(1, inside.length);
    return { start: Math.max(0, Math.min(s.t, duration - len)), score: sc };
  }).sort((a, b) => b.score - a.score);
  const out = [];
  for (const c of cands) {
    if (out.length >= count) break;
    if (out.every((o) => Math.abs(o.start - c.start) >= len * 0.9)) out.push(c);
  }
  return out.sort((a, b) => a.start - b.start).map((o) => ({ in: +o.start.toFixed(2), out: +(o.start + len).toFixed(2) }));
}

/**
 * 영상(또는 음성) 파일에서 말소리를 뽑아 16kHz 모노 WAV로 만든다 (받아쓰기용).
 * 소리가 거의 없으면 null. 너무 길면 앞부분 maxSec초만.
 */
export async function extractSpeechAudio(blob, maxSec = 600) {
  if (blob.size > 400e6) throw new Error('영상이 너무 커서 받아쓰기를 건너뛰었어요 (400MB 이하만)');
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  let buf;
  try { buf = await ac.decodeAudioData(await blob.arrayBuffer()); }
  catch (e) { throw new Error('이 영상의 소리를 읽지 못했어요'); }
  finally { ac.close && ac.close(); }
  const dur = Math.min(buf.duration, maxSec);
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(dur * rate)), rate);
  const src = off.createBufferSource(); src.buffer = buf; src.connect(off.destination); src.start(0);
  const out = await off.startRendering();
  const data = out.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i += 8) { const v = Math.abs(data[i]); if (v > peak) peak = v; }
  if (peak < 0.01) return null;
  const pcm = new DataView(new ArrayBuffer(data.length * 2));
  for (let i = 0; i < data.length; i++) { const v = Math.max(-1, Math.min(1, data[i] / Math.max(peak, 0.3))); pcm.setInt16(i * 2, v * 0x7fff, true); }
  const h = new DataView(new ArrayBuffer(44));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) h.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); h.setUint32(4, 36 + pcm.byteLength, true); w(8, 'WAVE'); w(12, 'fmt ');
  h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true); h.setUint32(24, rate, true);
  h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true);
  w(36, 'data'); h.setUint32(40, pcm.byteLength, true);
  return { blob: new Blob([h.buffer, pcm.buffer], { type: 'audio/wav' }), duration: buf.duration, truncated: buf.duration > maxSec };
}

/** 영상의 여러 시점을 작은 JPEG(base64)로 뽑는다 (스마트 편집용) */
export async function sampleFrames(url, times, maxSide = 224) {
  const v = await loadVideo(url);
  const [w, h] = fitSize(v.videoWidth, v.videoHeight, maxSide);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const out = [];
  for (const t of times) {
    await seek(v, Math.min(Math.max(0, t), Math.max(0, v.duration - 0.05)));
    ctx.drawImage(v, 0, 0, w, h);
    out.push({ t, b64: c.toDataURL('image/jpeg', 0.6).split(',')[1] });
  }
  v.removeAttribute('src'); v.load();
  return out;
}
