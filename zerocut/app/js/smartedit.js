// 스마트 편집: 긴 영상을 원하는 길이로 군더더기 없이 줄인다.
// 1) 제미나이 키가 있으면: 장면(시간 표시 썸네일) + 받아쓴 말을 보고 컷을 고른다
// 2) 없으면: 선명하고 움직임 있는 장면, 말이 있는 문장 단위로 규칙에 따라 고른다
import { sampleFrames, smallJpegBase64 } from './media.js';

const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const FILLER = /^(음+|어+|아+|그+|저+|뭐+|이제|막|약간|네+|예+|자|그러니까|그래서)$/;
export const isFiller = (text) => {
  const words = String(text || '').replace(/[.,!?…~·\s]+/g, ' ').trim().split(' ').filter(Boolean);
  return !words.length || words.every((w) => FILLER.test(w));
};

function meanScore(samples, a, b) {
  const xs = samples.filter((s) => s.t >= a && s.t <= b);
  if (!xs.length) return 0;
  let sc = 0, motion = 0, dark = 0;
  xs.forEach((s) => { sc += s.score; motion += s.diff > 3 && s.diff < 45 ? 1 : s.diff >= 60 ? -1 : 0; dark += (s.mean != null && s.mean < 35) ? 1 : 0; });
  return sc / xs.length + 0.6 * (motion / xs.length) - 1.5 * (dark / xs.length);
}

/** 키 없이 쓰는 규칙 편집. videos: [{analysis:{duration,samples}, transcript}], photos: 개수 */
export function heuristicEdit({ videos, photos = 0, targetSec }) {
  const photoClips = Math.min(photos, Math.max(0, Math.round((targetSec * 0.25) / 2.2)));
  const photoBudget = photoClips * 2.2;
  const vidBudget = Math.max(2, targetSec - photoBudget);
  const totalDur = videos.reduce((a, v) => a + v.analysis.duration, 0) || 1;
  const clips = [];
  videos.forEach((v, vi) => {
    const dur = v.analysis.duration;
    const samples = v.analysis.samples || [];
    const budget = vidBudget * dur / totalDur;
    let units;
    if (v.transcript && v.transcript.length) {
      // 말이 있는 영상: 문장 단위로 (더듬는 말·추임새는 빼고)
      units = v.transcript.filter((s) => !isFiller(s.text)).map((s, i, arr) => {
        const a = Math.max(0, s.start - 0.15), b = Math.min(dur, s.end + 0.2);
        const pos = a / dur;
        const sc = meanScore(samples, a, b) + (i === 0 ? 0.8 : 0) + (pos > 0.75 ? 1.6 : 0) + (/(완성|결과|포인트|팁|중요|마무리)/.test(s.text) ? 1 : 0) + Math.min(1, s.text.length / 30);
        return { in: a, out: b, sc, i };
      });
    } else {
      // 말이 없는 영상: 2초 안팎 창으로 훑어 선명하고 적당히 움직이는 곳
      const n = Math.max(1, Math.round(budget / 2.2));
      const L = clampN(budget / n, 1.4, 3.2);
      units = [];
      for (let a = 0; a + L <= dur + 0.01; a += L / 2) {
        const b = Math.min(dur, a + L);
        const pos = a / dur;
        units.push({ in: a, out: b, sc: meanScore(samples, a, b) + (pos > 0.8 ? 1.8 : 0) + (pos < 0.1 ? 0.5 : 0) });
      }
    }
    const picked = [];
    let sum = 0;
    for (const u of [...units].sort((x, y) => y.sc - x.sc)) {
      if (sum >= budget) break;
      if (picked.some((p) => u.in < p.out && u.out > p.in)) continue;
      const len = u.out - u.in;
      if (sum + len > budget * 1.15 && sum > 0) continue;
      picked.push(u); sum += len;
    }
    picked.sort((x, y) => x.in - y.in).forEach((u) => clips.push({ kind: 'video', src: vi, in: +u.in.toFixed(2), out: +u.out.toFixed(2), caption: '' }));
  });
  // 사진은 결과 보여 주기로 끝에
  for (let i = 0; i < photoClips; i++) clips.push({ kind: 'image', src: photos - photoClips + i, dur: 2.2, caption: '' });
  return { clips, engine: 'auto' };
}

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';

