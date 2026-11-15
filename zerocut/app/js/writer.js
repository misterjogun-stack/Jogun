// 글쓰기: 한 번의 분석 결과로 블로그 · 인스타 · 스레드 · 카드뉴스 · 숏폼 자막 · 유튜브 · 틱톡 문구를 만든다.
// 1) AI 연결(제미나이 키) 시: 사진을 직접 보고 씀
// 2) 키가 없을 때: 메모와 주제로 기본 문구를 만듦 (직접 다듬어 쓰는 초안)

import { brandOf } from './store.js';

export const TOPICS = {
  auto:    { label: '자동 판별', tags: [] },
  hair:    { label: '헤어·뷰티', tags: ['헤어스타일', '미용실', '헤어디자이너', '머리스타그램'], hook: '이 머리, 이렇게 완성됐어요', cta: '예약·문의는 프로필 링크에서 받아요', points: ['상담에서 고민부터 체크', '모질에 맞춘 시술 설계', '디테일 커트로 라인 정리', '집에서도 쉬운 스타일링 팁'] },
  food:    { label: '맛집·요리', tags: ['맛집', '맛스타그램', '먹스타그램', '맛집추천'], hook: '여긴 저장 필수예요', cta: '같이 갈 사람 태그해 주세요', points: ['첫 입부터 확실한 메인 메뉴', '재방문 각인 사이드', '분위기와 좌석', '가기 전에 알아둘 꿀팁'] },
  travel:  { label: '여행', tags: ['여행', '여행스타그램', '국내여행', '여행코스'], hook: '이번 여행, 이 코스로 끝', cta: '여행 계획 중이라면 저장해 두세요', points: ['첫 번째 들른 곳', '가장 좋았던 순간', '동선과 이동 팁', '다음에 또 간다면'] },
  product: { label: '제품 리뷰', tags: ['내돈내산', '리뷰', '추천템', '언박싱'], hook: '직접 써보고 정리했어요', cta: '궁금한 점은 댓글로 물어봐 주세요', points: ['첫인상과 구성', '실제로 써보니 좋은 점', '아쉬운 점도 솔직하게', '이런 분께 추천해요'] },
  daily:   { label: '일상', tags: ['일상', '데일리', '일상기록', '소소한행복'], hook: '오늘 하루를 기록해요', cta: '여러분의 오늘은 어땠나요?', points: ['오늘의 시작', '기억에 남는 장면', '소소하게 좋았던 것', '하루의 마무리'] },
  space:   { label: '인테리어·공간', tags: ['인테리어', '공간', '홈스타그램', '공간기록'], hook: '공간이 이렇게 바뀌었어요', cta: '공간 고민 있으면 댓글 남겨주세요', points: ['전체 분위기', '포인트가 된 디테일', '동선과 수납', '비용·시간 팁'] },
  fitness: { label: '운동', tags: ['운동', '오운완', '헬스', '운동기록'], hook: '오늘 운동, 이렇게 했어요', cta: '같이 할 사람 저장하고 따라 해요', points: ['오늘의 루틴', '자세 포인트', '세트·횟수 구성', '마무리 스트레칭'] },
  info:    { label: '정보·강의', tags: ['정보', '꿀팁', '공부', '자기계발'], hook: '이것만 알면 됩니다', cta: '필요할 때 꺼내보게 저장해 두세요', points: ['핵심 한 줄 요약', '왜 중요한가', '바로 써먹는 방법', '자주 하는 실수'] },
  pet:     { label: '반려동물', tags: ['반려동물', '멍스타그램', '냥스타그램', '펫스타그램'], hook: '오늘도 귀여움 갱신', cta: '우리 아이 자랑도 댓글로 보여주세요', points: ['오늘의 표정', '가장 좋아하는 것', '함께한 시간', '보호자 꿀팁'] },
};

