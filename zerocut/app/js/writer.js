// 글쓰기: 한 번의 분석 결과로 블로그 · 인스타 · 스레드 · 카드뉴스 · 숏폼 자막 · 유튜브 · 틱톡 문구를 만든다.
// 1) AI 연결(Claude API 키) 시: 사진을 직접 보고 씀
// 2) 키가 없을 때: 메모와 주제로 기본 문구를 만듦 (직접 다듬어 쓰는 초안)

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
export function draftWithoutAI({ memo, topic, title, settings, stillCount }) {
  const tp = TOPICS[topic] && topic !== 'auto' ? topic : 'daily';
  const T = TOPICS[tp];
  const f = facts(memo);
  const head = clean(title) || f[0] || T.hook;
  const pro = settings.tone === 'pro';
  const end = (friendly, formal) => (pro ? formal : friendly);
  const points = T.points.map((p, i) => f[i + 1] || p);
  const baseTags = String(settings.baseTags || '').split(/[\s,]+/).filter(Boolean).map((t) => (t.startsWith('#') ? t : '#' + t));
  const memoTags = f.slice(0, 3).map((x) => x.split(' ')[0]).filter((x) => x.length <= 10).map(tagify);
  const hashtags = uniq([...T.tags.map(tagify), ...memoTags, ...baseTags]).slice(0, 15);

  const blogBody = [
    (settings.ownerName ? `안녕하세요, ${settings.ownerName}입니다. ` : '안녕하세요. ')
      + end(`오늘은 "${head}" 이야기를 사진과 함께 정리해 볼게요.`, `오늘은 "${head}"에 대해 사진과 함께 정리합니다.`),
    '',
    ...points.flatMap((p, i) => [
      `## ${i + 1}. ${p}`,
      i === 0 && f.length
        ? end(`${f.join(', ')}. 이번 기록의 핵심이에요.`, `${f.join(', ')}. 이번 기록의 핵심입니다.`)
        : end(`사진 ${Math.min(i + 1, Math.max(1, stillCount))}번째 장면을 보면 바로 느낌이 와요. 이 부분은 직접 한두 줄 덧붙여 주세요.`, `사진 ${Math.min(i + 1, Math.max(1, stillCount))}번째 장면이 이 부분입니다. 구체적인 내용을 한두 줄 덧붙여 주세요.`),
      '',
    ]),
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
      description: [`${head}`, '', ...points.map((p, i) => `${i + 1}. ${p}`), '', T.cta, '', hashtags.slice(0, 8).join(' ')].join('\n'),
    },
    tiktok: { caption: `${head} ${T.hook}`, hashtags: hashtags.slice(0, 6) },
  };
}

// ---------- AI(Claude)로 사진을 직접 보고 쓰기 ----------
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.3.0/+esm';
const MODEL = 'claude-opus-5-5';

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
});

export async function draftWithAI({ memo, topic, title, settings, images, onStatus }) {
  if (!settings.claudeKey) throw new Error('Claude API 키가 없습니다. 브랜드 설정에서 넣어 주세요.');
  onStatus && onStatus('AI 연결 중');
  const { default: Anthropic } = await import(/* webpackIgnore: true */ SDK_URL);
  const client = new Anthropic({ apiKey: settings.claudeKey, dangerouslyAllowBrowser: true });

  const system = [
    '너는 한국어 SNS 콘텐츠 에디터다. 한 번의 촬영 소재(사진과 영상에서 뽑은 장면)를 보고, 여러 채널용 글을 한 번에 만든다.',
    '사진에서 실제로 보이는 것과 사용자의 메모에 있는 사실만 쓴다. 가격, 상호, 위치, 효능처럼 보이지 않는 사실은 지어내지 않는다. 필요한 곳은 [가격 입력] 같은 빈칸으로 남긴다.',
    `말투: ${TONES[settings.tone] || TONES.friendly}. 계정 이름: ${settings.brandName || ''} ${settings.handle || ''}.`,
    '채널별 규칙:',
    '- blog: 네이버 블로그용. 제목은 검색에 걸릴 핵심어 포함. 본문 900~1500자, 소제목 줄은 "## "로 시작, 사진 순서대로 흐름을 만든다.',
    '- instagram.caption: 첫 줄은 멈추게 하는 한 문장, 3~6줄, 마지막에 행동 유도. 해시태그는 caption에 넣지 말고 hashtags 배열(10~15개, # 포함)로.',
    '- threads: 3~5개 이어지는 글, 각 280자 이내, 첫 글이 훅.',
    '- cards: 카드뉴스 6~8장. 첫 장은 표지(title 18자 이내, body는 부제), 중간은 장면별 핵심(title 16자 이내, body 40자 이내), 마지막 장은 저장·팔로우 유도.',
    '- short: 9:16 숏폼. hook은 첫 1.5초에 띄울 14자 이내 문장. lines는 화면 자막 4~6개(각 16자 이내). narration은 25~35초 분량 내레이션 원고. keyword는 강조할 단어 하나.',
    '- youtube: 가로 영상 제목(40자 이내)과 설명(문단 + 해시태그 3~5개).',
    '- tiktok: 짧은 캡션과 해시태그 5~6개.',
    '- topic: 소재의 주제를 하나 고른다.',
  ].join('\n');

  const content = [];
  images.slice(0, 6).forEach((b64, i) => {
    content.push({ type: 'text', text: `장면 ${i + 1}` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } });
  });
  content.push({
    type: 'text',
    text: [
      `메모: ${clean(memo) || '(없음)'}`,
      title ? `원하는 제목: ${clean(title)}` : '',
      topic && topic !== 'auto' ? `주제: ${TOPICS[topic].label}` : '주제: 사진을 보고 판단',
      settings.baseTags ? `항상 넣을 해시태그: ${settings.baseTags}` : '',
    ].filter(Boolean).join('\n'),
  });

  const params = {
    model: MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: 'user', content }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
  };

  onStatus && onStatus('사진을 읽고 글을 쓰는 중');
  let res;
  try {
    // 안전 분류기가 거절하면 다른 모델로 자동으로 다시 시도
    res = await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error('Claude API 키가 맞지 않습니다. 브랜드 설정에서 확인해 주세요.');
    if (err instanceof Anthropic.RateLimitError) throw new Error('요청이 많아 잠시 막혔습니다. 1분 뒤 다시 시도해 주세요.');
    if (err instanceof Anthropic.BadRequestError) {
      res = await client.messages.create(params); // 대체 모델 기능을 쓸 수 없는 계정이면 기본 요청으로
    } else if (err instanceof Anthropic.APIConnectionError) {
      throw new Error('인터넷 연결을 확인해 주세요.');
    } else {
      throw err;
    }
  }
  if (res.stop_reason === 'refusal') throw new Error('AI가 이 소재로는 글을 쓰지 않았습니다. 기본 문구로 만들어 드릴게요.');
  if (res.stop_reason === 'max_tokens') throw new Error('글이 너무 길어 중간에 끊겼습니다. 다시 시도해 주세요.');
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const out = JSON.parse(text);
  out.source = 'ai';
  out.instagram.hashtags = uniq(out.instagram.hashtags.map((t) => (t.startsWith('#') ? t : '#' + t)));
  out.tiktok.hashtags = uniq(out.tiktok.hashtags.map((t) => (t.startsWith('#') ? t : '#' + t)));
  return out;
}
