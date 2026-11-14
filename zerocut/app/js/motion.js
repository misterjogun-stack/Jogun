// 숏폼·유튜브 영상 자동 편집: 장면 고르기 → 컷 편집 → 모션그래픽(훅 타이틀·자막·진행바·전환·엔딩) → 소리(원본·목소리·배경음악) → 녹화
import { FONT, NUM_FONT, ensureFonts, wrapText } from './cards.js';
import { pickSegments } from './media.js';

export const ASPECTS = {
  '9:16': { w: 1080, h: 1920, label: '릴스·쇼츠·틱톡 (세로)' },
  '16:9': { w: 1920, h: 1080, label: '유튜브 (가로)' },
};

export const MOTION_STYLES = {
  clean:   { label: '클린', desc: '흰 자막 상자 · 파란 강조' },
  bold:    { label: '볼드', desc: '큰 글씨 · 노란 강조 · 빠른 전환' },
  minimal: { label: '미니멀', desc: '작은 자막 · 잔잔한 전환' },
};

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
export function buildPlan({ sources, copy, targetSec = 30, voiceSec = 0, aspect = '9:16' }) {
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
    pickSegments(v.analysis, perVideo, segLen).forEach((s) => vsegs.push({ kind: 'video', url: v.url, in: s.in, out: s.out }));
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
  const lines = lineTexts.map((text, i) => ({ text, start: hookEnd + i * per + 0.1, end: hookEnd + (i + 1) * per - 0.05 }));
  return { total, segs, hook: copy.hook || '', hookEnd, keyword: copy.keyword || '', lines, outroStart: bodyLen, aspect };
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

  get accent() { return this.style === 'bold' ? '#FACC15' : '#3B82F6'; }

  async prepare(onProgress) {
    const p = this.plan;
    await ensureFonts([p.hook, ...p.lines.map((l) => l.text), this.settings.brandName, this.settings.handle].join(' '));
    const imgCache = new Map();
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
        const v = document.createElement('video');
        v.playsInline = true; v.preload = 'auto'; v.muted = true; v.src = s.url;
        await new Promise((res) => { v.addEventListener('loadeddata', res, { once: true }); v.addEventListener('error', res, { once: true }); });
        await new Promise((res) => { const done2 = () => res(); v.addEventListener('seeked', done2, { once: true }); v.currentTime = s.in || 0; setTimeout(done2, 3000); });
        this.els.set(i, v);
      }
      done++; onProgress && onProgress(done / p.segs.length);
    }
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
      this.els.forEach((el) => {
        if (el.tagName === 'VIDEO') {
          el.muted = false;
          try { this.ac.createMediaElementSource(el).connect(this.origGain); } catch (e) { el.muted = true; }
        }
      });
    }
    this.hasAudio = !!(this.voiceBuf || this.bgmBuf || this.useOriginal);
  }

  /** 재생(미리보기) 또는 녹화. record=true면 영상 파일(Blob)을 돌려준다 */
  async run({ record = false, onTime } = {}) {
    const p = this.plan;
    this.stopped = false;
    if (this.ac.state === 'suspended') await this.ac.resume();
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
    const t0 = this.ac.currentTime + 0.15;
    this.t0 = t0;
    // 목소리 · 배경음악 예약
    this.nodes = [];
    if (this.voiceBuf) {
      const src = this.ac.createBufferSource(); src.buffer = this.voiceBuf;
      const g = this.ac.createGain(); g.gain.value = 1.0;
      src.connect(g).connect(this.master); src.start(t0 + 0.3);
      this.nodes.push(src);
    }
    if (this.bgmBuf) {
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
        const t = this.ac.currentTime - t0;
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
    this.els.forEach((el) => { if (el.tagName === 'VIDEO') { el.pause(); el.removeAttribute('src'); el.load(); } });
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
      if (idx > 0 && !seg.outro) {
        const tp = clamp(u / (this.style === 'minimal' ? 0.45 : 0.28));
        if (this.style === 'bold') offX = (1 - easeOutCubic(tp)) * W * 0.18;
        else zoom *= 1 + (this.style === 'minimal' ? 0.04 : 0.1) * (1 - easeOutCubic(tp));
      }
      drawCoverKB(ctx, el, W, H, zoom, px, py, offX);
      if (idx > 0 && !seg.outro && u < 0.22 && this.style !== 'minimal') {
        ctx.fillStyle = `rgba(255,255,255,${0.28 * (1 - u / 0.22)})`; ctx.fillRect(0, 0, W, H);
      }
    }
    // 자막 가독성용 그라데이션
    const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const gt = ctx.createLinearGradient(0, 0, 0, H * 0.25);
    gt.addColorStop(0, 'rgba(0,0,0,0.35)'); gt.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gt; ctx.fillRect(0, 0, W, H * 0.25);

    if (t < p.outroStart) {
      this.drawProgress(t);
      this.drawBrandTag(t);
      if (t < p.hookEnd) this.drawHook(t);
      const line = p.lines.find((l) => t >= l.start && t < l.end);
      if (line) this.drawCaption(line, t);
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
    ctx.fillText(settings.handle || settings.brandName || '', 60, (H > W ? 110 : 60));
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
  }

  drawHook(t) {
    const { ctx, W, H, plan: p } = this;
    const portrait = H > W;
    const fs = portrait ? (this.style === 'bold' ? 112 : 96) : 92;
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
          const s = this.style === 'minimal' ? 0.92 + 0.08 * easeOutCubic(q) : easeOutBack(q);
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
          ctx.fillStyle = isKey && this.style === 'bold' ? '#0A0A0A' : '#FFFFFF';
          if (this.style === 'bold' && !isKey) { ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(w.text, -w.w / 2, fs * 0.35); }
          else { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 24; }
          ctx.fillText(w.text, -w.w / 2, fs * 0.35);
          ctx.restore();
        }
        x += w.w + space; wi++;
      });
    });
  }

  drawCaption(line, t) {
    const { ctx, W, H, plan: p } = this;
    const portrait = H > W;
    const st = this.style;
    const fs = portrait ? (st === 'bold' ? 84 : st === 'minimal' ? 54 : 66) : (st === 'minimal' ? 44 : 54);
    ctx.font = `${st === 'minimal' ? 600 : 800} ${fs}px ${FONT}`;
    const maxW = portrait ? W - 200 : W * 0.7;
    const rows = wrapText(ctx, line.text, maxW).slice(0, 3);
    const lh = fs * 1.3;
    const q = clamp((t - line.start) / 0.28);
    const out = clamp((line.end - t) / 0.18);
    const dy = (1 - easeOutCubic(q)) * 46;
    const baseY = (portrait ? H * (st === 'minimal' ? 0.8 : 0.7) : H * 0.8) + dy;
    ctx.save();
    ctx.globalAlpha = Math.min(q * 1.6, out, 1);
    rows.forEach((row, i) => {
      const w = ctx.measureText(row).width;
      const x = (W - w) / 2;
      const y = baseY + i * lh;
      if (st === 'clean') {
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        rr(ctx, x - 26, y - fs * 0.98, w + 52, fs * 1.32, 18); ctx.fill();
        this.fillWithKeyword(row, x, y, '#0F172A', this.accent);
      } else if (st === 'bold') {
        ctx.lineWidth = 16; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round';
        ctx.strokeText(row, x, y);
        this.fillWithKeyword(row, x, y, '#FFFFFF', this.accent);
      } else {
        ctx.fillStyle = 'rgba(10,15,28,0.6)';
        rr(ctx, x - 22, y - fs * 0.95, w + 44, fs * 1.3, fs * 0.65); ctx.fill();
        this.fillWithKeyword(row, x, y, '#FFFFFF', '#93C5FD');
      }
    });
    ctx.restore();
    void p;
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
      ctx.fillText((settings.brandName || 'Z').trim().charAt(0).toUpperCase(), 0, size * 0.03);
      // 대각선 컷 라인
      ctx.strokeStyle = this.accent; ctx.lineWidth = size * 0.06; ctx.lineCap = 'round';
      const cut = easeInOut(clamp((u - 0.45) / 0.35));
      ctx.beginPath(); ctx.moveTo(-size * 0.34, size * 0.34); ctx.lineTo(-size * 0.34 + size * 0.68 * cut, size * 0.34 - size * 0.68 * cut); ctx.stroke();
      ctx.restore();
    }
    ctx.textAlign = 'center';
    // 브랜드 이름: 글자가 하나씩
    const name = settings.brandName || 'ZEROCUT';
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
      ctx.fillStyle = this.style === 'bold' ? '#FACC15' : '#2563EB'; rr(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = this.style === 'bold' ? '#0A0A0A' : '#FFFFFF'; ctx.textBaseline = 'middle';
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

export async function audioDuration(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  try { const b = await ac.decodeAudioData(await blob.arrayBuffer()); return b.duration; } finally { ac.close(); }
}
