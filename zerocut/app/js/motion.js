// 숏폼·유튜브 영상 자동 편집: 장면 고르기 → 컷 편집 → 모션그래픽(훅 타이틀·자막·진행바·전환·엔딩) → 소리(원본·목소리·배경음악) → 녹화
import { FONT, NUM_FONT, ensureFonts, wrapText } from './cards.js';
import { pickSegments } from './media.js';
import { brandOf } from './store.js';

export const ASPECTS = {
  '9:16': { w: 1080, h: 1920, label: '릴스·쇼츠·틱톡 (세로)' },
  '16:9': { w: 1920, h: 1080, label: '유튜브 (가로)' },
};

// 영상 템플릿: 자막 모양 · 전환 · 색 · 화면 효과 묶음
export const TEMPLATES = {
  clean:      { label: '클린', desc: '흰 자막 상자 · 줌 전환', caption: 'box', trans: 'zoom', hook: 'pop', accent: '#3B82F6' },
  bold:       { label: '볼드 임팩트', desc: '큰 글씨 · 노란 강조 · 빠른 전환', caption: 'stroke', trans: 'whip', hook: 'stroke', accent: '#FACC15', btnInk: '#0A0A0A' },
  minimal:    { label: '미니멀', desc: '작은 자막 · 잔잔한 전환', caption: 'pill', trans: 'soft', hook: 'soft', accent: '#93C5FD' },
  beforeafter:{ label: '비포 · 애프터', desc: 'BEFORE → AFTER 표시', caption: 'box', trans: 'zoom', hook: 'pop', accent: '#F43F5E', badge: 'ba' },
  step:       { label: '스텝 튜토리얼', desc: 'STEP 1·2·3 번호 자막', caption: 'box', trans: 'zoom', hook: 'pop', accent: '#22C55E', badge: 'step' },
  cinema:     { label: '감성 시네마', desc: '위아래 검은 띠 · 따뜻한 색감', caption: 'plain', trans: 'fade', hook: 'soft', accent: '#FBBF24', overlay: 'letterbox', grade: 'warm' },
  news:       { label: '뉴스 자막', desc: '아래 자막 띠 · 브랜드 이름표', caption: 'lowerthird', trans: 'cut', hook: 'pop', accent: '#2563EB' },
  typing:     { label: '타자기', desc: '한 글자씩 써지는 자막', caption: 'type', trans: 'fade', hook: 'soft', accent: '#A78BFA' },
};
export const MOTION_STYLES = TEMPLATES;

/** 대본을 자막 조각으로: 줄마다, 긴 줄은 문장·띄어쓰기 단위로 (한 조각 ~18자) */
export function scriptChunks(script) {
  const out = [];
  String(script || '').split(/\n+/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
    line.split(/(?<=[.!?。…])\s+/).forEach((sent) => {
      let cur = '';
      sent.split(/\s+/).forEach((w) => {
        if (cur && (cur + ' ' + w).length > 18) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
      });
      if (cur) out.push(cur);
    });
  });
  return out;
}

/** 대본 조각에 시간을 붙인다. timings(목소리 받아쓰기)가 있으면 실제 말 속도에 맞춘다 */
export function scriptToCaptions(script, start, end, timings) {
  const chunks = scriptChunks(script);
  if (!chunks.length || end <= start) return [];
  const total = chunks.reduce((a, c) => a + c.length, 0);
  let map = (frac) => start + frac * (end - start);
  if (timings && timings.length) {
    // 목소리 받아쓰기의 글자 누적 비율 → 시간으로 구간별 선형 대응
    const tl = timings.reduce((a, s) => a + s.text.length, 0) || 1;
    const pts = [[0, start + timings[0].start]];
    let acc = 0;
    timings.forEach((s) => { pts.push([acc / tl, start + s.start]); acc += s.text.length; pts.push([acc / tl, start + s.end]); });
    map = (frac) => {
      for (let i = 1; i < pts.length; i++) if (frac <= pts[i][0]) { const [f0, t0] = pts[i - 1], [f1, t1] = pts[i]; return f1 === f0 ? t1 : t0 + ((frac - f0) / (f1 - f0)) * (t1 - t0); }
      return pts[pts.length - 1][1];
    };
  }
  let acc = 0;
  return chunks.map((text) => {
    const a = map(acc / total); acc += text.length; const b = map(acc / total);
    return { text, start: a, end: Math.max(a + 0.6, b - 0.05) };
  });
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOutCubic = (p) => 1 - (1 - p) ** 3;
const easeOutBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2; };
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

export function pickMime() {
  const list = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  if (typeof MediaRecorder === 'undefined') return null;
  return list.find((m) => MediaRecorder.isTypeSupported(m)) || '';
}

/**
 * 편집 계획 만들기
 * sources: [{kind:'video', url, analysis}|{kind:'image', url}]
 * 반환: { total, segs:[{kind,url,in,out,start,dur,kb}], hook, lines:[{text,start,end}], outroStart }
 */
