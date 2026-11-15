// 구글 블로그(Blogger) 발행: Blogger API v3 + 구글 로그인(Google Identity Services)
// 처음 한 번, 구글 클라우드 콘솔에서 무료 'OAuth 클라이언트 ID'(웹 애플리케이션)를 만들어 브랜드 설정에 넣습니다.
// 로그인 창은 사용자가 버튼을 누를 때 열리고, 받은 접근 권한은 이 화면에만 잠시 보관합니다(저장하지 않음).

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SCOPE = 'https://www.googleapis.com/auth/blogger';
const API = 'https://www.googleapis.com/blogger/v3';

let gisP = null;
export function loadGoogle() {
  if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
  if (!gisP) {
    gisP = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GIS_SRC; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { gisP = null; reject(new Error('구글 로그인 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.')); };
      document.head.appendChild(s);
    });
  }
  return gisP;
}

let client = null, clientFor = '', token = '', tokenExp = 0, pending = null;

/** 구글 블로그 화면을 열 때 미리 준비 (버튼을 누르는 순간 바로 로그인 창이 뜨도록) */
export async function prepareGoogle(clientId) {
  if (!clientId) return false;
  await loadGoogle();
  if (client && clientFor === clientId) return true;
  client = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId.trim(),
    scope: SCOPE,
    callback: (r) => {
      const p = pending; pending = null;
      if (!p) return;
      if (r.error) p.reject(new Error(r.error === 'access_denied' ? '구글 블로그 권한을 허용하지 않았어요.' : `구글 로그인 오류: ${r.error}`));
      else { token = r.access_token; tokenExp = Date.now() + (Number(r.expires_in) || 3600) * 1000 - 60000; p.resolve(token); }
    },
    error_callback: (e) => {
      const p = pending; pending = null;
      if (p) p.reject(new Error(e && e.type === 'popup_closed' ? '로그인 창이 닫혔어요.' : e && e.type === 'popup_failed_to_open' ? '팝업이 막혔어요. 브라우저에서 이 사이트의 팝업을 허용해 주세요.' : '구글 로그인에 실패했어요.'));
    },
  });
  clientFor = clientId;
  return true;
}

/** 버튼 클릭 안에서 동기적으로 호출해야 팝업이 막히지 않습니다 */
export function googleToken() {
  if (token && Date.now() < tokenExp) return Promise.resolve(token);
  if (!client) return Promise.reject(new Error('구글 로그인이 아직 준비되지 않았어요. 잠시 뒤 다시 눌러 주세요.'));
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    client.requestAccessToken({ prompt: token ? '' : 'consent' });
  });
}

async function call(path, opts = {}) {
  const t = await googleToken();
  let r;
  try {
    r = await fetch(API + path, { ...opts, headers: { Authorization: `Bearer ${t}`, ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) } });
  } catch (e) { throw new Error('구글 블로그에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'); }
  if (r.status === 401) { token = ''; throw new Error('구글 로그인이 만료됐어요. 다시 눌러 주세요.'); }
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    const msg = (j.error && j.error.message) || r.status;
    if (r.status === 403) throw new Error(`권한이 없어요: ${msg}. 구글 클라우드에서 Blogger API를 켰는지 확인해 주세요.`);
    throw new Error(`구글 블로그 오류: ${msg}`);
  }
  return r.json();
}

export async function listBlogs() {
  const j = await call('/users/self/blogs');
  return (j.items || []).map((b) => ({ id: b.id, name: b.name, url: b.url }));
}

export async function createBlogPost({ blogId, title, content, labels, draft = true }) {
  const post = await call(`/blogs/${encodeURIComponent(blogId)}/posts?isDraft=${draft ? 'true' : 'false'}`, {
    method: 'POST',
    body: JSON.stringify({ kind: 'blogger#post', title, content, labels: (labels || []).slice(0, 20) }),
  });
  return { id: post.id, url: post.url, status: post.status || (draft ? 'DRAFT' : 'LIVE'), blogId };
}

/** 블로거 편집 화면 주소 */
export const bloggerEditUrl = (blogId, postId) => `https://www.blogger.com/blog/post/edit/${blogId}/${postId}`;
