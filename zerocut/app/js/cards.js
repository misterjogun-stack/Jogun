// 카드뉴스: 1080×1350(인스타 4:5) 이미지를 캔버스로 그린다.

export const CARD_W = 1080;
export const CARD_H = 1350;

export const CARD_THEMES = {
  navy:  { label: '네이비', bg: '#0B1220', bg2: '#111C33', ink: '#FFFFFF', sub: '#B6C2D9', accent: '#3B82F6', chip: 'rgba(255,255,255,0.12)', chipInk: '#DCE6FA' },
  white: { label: '화이트', bg: '#FFFFFF', bg2: '#F1F4F9', ink: '#0F172A', sub: '#64748B', accent: '#2563EB', chip: '#EAF1FF', chipInk: '#1D4ED8' },
  black: { label: '블랙',   bg: '#0A0A0A', bg2: '#1A1A1A', ink: '#FFFFFF', sub: '#A3A3A3', accent: '#FACC15', chip: 'rgba(250,204,21,0.16)', chipInk: '#FDE68A' },
  cream: { label: '크림',   bg: '#F6F1E9', bg2: '#ECE4D6', ink: '#2B2118', sub: '#7A6A58', accent: '#C2410C', chip: '#FBE3D2', chipInk: '#9A3412' },
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
  ctx.fillText(settings.handle || settings.brandName || '', 72, CARD_H - 64);
  ctx.textAlign = 'right';
  ctx.font = `700 28px ${NUM_FONT}`;
  ctx.fillText(`${index + 1} / ${total}`, CARD_W - 72, CARD_H - 64);
  ctx.textAlign = 'left';
}

/** 카드 한 장 그리기. card={title, body}, img=HTMLImageElement|null */
export function drawCard(canvas, { card, img, index, total, theme = 'navy', settings, topicLabel }) {
  const th = CARD_THEMES[theme] || CARD_THEMES.navy;
  canvas.width = CARD_W; canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'left';
  const isCover = index === 0, isLast = index === total - 1 && total > 1;

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
    chip(ctx, topicLabel || settings.brandName || 'ZEROCUT', 72, y - 176, img ? { chip: 'rgba(255,255,255,0.16)', chipInk: '#FFFFFF' } : th);
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