export function buildPlan({ sources, copy, targetSec = 30, voiceSec = 0, aspect = '9:16', captionMode = 'summary', edit = null, script = '', voiceTimings = null }) {
  if (edit && edit.clips && edit.clips.length) return buildEditPlan({ sources, copy, voiceSec, aspect, captionMode, edit, script, voiceTimings });
  const outroLen = 2.2;
  const total = Math.min(90, Math.max(8, voiceSec ? voiceSec + 1.6 : targetSec));
  const bodyLen = total - outroLen;
  const segLen = aspect === '9:16' ? 2.2 : 3.2;
  const need = Math.max(1, Math.ceil(bodyLen / segLen));

  const videos = sources.filter((s) => s.kind === 'video' && s.analysis);
  const images = sources.filter((s) => s.kind === 'image');
  // 영상 소재를 먼저 쓰고, 모자라면 사진을 켄번스(천천히 확대)로 채운다
  const perVideo = videos.length ? Math.max(1, Math.ceil(need / videos.length)) : 0;
  let vsegs = [];
  videos.forEach((v) => {
    pickSegments(v.analysis, perVideo, segLen).forEach((s) => vsegs.push({ kind: 'video', url: v.url, in: s.in, out: s.out, transcript: v.transcript }));
  });
  let pool = [...vsegs];
  let ii = 0;
  while (pool.length < need && images.length) {
    pool.push({ kind: 'image', url: images[ii % images.length].url });
    ii++;
    if (ii > need * 2) break;
  }
  if (!pool.length) throw new Error('편집할 사진이나 영상이 없습니다');
  // 영상·사진을 번갈아 섞어 리듬을 만든다
  if (vsegs.length && pool.length > vsegs.length) {
    const imgs = pool.slice(vsegs.length);
    const mixed = [];
    let a = 0, b = 0;
    while (mixed.length < need && (a < vsegs.length || b < imgs.length)) {
      if (a < vsegs.length) mixed.push(vsegs[a++]);
      if (mixed.length < need && b < imgs.length && (mixed.length % 3 === 2 || a >= vsegs.length)) mixed.push(imgs[b++]);
    }
    pool = mixed;
  }
  // 필요한 수만큼 반복해서 채우고 시간 배분
  const segs = [];
  let t = 0, k = 0;
  while (t < bodyLen - 0.05) {
    const base = pool[k % pool.length];
    const dur = Math.min(segLen, bodyLen - t);
    const s = { ...base, start: t, dur };
    if (s.kind === 'video') {
      const avail = (s.out - s.in);
      s.out = s.in + Math.min(avail, dur);
    } else {
      s.kb = { zoomFrom: 1.0, zoomTo: 1.12, panX: (k % 2 ? 1 : -1) * 0.04, panY: -0.03 };
    }
    segs.push(s);
    t += dur; k++;
  }
  // 엔딩 구간은 마지막 장면을 이어서 깔아 둔다
  const last = segs[segs.length - 1];
  segs.push({ ...last, start: bodyLen, dur: outroLen, outro: true, in: last.kind === 'video' ? Math.max(last.in, last.out - 0.1) : undefined, freeze: last.kind === 'video' });

  const hookEnd = Math.min(2.6, bodyLen * 0.25);
  const lineTexts = (copy.lines || []).filter(Boolean);
  const per = lineTexts.length ? (bodyLen - hookEnd) / lineTexts.length : 0;
  let lines = lineTexts.map((text, i) => ({ text, start: hookEnd + i * per + 0.1, end: hookEnd + (i + 1) * per - 0.05 }));
  // '말한 그대로' 자막: 각 영상 구간에서 실제로 한 말을 그 시간에 맞춰 띄운다
  if (captionMode === 'script' && script) {
    const sc = voiceSec ? scriptToCaptions(script, 0.3, 0.3 + voiceSec, voiceTimings) : scriptToCaptions(script, hookEnd, bodyLen - 0.1);
    if (sc.length) lines = sc;
  }
  if (captionMode === 'speech') {
    const spoken = [];
    segs.filter((sg) => !sg.outro && sg.kind === 'video' && sg.transcript && sg.transcript.length).forEach((sg) => {
      sg.transcript.forEach((ts) => {
        const a = Math.max(ts.start, sg.in), b = Math.min(ts.end, sg.out);
        if (b - a < 0.4) return;
        spoken.push({ text: ts.text, start: sg.start + (a - sg.in), end: sg.start + (b - sg.in) });
      });
    });
    if (spoken.length) lines = spoken;
  }
  return { total, segs, hook: copy.hook || '', hookEnd, keyword: copy.keyword || '', lines, outroStart: bodyLen, aspect };
}