export const TONES = {
  friendly: '친근한 해요체',
  pro: '전문가답고 신뢰감 있는 합니다체',
  emotional: '감성적이고 차분한 문장',
  witty: '재치 있고 가벼운 말투',
};

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const tagify = (w) => '#' + String(w).replace(/[#\s·,.!?]/g, '');
const uniq = (arr) => [...new Set(arr.filter(Boolean))];

function facts(memo) {
  return String(memo || '').split(/[\n,，、/]+/).map(clean).filter((s) => s.length > 1);
}

// ---------- 키 없이 만드는 기본 문구 ----------
export function draftWithoutAI({ memo, topic, title, settings, stillCount, style = 'story', perspective = 'pro', speech = '' }) {
  const tp = TOPICS[topic] && topic !== 'auto' ? topic : 'daily';
  const T = TOPICS[tp];
  const f = facts(memo);
  const head = clean(title) || f[0] || T.hook;
  const pro = settings.tone === 'pro';
  const end = (friendly, formal) => (pro ? formal : friendly);
  const rawPoints = T.points.map((p, i) => f[i + 1] || p);
  const points = style === 'list' ? rawPoints.map((p, i) => `${i + 1}. ${p}`)
    : style === 'qa' ? rawPoints.map((p) => (/[?？]$/.test(p) ? p : `${p}, 어땠나요?`))
    : rawPoints;
  const guest = perspective === 'guest';
  const baseTags = String(settings.baseTags || '').split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith('#') ? t : '#' + t));
  const memoTags = f.slice(0, 3).map((x) => x.split(' ')[0]).filter((x) => x.length <= 10).map(tagify);
  const hashtags = uniq([...T.tags.map(tagify), ...memoTags, ...baseTags]).slice(0, 15);

  const blogBody = [
    (brandOf(settings) ? `안녕하세요, ${brandOf(settings)}입니다. ` : '안녕하세요. ')
      + (guest
        ? end(`오늘은 "${head}"을(를) 방문한 사람 입장에서 처음부터 끝까지 정리해 볼게요.`, `오늘은 "${head}"을(를) 방문한 사람 입장에서 정리합니다.`)
        : end(`오늘은 "${head}" 이야기를 사진과 함께 정리해 볼게요.`, `오늘은 "${head}"에 대해 사진과 함께 정리합니다.`)),
    '',
    ...points.flatMap((p, i) => [
      `## ${style === 'list' ? p : `${i + 1}. ${p}`}`,
      i === 0 && f.length
        ? end(`${f.join(', ')}. 이번 기록의 핵심이에요.`, `${f.join(', ')}. 이번 기록의 핵심입니다.`)
        : end(`사진 ${Math.min(i + 1, Math.max(1, stillCount))}번째 장면을 보면 바로 느낌이 와요. 이 부분은 직접 한두 줄 덧붙여 주세요.`, `사진 ${Math.min(i + 1, Math.max(1, stillCount))}번째 장면이 이 부분입니다. 구체적인 내용을 한두 줄 덧붙여 주세요.`),
      '',
    ]),
    ...(speech ? ['## 영상 속 설명', String(speech).slice(0, 1500), ''] : []),
    '## 마무리',
    end(`오늘 기록은 여기까지예요. ${T.cta}.`, `이상으로 정리를 마칩니다. ${T.cta}.`),
    '',
    hashtags.join(' '),
  ].join('\n');

  const caption = [
    `${head}`,
    '',
    ...points.slice(0, 3).map((p) => `✔ ${p}`),
    '',
    `${T.cta} 🙌`,
    '',
    hashtags.join(' '),
  ].join('\n');

  const threads = [
    `${head}\n\n${end('짧게 정리해 볼게요 🧵', '짧게 정리합니다 🧵')}`,
    `1/ ${points[0]}${f[0] ? `\n${f[0]}` : ''}`,
    `2/ ${points[1]}\n${points[2]}`,
    `3/ ${points[3]}\n\n${T.cta}`,
  ];

  const cards = [
    { title: head, body: T.hook },
    ...points.map((p, i) => ({ title: p, body: f[i + 1] && f[i + 1] !== p ? f[i + 1] : end('사진과 함께 핵심만 담았어요', '사진과 함께 핵심만 담았습니다') })),
    { title: end('저장해 두고 필요할 때 꺼내보세요', '저장해 두고 필요할 때 확인하세요'), body: T.cta },
  ];

  const lines = [points[0], points[1], points[2], T.cta].map(clean);
  return {
    source: 'basic',
    topic: tp,
    title: head,
    blog: { title: `${head} | ${T.label} 기록`, body: blogBody },
    instagram: { caption, hashtags },
    threads,
    cards,
    short: { hook: head, lines, narration: [head, ...lines].join('. ') + '.', keyword: (f[0] || T.label).split(' ')[0] },
    youtube: {
      title: `${head} | ${T.label}`,
      description: [`${head}`, '', ...points.map((p, i) => (style === 'list' ? p : `${i + 1}. ${p}`)), '', T.cta, '', hashtags.slice(0, 8).join(' ')].join('\n'),
    },
    tiktok: { caption: `${head} ${T.hook}`, hashtags: hashtags.slice(0, 6) },
    article: basicArticle({ head, f, T, points, hashtags, end }),
  };
}

