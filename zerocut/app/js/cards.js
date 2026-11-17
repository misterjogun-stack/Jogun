// 카드뉴스: 1080×1350(인스타 4:5) 이미지를 캔버스로 그린다.

import { brandOf } from './store.js';

export const CARD_W = 1080;
export const CARD_H = 1350;

export const CARD_THEMES = {
  navy:  { label: '네이비', bg: '#0B1220', bg2: '#111C33', ink: '#FFFFFF', sub: '#B6C2D9', accent: '#3B82F6', chip: 'rgba(255,255,255,0.12)', chipInk: '#DCE6FA' },
  white: { label: '화이트', bg: '#FFFFFF', bg2: '#F1F4F9', ink: '#0F172A', sub: '#64748B', accent: '#2563EB', chip: '#EAF1FF', chipInk: '#1D4ED8' },
  black: { label: '블랙',   bg: '#0A0A0A', bg2: '#1A1A1A', ink: '#FFFFFF', sub: '#A3A3A3', accent: '#FACC15', chip: 'rgba(250,204,21,0.16)', chipInk: '#FDE68A' },
  cream: { label: '크림',   bg: '#F6F1E9', bg2: '#ECE4D6', ink: '#2B2118', sub: '#7A6A58', accent: '#C2410C', chip: '#FBE3D2', chipInk: '#9A3412' },
};

export const CARD_LAYOUTS = {
  classic: { label: '기본', desc: '사진 위 · 글 아래' },
  magazine: { label: '매거진', desc: '사진 꽉 차게 · 글 겹침' },
  minimal: { label: '미니멀', desc: '여백 많이 · 글 중심' },
};

export const FONT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
export const NUM_FONT = 'Inter, "Pretendard Variable", Pretendard, sans-serif';

export async function ensureFonts(text) {
  if (!document.fonts || !document.fonts.load) return;
  const sample = String(text || '가나다ABC123').slice(0, 400);
  try {
    await Promise.all([
      document.fonts.load(`800 60px ${FONT}`, sample),
      document.fonts.load(`600 40px ${FONT}`, sample),
      document.fonts.load(`500 36px ${FONT}`, sample),
      document.fonts.load(`700 40px ${NUM_FONT}`, '0123456789'),
    ]);
  } catch (e) { /* 글꼴을 못 불러오면 기본 글꼴로 그린다 */ }
}

// 한국어 줄바꿈: 띄어쓰기 단위로 먼저 끊고, 한 단어가 너무 길면 글자 단위로
export function wrapText(ctx, text, maxW) {
  const out = [];
  String(text || '').split('\n').forEach((para) => {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width <= maxW) { line = test; continue; }
      if (line) out.push(line);
      if (ctx.measureText(w).width <= maxW) { line = w; continue; }
      line = '';
      for (const ch of w) {
        if (ctx.measureText(line + ch).width > maxW) { out.push(line); line = ch; } else line += ch;
      }
    }
    out.push(line);
  });
  return out;
}

function drawLines(ctx, lines, x, y, lh, maxLines) {
  const ls = maxLines ? lines.slice(0, maxLines) : lines;
  if (maxLines && lines.length > maxLines) ls[ls.length - 1] = ls[ls.length - 1].replace(/.{1}$/, '…');
  ls.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + ls.length * lh;
}

export function cover(ctx, img, x, y, w, h, focusY = 0.45) {
  if (!img) return;
  const iw = img.naturalWidth || img.videoWidth || img.width, ih = img.naturalHeight || img.videoHeight || img.height;
  const k = Math.max(w / iw, h / ih);
  const sw = w / k, sh = h / k;
  const sx = (iw - sw) / 2, sy = Math.max(0, Math.min(ih - sh, (ih - sh) * focusY));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function chip(ctx, text, x, y, th) {
  ctx.font = `700 30px ${FONT}`;
  const w = ctx.measureText(text).width + 44;
  ctx.fillStyle = th.chip; roundRect(ctx, x, y, w, 58, 29); ctx.fill();
  ctx.fillStyle = th.chipInk; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 22, y + 30); ctx.textBaseline = 'alphabetic';
  return w;
}

function footer(ctx, th, settings, index, total, onPhoto) {
  ctx.font = `600 28px ${FONT}`;
  ctx.fillStyle = onPhoto ? 'rgba(255,255,255,0.85)' : th.sub;
  ctx.textAlign = 'left';
  ctx.fillText(settings.handle || brandOf(settings), 72, CARD_H - 64);
  ctx.textAlign = 'right';
  ctx.font = `700 28px ${NUM_FONT}`;
  ctx.fillText(`${index + 1} / ${total}`, CARD_W - 72, CARD_H - 64);
  ctx.textAlign = 'left';
}