// 스마트 편집 결과(컷 목록)로 계획 만들기
function buildEditPlan({ sources, copy, voiceSec, aspect, captionMode, edit, script, voiceTimings }) {
  const outroLen = 2.2;
  const videos = sources.filter((s) => s.kind === 'video');
  const images = sources.filter((s) => s.kind === 'image');
  const segs = [];
  let t = 0;
  edit.clips.forEach((c, k) => {
    if (c.kind === 'image') {
      const img = images[c.src % Math.max(1, images.length)];
      if (!img) return;
      segs.push({ kind: 'image', url: img.url, start: t, dur: c.dur, caption: c.caption, kb: { zoomFrom: 1.0, zoomTo: 1.1, panX: (k % 2 ? 1 : -1) * 0.03, panY: -0.02 } });
      t += c.dur;
    } else {
      const v = videos[c.src];
      if (!v) return;
      const dur = c.out - c.in;
      segs.push({ kind: 'video', url: v.url, in: c.in, out: c.out, start: t, dur, caption: c.caption, transcript: v.transcript });
      t += dur;
    }
  });
  if (!segs.length) throw new Error('편집할 장면이 없어요');
  // 목소리가 더 길면 마지막 장면을 늘려 목소리가 끝까지 나오게
  if (voiceSec && voiceSec + 0.6 > t) {
    const last = segs[segs.length - 1];
    const extra = voiceSec + 0.6 - t;
    last.dur += extra; if (last.kind === 'video') last.hold = true;
    t += extra;
  }
  const bodyLen = t;
  const total = bodyLen + outroLen;
  const last = segs[segs.length - 1];
  segs.push({ ...last, start: bodyLen, dur: outroLen, outro: true, in: last.kind === 'video' ? Math.max(last.in, last.out - 0.1) : undefined, freeze: last.kind === 'video' });
  const hookEnd = Math.min(2.4, bodyLen * 0.25);
  let lines = [];
  if (captionMode === 'script' && script) {
    lines = voiceSec ? scriptToCaptions(script, 0.3, 0.3 + voiceSec, voiceTimings) : scriptToCaptions(script, hookEnd, bodyLen - 0.1);
  } else if (captionMode === 'speech') {
    segs.filter((sg) => !sg.outro && sg.kind === 'video' && sg.transcript && sg.transcript.length).forEach((sg) => {
      sg.transcript.forEach((ts) => {
        const a = Math.max(ts.start, sg.in), b = Math.min(ts.end, sg.out);
        if (b - a >= 0.4) lines.push({ text: ts.text, start: sg.start + (a - sg.in), end: sg.start + (b - sg.in) });
      });
    });
  }
  if (!lines.length) {
    // 컷마다 붙은 자막(제미나이) → 없으면 요약 자막을 컷 경계에 맞춰 나눠 배치
    const capSegs = segs.filter((sg) => !sg.outro && sg.caption && sg.start + sg.dur > hookEnd);
    if (capSegs.length) lines = capSegs.map((sg) => ({ text: sg.caption, start: Math.max(hookEnd, sg.start) + 0.05, end: sg.start + sg.dur - 0.05 }));
    else {
      const texts = (copy.lines || []).filter(Boolean);
      const per = texts.length ? (bodyLen - hookEnd) / texts.length : 0;
      lines = texts.map((text, i) => ({ text, start: hookEnd + i * per + 0.1, end: hookEnd + (i + 1) * per - 0.05 }));
    }
  }
  return { total, segs, hook: copy.hook || edit.hook || '', hookEnd, keyword: copy.keyword || '', lines, outroStart: bodyLen, aspect, edited: true };
}

function drawCoverKB(ctx, src, W, H, zoom, px, py, offX = 0) {
  const iw = src.videoWidth || src.naturalWidth || src.width, ih = src.videoHeight || src.naturalHeight || src.height;
  if (!iw || !ih) return;
  const k = Math.max(W / iw, H / ih) * zoom;
  const sw = W / k, sh = H / k;
  const cx = iw / 2 + px * iw, cy = ih * 0.45 + py * ih;
  const sx = clamp(cx - sw / 2, 0, Math.max(0, iw - sw)), sy = clamp(cy - sh / 2, 0, Math.max(0, ih - sh));
  ctx.drawImage(src, sx, sy, sw, sh, offX, 0, W, H);
}

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// 단어 단위로 줄 나누기(각 단어의 x 위치 포함)
function layoutWords(ctx, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const space = ctx.measureText(' ').width;
  const lines = [];
  let cur = [], curW = 0;
  for (const w of words) {
    const ww = ctx.measureText(w).width;
    if (cur.length && curW + space + ww > maxW) { lines.push({ words: cur, w: curW }); cur = []; curW = 0; }
    cur.push({ text: w, w: ww });
    curW += (cur.length > 1 ? space : 0) + ww;
  }
  if (cur.length) lines.push({ words: cur, w: curW });
  return { lines, space };
}

export class Composer {
  constructor({ canvas, plan, settings, style = 'clean', audio = {} }) {
    this.canvas = canvas;
    this.plan = plan;
    this.settings = settings;
    this.style = style;
    this.audioOpt = { originalGain: 1, voiceBlob: null, bgmBlob: null, ac: null, ...audio };
    const A = ASPECTS[plan.aspect] || ASPECTS['9:16'];
    this.W = A.w; this.H = A.h;
    canvas.width = this.W; canvas.height = this.H;
    this.ctx = canvas.getContext('2d');
    this.els = new Map(); // seg index → element
    this.stopped = false;
  }

  get tpl() { return TEMPLATES[this.style] || TEMPLATES.clean; }
  get accent() { return this.tpl.accent; }