// 구글 블로그용 글: 검색(SEO)과 AI 검색(GEO)에 맞춘 구조 — 맨 앞 요약 답변, 소제목, 자주 묻는 질문
function basicArticle({ head, f, T, points, hashtags, end }) {
  const kw = (f[0] || head).split(' ').slice(0, 3).join(' ');
  const d = new Date();
  const facts = f.filter((x) => x !== head).join(', ');
  return {
    seoTitle: `${head} | ${T.label} 핵심 정리`.slice(0, 60),
    slug: `post-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`,
    metaDescription: (`${head}. ${facts ? facts + '. ' : ''}${points.slice(0, 3).join(', ')}까지 사진과 함께 정리했어요.`).slice(0, 150),
    focusKeyword: kw,
    summary: end(
      `${head}, 핵심부터 말하면 ${facts || points[0]}. 아래에 ${points.slice(0, 3).join(', ')} 순서로 직접 확인한 내용만 정리했어요.`,
      `${head}, 핵심부터 말하면 ${facts || points[0]}. 아래에 ${points.slice(0, 3).join(', ')} 순서로 직접 확인한 내용만 정리했습니다.`),
    sections: points.map((p, i) => ({
      heading: p,
      body: i === 0 && facts
        ? end(`${facts}. ${kw}에서 가장 먼저 알아둘 부분이에요.`, `${facts}. ${kw}에서 가장 먼저 알아둘 부분입니다.`)
        : end('이 부분은 직접 겪은 내용을 두세 문장으로 적어 주세요. 숫자(가격·시간·횟수)가 들어가면 검색과 AI 답변에 더 잘 인용돼요.', '이 부분은 직접 겪은 내용을 두세 문장으로 적어 주세요. 숫자(가격·시간·횟수)가 들어가면 검색과 AI 답변에 더 잘 인용됩니다.'),
    })),
    faq: [
      { q: `${kw} 핵심만 알려주세요`, a: facts ? `${facts}입니다.` : '핵심 내용을 한두 문장으로 적어 주세요.' },
      { q: '어떤 분께 추천하나요?', a: '추천 대상을 한 문장으로 적어 주세요.' },
    ],
    tags: hashtags.slice(0, 8).map((t) => t.replace(/^#/, '')),
  };
}

// ---------- AI(제미나이)로 사진을 직접 보고 쓰기 : 출력 형식 ----------

const str = { type: 'string' };
const strArr = { type: 'array', items: str };
const obj = (props) => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false });

const SCHEMA = obj({
  topic: { type: 'string', enum: Object.keys(TOPICS).filter((k) => k !== 'auto') },
  title: str,
  blog: obj({ title: str, body: str }),
  instagram: obj({ caption: str, hashtags: strArr }),
  threads: strArr,
  cards: { type: 'array', items: obj({ title: str, body: str }) },
  short: obj({ hook: str, lines: strArr, narration: str, keyword: str }),
  youtube: obj({ title: str, description: str }),
  tiktok: obj({ caption: str, hashtags: strArr }),
  article: obj({
    seoTitle: str, slug: str, metaDescription: str, focusKeyword: str, summary: str,
    sections: { type: 'array', items: obj({ heading: str, body: str }) },
    faq: { type: 'array', items: obj({ q: str, a: str }) },
    tags: strArr,
  }),
});