/** 카드 한 장 그리기. card={title, body}, img=HTMLImageElement|null */
export function drawCard(canvas, { card, img, index, total, theme = 'navy', settings, topicLabel, layout = 'classic' }) {
  const th = CARD_THEMES[theme] || CARD_THEMES.navy;
  canvas.width = CARD_W; canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'left';
  const isCover = index === 0, isLast = index === total - 1 && total > 1;

  if (isCover && layout === 'minimal') {
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, CARD_W, CARD_H);
    if (img) { ctx.save(); roundRect(ctx, 72, 72, CARD_W - 144, 700, 32); ctx.clip(); cover(ctx, img, 72, 72, CARD_W - 144, 700); ctx.restore(); }
    chip(ctx, topicLabel || brandOf(settings) || '오늘의 기록', 72, img ? 820 : 300, th);
    ctx.fillStyle = th.ink; ctx.font = `800 80px ${FONT}`;
    const y = drawLines(ctx, wrapText(ctx, card.title, CARD_W - 144), 72, (img ? 820 : 300) + 150, 96, 3);
    ctx.fillStyle = th.sub; ctx.font = `500 38px ${FONT}`;
    drawLines(ctx, wrapText(ctx, card.body, CARD_W - 144), 72, y + 20, 54, 2);
    footer(ctx, th, settings, index, total, false);
    return;
  }
  if (isCover) {
    if (img) {
      cover(ctx, img, 0, 0, CARD_W, CARD_H);
      const g = ctx.createLinearGradient(0, CARD_H * 0.35, 0, CARD_H);
      g.addColorStop(0, 'rgba(5,8,16,0)'); g.addColorStop(0.55, 'rgba(5,8,16,0.72)'); g.addColorStop(1, 'rgba(5,8,16,0.94)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, CARD_W, CARD_H);
    } else {
      ctx.fillStyle = th.bg; ctx.fillRect(0, 0, CARD_W, CARD_H);
    }
    const ink = img ? '#FFFFFF' : th.ink;
    ctx.font = `800 92px ${FONT}`;
    const tl = wrapText(ctx, card.title, CARD_W - 144).slice(0, 4);
    ctx.font = `500 38px ${FONT}`;
    const bl = wrapText(ctx, card.body, CARD_W - 144).slice(0, 2);
    let y = CARD_H - 150 - bl.length * 54 - 36 - tl.length * 110;
    chip(ctx, topicLabel || brandOf(settings) || '오늘의 기록', 72, y - 176, img ? { chip: 'rgba(255,255,255,0.16)', chipInk: '#FFFFFF' } : th);
    ctx.fillStyle = ink; ctx.font = `800 92px ${FONT}`;
    y = drawLines(ctx, tl, 72, y, 110);
    // 강조 밑줄
    ctx.fillStyle = th.accent; ctx.fillRect(72, y - 70, 120, 10);
    ctx.fillStyle = img ? 'rgba(255,255,255,0.86)' : th.sub; ctx.font = `500 38px ${FONT}`;
    drawLines(ctx, bl, 72, y + 36, 54);
    footer(ctx, th, settings, index, total, !!img);
    return;
  }

  ctx.fillStyle = th.bg; ctx.fillRect(0, 0, CARD_W, CARD_H);

  if (isLast) {
    const g = ctx.createRadialGradient(CARD_W * 0.8, 120, 40, CARD_W * 0.8, 120, 900);
    g.addColorStop(0, th.accent + '55'); g.addColorStop(1, th.accent + '00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.fillStyle = th.ink; ctx.font = `800 80px ${FONT}`;
    const tl = wrapText(ctx, card.title, CARD_W - 144).slice(0, 4);
    let y = CARD_H / 2 - (tl.length * 98) / 2;
    y = drawLines(ctx, tl, 72, y, 98);
    ctx.fillStyle = th.sub; ctx.font = `500 38px ${FONT}`;
    y = drawLines(ctx, wrapText(ctx, card.body, CARD_W - 144), 72, y + 30, 54, 3);
    // 저장 · 팔로우 버튼 모양
    ctx.fillStyle = th.accent; roundRect(ctx, 72, y + 50, 300, 92, 46); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.font = `700 36px ${FONT}`; ctx.textBaseline = 'middle';
    ctx.fillText('저장하기', 128, y + 97);
    ctx.textBaseline = 'alphabetic';
    ctx.strokeStyle = th.sub; ctx.lineWidth = 3; roundRect(ctx, 392, y + 50, 300, 92, 46); ctx.stroke();
    ctx.fillStyle = th.ink; ctx.textBaseline = 'middle'; ctx.fillText('팔로우', 470, y + 97); ctx.textBaseline = 'alphabetic';
    footer(ctx, th, settings, index, total, false);
    return;
  }

  if (layout === 'magazine' && img) {
    cover(ctx, img, 0, 0, CARD_W, CARD_H);
    const g = ctx.createLinearGradient(0, CARD_H * 0.4, 0, CARD_H);
    g.addColorStop(0, 'rgba(5,8,16,0)'); g.addColorStop(0.6, 'rgba(5,8,16,0.75)'); g.addColorStop(1, 'rgba(5,8,16,0.95)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.font = `800 70px ${FONT}`;
    const tl = wrapText(ctx, card.title, CARD_W - 144).slice(0, 3);
    ctx.font = `500 38px ${FONT}`;
    const bl = wrapText(ctx, card.body, CARD_W - 144).slice(0, 3);
    let y = CARD_H - 150 - bl.length * 54 - 30 - tl.length * 86;
    ctx.fillStyle = th.accent; ctx.font = `800 44px ${NUM_FONT}`;
    ctx.fillText(String(index).padStart(2, '0'), 72, y - 50);
    ctx.fillStyle = '#FFFFFF'; ctx.font = `800 70px ${FONT}`;
    y = drawLines(ctx, tl, 72, y + 20, 86);
    ctx.fillStyle = 'rgba(255,255,255,0.86)'; ctx.font = `500 38px ${FONT}`;
    drawLines(ctx, bl, 72, y + 24, 54);
    footer(ctx, th, settings, index, total, true);
    return;
  }
  if (layout === 'minimal') {
    let y = 150;
    if (img) {
      ctx.save(); roundRect(ctx, CARD_W - 72 - 360, 110, 360, 360, 28); ctx.clip();
      cover(ctx, img, CARD_W - 72 - 360, 110, 360, 360);
      ctx.restore();
      y = 560;
    }
    ctx.fillStyle = th.accent; ctx.font = `800 40px ${NUM_FONT}`;
    ctx.fillText(String(index).padStart(2, '0'), 72, img ? 170 : y);
    ctx.fillStyle = th.ink; ctx.font = `800 76px ${FONT}`;
    y = drawLines(ctx, wrapText(ctx, card.title, CARD_W - 144), 72, y + (img ? 0 : 110), 94, 3);
    ctx.fillStyle = th.line || th.sub; ctx.fillRect(72, y + 10, 80, 6);
    ctx.fillStyle = th.sub; ctx.font = `500 42px ${FONT}`;
    drawLines(ctx, wrapText(ctx, card.body, CARD_W - 144), 72, y + 100, 64, 5);
    footer(ctx, th, settings, index, total, false);
    return;
  }

  // 본문 카드: 위쪽 사진, 아래쪽 번호 + 제목 + 설명
  const photoH = img ? 760 : 0;
  if (img) {
    ctx.save(); roundRect(ctx, 48, 48, CARD_W - 96, photoH, 36); ctx.clip();
    cover(ctx, img, 48, 48, CARD_W - 96, photoH);
    ctx.restore();
  }
  let y = img ? 48 + photoH + 70 : 260;
  ctx.fillStyle = th.accent; ctx.font = `800 44px ${NUM_FONT}`;
  ctx.fillText(String(index).padStart(2, '0'), 72, y + 30);
  y += 100;
  ctx.fillStyle = th.ink; ctx.font = `800 ${img ? 60 : 76}px ${FONT}`;
  y = drawLines(ctx, wrapText(ctx, card.title, CARD_W - 144), 72, y, img ? 74 : 92, img ? 2 : 3);
  ctx.fillStyle = th.sub; ctx.font = `500 ${img ? 36 : 42}px ${FONT}`;
  drawLines(ctx, wrapText(ctx, card.body, CARD_W - 144), 72, y + 24, img ? 52 : 62, img ? 2 : 5);
  footer(ctx, th, settings, index, total, false);
}

export function canvasBlob(canvas, type = 'image/png', q) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, q));
}