  async prepare(onProgress) {
    const p = this.plan;
    await ensureFonts([p.hook, ...p.lines.map((l) => l.text), brandOf(this.settings), this.settings.handle].join(' '));
    const imgCache = new Map();
    const vpool = new Map(), useCount = new Map();
    let done = 0;
    for (let i = 0; i < p.segs.length; i++) {
      const s = p.segs[i];
      if (s.kind === 'image') {
        if (!imgCache.has(s.url)) {
          const img = new Image(); img.src = s.url;
          await img.decode().catch(() => {});
          imgCache.set(s.url, img);
        }
        this.els.set(i, imgCache.get(s.url));
      } else {
        // 같은 영상은 플레이어 2개를 번갈아 쓴다 (컷이 많아도 브라우저 플레이어 수 제한에 안 걸리게)
        const prevEl = this.els.get(i - 1);
        if (s.outro && prevEl && prevEl.tagName === 'VIDEO' && p.segs[i - 1].url === s.url) { this.els.set(i, prevEl); done++; continue; }
        const pool = vpool.get(s.url) || [];
        const k = useCount.get(s.url) || 0;
        useCount.set(s.url, k + 1);
        let v = pool[k % 2];
        if (!v) {
          v = document.createElement('video');
          v.playsInline = true; v.preload = 'auto'; v.muted = true; v.src = s.url;
          await new Promise((res) => { const t = setTimeout(res, 10000); const done = () => { clearTimeout(t); res(); }; v.addEventListener('loadeddata', done, { once: true }); v.addEventListener('error', done, { once: true }); v.load(); });
          pool.push(v); vpool.set(s.url, pool);
        }
        this.els.set(i, v);
      }
      done++; onProgress && onProgress(done / p.segs.length);
    }
    await this.cueStart();
    // 소리
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ownAc = !this.audioOpt.ac;
    this.ac = this.audioOpt.ac || new AC();
    this.dest = this.ac.createMediaStreamDestination();
    this.master = this.ac.createGain();
    this.master.connect(this.dest);
    this.master.connect(this.ac.destination);
    const decode = async (blob) => (blob ? this.ac.decodeAudioData(await blob.arrayBuffer()) : null);
    this.voiceBuf = await decode(this.audioOpt.voiceBlob).catch(() => null);
    this.bgmBuf = await decode(this.audioOpt.bgmBlob).catch(() => null);
    this.useOriginal = this.audioOpt.originalGain > 0;
    if (this.useOriginal) {
      this.origGain = this.ac.createGain();
      this.origGain.gain.value = this.audioOpt.originalGain;
      this.origGain.connect(this.master);
      new Set(this.els.values()).forEach((el) => {
        if (el.tagName === 'VIDEO') {
          el.muted = false;
          try { this.ac.createMediaElementSource(el).connect(this.origGain); } catch (e) { el.muted = true; }
        }
      });
    }
    this.hasAudio = !!(this.voiceBuf || this.bgmBuf || this.useOriginal);
  }

  /** 각 플레이어를 처음 쓰는 컷의 시작점으로 맞춘다 */
  async cueStart() {
    const seen = new Set();
    const jobs = [];
    this.plan.segs.forEach((s, i) => {
      const el = this.els.get(i);
      if (!el || el.tagName !== 'VIDEO' || seen.has(el)) return;
      seen.add(el);
      jobs.push(new Promise((res) => { el.addEventListener('seeked', res, { once: true }); el.currentTime = s.in || 0; setTimeout(res, 3000); }));
    });
    await Promise.all(jobs);
  }

