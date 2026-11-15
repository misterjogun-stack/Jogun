// ZEROCUT 앱 본체: 화면 그리기 · 이동 · 작업 처리
import { db, blobUrl, forgetUrl, loadSettings, saveSettings, uid } from './store.js';
import { analyzeVideo, analyzePhoto, grabFrame, smallJpegBase64, thumbDataUrl } from './media.js';
import { TOPICS, TONES, STYLES, perspectiveLabels, GEMINI_MODELS, GEMINI_VOICES, geminiTTS, draftWithoutAI, draftWithAI, ensureArticle, seoCheck, articleHtml } from './writer.js';
import { prepareGoogle, googleToken, listBlogs, createBlogPost, bloggerEditUrl } from './blogger.js';
import { CARD_THEMES, CARD_LAYOUTS, drawCard, ensureFonts, canvasBlob } from './cards.js';
import { ASPECTS, MOTION_STYLES, Composer, buildPlan, recordMic, listElevenVoices, elevenTTS, audioDuration, pickMime } from './motion.js';

const root = document.getElementById('app');
let settings = loadSettings();
let jobs = [];

// ---------- 작은 도구 ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (t) => { const d = new Date(t); return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`; };
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtMB = (b) => (b > 1e9 ? (b / 1e9).toFixed(1) + 'GB' : Math.max(0.1, b / 1e6).toFixed(1) + 'MB');

const P = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  plus: 'M12 5v14M5 12h14',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M21 15l-5-5L5 21',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6',
  insta: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4zM17.5 6.5h.01',
  at: 'M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  layers: 'M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  film: 'M3 3h18v18H3zM7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4',
  play: 'M22 12c0-3-.3-5-1-6s-3-1-9-1-8 0-9 1-1 3-1 6 .3 5 1 6 3 1 9 1 8 0 9-1 1-3 1-6zM10 9l5 3-5 3z',
  tiktok: 'M9 12a4 4 0 1 0 4 4V2c.5 2.5 2.5 4.5 5 5',
  music: 'M9 18V5l12-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  copy: 'M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  check: 'M20 6 9 17l-5-5',
  sparkle: 'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4zM19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  x: 'M18 6 6 18M6 6l12 12',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
  stop: 'M6 6h12v12H6z',
  playBtn: 'M7 4v16l13-8z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 18l-6-6 6-6',
  external: 'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
};
const icon = (name, cls = '') => `<svg class="svg ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[name]}"/></svg>`;
const markSvg = (size = 20) => `<svg width="${size + 4}" height="${Math.round((size + 4) / 2)}" aria-hidden="true"><use href="#zmark"/></svg>`;

let toastTimer;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function shareFiles(files, text) {
  try {
    if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, text }); return true; }
  } catch (e) { if (e && e.name === 'AbortError') return true; }
  return false;
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('복사했어요'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('복사했어요'); } catch (e2) { toast('복사하지 못했어요. 길게 눌러 직접 복사해 주세요'); }
    ta.remove();
  }
}

let jszipP = null;
function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (!jszipP) jszipP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = () => res(window.JSZip); s.onerror = () => { jszipP = null; rej(new Error('압축 도구를 못 불러왔어요')); };
    document.head.appendChild(s);
  });
  return jszipP;
}
async function zipDownload(entries, name) {
  const JSZip = await loadJSZip();
  const z = new JSZip();
  entries.forEach(([n, b]) => z.file(n, b));
  downloadBlob(await z.generateAsync({ type: 'blob' }), name);
}

let sharedAc = null;
function getAC() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!sharedAc) sharedAc = new AC();
  if (sharedAc.state === 'suspended') sharedAc.resume();
  return sharedAc;
}

function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function setPath(obj, path, val) {
  const ks = path.split('.'); let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[ks[i]]; }
  o[ks[ks.length - 1]] = val;
}

const saveTimers = new Map();
function saveSoon(job) {
  clearTimeout(saveTimers.get(job.id));
  saveTimers.set(job.id, setTimeout(() => { job.updatedAt = Date.now(); db.putJob(job).catch(() => toast('저장 공간이 부족해요')); }, 500));
}

const hasAI = () => !!(settings.geminiKey || settings.claudeKey);
const hasBiz = () => !!(settings.bizName && settings.bizName.trim());
const voiceReady = () => !!(settings.geminiKey || (settings.elevenKey && settings.elevenVoice));

// 매장 정보를 블로그 · 인스타 글 끝에 붙이기
function applyBiz(copy) {
  if (!hasBiz()) return;
  const s = settings;
  const rows = [['📍 주소', s.bizAddress], ['🕘 영업시간', s.bizHours], ['📞 전화', s.bizPhone], ['🅿️ 주차', s.bizParking], ['💳 가격', s.bizPrice], ['📅 예약', s.bizBooking], ['🗺️ 지도', s.bizMap]].filter(([, v]) => v && v.trim());
  if (!copy.blog.body.includes('## 매장 정보')) copy.blog.body = copy.blog.body.replace(/\s*$/, '') + `\n\n## 매장 정보\n${s.bizName}\n${rows.map(([k, v]) => `${k} ${v}`).join('\n')}`;
  const line = [`📍 ${s.bizName}${s.bizAddress ? ' · ' + s.bizAddress : ''}`, s.bizBooking ? `📅 예약 ${s.bizBooking}` : ''].filter(Boolean).join('\n');
  if (!copy.instagram.caption.includes(`📍 ${s.bizName}`)) copy.instagram.caption = copy.instagram.caption.replace(/\s*$/, '') + `\n\n${line}`;
  if (copy.youtube && !copy.youtube.description.includes(`📍 ${s.bizName}`)) copy.youtube.description = copy.youtube.description.replace(/\s*$/, '') + `\n\n${line}`;
}

// ---------- 채널 ----------
const CHANNELS = [
  { key: 'blog', label: '네이버 블로그', icon: 'doc', tab: 'blog', url: 'https://blog.naver.com/', desc: '글 + 이미지' },
  { key: 'blogger', label: '구글 블로그', icon: 'globe', tab: 'post', url: 'https://www.blogger.com/', desc: '검색·AI 검색용 글' },
  { key: 'feed', label: '인스타 카드뉴스', icon: 'insta', tab: 'cards', url: 'https://www.instagram.com/', desc: '카드 이미지 + 캡션' },
  { key: 'reels', label: '인스타 릴스', icon: 'insta', tab: 'short', url: 'https://www.instagram.com/', desc: '세로 영상 + 캡션' },
  { key: 'threads', label: '스레드', icon: 'at', tab: 'threads', url: 'https://www.threads.net/', desc: '이어지는 글' },
  { key: 'shorts', label: '유튜브 쇼츠', icon: 'play', tab: 'short', url: 'https://studio.youtube.com/', desc: '세로 영상 + 제목' },
  { key: 'tiktok', label: '틱톡', icon: 'tiktok', tab: 'short', url: 'https://www.tiktok.com/upload', desc: '세로 영상 + 캡션' },
  { key: 'youtube', label: '유튜브 (가로)', icon: 'play', tab: 'youtube', url: 'https://studio.youtube.com/', desc: '가로 영상 + 설명' },
];
function channelState(job, ch) {
  if (job.publish && job.publish[ch.key]) return 'posted';
  if (!job.copy) return 'wait';
  if (['reels', 'shorts', 'tiktok'].includes(ch.key)) return job.outputs && job.outputs.short ? 'ready' : 'wait';
  if (ch.key === 'youtube') return job.outputs && job.outputs.youtube ? 'ready' : 'wait';
  if (ch.key === 'blogger' && job.blogger && job.blogger.status === 'LIVE') return 'posted';
  return 'ready';
}
function jobProgress(job) {
  const posted = CHANNELS.filter((c) => channelState(job, c) === 'posted').length;
  return { posted, total: CHANNELS.length, pct: Math.round((posted / CHANNELS.length) * 100) };
}
function jobStatusPill(job) {
  if (!job.copy) return '<span class="pill gray">만드는 중</span>';
  const p = jobProgress(job);
  if (p.posted === p.total) return '<span class="pill ok">완료</span>';
  if (p.posted > 0) return '<span class="pill blue">게시 중</span>';
  return '<span class="pill warn">게시 대기</span>';
}

// ---------- 틀 ----------
const NAV = [
  { href: '#/', key: 'home', label: '대시보드', icon: 'home' },
  { href: '#/new', key: 'new', label: '새 작업', icon: 'plus' },
  { href: '#/jobs', key: 'jobs', label: '작업 목록', icon: 'list' },
  { href: '#/publish', key: 'publish', label: '게시 센터', icon: 'send' },
  { href: '#/settings', key: 'settings', label: '브랜드 설정', icon: 'sliders' },
];

function shell(active, inner) {
  const name = esc(settings.ownerName || '사용자');
  return `
  <div class="shell">
    <aside class="side" aria-label="메뉴">
      <a class="brand" href="#/"><span class="mark">${markSvg()}</span><span class="wordmark"><b>ZERO</b><i>CUT</i></span></a>
      <nav>${NAV.map((n) => `<a href="${n.href}" class="${active === n.key ? 'on' : ''}">${icon(n.icon)}${n.label}</a>`).join('')}</nav>
      <div class="me"><span class="avatar">${esc((settings.ownerName || 'Z').charAt(0))}</span><div><b>${name}님</b><small>${esc(settings.handle || '')}</small></div></div>
    </aside>
    <main class="main" id="main"><div class="page">${inner}</div></main>
    <nav class="tabbar" aria-label="아래 메뉴">
      ${NAV.map((n) => n.key === 'new'
        ? `<a href="${n.href}" class="plus ${active === n.key ? 'on' : ''}"><span class="dot">${icon('plus')}</span></a>`
        : `<a href="${n.href}" class="${active === n.key ? 'on' : ''}">${icon(n.icon)}<span>${n.label.replace('브랜드 ', '')}</span></a>`).join('')}
    </nav>
  </div>`;
}

const topbar = (title, right = '') => `
  <div class="topbar">
    <a class="mobile-brand" href="#/" aria-label="ZEROCUT 홈"><span class="mark">${markSvg(18)}</span></a>
    <h1>${title}</h1>
    <div class="right">${right}</div>
  </div>`;