// ---------- 취향 템플릿 · 시점 ----------
export const STYLES = {
  story: { label: '스토리형', desc: '경험을 이야기처럼', rule: '처음-과정-결과 순서의 이야기 흐름으로, 현장감 있게 쓴다.' },
  info: { label: '정보형', desc: '핵심 정보·팁 정리', rule: '정보와 팁을 먼저, 군더더기 없이 정리한다. 목록과 숫자를 적극 쓴다.' },
  review: { label: '후기형', desc: '좋은 점·아쉬운 점', rule: '좋았던 점과 아쉬운 점을 나눠 솔직하게 쓰고, 추천 대상을 분명히 한다.' },
  list: { label: '리스트형', desc: 'TOP N · 체크리스트', rule: '번호를 붙인 목록(예: 꼭 알아둘 5가지) 구조로 쓴다.' },
  qa: { label: 'Q&A형', desc: '질문과 답', rule: '소제목을 사람들이 실제로 묻는 질문으로 하고, 바로 답한다.' },
};

export function perspectiveLabels(topic) {
  return topic === 'hair'
    ? { pro: '디자이너(시술자) 입장', guest: '고객 입장' }
    : { pro: '운영자·만든 사람 입장', guest: '방문자·이용자 입장' };
}

function bizFacts(s) {
  const rows = [
    ['상호', s.bizName], ['주소', s.bizAddress], ['영업시간', s.bizHours], ['전화', s.bizPhone],
    ['예약', s.bizBooking], ['지도', s.bizMap], ['주차', s.bizParking], ['가격 안내', s.bizPrice],
  ].filter(([, v]) => v && String(v).trim());
  return rows.map(([k, v]) => `${k}: ${String(v).trim()}`).join('\n');
}

function buildPrompt({ memo, topic, title, settings, style, perspective, useBiz, speech }) {
  const st = STYLES[style] || STYLES.story;
  const pl = perspectiveLabels(topic);
  const facts = useBiz ? bizFacts(settings) : '';
  const system = [
    '너는 한국어 SNS 콘텐츠 에디터다. 한 번의 촬영 소재(사진과 영상에서 뽑은 장면)를 보고, 여러 채널용 글을 한 번에 만든다.',
    '사진에서 실제로 보이는 것, 사용자의 메모, 아래 매장 정보에 있는 사실만 쓴다. 가격, 상호, 위치, 효능처럼 보이지 않는 사실은 지어내지 않는다. 필요한 곳은 [가격 입력] 같은 빈칸으로 남긴다.',
    `말투: ${TONES[settings.tone] || TONES.friendly}. 매장·계정 이름: ${brandOf(settings)} ${settings.handle || ''}. 글쓴이의 개인 이름은 쓰지 않는다.`,
    `글 스타일: ${st.label} — ${st.rule}`,
    perspective === 'guest'
      ? `시점: ${pl.guest}. 방문한 사람의 경험 흐름(찾아가기→상담·주문→과정→결과)과 처음 오는 사람이 궁금해할 점 중심으로 쓴다. 실제 고객의 말, 별점, 이름을 지어내지 않는다.`
      : `시점: ${pl.pro}. 만든 사람이 직접 과정, 이유, 노하우를 설명하는 전문가 시점으로 쓴다.`,
    '채널별 규칙:',
    '- blog: 네이버 블로그용. 제목은 검색에 걸릴 핵심어 포함. 본문 900~1500자, 소제목 줄은 "## "로 시작, 사진 순서대로 흐름을 만든다.',
    '- instagram.caption: 첫 줄은 멈추게 하는 한 문장, 3~6줄, 마지막에 행동 유도. 해시태그는 caption에 넣지 말고 hashtags 배열(10~15개, # 포함)로.',
    '- threads: 3~5개 이어지는 글, 각 280자 이내, 첫 글이 훅.',
    '- cards: 카드뉴스 6~8장. 첫 장은 표지(title 18자 이내, body는 부제), 중간은 장면별 핵심(title 16자 이내, body 40자 이내), 마지막 장은 저장·팔로우 유도.',
    '- short: 9:16 숏폼. hook은 첫 1.5초에 띄울 14자 이내 문장. lines는 화면 자막 4~6개(각 16자 이내). narration은 25~35초 분량 내레이션 원고. keyword는 강조할 단어 하나.',
    '- youtube: 가로 영상 제목(40자 이내)과 설명(문단 + 해시태그 3~5개).',
    '- tiktok: 짧은 캡션과 해시태그 5~6개.',
    '- article: 구글 블로그(블로거)용 글. 구글·네이버 검색(SEO)과 ChatGPT·퍼플렉시티·구글 AI 요약 같은 AI 검색(GEO)에 인용되기 좋게 쓴다.',
    '  · focusKeyword: 사람들이 실제로 검색할 2~4단어 핵심 검색어 하나(예: "광주 수완지구 미용실 추천"). 매장 주소가 있으면 동네 이름을 넣는다.',
    '  · seoTitle: 60자 이내, 핵심 검색어를 앞쪽에. slug: 영어 소문자와 하이픈 3~6단어.',
    '  · metaDescription: 80~150자, 핵심 검색어 포함, 클릭하고 싶게.',
    '  · summary: 글 맨 앞에 둘 2~3문장 요약 답변. 질문에 바로 답하는 문장으로 시작하고 핵심 검색어와 구체적 사실(숫자·장소·이름)을 담는다.',
    '  · sections: 4~6개. heading은 사람들이 물어볼 법한 질문형이나 핵심어가 든 소제목, body는 3~6문장. 목록이 어울리면 줄마다 "- "로 시작한다.',
    '  · faq: 3~5개. 실제 검색 질문 형태(q)와 1~3문장의 직접적인 답(a).',
    '  · tags: 5~8개, # 없이.',
    '- topic: 소재의 주제를 하나 고른다.',
  ].join('\n');
  const userText = [
    `메모: ${clean(memo) || '(없음)'}`,
    title ? `원하는 제목: ${clean(title)}` : '',
    topic && topic !== 'auto' ? `주제: ${TOPICS[topic].label}` : '주제: 사진을 보고 판단',
    settings.baseTags ? `항상 넣을 해시태그: ${settings.baseTags}` : '',
    facts ? `매장 정보(사실로 써도 됨):\n${facts}` : '',
    speech ? `영상 속에서 직접 한 말(받아쓰기, 사실로 써도 됨. 설명한 표현을 살려서 글과 자막에 써 줘):\n${String(speech).slice(0, 5000)}` : '',
  ].filter(Boolean).join('\n');
  return { system, userText };
}

