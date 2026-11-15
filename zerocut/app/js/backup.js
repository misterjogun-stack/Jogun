// 백업 · 다른 기기로 옮기기: 작업과 사진·영상을 파일 하나(.zip)로 묶고, 다른 기기에서 불러온다.
import { db } from './store.js';

const KEY_FIELDS = ['geminiKey', 'claudeKey', 'elevenKey'];

export function blobIdsOf(job, includeVideos = true) {
  const ids = [];
  (job.media || []).forEach((m) => { if (includeVideos || m.kind !== 'video') ids.push(m.id); });
  (job.stills || []).forEach((s) => ids.push(s.id));
  Object.values(job.outputs || {}).forEach((o) => o && o.id && ids.push(o.id));
  ['short', 'youtube'].forEach((k) => { const o = job[k] || {}; if (o.voiceId) ids.push(o.voiceId); if (o.bgmId) ids.push(o.bgmId); });
  return [...new Set(ids)];
}

/** 백업 파일 만들기 → Blob(.zip) */
export async function exportBackup(JSZip, { jobs, settings, includeVideos = true, includeKeys = false, onProgress }) {
  const zip = new JSZip();
  const s = { ...settings };
  if (!includeKeys) KEY_FIELDS.forEach((k) => delete s[k]);
  const outJobs = jobs.map((j) => {
    const c = JSON.parse(JSON.stringify(j));
    if (!includeVideos) c.media.forEach((m) => { if (m.kind === 'video') m.missing = true; });
    return c;
  });
  zip.file('zerocut.json', JSON.stringify({ app: 'ZEROCUT', version: 1, exportedAt: new Date().toISOString(), settings: s, jobs: outJobs }, null, 1));
  const ids = [...new Set(jobs.flatMap((j) => blobIdsOf(j, includeVideos)))];
  for (let i = 0; i < ids.length; i++) {
    const b = await db.getBlob(ids[i]);
    if (b) zip.file(`files/${ids[i]}`, b);
    onProgress && onProgress((i + 1) / ids.length);
  }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' }, (m) => onProgress && onProgress(1 + m.percent / 100));
}

/** 백업 파일 불러오기. 같은 작업이 있으면 더 최근 것을 남긴다 */
export async function importBackup(JSZip, file, { existing = [], onProgress } = {}) {
  let zip;
  try { zip = await JSZip.loadAsync(file); } catch (e) { throw new Error('ZEROCUT 백업 파일이 아니에요'); }
  const meta = zip.file('zerocut.json');
  if (!meta) throw new Error('ZEROCUT 백업 파일이 아니에요');
  const data = JSON.parse(await meta.async('string'));
  if (data.app !== 'ZEROCUT' || !Array.isArray(data.jobs)) throw new Error('ZEROCUT 백업 파일이 아니에요');
  const byId = new Map(existing.map((j) => [j.id, j]));
  const files = Object.keys(zip.files).filter((n) => n.startsWith('files/') && !zip.files[n].dir);
  let done = 0;
  for (const name of files) {
    const id = name.slice(6);
    const blob = await zip.file(name).async('blob');
    await db.putBlob(id, blob);
    onProgress && onProgress(++done / Math.max(1, files.length));
  }
  let added = 0, updated = 0, skipped = 0;
  for (const j of data.jobs) {
    const old = byId.get(j.id);
    if (old && (old.updatedAt || 0) >= (j.updatedAt || 0)) { skipped++; continue; }
    await db.putJob(j);
    if (old) updated++; else added++;
  }
  return { added, updated, skipped, files: files.length, settings: data.settings || null };
}
