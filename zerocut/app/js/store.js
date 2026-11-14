// 저장소: 작업 목록과 사진·영상 파일은 이 기기 브라우저(IndexedDB)에, 설정은 localStorage에 둔다.
// 서버로는 아무것도 보내지 않는다. (AI 글쓰기·AI 목소리를 켠 경우에만 해당 서비스로 전송)

const DB_NAME = 'zerocut';
const DB_VER = 1;
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('jobs')) db.createObjectStore('jobs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then((v) => { out = v; });
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('저장 실패'));
  }));
}

const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const db = {
  async allJobs() {
    const list = await tx('jobs', 'readonly', (s) => reqP(s.getAll()));
    return (list || []).sort((a, b) => b.createdAt - a.createdAt);
  },
  getJob: (id) => tx('jobs', 'readonly', (s) => reqP(s.get(id))),
  putJob: (job) => tx('jobs', 'readwrite', (s) => { s.put(job); }),
  async deleteJob(job) {
    const ids = [...(job.media || []).map((m) => m.id), ...(job.stills || []).map((m) => m.id), ...(job.extraMedia || [])];
    await tx('media', 'readwrite', (s) => { ids.forEach((id) => s.delete(id)); });
    await tx('jobs', 'readwrite', (s) => { s.delete(job.id); });
  },
  putBlob: (id, blob) => tx('media', 'readwrite', (s) => { s.put({ id, blob }); }),
  async getBlob(id) {
    const row = await tx('media', 'readonly', (s) => reqP(s.get(id)));
    return row ? row.blob : null;
  },
  deleteBlob: (id) => tx('media', 'readwrite', (s) => { s.delete(id); }),
  async clearAll() {
    await tx('media', 'readwrite', (s) => { s.clear(); });
    await tx('jobs', 'readwrite', (s) => { s.clear(); });
  },
};

// 화면에서 쓸 blob URL 캐시 (같은 파일을 여러 번 만들지 않도록)
const urlCache = new Map();
export async function blobUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const blob = await db.getBlob(id);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urlCache.set(id, u);
  return u;
}
export function forgetUrl(id) {
  const u = urlCache.get(id);
  if (u) { URL.revokeObjectURL(u); urlCache.delete(id); }
}

// ---------- 설정 ----------
const SKEY = 'zerocut_settings';
export const DEFAULT_SETTINGS = {
  ownerName: '조군',
  brandName: 'ZEROCUT',
  handle: '@my_account',
  tone: 'friendly', // friendly | pro | emotional | witty
  baseTags: '',
  cardTheme: 'navy',
  motionStyle: 'clean',
  claudeKey: '',
  elevenKey: '',
  elevenVoice: '',
  wpUrl: '',
  wpUser: '',
  wpPass: '',
  wpStatus: 'draft',
};

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SKEY) || '{}');
    return { ...DEFAULT_SETTINGS, ...raw };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}
export function saveSettings(s) {
  try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) { /* 사생활 보호 모드 등: 이번 방문 동안만 유지 */ }
}

export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