// ---------- 썸네일 · 커버 ----------
// 썸네일은 첫인상: 완성 결과 사진 + 한눈에 읽히는 큰 글자 + 늘 같은 자리의 브랜드 표시(채널 일관성)
export const THUMB_SIZES = {
  yt: { label: '유튜브 썸네일', w: 1280, h: 720 },
  cover: { label: '릴스·쇼츠 커버', w: 1080, h: 1920 },
};
export const THUMB_STYLES = {
  bold: { label: '볼드', desc: '큰 노란 글자 · 검은 테두리' },
  panel: { label: '패널', desc: '색 패널 위 글자 · 사진 강조' },
  clean: { label: '클린', desc: '아래 흰 띠 · 차분하게' },
};

export function drawThumb(canvas, { img, text, keyword = '', size = 'yt', style = 'bold', theme = 'navy', settings = {} }) {
  const S = THUMB_SIZES[size] || THUMB_SIZES.yt;
  const th = CARD_THEMES[theme] || CARD_THEMES.navy;
  const W = S.w, H = S.h, portrait = H > W;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
  const brand = brandOf(settings) || settings.handle || '';
  const words = String(text || '').trim();
  const fitFont = (weight, maxSize, maxW, maxLines) => {
    for (let fs = maxSize; fs >= 40; fs -= 4) {
      ctx.font = `${weight} ${fs}px ${FONT}`;
      const rows = wrapText(ctx, words, maxW);
      if (rows.length <= maxLines) return { fs, rows };
    }
    ctx.font = `${weight} 40px ${FONT}`;
    return { fs: 40, rows: wrapText(ctx, words, maxW).slice(0, maxLines) };
  };
  const paintRow = (row, x, y, ink, accent) => {
    if (!keyword || !row.includes(keyword)) { ctx.fillStyle = ink; ctx.fillText(row, x, y); return; }
    const [a, ...rest] = row.split(keyword); const b = rest.join(keyword);
    ctx.fillStyle = ink; ctx.fillText(a, x, y); let cx = x + ctx.measureText(a).width;
    ctx.fillStyle = accent; ctx.fillText(keyword, cx, y); cx += ctx.measureText(keyword).width;
    ctx.fillStyle = ink; ctx.fillText(b, cx, y);
  };
  const brandTag = (x, y, onDark) => {
    if (!brand) return;
    ctx.font = `800 ${portrait ? 40 : 32}px ${FONT}`;
    const w = ctx.measureText(brand).width + 44, h = portrait ? 72 : 58;
    ctx.fillStyle = onDark ? 'rgba(0,0,0,0.55)' : th.accent; roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle'; ctx.fillText(brand, x + 22, y + h / 2 + 2); ctx.textBaseline = 'alphabetic';
  };
  if (style === 'panel' && portrait) {
    const ph = Math.round(H * 0.36);
    cover(ctx, img, 0, ph, W, H - ph, 0.4);
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, ph);
    ctx.fillStyle = th.accent; ctx.fillRect(0, ph - 12, W, 12);
    const { fs, rows } = fitFont(900, 132, W - 140, 3);
    const lh = fs * 1.16, top = 200 + (ph - 200 - rows.length * lh) / 2 + fs * 0.85;
    rows.forEach((r, i) => paintRow(r, 70, top + i * lh, th.ink, '#FACC15'));
    brandTag(60, 90, false);
  } else if (style === 'panel') {
    const pw = Math.round(W * 0.46);
    cover(ctx, img, pw, 0, W - pw, H, 0.4);
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, pw, H);
    ctx.fillStyle = th.accent; ctx.fillRect(pw - 10, 0, 10, H);
    const { fs, rows } = fitFont(900, 104, pw - 120, 4);
    const lh = fs * 1.18, top = (H - rows.length * lh) / 2 + fs * 0.85;
    rows.forEach((r, i) => paintRow(r, 60, top + i * lh, th.ink, '#FACC15'));
    brandTag(60, 48, false);
  } else if (style === 'clean') {
    cover(ctx, img, 0, 0, W, H, 0.4);
    const { fs, rows } = fitFont(800, portrait ? 92 : 76, W - (portrait ? 140 : 160), portrait ? 3 : 2);
    const lh = fs * 1.25, band = rows.length * lh + (portrait ? 110 : 80);
    const y0 = portrait ? H * 0.62 : H - band;
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fillRect(0, y0, W, band);
    ctx.fillStyle = th.accent === '#FACC15' ? '#0A0A0A' : '#2563EB'; ctx.fillRect(0, y0, W, 8);
    rows.forEach((r, i) => paintRow(r, portrait ? 70 : 80, y0 + (portrait ? 70 : 50) + fs * 0.9 + i * lh, '#0F172A', '#2563EB'));
    brandTag(portrait ? 60 : 48, portrait ? 120 : 40, true);
  } else {
    // bold: 사진 전체 + 아래쪽 어둡게 + 큰 노란·흰 글자에 검은 테두리
    cover(ctx, img, 0, 0, W, H, 0.4);
    const g = ctx.createLinearGradient(0, H * 0.35, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const { fs, rows } = fitFont(900, portrait ? 156 : 120, W - (portrait ? 120 : 140), 3);
    const lh = fs * 1.12;
    const bottom = portrait ? H * 0.78 : H - 70;
    const top = bottom - (rows.length - 1) * lh;
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.round(fs * 0.16); ctx.strokeStyle = '#000';
    rows.forEach((r, i) => {
      const x = portrait ? (W - ctx.measureText(r).width) / 2 : 64, y = top + i * lh;
      ctx.strokeText(r, x, y);
      paintRow(r, x, y, i === rows.length - 1 && !keyword ? '#FACC15' : '#FFFFFF', '#FACC15');
    });
    brandTag(portrait ? 60 : 48, portrait ? 120 : 40, true);
  }
  return canvas;
}