  /** 재생(미리보기) 또는 녹화. record=true면 영상 파일(Blob)을 돌려준다 */
  async run({ record = false, onTime } = {}) {
    const p = this.plan;
    this.stopped = false;
    await this.cueStart();
    // 아이폰은 손가락으로 누른 순간이 아니면 소리 엔진(AudioContext)이 안 켜지고, resume()이 끝나지 않는다 → 기다리다 멈추지 않게 1.5초만 기다린다
    if (this.ac.state !== 'running') await Promise.race([this.ac.resume().catch(() => {}), new Promise((r) => setTimeout(r, 1500))]);
    const useAC = this.ac.state === 'running';
    const clock = () => (useAC ? this.ac.currentTime : performance.now() / 1000);
    let recorder = null, chunks = [], mime = '';
    if (record) {
      mime = pickMime();
      if (mime === null) throw new Error('이 브라우저는 영상 녹화를 지원하지 않습니다. 크롬이나 사파리 최신 버전을 써 주세요.');
      const stream = this.canvas.captureStream(30);
      if (this.hasAudio) this.dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      recorder = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: 9_000_000, audioBitsPerSecond: 160_000 });
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.start(500);
    }
    const t0 = clock() + 0.15;
    this.t0 = t0;
    // 목소리 · 배경음악 예약
    this.nodes = [];
    if (this.voiceBuf && useAC) {
      const src = this.ac.createBufferSource(); src.buffer = this.voiceBuf;
      const g = this.ac.createGain(); g.gain.value = 1.0;
      src.connect(g).connect(this.master); src.start(t0 + 0.3);
      this.nodes.push(src);
    }
    if (this.bgmBuf && useAC) {
      const src = this.ac.createBufferSource(); src.buffer = this.bgmBuf; src.loop = true;
      const g = this.ac.createGain();
      const base = this.voiceBuf ? 0.16 : (this.useOriginal ? 0.3 : 0.6); // 목소리가 있으면 배경음악을 낮춘다(더킹)
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(base, t0 + 0.6);
      g.gain.setValueAtTime(base, t0 + p.total - 1.5); g.gain.linearRampToValueAtTime(0, t0 + p.total);
      src.connect(g).connect(this.master); src.start(t0); src.stop(t0 + p.total + 0.1);
      this.nodes.push(src);
    }

    let active = -1;
    await new Promise((resolve) => {
      const tick = () => {
        if (this.stopped) return resolve();
        const t = clock() - t0;
        if (t >= p.total) { this.draw(p.total - 0.001); return resolve(); }
        const idx = p.segs.findIndex((s) => t >= s.start && t < s.start + s.dur);
        if (idx !== active) {
          const prev = this.els.get(active);
          if (prev && prev.tagName === 'VIDEO') prev.pause();
          active = idx;
          const el = this.els.get(idx);
          const seg = p.segs[idx];
          if (el && el.tagName === 'VIDEO' && seg && !seg.freeze) {
            el.play().catch(() => { el.muted = true; el.play().catch(() => {}); });
          }
          // 다음 영상 구간 미리 맞춰 두기
          const nseg = p.segs[idx + 1], nel = this.els.get(idx + 1);
          if (nseg && nel && nel.tagName === 'VIDEO' && nel !== el) { try { nel.currentTime = nseg.in || 0; } catch (e) { /* 무시 */ } }
        }
        this.draw(Math.max(0, t));
        onTime && onTime(Math.max(0, t), p.total);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    this.els.forEach((el) => { if (el.tagName === 'VIDEO') el.pause(); });
    this.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* 이미 멈춤 */ } });
    if (recorder) {
      await new Promise((res) => { recorder.onstop = res; recorder.stop(); });
      const type = (mime || 'video/webm').split(';')[0];
      return new Blob(chunks, { type });
    }
    return null;
  }

  stop() { this.stopped = true; }

  async dispose() {
    this.stop();
    new Set(this.els.values()).forEach((el) => { if (el.tagName === 'VIDEO') { el.pause(); el.removeAttribute('src'); el.load(); } });
    try { this.master && this.master.disconnect(); } catch (e) { /* 이미 끊김 */ }
    if (this.ac && this.ownAc) await this.ac.close().catch(() => {});
  }

  /** 미리보기 정지 화면용: 특정 시점 한 장 */
  async poster(t = 1.2) {
    // 영상 구간은 해당 장면으로 맞춘 뒤 그린다
    const idx = this.plan.segs.findIndex((s) => t >= s.start && t < s.start + s.dur);
    const el = this.els.get(idx), seg = this.plan.segs[idx];
    if (el && el.tagName === 'VIDEO' && seg) {
      await new Promise((res) => { el.addEventListener('seeked', res, { once: true }); el.currentTime = (seg.in || 0) + (t - seg.start); setTimeout(res, 1500); });
    }
    this.draw(t);
  }

  // ---------- 한 프레임 그리기 ----------
  draw(t) {
    const { ctx, W, H, plan: p } = this;
    const portrait = H > W;
    ctx.save();
    ctx.fillStyle = '#05070D'; ctx.fillRect(0, 0, W, H);
    const idx = p.segs.findIndex((s) => t >= s.start && t < s.start + s.dur);
    const seg = p.segs[idx < 0 ? p.segs.length - 1 : idx];
    const el = this.els.get(idx < 0 ? p.segs.length - 1 : idx);
    const u = t - seg.start; // 구간 안 경과 시간
    if (el) {
      let zoom = 1, px = 0, py = 0, offX = 0;
      if (seg.kb) {
        const q = clamp(u / seg.dur);
        zoom = seg.kb.zoomFrom + (seg.kb.zoomTo - seg.kb.zoomFrom) * q;
        px = seg.kb.panX * q; py = seg.kb.panY * q;
      }
      // 컷 전환: 줌 펀치(클린) · 휙 밀기(볼드) · 부드럽게(미니멀)
      const tr = this.tpl.trans;
      if (idx > 0 && !seg.outro) {
        const tp = clamp(u / (tr === 'soft' ? 0.45 : 0.28));
        if (tr === 'whip') offX = (1 - easeOutCubic(tp)) * W * 0.18;
        else if (tr === 'zoom' || tr === 'soft') zoom *= 1 + (tr === 'soft' ? 0.04 : 0.1) * (1 - easeOutCubic(tp));
      }
      drawCoverKB(ctx, el, W, H, zoom, px, py, offX);
      if (idx > 0 && !seg.outro && u < 0.22 && (tr === 'zoom' || tr === 'whip')) {
        ctx.fillStyle = `rgba(255,255,255,${0.28 * (1 - u / 0.22)})`; ctx.fillRect(0, 0, W, H);
      }
      if (idx > 0 && !seg.outro && u < 0.35 && tr === 'fade') {
        ctx.fillStyle = `rgba(0,0,0,${0.85 * (1 - u / 0.35)})`; ctx.fillRect(0, 0, W, H);
      }
    }
    if (this.tpl.grade === 'warm') { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,160,80,0.35)'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // 자막 가독성용 그라데이션
    const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const gt = ctx.createLinearGradient(0, 0, 0, H * 0.25);
    gt.addColorStop(0, 'rgba(0,0,0,0.35)'); gt.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gt; ctx.fillRect(0, 0, W, H * 0.25);

    if (this.tpl.overlay === 'letterbox') { const bh = (portrait ? H * 0.09 : H * 0.11); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh); }
    if (t < p.outroStart) {
      if (this.tpl.overlay !== 'letterbox') this.drawProgress(t);
      this.drawBrandTag(t);
      if (this.tpl.badge === 'ba') this.drawBeforeAfter(t);
      if (t < p.hookEnd) this.drawHook(t);
      const li = p.lines.findIndex((l) => t >= l.start && t < l.end);
      if (li >= 0) this.drawCaption(p.lines[li], t, li);
    } else {
      this.drawOutro(t - p.outroStart);
    }
    ctx.restore();
    void portrait;
  }

  drawProgress(t) {
    const { ctx, W, H, plan: p } = this;
    const y = H > W ? 70 : 34, x = 60, w = W - 120;
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(ctx, x, y, w, 8, 4); ctx.fill();
    ctx.fillStyle = this.accent; rr(ctx, x, y, Math.max(8, w * clamp(t / p.outroStart)), 8, 4); ctx.fill();
  }

  drawBrandTag(t) {
    const { ctx, W, H, settings } = this;
    const a = clamp((t - 0.4) / 0.5);
    if (a <= 0) return;
    const size = H > W ? 34 : 28;
    ctx.globalAlpha = a * 0.9;
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    ctx.fillText(settings.handle || brandOf(settings), 60, (H > W ? 110 : 60));
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
  }

  drawHook(t) {
    const { ctx, W, H, plan: p } = this;
    const portrait = H > W;
    const hk = this.tpl.hook;
    const fs = portrait ? (hk === 'stroke' ? 112 : 96) : 92;
    ctx.font = `800 ${fs}px ${FONT}`;
    const maxW = portrait ? W - 160 : W * 0.62;
    const { lines, space } = layoutWords(ctx, p.hook, maxW);
    const lh = fs * 1.22;
    const blockH = lines.length * lh;
    const y0 = portrait ? H * 0.36 - blockH / 2 : H * 0.5 - blockH / 2;
    const fadeOut = clamp((p.hookEnd - t) / 0.3);
    let wi = 0;
    lines.forEach((ln, li) => {
      let x = portrait ? (W - ln.w) / 2 : 120;
      const y = y0 + li * lh + fs;
      ln.words.forEach((w) => {
        const at = 0.12 + wi * 0.09;
        const q = clamp((t - at) / 0.38);
        if (q > 0) {
          const s = hk === 'soft' ? 0.92 + 0.08 * easeOutCubic(q) : easeOutBack(q);
          const isKey = p.keyword && w.text.includes(p.keyword);
          ctx.save();
          ctx.globalAlpha = clamp(q * 2) * fadeOut;
          ctx.translate(x + w.w / 2, y - fs * 0.35);
          ctx.scale(s, s);
          if (isKey) {
            const bw = (w.w + 28) * clamp((t - at - 0.15) / 0.25);
            ctx.fillStyle = this.accent;
            rr(ctx, -w.w / 2 - 14, -fs * 0.62, bw, fs * 1.1, 14); ctx.fill();
          }
          ctx.fillStyle = isKey && this.tpl.btnInk ? this.tpl.btnInk : '#FFFFFF';
          if (hk === 'stroke' && !isKey) { ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(w.text, -w.w / 2, fs * 0.35); }
          else { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 24; }
          ctx.fillText(w.text, -w.w / 2, fs * 0.35);
          ctx.restore();
        }
        x += w.w + space; wi++;
      });
    });
  }

  drawCaption(line, t, index = 0) {
    const { ctx, W, H } = this;
    const portrait = H > W;
    const cs = this.tpl.caption;
    const fs = portrait ? ({ stroke: 84, pill: 54, plain: 58, lowerthird: 56, type: 62 }[cs] || 66) : ({ pill: 44, plain: 46, lowerthird: 46 }[cs] || 54);
    ctx.font = `${cs === 'pill' || cs === 'plain' ? 600 : 800} ${fs}px ${FONT}`;
    const maxW = portrait ? W - 200 : W * 0.7;
    // 타자기: 한 글자씩
    let text = line.text;
    if (cs === 'type') { const n = Math.ceil(clamp((t - line.start) / Math.min(0.9, (line.end - line.start) * 0.5)) * text.length); text = text.slice(0, n); }
    const rows = wrapText(ctx, text, maxW).slice(0, 3);
    const lh = fs * 1.3;
    const q = clamp((t - line.start) / 0.28);
    const out = clamp((line.end - t) / 0.18);
    const dy = cs === 'type' || cs === 'lowerthird' ? 0 : (1 - easeOutCubic(q)) * 46;
    const baseY = (portrait ? H * ({ pill: 0.8, plain: 0.8, lowerthird: 0.82 }[cs] || 0.7) : H * ({ lowerthird: 0.86, plain: 0.8 }[cs] || 0.8)) + dy;
    ctx.save();
    ctx.globalAlpha = cs === 'type' ? Math.min(out, 1) : Math.min(q * 1.6, out, 1);
    if (this.tpl.badge === 'step') {
      const label = `STEP ${index + 1}`;
      ctx.font = `800 ${Math.round(fs * 0.55)}px ${NUM_FONT}`;
      const bw = ctx.measureText(label).width + 36, bh = fs * 0.85;
      ctx.fillStyle = this.accent; rr(ctx, (W - bw) / 2, baseY - fs * 1.1 - bh - 14, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(label, W / 2, baseY - fs * 1.1 - bh / 2 - 14); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = `800 ${fs}px ${FONT}`;
    }
    if (cs === 'lowerthird') {
      const barH = rows.length * lh + fs * 0.6;
      const top = baseY - fs * 1.05;
      const slide = easeOutCubic(q);
      ctx.fillStyle = 'rgba(10,15,28,0.88)'; ctx.fillRect(0, top, W * slide, barH);
      ctx.fillStyle = this.accent; ctx.fillRect(0, top, 14, barH);
      const name = this.settings.handle || brandOf(this.settings);
      if (name) {
        ctx.font = `800 ${Math.round(fs * 0.5)}px ${FONT}`;
        const tw = ctx.measureText(name).width + 32;
        ctx.fillStyle = this.accent; ctx.fillRect(48, top - fs * 0.8, tw, fs * 0.8);
        ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle'; ctx.fillText(name, 64, top - fs * 0.4); ctx.textBaseline = 'alphabetic';
        ctx.font = `800 ${fs}px ${FONT}`;
      }
    }
    rows.forEach((row, i) => {
      const w = ctx.measureText(row).width;
      const x = cs === 'lowerthird' ? 56 : (W - w) / 2;
      const y = baseY + i * lh;
      if (cs === 'box' || cs === 'type') {
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        rr(ctx, x - 26, y - fs * 0.98, Math.max(w, cs === 'type' ? fs : 0) + 52, fs * 1.32, 18); ctx.fill();
        this.fillWithKeyword(row, x, y, '#0F172A', this.accent);
        if (cs === 'type' && i === rows.length - 1 && text.length < line.text.length) { ctx.fillStyle = this.accent; ctx.fillRect(x + w + 6, y - fs * 0.8, 6, fs * 0.9); }
      } else if (cs === 'stroke') {
        ctx.lineWidth = 16; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round';
        ctx.strokeText(row, x, y);
        this.fillWithKeyword(row, x, y, '#FFFFFF', this.accent);
      } else if (cs === 'pill') {
        ctx.fillStyle = 'rgba(10,15,28,0.6)';
        rr(ctx, x - 22, y - fs * 0.95, w + 44, fs * 1.3, fs * 0.65); ctx.fill();
        this.fillWithKeyword(row, x, y, '#FFFFFF', this.accent);
      } else if (cs === 'plain') {
        ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 18;
        this.fillWithKeyword(row, x, y, '#FFF8EC', this.accent);
        ctx.shadowBlur = 0;
      } else {
        this.fillWithKeyword(row, x, y, '#FFFFFF', '#93C5FD');
      }
    });
    ctx.restore();
  }

  // 비포 · 애프터: 앞쪽은 BEFORE, 마지막 30%는 AFTER (바뀌는 순간 번쩍)
  drawBeforeAfter(t) {
    const { ctx, W, H, plan: p } = this;
    const body = p.outroStart;
    const switchAt = body * 0.7;
    const isAfter = t >= switchAt;
    if (t < p.hookEnd * 0.6) return;
    const label = isAfter ? 'AFTER' : 'BEFORE';
    const fs = H > W ? 46 : 38;
    ctx.save();
    ctx.font = `800 ${fs}px ${NUM_FONT}`;
    const bw = ctx.measureText(label).width + 40, bh = fs * 1.4;
    const x = W - bw - 50, y = H > W ? 110 : 56;
    const pop = isAfter ? easeOutBack(clamp((t - switchAt) / 0.4)) : 1;
    ctx.translate(x + bw / 2, y + bh / 2); ctx.scale(pop, pop);
    ctx.fillStyle = isAfter ? this.accent : 'rgba(10,15,28,0.75)'; rr(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 2);
    ctx.restore();
    if (isAfter && t - switchAt < 0.25) { ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - (t - switchAt) / 0.25)})`; ctx.fillRect(0, 0, W, H); }
  }

  fillWithKeyword(row, x, y, ink, accent) {
    const { ctx, plan: p } = this;
    const k = p.keyword;
    if (!k || !row.includes(k)) { ctx.fillStyle = ink; ctx.fillText(row, x, y); return; }
    const parts = row.split(k);
    let cx = x;
    parts.forEach((part, i) => {
      ctx.fillStyle = ink; ctx.fillText(part, cx, y); cx += ctx.measureText(part).width;
      if (i < parts.length - 1) { ctx.fillStyle = accent; ctx.fillText(k, cx, y); cx += ctx.measureText(k).width; }
    });
  }

  drawOutro(u) {
    const { ctx, W, H, settings } = this;
    const portrait = H > W;
    const a = easeOutCubic(clamp(u / 0.45));
    ctx.fillStyle = `rgba(7,11,20,${0.9 * a})`; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.75, H * 0.2, 10, W * 0.75, H * 0.2, Math.max(W, H) * 0.7);
    glow.addColorStop(0, `rgba(59,130,246,${0.35 * a})`); glow.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = portrait ? H * 0.42 : H * 0.4;
    // 로고 마크
    const ms = clamp((u - 0.15) / 0.5);
    if (ms > 0) {
      const s = easeOutBack(ms);
      const size = portrait ? 180 : 150;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
      ctx.fillStyle = '#05070D'; rr(ctx, -size / 2, -size / 2, size, size, size * 0.26); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = `800 ${size * 0.56}px ${NUM_FONT}`; ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((brandOf(settings) || String(settings.handle || '').replace('@', '') || 'Z').trim().charAt(0).toUpperCase(), 0, size * 0.03);
      // 대각선 컷 라인
      ctx.strokeStyle = this.accent; ctx.lineWidth = size * 0.06; ctx.lineCap = 'round';
      const cut = easeInOut(clamp((u - 0.45) / 0.35));
      ctx.beginPath(); ctx.moveTo(-size * 0.34, size * 0.34); ctx.lineTo(-size * 0.34 + size * 0.68 * cut, size * 0.34 - size * 0.68 * cut); ctx.stroke();
      ctx.restore();
    }
    ctx.textAlign = 'center';
    // 브랜드 이름: 글자가 하나씩
    const name = brandOf(settings) || settings.handle || '';
    const fs = portrait ? 76 : 64;
    ctx.font = `800 ${fs}px ${NUM_FONT}`;
    const shown = Math.floor(clamp((u - 0.5) / 0.6) * name.length);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(name.slice(0, shown), cx, cy + (portrait ? 190 : 160));
    const hq = clamp((u - 0.9) / 0.4);
    ctx.globalAlpha = hq;
    ctx.font = `600 ${portrait ? 40 : 34}px ${FONT}`; ctx.fillStyle = '#B6C2D9';
    ctx.fillText(settings.handle || '', cx, cy + (portrait ? 258 : 218));
    // 팔로우 버튼
    const bq = easeOutBack(clamp((u - 1.1) / 0.4));
    if (bq > 0) {
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(cx, cy + (portrait ? 380 : 320)); ctx.scale(bq, bq);
      const label = '팔로우하고 다음 편 보기';
      ctx.font = `700 ${portrait ? 40 : 34}px ${FONT}`;
      const bw = ctx.measureText(label).width + 80, bh = portrait ? 96 : 82;
      ctx.fillStyle = this.accent; rr(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = this.tpl.btnInk || '#FFFFFF'; ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
}

// ---------- 목소리 ----------
export async function recordMic() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.start();
  return {
    stop: () => new Promise((resolve) => {
      rec.onstop = () => { stream.getTracks().forEach((tr) => tr.stop()); resolve(new Blob(chunks, { type: (mime || 'audio/webm').split(';')[0] })); };
      rec.stop();
    }),
  };
}

export async function listElevenVoices(key) {
  const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } });
  if (r.status === 401) throw new Error('ElevenLabs 키가 맞지 않습니다');
  if (!r.ok) throw new Error(`목소리 목록을 못 불러왔습니다 (${r.status})`);
  const j = await r.json();
  return (j.voices || []).map((v) => ({ id: v.voice_id, name: v.name, category: v.category }));
}

export async function elevenTTS({ key, voiceId, text }) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
  });
  if (r.status === 401) throw new Error('ElevenLabs 키가 맞지 않습니다');
  if (!r.ok) throw new Error(`AI 목소리를 만들지 못했습니다 (${r.status})`);
  return r.blob();
}

/** ElevenLabs 즉시 목소리 복제: 내 목소리 녹음 파일로 목소리를 만들고 voice_id를 돌려준다 */
export async function elevenCloneVoice({ key, name, files }) {
  const fd = new FormData();
  fd.append('name', name);
  fd.append('description', 'ZEROCUT에서 만든 내 목소리');
  fd.append('remove_background_noise', 'true');
  files.forEach((f, i) => fd.append('files', f, f.name || `sample-${i + 1}.webm`));
  let r;
  try { r = await fetch('https://api.elevenlabs.io/v1/voices/add', { method: 'POST', headers: { 'xi-api-key': key }, body: fd }); }
  catch (e) { throw new Error('ElevenLabs에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'); }
  if (r.status === 401) throw new Error('ElevenLabs 키가 맞지 않습니다');
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    const msg = (j.detail && (j.detail.message || j.detail)) || r.status;
    throw new Error(`내 목소리를 만들지 못했어요: ${typeof msg === 'string' ? msg : r.status}. 목소리 복제는 ElevenLabs 유료 요금제가 필요할 수 있어요.`);
  }
  const j = await r.json();
  return { id: j.voice_id, needsVerification: !!j.requires_verification };
}

export async function audioDuration(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  try { const b = await ac.decodeAudioData(await blob.arrayBuffer()); return b.duration; } finally { ac.close(); }
}