function finishCopy(out) {
  out.instagram.hashtags = uniq(out.instagram.hashtags.map((t) => (t.startsWith('#') ? t : '#' + t)));
  out.article.tags = uniq(out.article.tags.map((t) => t.replace(/^#/, '')));
  out.tiktok.hashtags = uniq(out.tiktok.hashtags.map((t) => (t.startsWith('#') ? t : '#' + t)));
  return out;
}

/** 제미나이로 사진을 읽고 쓴다 */
export async function draftWithAI(args) {
  const { settings } = args;
  if (!settings.geminiKey) throw new Error('AI 키가 없습니다. 브랜드 설정에서 구글 AI 스튜디오(제미나이) 키를 넣어 주세요.');
  const out = await draftWithGemini(args);
  out.source = 'ai';
  out.engine = 'gemini';
  return finishCopy(out);
}

// ----- 제미나이 (구글 AI 스튜디오 키) -----
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';
export const GEMINI_MODELS = {
  'gemini-flash-latest': '제미나이 플래시 (빠르고 무료 사용량 넉넉)',
  'gemini-pro-latest': '제미나이 프로 (더 꼼꼼하게)',
};

// 제미나이 구조화 출력에 맞게 JSON 스키마를 단순화 (additionalProperties 제거)
function geminiSchema(x) {
  if (Array.isArray(x)) return x.map(geminiSchema);
  if (!x || typeof x !== 'object') return x;
  const o = {};
  for (const [k, v] of Object.entries(x)) if (k !== 'additionalProperties') o[k] = geminiSchema(v);
  return o;
}

async function geminiError(r) {
  const j = await r.json().catch(() => ({}));
  const msg = (j.error && j.error.message) || '';
  if (r.status === 400 && /API key/i.test(msg)) return new Error('제미나이 키가 맞지 않아요. 구글 AI 스튜디오에서 키를 다시 확인해 주세요.');
  if (r.status === 403) return new Error('제미나이 키에 권한이 없어요. 구글 AI 스튜디오에서 새 키를 만들어 주세요.');
  if (r.status === 429) return new Error('제미나이 무료 사용량을 잠시 다 썼어요. 1분 뒤 다시 시도하거나 내일 다시 써 주세요.');
  return new Error(`제미나이 오류 (${r.status}) ${msg}`.trim());
}

async function draftWithGemini({ memo, topic, title, settings, images, onStatus, style, perspective, useBiz, speech }) {
  const { system, userText } = buildPrompt({ memo, topic, title, settings, style, perspective, useBiz, speech });
  const parts = [];
  images.slice(0, 6).forEach((b64, i) => {
    parts.push({ text: `장면 ${i + 1}` });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: b64 } });
  });
  parts.push({ text: userText });
  const model = settings.geminiModel || 'gemini-flash-latest';
  onStatus && onStatus('제미나이가 사진을 읽고 글을 쓰는 중');
  let r;
  try {
    r = await fetch(`${GEMINI_API}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings.geminiKey.trim() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: geminiSchema(SCHEMA), maxOutputTokens: 16000 },
      }),
    });
  } catch (e) { throw new Error('인터넷 연결을 확인해 주세요.'); }
  if (!r.ok) throw await geminiError(r);
  const j = await r.json();
  if (j.promptFeedback && j.promptFeedback.blockReason) throw new Error('제미나이가 이 소재로는 글을 쓰지 않았어요. 기본 문구로 만들어 드릴게요.');
  const c = (j.candidates || [])[0];
  if (!c) throw new Error('제미나이 응답이 비어 있어요. 다시 시도해 주세요.');
  if (c.finishReason === 'MAX_TOKENS') throw new Error('글이 너무 길어 중간에 끊겼어요. 다시 시도해 주세요.');
  if (c.finishReason && !['STOP', 'FINISH_REASON_UNSPECIFIED'].includes(c.finishReason)) throw new Error('제미나이가 이 소재로는 글을 쓰지 않았어요. 기본 문구로 만들어 드릴게요.');
  const text = ((c.content && c.content.parts) || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('');
  return JSON.parse(text);
}

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onload = () => resolve(String(fr.result).split(',')[1]);
  fr.onerror = () => reject(new Error('파일을 읽지 못했어요'));
  fr.readAsDataURL(blob);
});

/** 제미나이 받아쓰기: WAV를 보내 [{start, end, text}]를 받는다 (초 단위) */
export async function geminiTranscribe({ key, model = 'gemini-flash-latest', wav }) {
  const schema = {
    type: 'object',
    properties: { segments: { type: 'array', items: { type: 'object', properties: { start: { type: 'number' }, end: { type: 'number' }, text: { type: 'string' } }, required: ['start', 'end', 'text'] } } },
    required: ['segments'],
  };
  let r;
  try {
    r = await fetch(`${GEMINI_API}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType: 'audio/wav', data: await blobToBase64(wav) } },
          { text: '이 오디오에서 사람이 한 한국어 말을 들리는 그대로 받아 적어 줘. 고치거나 요약하지 말고, 문장 단위로 나눠 각 문장의 시작·끝 시간(초)을 적어. 음악이나 잡음만 있으면 segments를 빈 배열로.' },
        ] }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema },
      }),
    });
  } catch (e) { throw new Error('인터넷 연결을 확인해 주세요.'); }
  if (!r.ok) throw await geminiError(r);
  const j = await r.json();
  const c = (j.candidates || [])[0];
  const text = ((c && c.content && c.content.parts) || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('');
  if (!text) return [];
  const out = JSON.parse(text);
  return (out.segments || []).filter((x) => x.text && x.text.trim()).map((x) => ({ start: Math.max(0, +x.start || 0), end: Math.max(+x.end || 0, (+x.start || 0) + 0.5), text: x.text.trim() }));
}