// ---------- 대시보드 ----------
function donut(parts, size = 132, stroke = 16) {
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let off = 0;
  const segs = parts.map((p) => {
    const len = (p.v / total) * c;
    const s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.c}" stroke-width="${stroke}" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
    off += len; return s;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="채널별 진행 현황"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${stroke}"/>${segs}</svg>`;
}

function jobRows(list, numbered = false) {
  if (!list.length) return '';
  return `<div class="scroll-x"><table class="table"><thead><tr>${numbered ? '<th class="hide-m">번호</th>' : ''}<th>작업</th><th class="hide-m">날짜</th><th>진행률</th><th>상태</th></tr></thead><tbody>
    ${list.map((j, i) => {
      const p = jobProgress(j);
      return `<tr>${numbered ? `<td class="hide-m num">${list.length - i}</td>` : ''}
        <td><a class="t-title" href="#/job/${j.id}/images">${j.thumb ? `<img src="${j.thumb}" alt="" />` : '<img alt="" />'}<span>${esc(j.title || '제목 없음')}</span></a></td>
        <td class="hide-m num sub">${fmtDate(j.createdAt)}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="bar ${p.pct === 100 ? 'done' : ''}" style="flex:1"><i style="width:${p.pct}%"></i></div><small class="num sub">${p.posted}/${p.total}</small></div></td>
        <td>${jobStatusPill(j)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function viewHome() {
  const outputs = jobs.reduce((a, j) => a + (j.stills || []).length + (j.copy ? (j.copy.cards || []).length + 5 : 0) + Object.keys(j.outputs || {}).length, 0);
  let posted = 0, ready = 0, wait = 0;
  jobs.forEach((j) => CHANNELS.forEach((c) => { const s = channelState(j, c); if (s === 'posted') posted++; else if (s === 'ready') ready++; else wait++; }));
  const total = posted + ready + wait;
  const rate = total ? Math.round((posted / total) * 100) : 0;
  const hours = (jobs.filter((j) => j.copy).length * 2.5).toFixed(1).replace('.0', '');
  const inner = `
    ${topbar('대시보드', `<a class="btn btn-blue btn-sm" href="#/new">${icon('plus')}새 작업</a>`)}
    <section class="hero">
      <h2>사진·영상만 올리면<br />오늘 올릴 콘텐츠가 다 나옵니다</h2>
      <p>블로그 · 구글 블로그 · 인스타 카드뉴스 · 스레드 · 릴스 · 쇼츠 · 틱톡 · 유튜브까지, 한 번 올린 소재로 자동으로 만들어 둡니다.</p>
      <div class="cta"><a class="btn btn-white btn-lg" href="#/new">자동으로 만들기 ${icon('arrow')}</a><a class="btn btn-ghost-w btn-lg" href="#/publish">게시 센터</a></div>
      <div class="kpis">
        <div class="kpi"><small>${icon('layers')}전체 작업</small><b class="num">${jobs.length}<em>건</em></b></div>
        <div class="kpi"><small>${icon('sparkle')}만든 결과물</small><b class="num">${outputs}<em>개</em></b></div>
        <div class="kpi"><small>${icon('check')}게시 완료율</small><b class="num">${rate}<em>%</em></b></div>
        <div class="kpi"><small>${icon('clock')}아낀 시간(예상)</small><b class="num">${hours}<em>시간</em></b></div>
      </div>
    </section>
    <div class="grid g-main">
      <section class="card">
        <div class="card-head"><h3>최근 작업</h3><div class="right"><a class="btn btn-line btn-sm" href="#/jobs">전체 보기</a></div></div>
        ${jobs.length ? jobRows(jobs.slice(0, 5)) : `<div class="empty"><span class="ico blue">${icon('upload')}</span><b>아직 작업이 없어요</b><p>퇴근 전에 찍은 사진·영상을 올려 보세요.</p><a class="btn btn-blue" href="#/new">첫 작업 만들기</a></div>`}
      </section>
      <section class="card">
        <div class="card-head"><h3>채널별 진행 현황</h3></div>
        <div class="donut-wrap">
          <div style="position:relative;display:grid;place-items:center">${donut([{ v: posted, c: 'var(--ok)' }, { v: ready, c: 'var(--accent)' }, { v: wait, c: 'var(--line-strong)' }])}
            <b class="num" style="position:absolute;font-size:26px">${rate}%</b></div>
          <div class="legend">
            <div style="--c:var(--ok)"><i></i>게시 완료<b>${posted}</b></div>
            <div style="--c:var(--accent)"><i></i>게시 준비됨<b>${ready}</b></div>
            <div style="--c:var(--line-strong)"><i></i>영상 만들기 전<b>${wait}</b></div>
          </div>
        </div>
      </section>
    </div>
    <section>
      <h3 style="font-size:16px;font-weight:800;margin-bottom:10px">빠른 메뉴</h3>
      <div class="quick">
        <a href="#/new"><span class="ico blue">${icon('upload')}</span>새 작업</a>
        <a href="#/jobs"><span class="ico green">${icon('list')}</span>작업 목록</a>
        <a href="#/publish"><span class="ico orange">${icon('send')}</span>게시 센터</a>
        <a href="#/settings"><span class="ico red">${icon('sliders')}</span>브랜드 설정</a>
      </div>
    </section>`;
  return shell('home', inner);
}

// ---------- 새 작업 ----------
const draft = { files: [], memo: '', title: '', topic: 'auto', style: '', perspective: 'pro', useBiz: true };
function draftThumbs() {
  return draft.files.map((f, i) => `<div class="thumb">${f.kind === 'video' ? `<video src="${f.url}#t=0.5" muted playsinline preload="metadata"></video>` : `<img src="${f.url}" alt="" />`}
    <span class="badge">${f.kind === 'video' ? '영상' : '사진'}</span><button class="x" data-act="draft-remove" data-i="${i}" aria-label="빼기">${icon('x')}</button></div>`).join('');
}
function viewNew() {
  const hasKey = hasAI();
  const style = draft.style || settings.writeStyle || 'story';
  const pl = perspectiveLabels(draft.topic);
  const size = draft.files.reduce((a, f) => a + f.file.size, 0);
  const inner = `
    ${topbar('새 작업')}
    <div class="grid g-main">
      <section class="card" style="display:grid;gap:16px">
        <label class="drop" id="drop" for="file-in">
          <span class="ico blue">${icon('upload')}</span>
          <b>사진·영상을 올려 주세요</b>
          <span class="sub">여기로 끌어다 놓거나 눌러서 고르기 · 여러 개 가능</span>
          <input id="file-in" type="file" accept="image/*,video/*" multiple hidden />
        </label>
        ${draft.files.length ? `<div><div class="card-head" style="margin-bottom:8px"><h3>올린 소재 ${draft.files.length}개</h3><div class="right"><span class="sub num" style="font-size:13px">${fmtMB(size)}</span></div></div><div class="thumbs">${draftThumbs()}</div></div>` : ''}
        <label class="field"><span>메모 한 줄 (선택)</span>
          <textarea class="textarea" data-draft="memo" rows="3" placeholder="예) 광주 동명동 ○○카페, 라떼 6천원, 웨이팅 20분 / 레이어드컷, 손상모, 클리닉 같이">${esc(draft.memo)}</textarea>
          <span class="hint">사실 정보(가격·장소·시술명)를 적으면 글에 그대로 넣고, 없는 내용은 지어내지 않아요.</span></label>
        <label class="field"><span>제목 (선택)</span><input class="input" data-draft="title" value="${esc(draft.title)}" placeholder="비워 두면 자동으로 지어요" /></label>
        <div class="field"><span>글 스타일 (취향)</span><div class="chips">${Object.entries(STYLES).map(([k, v]) => `<button type="button" class="${style === k ? 'on' : ''}" data-act="draft-style" data-v="${k}" title="${v.desc}">${v.label}</button>`).join('')}</div><span class="hint">${esc(STYLES[style].desc)}</span></div>
        <div class="field"><span>누구 입장에서 쓸까요?</span><div class="seg"><button type="button" class="${draft.perspective !== 'guest' ? 'on' : ''}" data-act="draft-persp" data-v="pro">${pl.pro}</button><button type="button" class="${draft.perspective === 'guest' ? 'on' : ''}" data-act="draft-persp" data-v="guest">${pl.guest}</button></div>
          ${draft.perspective === 'guest' && hasBiz() ? `<span class="hint">매장 계정에서 고객인 것처럼 후기를 쓰면 거짓 후기가 될 수 있어요. 고객이 겪는 과정을 안내하는 글로 쓰거나, 고객님께 초안으로 전달해 직접 올리시게 해 주세요.</span>` : ''}</div>
        ${hasBiz() ? `<label class="field" style="display:flex;gap:10px;align-items:center;flex-direction:row"><input type="checkbox" data-draft-check="useBiz" ${draft.useBiz ? 'checked' : ''} style="width:20px;height:20px" /><span style="color:var(--ink);font-weight:600">매장 정보 넣기 (${esc(settings.bizName)} · 주소 · 예약 링크)</span></label>` : ''}
        <div class="field"><span>주제</span><div class="chips">${Object.entries(TOPICS).filter(([k]) => hasKey || k !== 'auto').map(([k, t]) => `<button type="button" class="${(draft.topic === k || (!hasKey && draft.topic === 'auto' && k === 'daily')) ? 'on' : ''}" data-act="draft-topic" data-v="${k}">${t.label}</button>`).join('')}</div></div>
      </section>
      <section class="card" style="display:grid;gap:14px;align-content:start">
        <h3>자동으로 만들어지는 것</h3>
        <div class="channels">
          ${[['image', '잘 나온 장면 이미지', '영상에서 선명한 장면을 골라 고화질로 저장'], ['doc', '블로그 글', '소제목까지 나눈 원고'], ['globe', '구글 블로그 글', '검색·AI 검색 상위노출 구조 + 매장 정보'], ['insta', '인스타 캡션 · 카드뉴스', '1080×1350 카드 6~8장'], ['at', '스레드', '이어지는 글 3~5개'], ['film', '릴스 · 쇼츠 · 틱톡', '자막 · 모션그래픽 · 소리'], ['play', '유튜브', '가로 영상 + 설명']]
            .map(([ic, t, d]) => `<div class="ch" style="padding:10px 12px"><span class="ico blue" style="width:34px;height:34px">${icon(ic)}</span><div class="txt"><b>${t}</b><small>${d}</small></div></div>`).join('')}
        </div>
        ${hasKey ? `<div class="notice blue">${icon('sparkle')}<span>${settings.aiProvider === 'claude' && settings.claudeKey ? 'Claude' : '제미나이'}가 사진을 직접 보고 글을 씁니다.</span></div>`
          : `<div class="notice">${icon('info')}<span>지금은 메모로 기본 문구를 만듭니다. <a href="#/settings" style="color:var(--accent);font-weight:700">브랜드 설정</a>에서 구글 AI 스튜디오(제미나이) 키를 넣으면 AI가 사진을 직접 읽고 씁니다(무료 사용량 있음).</span></div>`}
        <button class="btn btn-blue btn-lg" data-act="start" ${draft.files.length ? '' : 'disabled'}>${icon('sparkle')}자동으로 만들기</button>
      </section>
    </div>`;
  return shell('new', inner);
}

function addFiles(list) {
  const arr = [...list].filter((f) => /^(image|video)\//.test(f.type) || /\.(jpe?g|png|heic|webp|mp4|mov|m4v|webm)$/i.test(f.name));
  arr.forEach((file) => draft.files.push({ file, kind: file.type.startsWith('video') || /\.(mp4|mov|m4v|webm)$/i.test(file.name) ? 'video' : 'image', url: URL.createObjectURL(file) }));
  if (draft.files.length > 20) { draft.files.slice(20).forEach((f) => URL.revokeObjectURL(f.url)); draft.files.length = 20; toast('한 번에 20개까지 올릴 수 있어요'); }
  render();
}

// ---------- 처리 ----------
const STEPS = [
  ['save', '소재 저장', '이 기기에만 보관해요'],
  ['analyze', '장면 분석 · 이미지 변환', '선명하고 잘 나온 장면을 고릅니다'],
  ['write', '글 쓰기', '블로그 · 인스타 · 스레드 · 카드뉴스 · 자막'],
  ['done', '정리', '바로 쓸 수 있게 묶어 둡니다'],
];
function viewProcessing() {
  return shell('new', `${topbar('자동으로 만드는 중')}
    <section class="card" style="max-width:640px;width:100%;justify-self:center;display:grid;gap:16px">
      <p class="sub">화면을 켜 둔 채로 잠시만 기다려 주세요. 영상 길이에 따라 1~3분 걸려요.</p>
      <div class="steps">${STEPS.map(([k, t, d]) => `<div class="step" id="st-${k}"><span class="st">${icon('check')}</span><div><b>${t}</b><small>${d}</small></div><span class="pct" id="pct-${k}"></span></div>`).join('')}</div>
      <div class="notice blue" id="proc-msg" hidden></div>
    </section>`);
}
function setStep(key, state, pct) {
  const el = document.getElementById('st-' + key); if (!el) return;
  el.classList.toggle('run', state === 'run'); el.classList.toggle('done', state === 'done');
  const st = el.querySelector('.st');
  st.innerHTML = state === 'run' ? '<span class="spin"></span>' : icon('check');
  const p = document.getElementById('pct-' + key);
  if (p) p.textContent = pct != null ? `${Math.round(pct * 100)}%` : '';
}

let processing = false;
async function startJob() {
  if (processing || !draft.files.length) return;
  processing = true;
  location.hash = '#/working';
  await new Promise((r) => setTimeout(r, 60)); // 진행 화면이 먼저 그려지도록
  const job = {
    id: uid('job'), createdAt: Date.now(), updatedAt: Date.now(),
    title: draft.title.trim(), memo: draft.memo.trim(), topic: draft.topic === 'auto' && !hasAI() ? 'daily' : draft.topic,
    style: draft.style || settings.writeStyle || 'story', perspective: draft.perspective, useBiz: hasBiz() && draft.useBiz, cardLayout: settings.cardLayout || 'classic',
    media: [], stills: [], copy: null, coverId: null, cardTheme: settings.cardTheme, cardImages: [], outputs: {}, publish: {},
    short: { length: 30, style: settings.motionStyle, voice: 'none', voiceId: null, voiceSec: 0, bgmId: null, script: '' },
    youtube: { length: 45, style: settings.motionStyle, voice: 'none', voiceId: null, voiceSec: 0, bgmId: null, script: '' },
  };
  try {
    // 1) 저장
    setStep('save', 'run', 0);
    for (let i = 0; i < draft.files.length; i++) {
      const f = draft.files[i];
      const id = uid('m');
      await db.putBlob(id, f.file);
      job.media.push({ id, kind: f.kind, name: f.file.name, type: f.file.type, size: f.file.size });
      setStep('save', 'run', (i + 1) / draft.files.length);
    }
    setStep('save', 'done');
    // 2) 분석
    setStep('analyze', 'run', 0);
    const videos = job.media.filter((m) => m.kind === 'video');
    const perVideo = Math.max(2, Math.min(6, Math.ceil(10 / Math.max(1, videos.length))));
    for (let i = 0; i < job.media.length; i++) {
      const m = job.media[i];
      const url = await blobUrl(m.id);
      const base = i / job.media.length, span = 1 / job.media.length;
      try {
        if (m.kind === 'video') {
          const an = await analyzeVideo(url, { maxPicks: perVideo, onProgress: (p) => setStep('analyze', 'run', base + span * 0.7 * p) });
          m.analysis = { duration: an.duration, w: an.w, h: an.h, samples: an.samples, picks: an.picks.map((p) => p.t) };
          for (const pk of an.picks) {
            const fr = await grabFrame(url, pk.t);
            const sid = uid('s');
            await db.putBlob(sid, fr.blob);
            const su = await blobUrl(sid);
            job.stills.push({ id: sid, from: m.id, t: pk.t, w: fr.w, h: fr.h, score: pk.score, thumb: await thumbDataUrl(su) });
          }
        } else {
          const ph = await analyzePhoto(url);
          const sid = uid('s');
          await db.putBlob(sid, ph.blob);
          const su = await blobUrl(sid);
          job.stills.push({ id: sid, from: m.id, w: ph.w, h: ph.h, score: ph.score, thumb: await thumbDataUrl(su) });
        }
      } catch (e) {
        m.error = '읽을 수 없는 파일';
      }
      setStep('analyze', 'run', base + span);
    }
    if (!job.stills.length) throw new Error('사진이나 영상을 읽지 못했어요. 다른 파일로 다시 시도해 주세요.');
    const best = [...job.stills].sort((a, b) => b.score - a.score)[0];
    job.coverId = best.id; job.thumb = best.thumb;
    job.short.voice = videos.length ? 'original' : 'none';
    job.youtube.voice = job.short.voice;
    setStep('analyze', 'done');
    // 3) 글
    setStep('write', 'run');
    const msg = document.getElementById('proc-msg');
    await writeCopy(job, (t) => { if (msg) { msg.hidden = false; msg.innerHTML = `${icon('sparkle')}<span>${esc(t)}</span>`; } });
    job.topic = job.copy.topic || job.topic;
    if (!job.title) job.title = job.copy.title;
    job.short.script = job.copy.short.narration || '';
    job.youtube.script = job.copy.short.narration || '';
    job.cardImages = defaultCardImages(job);
    setStep('write', 'done');
    // 4) 정리
    setStep('done', 'run');
    await db.putJob(job);
    jobs.unshift(job);
    setStep('done', 'done');
    draft.files.forEach((f) => URL.revokeObjectURL(f.url));
    draft.files = []; draft.memo = ''; draft.title = ''; draft.topic = 'auto'; draft.style = ''; draft.perspective = 'pro'; draft.useBiz = true;
    processing = false;
    location.hash = `#/job/${job.id}/images`;
    toast('다 만들었어요');
  } catch (e) {
    processing = false;
    const msg = document.getElementById('proc-msg');
    if (msg) { msg.hidden = false; msg.className = 'notice'; msg.innerHTML = `${icon('info')}<span>${esc(e.message || '처리 중 문제가 생겼어요')} <a href="#/new" style="color:var(--accent);font-weight:700">돌아가기</a></span>`; }
    // 반쯤 저장된 파일 정리
    for (const m of job.media) await db.deleteBlob(m.id).catch(() => {});
    for (const s of job.stills) await db.deleteBlob(s.id).catch(() => {});
  }
}

// 글 쓰기 (새 작업 · 다시 쓰기 공통)
async function writeCopy(job, onStatus) {
  const args = { memo: job.memo, topic: job.topic, title: job.title, settings, stillCount: job.stills.length, style: job.style, perspective: job.perspective, useBiz: job.useBiz };
  job.copyNotice = '';
  if (hasAI()) {
    try {
      const top = [...job.stills].sort((a, b) => b.score - a.score).slice(0, 6).sort((a, b) => job.stills.indexOf(a) - job.stills.indexOf(b));
      const images = [];
      for (const s of top) images.push(await smallJpegBase64(await blobUrl(s.id)));
      job.copy = await draftWithAI({ ...args, images, onStatus });
    } catch (e) {
      job.copyNotice = (e && e.message ? e.message : 'AI 글쓰기에 실패했어요') + ' 기본 문구로 만들었어요.';
      job.copy = draftWithoutAI(args);
    }
  } else {
    job.copy = draftWithoutAI(args);
  }
  if (job.useBiz) applyBiz(job.copy);
}

function defaultCardImages(job) {
  const n = (job.copy.cards || []).length;
  const order = job.stills.map((s) => s.id).filter((id) => id !== job.coverId);
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return job.coverId;
    if (i === n - 1) return null;
    return order.length ? order[(i - 1) % order.length] : job.coverId;
  });
}

// ---------- 작업 목록 ----------
let jobFilter = 'all';
function viewJobs() {
  const list = jobs.filter((j) => {
    if (jobFilter === 'all') return true;
    const p = jobProgress(j);
    return jobFilter === 'done' ? p.posted === p.total : p.posted < p.total;
  });
  const cnt = (f) => jobs.filter((j) => { const p = jobProgress(j); return f === 'done' ? p.posted === p.total : p.posted < p.total; }).length;
  return shell('jobs', `
    ${topbar('작업 목록', `<a class="btn btn-blue btn-sm" href="#/new">${icon('plus')}새 작업</a>`)}
    <section class="card">
      <div class="card-head"><div class="seg">
        <button class="${jobFilter === 'all' ? 'on' : ''}" data-act="job-filter" data-v="all">전체 ${jobs.length}</button>
        <button class="${jobFilter === 'doing' ? 'on' : ''}" data-act="job-filter" data-v="doing">진행 중 ${cnt('doing')}</button>
        <button class="${jobFilter === 'done' ? 'on' : ''}" data-act="job-filter" data-v="done">완료 ${cnt('done')}</button>
      </div></div>
      ${list.length ? jobRows(list, true) : `<div class="empty"><span class="ico blue">${icon('list')}</span><b>작업이 없어요</b><a class="btn btn-blue" href="#/new">새 작업</a></div>`}
    </section>`);
}

// ---------- 게시 센터 ----------
function viewPublish() {
  const pending = jobs.filter((j) => j.copy && jobProgress(j).posted < CHANNELS.length);
  return shell('publish', `
    ${topbar('게시 센터')}
    <div class="notice blue">${icon('info')}<span>각 채널 앱에서 올린 뒤 '게시 완료'를 눌러 두면 진행률이 채워져요. 휴대폰에서는 '공유'로 인스타·틱톡 앱에 바로 넘길 수 있어요.</span></div>
    ${pending.length ? pending.map((j) => `
      <section class="card">
        <div class="card-head"><a class="t-title" style="display:flex;gap:10px;align-items:center;font-weight:800" href="#/job/${j.id}/publish">${j.thumb ? `<img src="${j.thumb}" alt="" style="width:40px;height:40px;border-radius:10px;object-fit:cover" />` : ''}${esc(j.title)}</a>
          <div class="right">${jobStatusPill(j)}<a class="btn btn-line btn-sm" href="#/job/${j.id}/publish">열기</a></div></div>
        <div class="chips">${CHANNELS.map((c) => { const s = channelState(j, c); return `<span class="pill ${s === 'posted' ? 'ok' : s === 'ready' ? 'blue' : 'gray'}">${s === 'posted' ? icon('check') : ''}${c.label}</span>`; }).join('')}</div>
      </section>`).join('') : `<section class="card"><div class="empty"><span class="ico green">${icon('check')}</span><b>올릴 게 남아 있지 않아요</b><a class="btn btn-blue" href="#/new">새 작업</a></div></section>`}`);
}

// ---------- 설정 ----------
function viewSettings() {
  const s = settings;
  const fld = (key, label, ph = '', type = 'text', hint = '') => `<label class="field"><span>${label}</span><input class="input" type="${type}" data-set="${key}" value="${esc(s[key])}" placeholder="${esc(ph)}" autocomplete="off" />${hint ? `<span class="hint">${hint}</span>` : ''}</label>`;
  return shell('settings', `
    ${topbar('브랜드 설정')}
    <div class="grid g2">
      <section class="card" style="display:grid;gap:14px;align-content:start">
        <h3>계정 · 브랜드</h3>
        ${fld('ownerName', '내 이름', '조군')}
        ${fld('brandName', '브랜드 이름 (영상 엔딩 · 카드에 표시)', 'ZEROCUT')}
        ${fld('handle', '계정 아이디', '@my_account')}
        <label class="field"><span>말투</span><select class="select" data-set="tone">${Object.entries(TONES).map(([k, v]) => `<option value="${k}" ${s.tone === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        ${fld('baseTags', '항상 넣을 해시태그', '#광주미용실 #내브랜드', 'text', '띄어쓰기로 구분해요')}
        <label class="field"><span>카드뉴스 기본 색</span><select class="select" data-set="cardTheme">${Object.entries(CARD_THEMES).map(([k, v]) => `<option value="${k}" ${s.cardTheme === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
        <label class="field"><span>기본 글 스타일</span><select class="select" data-set="writeStyle">${Object.entries(STYLES).map(([k, v]) => `<option value="${k}" ${(s.writeStyle || 'story') === k ? 'selected' : ''}>${v.label} · ${v.desc}</option>`).join('')}</select></label>
        <label class="field"><span>카드뉴스 기본 레이아웃</span><select class="select" data-set="cardLayout">${Object.entries(CARD_LAYOUTS).map(([k, v]) => `<option value="${k}" ${(s.cardLayout || 'classic') === k ? 'selected' : ''}>${v.label} · ${v.desc}</option>`).join('')}</select></label>
        <label class="field"><span>영상 모션 기본 스타일</span><select class="select" data-set="motionStyle">${Object.entries(MOTION_STYLES).map(([k, v]) => `<option value="${k}" ${s.motionStyle === k ? 'selected' : ''}>${v.label} · ${v.desc}</option>`).join('')}</select></label>
        <h3 style="margin-top:6px">매장 · 블로그 정보</h3>
        <p class="sub" style="font-size:14px">한 번 적어 두면 블로그 글 끝 '매장 정보', 인스타 캡션의 주소·예약 줄, 검색엔진용 매장 정보(구조화 데이터)에 자동으로 들어가요. 비워 둔 칸은 빠져요.</p>
        ${fld('bizName', '상호 (매장 이름)', '조군헤어 광주점')}
        ${fld('bizAddress', '주소', '광주 동구 동명동 00-0 2층')}
        ${fld('bizHours', '영업시간', '화–일 10:00–20:00 (월 휴무)')}
        ${fld('bizPhone', '전화', '02-000-0000')}
        ${fld('bizBooking', '예약 링크', 'https://booking.naver.com/...')}
        ${fld('bizMap', '지도 링크 (네이버·카카오·구글 지도)', 'https://naver.me/...')}
        ${fld('bizParking', '주차 안내', '건물 뒤 2대 · 1시간 무료')}
        ${fld('bizPrice', '가격 안내', '커트 3만원~ / 가격표 링크')}
        ${fld('blogUrl', '내 블로그 주소 (네이버·구글 블로그)', 'https://blog.naver.com/...')}
      </section>
      <section class="card" style="display:grid;gap:14px;align-content:start">
        <h3>AI 연결</h3>
        <p class="sub" style="font-size:14px">키는 이 기기 브라우저에만 저장되고, 해당 서비스로만 보내집니다. 공용 컴퓨터에서는 넣지 마세요.</p>
        <details class="sub" style="font-size:13.5px"><summary style="cursor:pointer;font-weight:700;color:var(--accent)">제미나이 키 받는 법 (무료, 1분)</summary>
          <ol style="margin:8px 0 0;padding-left:18px;display:grid;gap:4px"><li>aistudio.google.com 에 구글 계정으로 들어가요.</li><li>'Get API key → API 키 만들기'를 눌러요.</li><li>만들어진 키를 아래에 붙여 넣어요. 무료 사용량을 넘으면 그날은 기본 문구로 만들어져요.</li></ol></details>
        <label class="field"><span>구글 AI 스튜디오(제미나이) API 키 — 사진 읽고 글쓰기 · AI 목소리</span><input class="input" type="password" data-set="geminiKey" value="${esc(s.geminiKey)}" placeholder="AIza..." autocomplete="off" /></label>
        <div class="grid g2" style="gap:12px">
          <label class="field"><span>제미나이 모델</span><select class="select" data-set="geminiModel">${Object.entries(GEMINI_MODELS).map(([k, v]) => `<option value="${k}" ${(s.geminiModel || 'gemini-flash-latest') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label class="field"><span>AI 목소리 (제미나이)</span><select class="select" data-set="geminiVoice">${GEMINI_VOICES.map((v) => `<option value="${v}" ${(s.geminiVoice || 'Kore') === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        </div>
        <details class="sub" style="font-size:13.5px"><summary style="cursor:pointer;font-weight:700">다른 AI 쓰기 (선택: Claude · ElevenLabs)</summary>
          <div style="display:grid;gap:12px;margin-top:10px">
            <label class="field"><span>글쓰기에 쓸 AI</span><select class="select" data-set="aiProvider"><option value="gemini" ${s.aiProvider !== 'claude' ? 'selected' : ''}>제미나이</option><option value="claude" ${s.aiProvider === 'claude' ? 'selected' : ''}>Claude</option></select></label>
            <label class="field"><span>Claude API 키</span><input class="input" type="password" data-set="claudeKey" value="${esc(s.claudeKey)}" placeholder="sk-ant-..." autocomplete="off" /></label>
            <label class="field"><span>ElevenLabs API 키 (제미나이 대신 이 목소리를 쓰려면)</span><div class="key-row"><input class="input" type="password" data-set="elevenKey" value="${esc(s.elevenKey)}" placeholder="xi-..." autocomplete="off" /><button class="btn btn-line" data-act="load-voices">목소리 불러오기</button></div></label>
            <label class="field"><span>ElevenLabs 목소리</span><select class="select" data-set="elevenVoice" id="voice-sel">${s.elevenVoice ? `<option value="${esc(s.elevenVoice)}">${esc(s.elevenVoiceName || s.elevenVoice)}</option>` : '<option value="">먼저 목소리를 불러오세요</option>'}</select></label>
          </div></details>
        <h3 style="margin-top:6px">구글 블로그 연결</h3>
        <details class="sub" style="font-size:13.5px"><summary style="cursor:pointer;font-weight:700;color:var(--accent)">처음 한 번 하는 설정 (무료, 5분)</summary>
          <ol style="margin:8px 0 0;padding-left:18px;display:grid;gap:4px">
            <li>console.cloud.google.com 에서 새 프로젝트를 만들어요.</li>
            <li>'API 및 서비스 → 라이브러리'에서 <b>Blogger API v3</b>를 사용 설정해요.</li>
            <li>'OAuth 동의 화면'을 외부 · 테스트로 만들고, 테스트 사용자에 내 구글 계정을 추가해요.</li>
            <li>'사용자 인증 정보 → OAuth 클라이언트 ID → 웹 애플리케이션'을 만들고, 승인된 자바스크립트 원본에 <b>${esc(location.origin)}</b>를 넣어요.</li>
            <li>만들어진 클라이언트 ID(…apps.googleusercontent.com)를 아래에 붙여 넣고 '내 블로그 불러오기'를 눌러요.</li>
          </ol></details>
        ${fld('googleClientId', '구글 OAuth 클라이언트 ID', '1234-abcd.apps.googleusercontent.com')}
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn btn-line" data-act="bl-load-blogs">${icon('globe')}내 블로그 불러오기</button>
          <select class="select" data-set="bloggerBlogId" id="blog-sel" style="flex:1;min-width:180px">${s.bloggerBlogId ? `<option value="${esc(s.bloggerBlogId)}">${esc(s.bloggerBlogName || s.bloggerBlogId)}</option>` : '<option value="">먼저 블로그를 불러오세요</option>'}</select></div>
        <h3 style="margin-top:6px">데이터</h3>
        <p class="sub" style="font-size:14px" id="storage-info">사진·영상은 이 기기 브라우저에 저장돼요.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-danger" data-act="clear-all">${icon('trash')}모든 작업 지우기</button></div>
      </section>
    </div>`);
}

// ---------- 작업 상세 ----------
const JOB_TABS = [
  ['images', '이미지', 'image'], ['blog', '블로그', 'doc'], ['post', '구글 블로그', 'globe'], ['insta', '인스타', 'insta'], ['threads', '스레드', 'at'],
  ['cards', '카드뉴스', 'layers'], ['short', '숏폼 영상', 'film'], ['youtube', '유튜브', 'play'], ['publish', '게시', 'send'],
];

function viewJob(job, tab) {
  if (!job) return shell('jobs', `${topbar('작업')}<section class="card"><div class="empty"><b>작업을 찾을 수 없어요</b><a class="btn btn-blue" href="#/jobs">작업 목록</a></div></section>`);
  const t = TOPICS[job.topic] || TOPICS.daily;
  const head = `
    <div class="job-head">
      <a class="iconbtn" href="#/jobs" aria-label="작업 목록으로">${icon('back')}</a>
      ${job.thumb ? `<img src="${job.thumb}" alt="" />` : ''}
      <div style="min-width:0;flex:1"><h2>${esc(job.title)}</h2>
        <div class="meta"><span class="pill blue">${t.label}</span>${job.copy && job.copy.source === 'ai' ? `<span class="pill ok">${icon('sparkle')}AI 작성</span>` : '<span class="pill gray">기본 문구</span>'}<span class="sub num" style="font-size:13px">${new Date(job.createdAt).toLocaleDateString('ko-KR')}</span>${jobStatusPill(job)}</div></div>
      <button class="btn btn-danger btn-sm" data-act="job-delete">${icon('trash')}<span class="hide-m">삭제</span></button>
    </div>
    ${job.copyNotice ? `<div class="notice">${icon('info')}<span>${esc(job.copyNotice)}</span></div>` : ''}
    <details class="card" style="padding:14px 18px"><summary style="cursor:pointer;font-weight:700;display:flex;gap:8px;align-items:center">${icon('refresh')}스타일 · 입장 바꿔서 글 다시 쓰기 <span class="sub" style="font-weight:600;font-size:13px">지금: ${esc((STYLES[job.style] || STYLES.story).label)} · ${esc(perspectiveLabels(job.topic)[job.perspective === 'guest' ? 'guest' : 'pro'])}</span></summary>
      <div style="display:grid;gap:12px;margin-top:12px">
        <div class="chips">${Object.entries(STYLES).map(([k, v]) => `<button type="button" class="${(job.style || 'story') === k ? 'on' : ''}" data-act="job-style" data-v="${k}">${v.label}</button>`).join('')}</div>
        <div class="seg"><button class="${job.perspective !== 'guest' ? 'on' : ''}" data-act="job-persp" data-v="pro">${perspectiveLabels(job.topic).pro}</button><button class="${job.perspective === 'guest' ? 'on' : ''}" data-act="job-persp" data-v="guest">${perspectiveLabels(job.topic).guest}</button></div>
        ${hasBiz() ? `<label style="display:flex;gap:10px;align-items:center"><input type="checkbox" data-job-check="useBiz" ${job.useBiz ? 'checked' : ''} style="width:20px;height:20px" />매장 정보 넣기</label>` : ''}
        <div><button class="btn btn-blue btn-sm" data-act="rewrite" id="rewrite-btn">${icon('sparkle')}이 설정으로 글 다시 쓰기</button> <span class="hint">고친 글은 새로 써진 글로 바뀌어요 (영상·사진은 그대로)</span></div>
      </div></details>
    <nav class="tabs" aria-label="결과물">${JOB_TABS.map(([k, l, ic]) => `<a href="#/job/${job.id}/${k}" class="${tab === k ? 'on' : ''}">${icon(ic)}${l}</a>`).join('')}</nav>`;
  let body = '';
  if (tab === 'images') body = tabImages(job);
  else if (tab === 'blog') body = tabBlog(job);
  else if (tab === 'post' || tab === 'wp') body = tabPost(job);
  else if (tab === 'insta') body = tabInsta(job);
  else if (tab === 'threads') body = tabThreads(job);
  else if (tab === 'cards') body = tabCards(job);
  else if (tab === 'short') body = tabStudio(job, 'short');
  else if (tab === 'youtube') body = tabStudio(job, 'youtube');
  else body = tabPublish(job);
  return shell('jobs', head + body);
}

function tabImages(job) {
  return `<section class="card">
    <div class="card-head"><h3>자동 변환된 이미지 ${job.stills.length}장</h3><div class="right"><button class="btn btn-blue btn-sm" data-act="stills-zip">${icon('download')}전체 저장</button></div></div>
    <p class="sub" style="font-size:13.5px;margin:-6px 0 14px">영상에서는 선명하고 잘 나온 장면만 골랐어요. ★ 표시한 사진이 카드뉴스 표지와 대표 이미지가 됩니다.</p>
    <div class="stills">${job.stills.map((s, i) => `
      <div class="still"><div class="img"><img src="${s.thumb}" alt="장면 ${i + 1}" loading="lazy" />
        <button class="iconbtn star ${job.coverId === s.id ? 'on' : ''}" data-act="set-cover" data-id="${s.id}" aria-label="대표로 지정">${icon('star')}</button></div>
        <div class="row"><small class="num" title="${s.w}×${s.h}">${s.t != null ? `영상 ${fmtTime(s.t)}` : '사진'}</small>
          <button class="iconbtn" data-act="still-dl" data-id="${s.id}" aria-label="저장">${icon('download')}</button>
          <button class="iconbtn" data-act="still-del" data-id="${s.id}" aria-label="빼기">${icon('trash')}</button></div></div>`).join('')}</div>
  </section>`;
}

function tabBlog(job) {
  const b = job.copy.blog;
  return `<section class="card" style="display:grid;gap:14px">
    <div class="card-head" style="margin:0"><h3>블로그 글</h3><div class="right"><button class="btn btn-line btn-sm" data-act="copy-path" data-path="copy.blog.title">${icon('copy')}제목 복사</button><button class="btn btn-blue btn-sm" data-act="copy-path" data-path="copy.blog.body">${icon('copy')}본문 복사</button><button class="btn btn-line btn-sm" data-act="stills-zip">${icon('download')}이미지 저장</button></div></div>
    <label class="field"><span>제목</span><input class="input" data-bind="copy.blog.title" value="${esc(b.title)}" /></label>
    <label class="field"><span>본문 <small class="num" data-count="copy.blog.body">${b.body.length}자</small></span><textarea class="textarea" data-bind="copy.blog.body" style="min-height:420px">${esc(b.body)}</textarea>
      <span class="hint">"## "로 시작하는 줄은 소제목이에요. 네이버 블로그에 붙여넣은 뒤 소제목으로 바꾸고, 사이사이에 이미지를 넣어 주세요.</span></label>
  </section>`;
}

function tabInsta(job) {
  const ig = job.copy.instagram, tt = job.copy.tiktok;
  return `<div class="grid g2">
    <section class="card" style="display:grid;gap:12px;align-content:start">
      <div class="card-head" style="margin:0"><h3>인스타 캡션</h3><div class="right"><button class="btn btn-blue btn-sm" data-act="copy-insta">${icon('copy')}캡션+태그 복사</button></div></div>
      <textarea class="textarea" data-bind="copy.instagram.caption" style="min-height:240px">${esc(ig.caption)}</textarea>
      <label class="field"><span>해시태그 <small class="num">${ig.hashtags.length}개</small></span><textarea class="textarea" data-bind-tags="copy.instagram.hashtags" style="min-height:90px">${esc(ig.hashtags.join(' '))}</textarea></label>
    </section>
    <section class="card" style="display:grid;gap:12px;align-content:start">
      <div class="card-head" style="margin:0"><h3>틱톡 캡션</h3><div class="right"><button class="btn btn-line btn-sm" data-act="copy-tiktok">${icon('copy')}복사</button></div></div>
      <textarea class="textarea" data-bind="copy.tiktok.caption">${esc(tt.caption)}</textarea>
      <label class="field"><span>해시태그</span><textarea class="textarea" data-bind-tags="copy.tiktok.hashtags" style="min-height:70px">${esc(tt.hashtags.join(' '))}</textarea></label>
      <div class="card-head" style="margin:8px 0 0"><h3>유튜브 쇼츠 제목</h3><div class="right"><button class="btn btn-line btn-sm" data-act="copy-path" data-path="copy.short.hook">${icon('copy')}복사</button></div></div>
      <input class="input" data-bind="copy.short.hook" value="${esc(job.copy.short.hook)}" />
    </section>
  </div>`;
}

function tabThreads(job) {
  const th = job.copy.threads;
  return `<section class="card" style="display:grid;gap:12px">
    <div class="card-head" style="margin:0"><h3>스레드 ${th.length}개</h3><div class="right"><button class="btn btn-line btn-sm" data-act="thread-add">${icon('plus')}글 추가</button><button class="btn btn-blue btn-sm" data-act="copy-threads">${icon('copy')}전체 복사</button></div></div>
    <p class="sub" style="font-size:13.5px">첫 글을 올린 뒤, 나머지를 답글로 이어 붙이세요. 한 글은 500자까지 올라가요.</p>
    ${th.map((t, i) => `<div class="post"><div class="tools"><small>${i + 1}/${th.length} · <span data-count="copy.threads.${i}">${t.length}자</span></small>
      <button class="iconbtn" data-act="copy-path" data-path="copy.threads.${i}" aria-label="복사">${icon('copy')}</button>
      <button class="iconbtn" data-act="thread-del" data-i="${i}" aria-label="삭제">${icon('trash')}</button></div>
      <textarea class="textarea" data-bind="copy.threads.${i}">${esc(t)}</textarea></div>`).join('')}
  </section>`;
}

function tabCards(job) {
  const cards = job.copy.cards;
  return `<section class="card" style="display:grid;gap:14px">
    <div class="card-head" style="margin:0"><h3>카드뉴스 ${cards.length}장 <small class="sub" style="font-weight:600">1080×1350</small></h3>
      <div class="right"><div class="seg">${Object.entries(CARD_LAYOUTS).map(([k, v]) => `<button class="${(job.cardLayout || 'classic') === k ? 'on' : ''}" data-act="card-layout" data-v="${k}" title="${v.desc}">${v.label}</button>`).join('')}</div><div class="seg">${Object.entries(CARD_THEMES).map(([k, v]) => `<button class="${job.cardTheme === k ? 'on' : ''}" data-act="card-theme" data-v="${k}">${v.label}</button>`).join('')}</div>
      <button class="btn btn-blue btn-sm" data-act="cards-zip">${icon('download')}전체 저장</button><button class="btn btn-line btn-sm" data-act="cards-share">${icon('share')}공유</button></div></div>
    <div class="cards-grid">${cards.map((c, i) => `
      <div class="cn"><img id="card-img-${i}" alt="카드 ${i + 1}" />
        <input class="input" data-bind="copy.cards.${i}.title" data-card="${i}" value="${esc(c.title)}" aria-label="카드 ${i + 1} 제목" />
        <input class="input" data-bind="copy.cards.${i}.body" data-card="${i}" value="${esc(c.body)}" aria-label="카드 ${i + 1} 설명" />
        <div class="tools">${i < cards.length - 1 ? `<button class="btn btn-line btn-sm" data-act="card-photo" data-i="${i}">${icon('refresh')}사진 바꾸기</button>` : ''}
          <button class="iconbtn" data-act="card-dl" data-i="${i}" aria-label="저장">${icon('download')}</button>
          ${cards.length > 3 && i > 0 && i < cards.length - 1 ? `<button class="iconbtn" data-act="card-del" data-i="${i}" aria-label="삭제">${icon('trash')}</button>` : ''}</div></div>`).join('')}
    </div>
    <div><button class="btn btn-line btn-sm" data-act="card-add">${icon('plus')}카드 추가</button></div>
  </section>`;
}

const cardUrls = new Map();
const imgCache = new Map();
async function stillImage(id) {
  if (!id) return null;
  if (imgCache.has(id)) return imgCache.get(id);
  const u = await blobUrl(id); if (!u) return null;
  const img = new Image(); img.src = u; await img.decode().catch(() => {});
  imgCache.set(id, img); return img;
}
async function renderCard(job, i) {
  const canvas = document.createElement('canvas');
  const cards = job.copy.cards;
  drawCard(canvas, { card: cards[i], img: await stillImage(job.cardImages[i]), index: i, total: cards.length, theme: job.cardTheme, layout: job.cardLayout || 'classic', settings, topicLabel: (TOPICS[job.topic] || {}).label });
  return canvas;
}
async function paintCards(job, only) {
  await ensureFonts(job.copy.cards.map((c) => c.title + c.body).join(' ') + (settings.handle || ''));
  const idxs = only != null ? [only] : job.copy.cards.map((_, i) => i);
  for (const i of idxs) {
    const el = document.getElementById('card-img-' + i); if (!el) continue;
    const c = await renderCard(job, i);
    const blob = await canvasBlob(c, 'image/jpeg', 0.9);
    const prev = cardUrls.get(i); if (prev) URL.revokeObjectURL(prev);
    const u = URL.createObjectURL(blob); cardUrls.set(i, u); el.src = u;
  }
}
async function cardBlobs(job) {
  await ensureFonts(job.copy.cards.map((c) => c.title + c.body).join(' '));
  const out = [];
  for (let i = 0; i < job.copy.cards.length; i++) out.push(await canvasBlob(await renderCard(job, i), 'image/png'));
  return out;
}

// ---------- 구글 블로그 글 (SEO · GEO) ----------
function seoPanel(job) {
  const a = job.copy.article;
  const { score, items } = seoCheck(a, Math.min(job.stills.length, a.sections.length + 1));
  const tone = score >= 85 ? 'var(--ok)' : score >= 60 ? 'var(--accent)' : 'var(--warn)';
  return `<div class="donut-wrap" style="margin-bottom:12px"><div style="position:relative;display:grid;place-items:center">${donut([{ v: score, c: tone }, { v: 100 - score, c: 'var(--surface-2)' }], 104, 12)}<b class="num" style="position:absolute;font-size:24px">${score}</b></div>
    <div><b style="font-size:15px">${score >= 85 ? '상위노출 준비 완료' : score >= 60 ? '조금만 더 채우면 좋아요' : '채울 곳이 남아 있어요'}</b><p class="sub" style="font-size:13px;margin-top:4px">검색(SEO)과 AI 검색(GEO) 기준 ${items.length}가지 점검</p></div></div>
    <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px">${items.map((it) => `<li style="display:flex;gap:8px;align-items:flex-start;font-size:13.5px"><span class="ico ${it.ok ? 'green' : 'orange'}" style="width:22px;height:22px;border-radius:7px">${icon(it.ok ? 'check' : 'info')}</span><span><b style="font-weight:${it.ok ? 600 : 700}">${esc(it.label)}</b>${it.ok ? '' : `<br /><span class="sub">${esc(it.tip)}</span>`}</span></li>`).join('')}</ul>`;
}
function tabPost(job) {
  ensureArticle(job.copy, job.memo, job.topic, settings);
  const a = job.copy.article;
  return `<div class="studio wide" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
    <section class="card" style="display:grid;gap:14px;align-content:start">
      <div class="card-head" style="margin:0"><h3>구글 블로그 글</h3><div class="right"><button class="btn btn-line btn-sm" data-act="wp-copy-html">${icon('copy')}HTML 복사</button></div></div>
      <div class="notice blue">${icon('info')}<span>맨 앞 요약 → 질문형 소제목 → 자주 묻는 질문 순서는 구글·네이버 검색(SEO)과 ChatGPT·퍼플렉시티 같은 AI 검색(GEO)에 인용되기 좋은 구조예요.</span></div>
      <div class="grid g2" style="gap:12px">
        <label class="field"><span>핵심 검색어</span><input class="input" data-bind="copy.article.focusKeyword" data-seo="1" value="${esc(a.focusKeyword)}" placeholder="예) 광주 동명동 카페 추천" /></label>
        <label class="field"><span>주소 (영어 slug)</span><input class="input" data-bind="copy.article.slug" data-seo="1" value="${esc(a.slug)}" /></label>
      </div>
      <label class="field"><span>검색 제목 <small class="num" data-count="copy.article.seoTitle">${a.seoTitle.length}자</small></span><input class="input" data-bind="copy.article.seoTitle" data-seo="1" value="${esc(a.seoTitle)}" /></label>
      <label class="field"><span>검색 설명 <small class="num" data-count="copy.article.metaDescription">${a.metaDescription.length}자</small></span><textarea class="textarea" style="min-height:70px" data-bind="copy.article.metaDescription" data-seo="1">${esc(a.metaDescription)}</textarea></label>
      <label class="field"><span>맨 앞 요약 (AI 검색이 가장 많이 인용하는 부분)</span><textarea class="textarea" style="min-height:80px" data-bind="copy.article.summary" data-seo="1">${esc(a.summary)}</textarea></label>
      <div class="field"><span>본문 소제목</span>
        ${a.sections.map((sec, i) => `<div class="post"><div class="tools"><small>${i + 1}</small><button class="iconbtn" data-act="art-del" data-k="sections" data-i="${i}" aria-label="삭제">${icon('trash')}</button></div>
          <input class="input" data-bind="copy.article.sections.${i}.heading" data-seo="1" value="${esc(sec.heading)}" />
          <textarea class="textarea" data-bind="copy.article.sections.${i}.body" data-seo="1">${esc(sec.body)}</textarea></div>`).join('')}
        <div><button class="btn btn-line btn-sm" data-act="art-add" data-k="sections">${icon('plus')}소제목 추가</button></div></div>
      <div class="field"><span>자주 묻는 질문</span>
        ${a.faq.map((f, i) => `<div class="post"><div class="tools"><small>Q${i + 1}</small><button class="iconbtn" data-act="art-del" data-k="faq" data-i="${i}" aria-label="삭제">${icon('trash')}</button></div>
          <input class="input" data-bind="copy.article.faq.${i}.q" data-seo="1" value="${esc(f.q)}" />
          <textarea class="textarea" style="min-height:70px" data-bind="copy.article.faq.${i}.a" data-seo="1">${esc(f.a)}</textarea></div>`).join('')}
        <div><button class="btn btn-line btn-sm" data-act="art-add" data-k="faq">${icon('plus')}질문 추가</button></div></div>
      <label class="field"><span>라벨 · 태그 (쉼표로 구분)</span><input class="input" data-bind-csv="copy.article.tags" value="${esc(a.tags.join(', '))}" /></label>
    </section>
    <div style="display:grid;gap:16px;align-content:start">
      <section class="card"><h3 style="margin-bottom:12px">상위노출 점검</h3><div id="seo-panel">${seoPanel(job)}</div></section>
      <section class="card" style="display:grid;gap:12px">
        <h3>구글 블로그에 올리기</h3>
        ${settings.googleClientId && settings.bloggerBlogId ? `<p class="sub" style="font-size:13.5px">${esc(settings.bloggerBlogName || '내 블로그')}에 제목 · 본문 · 요약 · 자주 묻는 질문 · 라벨까지 넣어요. 사진은 넣을 자리를 표시해 두니, 블로거 편집기에서 끌어다 놓아 주세요.</p>
          <div class="seg"><button class="${job.blStatus !== 'publish' ? 'on' : ''}" data-act="bl-status" data-v="draft">임시저장</button><button class="${job.blStatus === 'publish' ? 'on' : ''}" data-act="bl-status" data-v="publish">바로 발행</button></div>
          <button class="btn btn-blue btn-lg" data-act="bl-publish" id="bl-btn">${icon('upload')}구글 블로그에 올리기</button>`
          : `<div class="notice">${icon('info')}<span>처음 한 번만 브랜드 설정에서 구글 블로그를 연결해 주세요(무료). 연결 전에는 'HTML 복사' 후 블로거 글쓰기의 'HTML 보기'에 붙여 넣으면 돼요.</span></div><a class="btn btn-line" href="#/settings">구글 블로그 연결하기</a>`}
        ${job.blogger ? `<div class="result"><b>${icon('check')} ${job.blogger.status === 'LIVE' ? '발행했어요' : '임시저장했어요'}</b>
          <p style="font-size:13.5px">블로거 편집기에서 마지막으로: ① 사진 넣기 ② 오른쪽 '검색 설명'과 '맞춤 퍼머링크'에 아래 값 붙여넣기</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-blue btn-sm" href="${esc(bloggerEditUrl(job.blogger.blogId, job.blogger.id))}" target="_blank" rel="noopener">${icon('external')}블로거에서 열기</a>
          <button class="btn btn-line btn-sm" data-act="copy-path" data-path="copy.article.metaDescription">${icon('copy')}검색 설명 복사</button>
          <button class="btn btn-line btn-sm" data-act="copy-path" data-path="copy.article.slug">${icon('copy')}퍼머링크 복사</button>
          <button class="btn btn-line btn-sm" data-act="stills-zip">${icon('download')}사진 저장</button></div></div>` : ''}
        <p class="hint">처음 블로그라면 블로거 설정 → '검색 설명 사용'을 켜고, 구글 서치콘솔에 블로그를 등록하면 더 빨리 검색에 잡혀요.</p>
      </section>
    </div>
  </div>`;
}
async function postImages(job) {
  const a = job.copy.article;
  const others = job.stills.filter((s) => s.id !== job.coverId);
  const picks = [job.coverId, ...others.map((s) => s.id)].slice(0, a.sections.length + 1);
  const kw = (a.focusKeyword || '').trim();
  return picks.map((id, i) => {
    const part = (i === 0 ? job.title : (a.sections[i - 1] || {}).heading || job.title).trim();
    return { id, alt: kw && !part.includes(kw) ? `${kw} - ${part}` : part };
  });
}

// ---------- 영상 스튜디오 (숏폼 · 유튜브) ----------
const studio = { composer: null, key: '', busy: false };
async function disposeStudio() {
  if (studio.composer) { const c = studio.composer; studio.composer = null; await c.dispose(); }
  studio.key = '';
}

function tabStudio(job, kind) {
  const o = job[kind];
  const isShort = kind === 'short';
  const out = job.outputs[kind];
  const hasVideo = job.media.some((m) => m.kind === 'video');
  const voiceOpts = [['original', '원본 소리'], ['mic', '내 목소리'], ['ai', 'AI 목소리'], ['none', '없음']].filter(([k]) => k !== 'original' || hasVideo);
  const lines = job.copy.short.lines;
  return `<div class="studio ${isShort ? '' : 'wide'}">
    <section class="card" style="display:grid;gap:12px;align-content:start">
      <div class="stage ${isShort ? 'v' : ''}"><canvas id="stage-canvas"></canvas>
        <div class="overlay"><button class="btn btn-white btn-sm" data-act="studio-play" id="play-btn">${icon('playBtn')}미리보기</button><span class="time num" id="stage-time">0:00</span></div></div>
      <div class="progress-line" id="rec-progress" hidden><i></i></div>
      <button class="btn btn-blue btn-lg" data-act="studio-record" id="rec-btn">${icon('film')}${isShort ? '세로 영상 만들기' : '가로 영상 만들기'}</button>
      <p class="hint" id="rec-hint">영상 길이만큼 실제로 재생하며 녹화해요. 끝날 때까지 이 화면을 켜 두세요.</p>
      ${out ? `<div class="result" id="result"><b>${icon('check')} 만든 영상 · ${fmtTime(out.sec || 0)} · ${(out.mime || '').includes('mp4') ? 'MP4' : 'WebM'}</b><video id="result-video" controls playsinline></video>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-blue btn-sm" data-act="video-dl" data-kind="${kind}">${icon('download')}저장</button><button class="btn btn-line btn-sm" data-act="video-share" data-kind="${kind}">${icon('share')}공유 (인스타·틱톡 앱)</button></div>
        ${(out.mime || '').includes('webm') ? '<span class="hint">이 브라우저는 WebM으로 저장해요. 인스타·틱톡에 그대로 안 올라가면 크롬 최신 버전이나 아이폰 사파리에서 다시 만들어 주세요(MP4로 저장).</span>' : ''}</div>` : ''}
    </section>
    <section class="card opt">
      ${isShort ? '' : `<div><h4>유튜브 제목 · 설명</h4><div style="display:grid;gap:8px"><input class="input" data-bind="copy.youtube.title" value="${esc(job.copy.youtube.title)}" />
        <textarea class="textarea" data-bind="copy.youtube.description">${esc(job.copy.youtube.description)}</textarea>
        <div style="display:flex;gap:8px"><button class="btn btn-line btn-sm" data-act="copy-path" data-path="copy.youtube.title">${icon('copy')}제목 복사</button><button class="btn btn-line btn-sm" data-act="copy-path" data-path="copy.youtube.description">${icon('copy')}설명 복사</button></div></div></div>`}
      <div><h4>길이</h4><div class="seg">${[15, 30, 45, 60].map((s) => `<button class="${o.length === s ? 'on' : ''}" data-act="st-set" data-k="length" data-v="${s}" ${o.voice === 'mic' || o.voice === 'ai' ? (o.voiceId ? 'disabled' : '') : ''}>${s}초</button>`).join('')}</div>
        ${(o.voice === 'mic' || o.voice === 'ai') && o.voiceId ? `<p class="hint" style="margin-top:6px">목소리 길이(${fmtTime(o.voiceSec)})에 맞춰 자동으로 정해져요.</p>` : ''}</div>
      <div><h4>모션 스타일</h4><div class="seg">${Object.entries(MOTION_STYLES).map(([k, v]) => `<button class="${o.style === k ? 'on' : ''}" data-act="st-set" data-k="style" data-v="${k}" title="${v.desc}">${v.label}</button>`).join('')}</div></div>
      <div><h4>첫 화면 문구 (훅)</h4><input class="input" data-bind="copy.short.hook" data-studio="1" value="${esc(job.copy.short.hook)}" maxlength="40" /></div>
      <div><h4>강조 단어</h4><input class="input" data-bind="copy.short.keyword" data-studio="1" value="${esc(job.copy.short.keyword)}" maxlength="12" /></div>
      <div><h4>화면 자막 (한 줄에 하나)</h4><textarea class="textarea" data-bind-lines="copy.short.lines" data-studio="1" style="min-height:130px">${esc(lines.join('\n'))}</textarea></div>
      <div><h4>말소리</h4><div class="seg">${voiceOpts.map(([k, l]) => `<button class="${o.voice === k ? 'on' : ''}" data-act="st-set" data-k="voice" data-v="${k}">${l}</button>`).join('')}</div>
        ${o.voice === 'mic' || o.voice === 'ai' ? `<div class="voice-box" style="margin-top:10px">
          <label class="field"><span>내레이션 원고</span><textarea class="textarea" data-bind="${kind}.script" style="min-height:110px">${esc(o.script)}</textarea></label>
          ${o.voice === 'mic'
            ? `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn btn-blue btn-sm" data-act="mic-rec" id="mic-btn">${icon('mic')}녹음 시작</button><span class="sub" id="mic-state" style="font-size:13px">원고를 보며 읽어 주세요</span></div>`
            : `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn btn-blue btn-sm" data-act="ai-voice" ${voiceReady() ? '' : 'disabled'}>${icon('sparkle')}AI 목소리 만들기</button>
               ${voiceReady() ? `<span class="sub" style="font-size:13px">${settings.elevenKey && settings.elevenVoice && !settings.geminiKey ? 'ElevenLabs' : `제미나이 목소리 ${esc(settings.geminiVoice || 'Kore')}`}로 만들어요</span>` : '<a href="#/settings" class="sub" style="font-size:13px;color:var(--accent);font-weight:700">설정에서 제미나이 키를 먼저 넣어 주세요</a>'}</div>`}
          ${o.voiceId ? `<audio id="voice-audio" controls style="width:100%"></audio><button class="btn btn-line btn-sm" data-act="voice-del">${icon('trash')}목소리 지우기</button>` : ''}
        </div>` : ''}</div>
      <div><h4>배경음악 (선택)</h4>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label class="btn btn-line btn-sm">${icon('music')}음악 파일 고르기<input type="file" accept="audio/*" hidden data-act-change="bgm" /></label>
        ${o.bgmId ? `<span class="pill ok">${icon('check')}${esc(o.bgmName || '배경음악')}</span><button class="iconbtn" data-act="bgm-del" aria-label="배경음악 빼기">${icon('x')}</button>` : '<span class="sub" style="font-size:13px">목소리가 있으면 자동으로 작게 깔려요</span>'}</div>
        <p class="hint" style="margin-top:6px">저작권 걱정 없는 음악만 넣어 주세요. 인스타·틱톡의 인기 음악은 앱에서 올릴 때 고르는 게 안전해요.</p></div>
    </section>
  </div>`;
}

async function studioSources(job) {
  const sources = [];
  for (const m of job.media) if (m.kind === 'video' && m.analysis) sources.push({ kind: 'video', url: await blobUrl(m.id), analysis: m.analysis });
  const photoStills = job.stills.filter((s) => s.t == null);
  const pool = sources.length ? photoStills : job.stills;
  for (const s of pool) sources.push({ kind: 'image', url: await blobUrl(s.id) });
  if (!sources.length) for (const s of job.stills) sources.push({ kind: 'image', url: await blobUrl(s.id) });
  return sources;
}

async function buildComposer(job, kind) {
  const o = job[kind];
  const aspect = kind === 'short' ? '9:16' : '16:9';
  const voiceOn = (o.voice === 'mic' || o.voice === 'ai') && o.voiceId;
  const plan = buildPlan({ sources: await studioSources(job), copy: job.copy.short, targetSec: o.length, voiceSec: voiceOn ? o.voiceSec : 0, aspect });
  const canvas = document.getElementById('stage-canvas');
  if (!canvas) return null;
  const comp = new Composer({
    canvas, plan, settings, style: o.style,
    audio: {
      ac: getAC(),
      originalGain: o.voice === 'original' ? 1 : 0,
      voiceBlob: voiceOn ? await db.getBlob(o.voiceId) : null,
      bgmBlob: o.bgmId ? await db.getBlob(o.bgmId) : null,
    },
  });
  await comp.prepare();
  return comp;
}

async function ensureComposer(job, kind) {
  const o = job[kind];
  const key = JSON.stringify([job.id, kind, o.length, o.style, o.voice, o.voiceId, o.voiceSec, o.bgmId, job.copy.short.hook, job.copy.short.keyword, job.copy.short.lines, settings.brandName, settings.handle]);
  if (studio.composer && studio.key === key) return studio.composer;
  await disposeStudio();
  studio.composer = await buildComposer(job, kind);
  studio.key = key;
  return studio.composer;
}

async function studioPoster(job, kind) {
  try {
    const c = await ensureComposer(job, kind);
    if (c) { await c.poster(Math.min(1.4, c.plan.hookEnd - 0.2)); const t = document.getElementById('stage-time'); if (t) t.textContent = `0:00 / ${fmtTime(c.plan.total)}`; }
  } catch (e) { toast(e.message || '미리보기를 만들지 못했어요'); }
}

// ---------- 게시 탭 ----------
function tabPublish(job) {
  return `<section class="card">
    <div class="card-head"><h3>채널별 게시</h3><div class="right"><span class="sub num" style="font-size:13px">${jobProgress(job).posted}/${CHANNELS.length} 완료</span></div></div>
    <div class="channels">${CHANNELS.map((c) => {
      const s = channelState(job, c);
      return `<div class="ch"><span class="ico ${s === 'posted' ? 'green' : s === 'ready' ? 'blue' : 'orange'}">${icon(c.icon)}</span>
        <div class="txt"><b>${c.label}</b><small>${s === 'posted' ? '게시 완료' : s === 'ready' ? c.desc + ' 준비됨' : '영상을 먼저 만들어 주세요'}</small></div>
        <div class="acts">
          <a class="btn btn-line btn-sm" href="#/job/${job.id}/${c.tab}">${s === 'wait' ? '만들러 가기' : '결과물 보기'}</a>
          ${s !== 'wait' && c.url ? `<a class="btn btn-line btn-sm" href="${esc(c.key === 'blogger' ? (job.blogger ? bloggerEditUrl(job.blogger.blogId, job.blogger.id) : c.url) : c.url)}" target="_blank" rel="noopener">${icon('external')}열기</a>` : ''}
          <button class="btn ${s === 'posted' ? 'btn-soft' : 'btn-line'} btn-sm" data-act="mark-posted" data-k="${c.key}" ${s === 'wait' ? 'disabled' : ''}>${s === 'posted' ? icon('check') + '완료' : '게시 완료'}</button>
        </div></div>`;
    }).join('')}</div>
    <p class="hint" style="margin-top:12px">자동 게시(예약 업로드)는 각 채널 계정을 연결하는 서버가 필요해서 다음 단계로 준비 중이에요. 지금은 복사·저장·공유로 1분 안에 올릴 수 있게 해 두었습니다.</p>
  </section>`;
}

// ---------- 화면 이동 ----------
function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  const parts = h.split('/').filter(Boolean);
  return { name: parts[0] || 'home', id: parts[1], tab: parts[2] || 'images' };
}

let current = null;
async function render() {
  const r = route();
  const sameStudio = current && current.name === 'job' && r.name === 'job' && current.id === r.id && current.tab === r.tab;
  if (!sameStudio) await disposeStudio();
  current = r;
  let html;
  let job = null;
  if (r.name === 'new') html = viewNew();
  else if (r.name === 'working') html = processing ? viewProcessing() : (location.hash = '#/new', '');
  else if (r.name === 'jobs') html = viewJobs();
  else if (r.name === 'publish') html = viewPublish();
  else if (r.name === 'settings') html = viewSettings();
  else if (r.name === 'job') { job = jobs.find((j) => j.id === r.id); html = viewJob(job, r.tab); }
  else html = viewHome();
  if (!html) return;
  root.innerHTML = html;
  document.title = { home: '대시보드', new: '새 작업', jobs: '작업 목록', publish: '게시 센터', settings: '브랜드 설정', job: job ? job.title : '작업', working: '만드는 중' }[r.name] + ' · ZEROCUT';
  afterRender(r, job);
}

async function afterRender(r, job) {
  if (r.name === 'new') {
    const drop = document.getElementById('drop');
    const inp = document.getElementById('file-in');
    inp.addEventListener('change', () => addFiles(inp.files));
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
  }
  if ((r.name === 'settings' || (r.name === 'job' && (r.tab === 'post' || r.tab === 'wp'))) && settings.googleClientId) prepareGoogle(settings.googleClientId).catch(() => {});
  if (r.name === 'settings') {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => { const el = document.getElementById('storage-info'); if (el) el.textContent = `사진·영상은 이 기기 브라우저에 저장돼요. 지금 ${fmtMB(est.usage || 0)} 사용 중 (여유 약 ${fmtMB(Math.max(0, (est.quota || 0) - (est.usage || 0)))})`; });
    }
  }
  if (r.name === 'job' && job) {
    if (r.tab === 'cards') paintCards(job);
    if (r.tab === 'short' || r.tab === 'youtube') {
      const o = job[r.tab];
      const out = job.outputs[r.tab];
      if (out) { const v = document.getElementById('result-video'); if (v) v.src = await blobUrl(out.id); }
      if (o.voiceId) { const a = document.getElementById('voice-audio'); if (a) a.src = await blobUrl(o.voiceId); }
      studioPoster(job, r.tab);
    }
  }
}

// ---------- 동작 ----------
const curJob = () => (current && current.name === 'job' ? jobs.find((j) => j.id === current.id) : null);

const actions = {
  'draft-remove': (el) => { const i = +el.dataset.i; URL.revokeObjectURL(draft.files[i].url); draft.files.splice(i, 1); render(); },
  'draft-topic': (el) => { draft.topic = el.dataset.v; render(); },
  start: () => startJob(),
  'job-filter': (el) => { jobFilter = el.dataset.v; render(); },
  'job-delete': async () => {
    const job = curJob(); if (!job || !confirm('이 작업과 만든 결과물을 모두 지울까요? 되돌릴 수 없어요.')) return;
    await disposeStudio();
    const extra = [job.outputs.short && job.outputs.short.id, job.outputs.youtube && job.outputs.youtube.id, job.short.voiceId, job.short.bgmId, job.youtube.voiceId, job.youtube.bgmId].filter(Boolean);
    job.extraMedia = extra;
    await db.deleteJob(job);
    [...job.media, ...job.stills].forEach((m) => forgetUrl(m.id)); extra.forEach(forgetUrl);
    jobs = jobs.filter((j) => j.id !== job.id);
    location.hash = '#/jobs'; toast('지웠어요');
  },
  'set-cover': (el) => {
    const job = curJob(); job.coverId = el.dataset.id; job.thumb = job.stills.find((s) => s.id === job.coverId).thumb;
    job.cardImages[0] = job.coverId; saveSoon(job); render();
  },
  'still-dl': async (el) => { const b = await db.getBlob(el.dataset.id); if (b) downloadBlob(b, `zerocut-${el.dataset.id.slice(-6)}.jpg`); },
  'still-del': async (el) => {
    const job = curJob(); if (job.stills.length <= 1) { toast('이미지는 한 장 이상 있어야 해요'); return; }
    const id = el.dataset.id;
    job.stills = job.stills.filter((s) => s.id !== id);
    if (job.coverId === id) { job.coverId = job.stills[0].id; job.thumb = job.stills[0].thumb; }
    job.cardImages = job.cardImages.map((c) => (c === id ? job.coverId : c));
    await db.deleteBlob(id); forgetUrl(id); saveSoon(job); render();
  },
  'stills-zip': async () => {
    const job = curJob(); toast('이미지를 묶는 중…');
    try { const entries = []; for (let i = 0; i < job.stills.length; i++) entries.push([`${String(i + 1).padStart(2, '0')}.jpg`, await db.getBlob(job.stills[i].id)]); await zipDownload(entries, `${job.title}-이미지.zip`); }
    catch (e) { toast(e.message); }
  },
  'copy-path': (el) => copyText(String(getPath(curJob(), el.dataset.path) || '')),
  'copy-insta': () => { const ig = curJob().copy.instagram; copyText(`${ig.caption}\n\n${ig.hashtags.join(' ')}`); },
  'copy-tiktok': () => { const t = curJob().copy.tiktok; copyText(`${t.caption}\n\n${t.hashtags.join(' ')}`); },
  'copy-threads': () => copyText(curJob().copy.threads.join('\n\n---\n\n')),
  'thread-add': () => { const job = curJob(); job.copy.threads.push(''); saveSoon(job); render(); },
  'thread-del': (el) => { const job = curJob(); job.copy.threads.splice(+el.dataset.i, 1); saveSoon(job); render(); },
  'card-theme': (el) => { const job = curJob(); job.cardTheme = el.dataset.v; saveSoon(job); render(); },
  'card-photo': (el) => {
    const job = curJob(); const i = +el.dataset.i;
    const ids = job.stills.map((s) => s.id);
    const cur = ids.indexOf(job.cardImages[i]);
    job.cardImages[i] = ids[(cur + 1) % ids.length];
    if (i === 0) { job.coverId = job.cardImages[0]; job.thumb = job.stills.find((s) => s.id === job.coverId).thumb; }
    saveSoon(job); paintCards(job, i);
  },
  'card-dl': async (el) => { const job = curJob(); const i = +el.dataset.i; downloadBlob(await canvasBlob(await renderCard(job, i), 'image/png'), `${job.title}-카드${i + 1}.png`); },
  'card-add': () => {
    const job = curJob(); const n = job.copy.cards.length;
    job.copy.cards.splice(n - 1, 0, { title: '새 카드 제목', body: '설명을 적어 주세요' });
    job.cardImages.splice(n - 1, 0, job.stills[(n - 1) % job.stills.length].id);
    saveSoon(job); render();
  },
  'card-del': (el) => { const job = curJob(); const i = +el.dataset.i; job.copy.cards.splice(i, 1); job.cardImages.splice(i, 1); saveSoon(job); render(); },
  'cards-zip': async () => {
    const job = curJob(); toast('카드를 저장하는 중…');
    try { const bl = await cardBlobs(job); await zipDownload(bl.map((b, i) => [`${String(i + 1).padStart(2, '0')}.png`, b]), `${job.title}-카드뉴스.zip`); }
    catch (e) { toast(e.message); }
  },
  'cards-share': async () => {
    const job = curJob(); const bl = await cardBlobs(job);
    const files = bl.map((b, i) => new File([b], `card-${i + 1}.png`, { type: 'image/png' }));
    const ig = job.copy.instagram;
    if (!(await shareFiles(files, `${ig.caption}\n\n${ig.hashtags.join(' ')}`))) { toast('이 기기에서는 공유가 안 돼요. 전체 저장을 써 주세요'); }
  },
  'st-set': (el) => {
    const job = curJob(); const kind = current.tab; const k = el.dataset.k;
    job[kind][k] = k === 'length' ? +el.dataset.v : el.dataset.v;
    saveSoon(job); render();
  },
  'studio-play': async (el) => {
    const job = curJob(); const kind = current.tab;
    getAC();
    if (studio.busy) return;
    if (studio.playing) { studio.composer && studio.composer.stop(); return; }
    try {
      el.disabled = true;
      const c = await ensureComposer(job, kind);
      el.disabled = false;
      studio.playing = true; el.innerHTML = `${icon('stop')}정지`;
      const tEl = document.getElementById('stage-time');
      await c.run({ onTime: (t, tot) => { if (tEl) tEl.textContent = `${fmtTime(t)} / ${fmtTime(tot)}`; } });
    } catch (e) { toast(e.message || '재생하지 못했어요'); }
    studio.playing = false; el.disabled = false; el.innerHTML = `${icon('playBtn')}미리보기`;
  },
  'studio-record': async (el) => {
    const job = curJob(); const kind = current.tab;
    getAC();
    if (studio.busy) return;
    if (pickMime() === null) { toast('이 브라우저는 영상 만들기를 지원하지 않아요'); return; }
    if (studio.playing && studio.composer) studio.composer.stop();
    studio.busy = true; el.disabled = true; el.innerHTML = '<span class="spin"></span>준비 중';
    const bar = document.getElementById('rec-progress'); const hint = document.getElementById('rec-hint');
    try {
      const c = await ensureComposer(job, kind);
      bar.hidden = false; el.innerHTML = '<span class="rec-dot"></span>녹화 중';
      const tEl = document.getElementById('stage-time');
      const blob = await c.run({ record: true, onTime: (t, tot) => { bar.firstElementChild.style.width = `${(t / tot) * 100}%`; if (tEl) tEl.textContent = `${fmtTime(t)} / ${fmtTime(tot)}`; } });
      const old = job.outputs[kind];
      const id = uid('v');
      await db.putBlob(id, blob);
      if (old) { await db.deleteBlob(old.id).catch(() => {}); forgetUrl(old.id); }
      job.outputs[kind] = { id, mime: blob.type, sec: c.plan.total, at: Date.now(), size: blob.size };
      await db.putJob(job);
      studio.busy = false;
      toast('영상을 만들었어요');
      render();
      return;
    } catch (e) {
      toast(e.message || '영상을 만들지 못했어요');
      if (hint) hint.textContent = '문제가 생겼어요. 다시 시도해 주세요.';
    }
    studio.busy = false; el.disabled = false; el.innerHTML = `${icon('film')}다시 만들기`; if (bar) bar.hidden = true;
  },
  'video-dl': async (el) => {
    const job = curJob(); const out = job.outputs[el.dataset.kind]; const b = await db.getBlob(out.id);
    downloadBlob(b, `${job.title}-${el.dataset.kind === 'short' ? '세로' : '가로'}.${out.mime.includes('mp4') ? 'mp4' : 'webm'}`);
  },
  'video-share': async (el) => {
    const job = curJob(); const out = job.outputs[el.dataset.kind]; const b = await db.getBlob(out.id);
    const ext = out.mime.includes('mp4') ? 'mp4' : 'webm';
    const ig = job.copy.instagram;
    if (!(await shareFiles([new File([b], `zerocut.${ext}`, { type: out.mime })], `${ig.caption}\n\n${ig.hashtags.join(' ')}`))) toast('이 기기에서는 공유가 안 돼요. 저장을 써 주세요');
  },
  'mic-rec': async (el) => {
    const job = curJob(); const kind = current.tab; const state = document.getElementById('mic-state');
    if (studio.mic) {
      const blob = await studio.mic.stop(); studio.mic = null;
      const id = uid('a'); await db.putBlob(id, blob);
      const o = job[kind];
      if (o.voiceId) { await db.deleteBlob(o.voiceId).catch(() => {}); forgetUrl(o.voiceId); }
      o.voiceId = id; o.voiceSec = await audioDuration(blob).catch(() => 20);
      await db.putJob(job); toast('녹음했어요'); render(); return;
    }
    try {
      studio.mic = await recordMic();
      el.innerHTML = `${icon('stop')}녹음 끝`; if (state) state.innerHTML = '<span class="rec-dot"></span> 녹음 중… 원고를 읽어 주세요';
    } catch (e) { toast('마이크를 쓸 수 없어요. 브라우저에서 마이크 권한을 허용해 주세요'); }
  },
  'ai-voice': async (el) => {
    const job = curJob(); const kind = current.tab; const o = job[kind];
    if (!o.script.trim()) { toast('원고를 먼저 적어 주세요'); return; }
    el.disabled = true; el.innerHTML = '<span class="spin"></span>만드는 중';
    try {
      const blob = settings.geminiKey
        ? await geminiTTS({ key: settings.geminiKey, voice: settings.geminiVoice || 'Kore', text: o.script.trim() })
        : await elevenTTS({ key: settings.elevenKey, voiceId: settings.elevenVoice, text: o.script.trim() });
      const id = uid('a'); await db.putBlob(id, blob);
      if (o.voiceId) { await db.deleteBlob(o.voiceId).catch(() => {}); forgetUrl(o.voiceId); }
      o.voiceId = id; o.voiceSec = await audioDuration(blob);
      await db.putJob(job); toast('AI 목소리를 만들었어요'); render();
    } catch (e) { toast(e.message); el.disabled = false; el.innerHTML = `${icon('sparkle')}AI 목소리 만들기`; }
  },
  'voice-del': async () => {
    const job = curJob(); const o = job[current.tab];
    if (o.voiceId) { await db.deleteBlob(o.voiceId).catch(() => {}); forgetUrl(o.voiceId); }
    o.voiceId = null; o.voiceSec = 0; await db.putJob(job); render();
  },
  'bgm-del': async () => {
    const job = curJob(); const o = job[current.tab];
    if (o.bgmId) { await db.deleteBlob(o.bgmId).catch(() => {}); forgetUrl(o.bgmId); }
    o.bgmId = null; o.bgmName = ''; await db.putJob(job); render();
  },
  'art-add': (el) => {
    const job = curJob(); const a = job.copy.article;
    if (el.dataset.k === 'sections') a.sections.push({ heading: '새 소제목', body: '' }); else a.faq.push({ q: '새 질문', a: '' });
    saveSoon(job); render();
  },
  'art-del': (el) => { const job = curJob(); job.copy.article[el.dataset.k].splice(+el.dataset.i, 1); saveSoon(job); render(); },
  'bl-status': (el) => { const job = curJob(); job.blStatus = el.dataset.v; saveSoon(job); render(); },
  'bl-load-blogs': async (el) => {
    if (!settings.googleClientId) { toast('구글 OAuth 클라이언트 ID를 먼저 넣어 주세요'); return; }
    let tp;
    try { tp = googleToken(); } catch (e) { tp = Promise.reject(e); }
    el.disabled = true;
    try {
      await tp;
      const blogs = await listBlogs();
      if (!blogs.length) { toast('이 구글 계정에 블로그가 없어요. blogger.com에서 먼저 블로그를 만들어 주세요'); }
      else {
        const sel = document.getElementById('blog-sel');
        sel.innerHTML = blogs.map((b) => `<option value="${esc(b.id)}" ${b.id === settings.bloggerBlogId ? 'selected' : ''}>${esc(b.name)}</option>`).join('');
        if (!blogs.some((b) => b.id === settings.bloggerBlogId)) { settings.bloggerBlogId = blogs[0].id; settings.bloggerBlogName = blogs[0].name; }
        settings.bloggerBlogName = (blogs.find((b) => b.id === settings.bloggerBlogId) || blogs[0]).name;
        saveSettings(settings);
        toast(`블로그 ${blogs.length}개를 불러왔어요`);
      }
    } catch (e) {
      toast(e.message);
      if (/준비되지 않았어요/.test(e.message)) prepareGoogle(settings.googleClientId).catch((er) => toast(er.message));
    }
    el.disabled = false;
  },
  'bl-publish': async (el) => {
    const job = curJob(); const a = job.copy.article;
    const draft = job.blStatus !== 'publish';
    let tp;
    try { tp = googleToken(); } catch (e) { tp = Promise.reject(e); }
    if (!draft && !confirm('구글 블로그에 바로 공개 발행할까요?')) return;
    el.disabled = true; el.innerHTML = '<span class="spin"></span>구글 로그인';
    try {
      await tp;
      el.innerHTML = '<span class="spin"></span>글 올리는 중';
      const imgs = await postImages(job);
      const content = articleHtml(a, imgs.slice(1).map((im, i) => ({ placeholder: i + 2, alt: im.alt })), { author: settings.ownerName, biz: job.useBiz ? settings : null, topic: job.topic });
      const lead = `<p style="padding:14px;border:2px dashed #93C5FD;border-radius:10px;color:#1D4ED8">📷 대표 사진(사진 1) 넣는 자리 — 대체 텍스트: "${esc(imgs[0] ? imgs[0].alt : a.focusKeyword)}"</p>\n`;
      const post = await createBlogPost({ blogId: settings.bloggerBlogId, title: a.seoTitle || job.title, content: lead + content, labels: a.tags, draft });
      job.blogger = { ...post, at: Date.now() };
      if (post.status === 'LIVE') job.publish.blogger = Date.now();
      await db.putJob(job);
      toast(post.status === 'LIVE' ? '구글 블로그에 발행했어요' : '구글 블로그에 임시저장했어요');
      render();
    } catch (e) {
      toast(e.message || '구글 블로그에 올리지 못했어요');
      if (/준비되지 않았어요/.test(e.message || '')) prepareGoogle(settings.googleClientId).catch(() => {});
      el.disabled = false; el.innerHTML = `${icon('upload')}다시 올리기`;
    }
  },
  'wp-copy-html': async () => {
    const job = curJob();
    copyText(articleHtml(job.copy.article, [], { author: settings.ownerName, biz: job.useBiz ? settings : null, topic: job.topic }));
  },
  'draft-style': (el) => { draft.style = el.dataset.v; render(); },
  'draft-persp': (el) => { draft.perspective = el.dataset.v; render(); },
  'job-style': (el) => { const job = curJob(); job.style = el.dataset.v; saveSoon(job); render(); },
  'job-persp': (el) => { const job = curJob(); job.perspective = el.dataset.v; saveSoon(job); render(); },
  'card-layout': (el) => { const job = curJob(); job.cardLayout = el.dataset.v; saveSoon(job); render(); },
  rewrite: async (el) => {
    const job = curJob();
    if (!confirm('지금 글을 새 설정으로 다시 쓸까요? 직접 고친 글 내용은 바뀌어요.')) return;
    el.disabled = true; el.innerHTML = '<span class="spin"></span>다시 쓰는 중';
    const keepTitle = job.title;
    try {
      await writeCopy(job, (t) => { el.innerHTML = `<span class="spin"></span>${esc(t)}`; });
      job.title = keepTitle || job.copy.title;
      job.short.script = job.copy.short.narration || job.short.script;
      job.youtube.script = job.copy.short.narration || job.youtube.script;
      job.cardImages = defaultCardImages(job);
      await disposeStudio();
      await db.putJob(job);
      toast(job.copyNotice ? '기본 문구로 다시 썼어요' : '새 스타일로 다시 썼어요');
      render();
    } catch (e) { toast(e.message || '다시 쓰지 못했어요'); el.disabled = false; el.innerHTML = `${icon('sparkle')}이 설정으로 글 다시 쓰기`; }
  },
  'mark-posted': (el) => { const job = curJob(); job.publish[el.dataset.k] = job.publish[el.dataset.k] ? null : Date.now(); saveSoon(job); render(); },
  'load-voices': async () => {
    if (!settings.elevenKey) { toast('ElevenLabs 키를 먼저 넣어 주세요'); return; }
    try {
      const vs = await listElevenVoices(settings.elevenKey);
      const sel = document.getElementById('voice-sel');
      sel.innerHTML = vs.map((v) => `<option value="${esc(v.id)}" ${v.id === settings.elevenVoice ? 'selected' : ''}>${esc(v.name)}</option>`).join('');
      if (vs.length && !vs.some((v) => v.id === settings.elevenVoice)) { settings.elevenVoice = vs[0].id; settings.elevenVoiceName = vs[0].name; saveSettings(settings); }
      toast(`목소리 ${vs.length}개를 불러왔어요`);
    } catch (e) { toast(e.message); }
  },
  'clear-all': async () => {
    if (!confirm('모든 작업과 사진·영상을 이 기기에서 지울까요? 되돌릴 수 없어요.')) return;
    await disposeStudio(); await db.clearAll(); jobs = []; toast('모두 지웠어요'); location.hash = '#/';
  },
};

root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});

let studioTimer;
root.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.draft) { draft[el.dataset.draft] = el.value; return; }
  if (el.dataset.draftCheck) { draft[el.dataset.draftCheck] = el.checked; return; }
  if (el.dataset.set) {
    settings[el.dataset.set] = el.value;
    if (el.dataset.set === 'elevenVoice') settings.elevenVoiceName = el.options[el.selectedIndex].text;
    if (el.dataset.set === 'bloggerBlogId') settings.bloggerBlogName = el.options[el.selectedIndex].text;
    saveSettings(settings); return;
  }
  const job = curJob(); if (!job) return;
  if (el.dataset.bind) {
    setPath(job, el.dataset.bind, el.value);
    const cnt = root.querySelector(`[data-count="${el.dataset.bind}"]`); if (cnt) cnt.textContent = `${el.value.length}자`;
  } else if (el.dataset.bindTags) {
    setPath(job, el.dataset.bindTags, el.value.split(/\s+/).filter(Boolean).map((t) => (t.startsWith('#') ? t : '#' + t)));
  } else if (el.dataset.bindCsv) {
    setPath(job, el.dataset.bindCsv, el.value.split(/[,\n]+/).map((t) => t.trim().replace(/^#/, '')).filter(Boolean));
  } else if (el.dataset.bindLines) {
    setPath(job, el.dataset.bindLines, el.value.split('\n').map((s) => s.trim()).filter(Boolean));
  } else return;
  saveSoon(job);
  if (el.dataset.seo) { clearTimeout(el._s); el._s = setTimeout(() => { const pn = document.getElementById('seo-panel'); if (pn) pn.innerHTML = seoPanel(job); }, 200); }
  if (el.dataset.card != null) { clearTimeout(el._t); el._t = setTimeout(() => paintCards(job, +el.dataset.card), 250); }
  if (el.dataset.studio) { clearTimeout(studioTimer); studioTimer = setTimeout(() => { if (!studio.playing && !studio.busy) studioPoster(job, current.tab); }, 600); }
});

root.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset.jobCheck) { const job = curJob(); if (job) { job[el.dataset.jobCheck] = el.checked; saveSoon(job); } return; }
  if (el.dataset.set && el.tagName === 'SELECT') { settings[el.dataset.set] = el.value; if (el.dataset.set === 'elevenVoice') settings.elevenVoiceName = el.options[el.selectedIndex].text; if (el.dataset.set === 'bloggerBlogId') settings.bloggerBlogName = el.options[el.selectedIndex].text; saveSettings(settings); }
  if (el.dataset.set === 'googleClientId' && el.value.trim()) prepareGoogle(el.value.trim()).catch((er) => toast(er.message));
  if (el.dataset.actChange === 'bgm' && el.files[0]) {
    const job = curJob(); const o = job[current.tab]; const f = el.files[0];
    if (f.size > 40e6) { toast('음악 파일은 40MB 이하로 넣어 주세요'); return; }
    const id = uid('a'); await db.putBlob(id, f);
    if (o.bgmId) { await db.deleteBlob(o.bgmId).catch(() => {}); forgetUrl(o.bgmId); }
    o.bgmId = id; o.bgmName = f.name; await db.putJob(job); render();
  }
});

window.addEventListener('hashchange', render);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && studio.busy) toast('녹화 중에는 화면을 켜 두세요');
});

// ---------- 시작 ----------
(async function boot() {
  try { jobs = await db.allJobs(); }
  catch (e) { jobs = []; root.innerHTML = '<div style="padding:24px">이 브라우저에서는 저장 공간을 쓸 수 없어요. 사생활 보호 모드를 끄거나 다른 브라우저로 열어 주세요.</div>'; return; }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  render();
})();