/** 제미나이 편집: videos: [{url, analysis, transcript}], photoUrls: [] */
export async function geminiEdit({ key, model = 'gemini-flash-latest', videos, photoUrls = [], targetSec, topicLabel = '', onStatus }) {
  onStatus && onStatus('장면을 살펴보는 중');
  const parts = [];
  const perVideo = Math.max(8, Math.floor(48 / Math.max(1, videos.length)));
  for (let vi = 0; vi < videos.length; vi++) {
    const v = videos[vi];
    const dur = v.analysis.duration;
    const n = clampN(Math.round(dur / 2), 6, perVideo);
    const times = Array.from({ length: n }, (_, i) => +((dur * (i + 0.5)) / n).toFixed(1));
    const frames = await sampleFrames(v.url, times);
    parts.push({ text: `[영상 ${vi}] 길이 ${dur.toFixed(1)}초` });
    frames.forEach((f) => { parts.push({ text: `영상 ${vi} · ${f.t}초` }); parts.push({ inlineData: { mimeType: 'image/jpeg', data: f.b64 } }); });
    if (v.transcript && v.transcript.length) parts.push({ text: `영상 ${vi}에서 한 말 (시작~끝 초):\n${v.transcript.map((s) => `${s.start.toFixed(1)}~${s.end.toFixed(1)} ${s.text}`).join('\n')}` });
    onStatus && onStatus(`장면을 살펴보는 중 (${vi + 1}/${videos.length})`);
  }
  for (let pi = 0; pi < Math.min(photoUrls.length, 8); pi++) {
    parts.push({ text: `[사진 ${pi}]` });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: await smallJpegBase64(photoUrls[pi], 320) } });
  }
  parts.push({ text: [
    `위 소재로 ${targetSec}초(±10%) 길이의 세로 숏폼을 편집해 줘.${topicLabel ? ` 주제: ${topicLabel}.` : ''}`,
    '규칙:',
    '1) 군더더기를 뺀다: 준비 동작, 흔들리거나 흐린 장면, 같은 장면 반복, 말 더듬기·"음/어" 같은 추임새, 말 없는 긴 공백.',
    '2) 흐름: 첫 2초 안에 시선을 잡는 장면(완성 결과를 1~2초 먼저 보여줘도 좋음) → 핵심 과정 → 완성 결과로 끝낸다.',
    '3) 말이 있는 구간은 문장 중간에서 자르지 말고, 받아쓰기의 문장 시작·끝 시간에 맞춘다.',
    '4) 컷 하나는 보통 1~4초. 말이 이어지는 설명은 더 길어도 된다. 시간 순서를 바꿔도 된다.',
    '5) 사진은 결과를 보여 줄 때 쓰고, 사진 컷은 start=0, end=2.2로 둔다.',
    '6) caption: 그 컷에 띄울 짧은 화면 자막(16자 이내). 말이 있는 컷이나 필요 없으면 빈 문자열.',
    '7) hook: 첫 화면에 띄울 14자 이내 문구.',
  ].join('\n') });
  const schema = {
    type: 'object',
    properties: {
      hook: { type: 'string' },
      clips: { type: 'array', items: { type: 'object', properties: { source: { type: 'string', enum: ['video', 'photo'] }, index: { type: 'integer' }, start: { type: 'number' }, end: { type: 'number' }, caption: { type: 'string' } }, required: ['source', 'index', 'start', 'end', 'caption'] } },
    },
    required: ['hook', 'clips'],
  };
  onStatus && onStatus('제미나이가 컷을 고르는 중');
  let r;
  try {
    r = await fetch(`${GEMINI_API}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema } }),
    });
  } catch (e) { throw new Error('인터넷 연결을 확인해 주세요.'); }
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(r.status === 429 ? '제미나이 사용량을 잠시 다 썼어요. 기본 자동 편집으로 할게요.' : `제미나이 편집 실패 (${r.status}) ${(j.error && j.error.message) || ''}`.trim());
  }
  const j = await r.json();
  const c = (j.candidates || [])[0];
  const text = ((c && c.content && c.content.parts) || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('');
  const out = JSON.parse(text || '{}');
  // 검증: 범위 밖 · 너무 짧은 컷 정리
  const clips = [];
  (out.clips || []).forEach((cl) => {
    if (cl.source === 'photo') {
      if (cl.index >= 0 && cl.index < photoUrls.length) clips.push({ kind: 'image', src: cl.index, dur: clampN((+cl.end || 2.2) - (+cl.start || 0), 1.5, 3), caption: cl.caption || '' });
      return;
    }
    const v = videos[cl.index];
    if (!v) return;
    const dur = v.analysis.duration;
    const a = clampN(+cl.start || 0, 0, dur), b = clampN(+cl.end || 0, 0, dur);
    if (b - a >= 0.6) clips.push({ kind: 'video', src: cl.index, in: +a.toFixed(2), out: +b.toFixed(2), caption: cl.caption || '' });
  });
  if (!clips.length) throw new Error('제미나이가 컷을 고르지 못했어요. 기본 자동 편집으로 할게요.');
  return fitClips({ clips, hook: out.hook || '', engine: 'gemini' }, targetSec);
}

/** 목표 길이보다 많이 길면 컷 끝을 고르게 줄인다 */
export function fitClips(edit, targetSec) {
  const len = (c) => (c.kind === 'image' ? c.dur : c.out - c.in);
  const sum = edit.clips.reduce((a, c) => a + len(c), 0);
  if (sum > targetSec * 1.15) {
    const k = targetSec / sum;
    edit.clips.forEach((c) => { if (c.kind === 'image') c.dur = Math.max(1.2, c.dur * k); else c.out = +(c.in + Math.max(0.8, (c.out - c.in) * k)).toFixed(2); });
  }
  return edit;
}

export const editLength = (edit) => (edit && edit.clips ? edit.clips.reduce((a, c) => a + (c.kind === 'image' ? c.dur : c.out - c.in), 0) : 0);