/** 제미나이 목소리(TTS). WAV Blob을 돌려준다 */
export const GEMINI_VOICES = ['Kore', 'Aoede', 'Leda', 'Zephyr', 'Puck', 'Charon', 'Fenrir', 'Orus'];
export async function geminiTTS({ key, voice = 'Kore', text, model = 'gemini-3.8-flash-tts' }) {
  let r;
  try {
    r = await fetch(`${GEMINI_API}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      }),
    });
  } catch (e) { throw new Error('인터넷 연결을 확인해 주세요.'); }
  if (!r.ok) throw await geminiError(r);
  const j = await r.json();
  const part = (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.find((p) => p.inlineData);
  if (!part) throw new Error('제미나이 목소리를 만들지 못했어요. 다시 시도해 주세요.');
  const { mimeType = '', data } = part.inlineData;
  const bytes = Uint8Array.from(atob(data), (ch) => ch.charCodeAt(0));
  if (/wav/i.test(mimeType) || (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46)) return new Blob([bytes], { type: 'audio/wav' });
  const rate = Number((/rate=(\d+)/.exec(mimeType) || [])[1]) || 24000;
  return pcmToWav(bytes, rate);
}

function pcmToWav(pcm, rate, ch = 1) {
  const h = new DataView(new ArrayBuffer(44));
  const w = (o, str) => { for (let i = 0; i < str.length; i++) h.setUint8(o + i, str.charCodeAt(i)); };
  w(0, 'RIFF'); h.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt ');
  h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, ch, true); h.setUint32(24, rate, true);
  h.setUint32(28, rate * ch * 2, true); h.setUint16(32, ch * 2, true); h.setUint16(34, 16, true);
  w(36, 'data'); h.setUint32(40, pcm.length, true);
  return new Blob([h.buffer, pcm], { type: 'audio/wav' });
}

/** 예전에 만든 작업에 블로그 글이 없으면 기본 구조를 채워 넣는다 */
export function ensureArticle(copy, memo, topic, settings) {
  if (copy.article) return copy.article;
  const base = draftWithoutAI({ memo, topic, title: copy.title, settings, stillCount: 1 });
  copy.article = base.article;
  return copy.article;
}

const plain = (s) => String(s || '').replace(/<[^>]+>/g, '');

/** 상위노출 점검: SEO + GEO 체크리스트 */
export function seoCheck(a, imageCount) {
  const kw = (a.focusKeyword || '').trim();
  const body = [a.summary, ...a.sections.map((x) => x.heading + ' ' + x.body), ...a.faq.map((x) => x.q + ' ' + x.a)].join(' ');
  const len = plain(body).replace(/\s/g, '').length;
  const has = (t) => kw && String(t || '').toLowerCase().includes(kw.toLowerCase());
  const numbers = (body.match(/\d/g) || []).length;
  const items = [
    { ok: !!kw, label: '핵심 검색어를 정했어요', tip: '사람들이 실제로 검색할 2~4단어를 적어 주세요.' },
    { ok: has(a.seoTitle), label: '제목에 핵심 검색어가 있어요', tip: '제목 앞쪽에 핵심 검색어를 넣어 주세요.' },
    { ok: a.seoTitle.length >= 15 && a.seoTitle.length <= 60, label: `제목 길이 적당 (${a.seoTitle.length}자)`, tip: '15~60자가 검색 결과에서 잘리지 않아요.' },
    { ok: a.metaDescription.length >= 60 && a.metaDescription.length <= 160, label: `검색 설명 길이 적당 (${a.metaDescription.length}자)`, tip: '60~160자로 맞춰 주세요.' },
    { ok: has(a.metaDescription), label: '검색 설명에 핵심 검색어가 있어요', tip: '검색 설명에도 핵심 검색어를 한 번 넣어 주세요.' },
    { ok: has(a.summary), label: '맨 앞 요약에 핵심 검색어가 있어요', tip: 'AI 검색은 첫 문단을 가장 많이 인용해요.' },
    { ok: a.sections.length >= 3, label: `소제목 ${a.sections.length}개`, tip: '소제목을 3개 이상 나눠 주세요.' },
    { ok: a.sections.some((x) => has(x.heading)), label: '소제목 중 하나에 핵심 검색어가 있어요', tip: '소제목 하나에 핵심 검색어를 넣어 주세요.' },
    { ok: len >= 800, label: `본문 분량 ${len}자`, tip: '공백 빼고 800자 이상이면 좋아요.' },
    { ok: a.faq.length >= 3, label: `자주 묻는 질문 ${a.faq.length}개`, tip: 'AI 검색은 질문-답 형식을 잘 인용해요. 3개 이상 넣어 주세요.' },
    { ok: numbers >= 3, label: '구체적인 숫자가 들어 있어요', tip: '가격·시간·횟수 같은 숫자는 신뢰도를 높이고 AI 답변에 인용되기 쉬워요.' },
    { ok: imageCount >= 2, label: `이미지 ${imageCount}장 (대체 텍스트 자동)`, tip: '이미지를 2장 이상 넣어 주세요.' },
    { ok: /^[a-z0-9-]{3,80}$/.test(a.slug || ''), label: '주소(slug)가 영어로 깔끔해요', tip: '영어 소문자와 하이픈만 써 주세요.' },
    { ok: !/직접 겪은 내용을|적어 주세요/.test(body), label: '빈칸이 모두 채워졌어요', tip: '"적어 주세요"로 남은 부분을 채워 주세요.' },
  ];
  const score = Math.round((items.filter((i) => i.ok).length / items.length) * 100);
  return { score, items };
}

const escH = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function bodyHtml(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  let html = '', list = [];
  const flush = () => { if (list.length) { html += `<ul>${list.map((l) => `<li>${escH(l)}</li>`).join('')}</ul>`; list = []; } };
  lines.forEach((l) => { if (/^[-•·]\s+/.test(l)) list.push(l.replace(/^[-•·]\s+/, '')); else { flush(); html += `<p>${escH(l)}</p>`; } });
  flush();
  return html;
}

/**
 * 구글 블로그 본문 HTML. images: [{url, alt}] (섹션 사이에 하나씩)
 * 요약 → 소제목별 본문(+이미지) → 자주 묻는 질문 → FAQ 구조화 데이터
 */
export function articleHtml(a, images = [], { author = '', updated = new Date(), biz = null, topic = '' } = {}) {
  const parts = [];
  parts.push(`<p><strong>핵심 요약</strong> ${escH(a.summary)}</p>`);
  a.sections.forEach((sec, i) => {
    parts.push(`<h2>${escH(sec.heading)}</h2>`);
    parts.push(bodyHtml(sec.body));
    const img = images[i];
    if (img && img.url) parts.push(`<figure><img src="${escH(img.url)}" alt="${escH(img.alt)}" loading="lazy" /><figcaption>${escH(img.alt)}</figcaption></figure>`);
    else if (img && img.placeholder) parts.push(`<p style="padding:14px;border:2px dashed #93C5FD;border-radius:10px;color:#1D4ED8">📷 사진 ${img.placeholder} 넣는 자리 — 이 줄을 지우고 사진을 넣은 뒤, 사진 설명(대체 텍스트)에 "${escH(img.alt)}"를 적어 주세요.</p>`);
  });
  if (a.faq.length) {
    parts.push('<h2>자주 묻는 질문</h2>');
    a.faq.forEach((f) => { parts.push(`<h3>${escH(f.q)}</h3>`); parts.push(`<p>${escH(f.a)}</p>`); });
  }
  if (biz && biz.bizName) {
    const rows = [['주소', biz.bizAddress], ['영업시간', biz.bizHours], ['전화', biz.bizPhone], ['주차', biz.bizParking], ['가격 안내', biz.bizPrice]].filter(([, v]) => v);
    const links = [['예약하기', biz.bizBooking], ['지도 보기', biz.bizMap]].filter(([, v]) => v && /^https?:\/\//.test(v));
    parts.push(`<h2>${escH(biz.bizName)} 정보</h2>`);
    parts.push(`<ul>${rows.map(([k, v]) => `<li><strong>${k}</strong> ${escH(v)}</li>`).join('')}</ul>`);
    if (links.length) parts.push(`<p>${links.map(([k, v]) => `<a href="${escH(v)}" target="_blank" rel="noopener">${k}</a>`).join(' · ')}</p>`);
  }
  const d = updated.toISOString().slice(0, 10);
  parts.push(`<p><em>${author ? escH(author) + ' 작성 · ' : ''}${d} 업데이트 · 직접 촬영한 사진과 경험을 바탕으로 썼습니다.</em></p>`);
  if (a.faq.length) {
    const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: a.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
    parts.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`);
  }
  if (biz && biz.bizName) {
    const lb = { '@context': 'https://schema.org', '@type': topic === 'hair' ? 'HairSalon' : topic === 'food' ? 'FoodEstablishment' : 'LocalBusiness', name: biz.bizName };
    if (biz.bizAddress) lb.address = biz.bizAddress;
    if (biz.bizPhone) lb.telephone = biz.bizPhone;
    if (biz.bizHours) lb.openingHours = biz.bizHours;
    const sameAs = [biz.bizMap, biz.bizBooking].filter((v) => v && /^https?:\/\//.test(v));
    if (sameAs.length) lb.sameAs = sameAs;
    parts.push(`<script type="application/ld+json">${JSON.stringify(lb).replace(/</g, '\\u003c')}</script>`);
  }
  return parts.join('\n');
}
