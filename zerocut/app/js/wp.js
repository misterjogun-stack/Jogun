// 워드프레스 발행: 워드프레스 기본 REST API + 응용 프로그램 비밀번호(Application Password)
// 사용자 → 프로필 → "응용 프로그램 비밀번호"에서 만든 값을 씁니다. (로그인 비밀번호 아님)

// 주소 후보: 사용자가 http(s)를 안 붙였으면 https 먼저, 안 되면 http
function siteCandidates(url) {
  let u = String(url || '').trim().replace(/\/(wp-admin|wp-login\.php|wp-json).*$/i, '').replace(/\/+$/, '');
  if (!u) throw new Error('워드프레스 주소를 넣어 주세요');
  if (/^https?:\/\//i.test(u)) return [u];
  return ['https://' + u, 'http://' + u];
}

function authHeader(user, pass) {
  const raw = `${String(user).trim()}:${String(pass).replace(/\s+/g, '')}`;
  return 'Basic ' + btoa(unescape(encodeURIComponent(raw)));
}

export class WordPress {
  constructor({ url, user, pass }) {
    this.sites = siteCandidates(url);
    this.site = this.sites[0];
    this.auth = authHeader(user, pass);
    this.mode = null; // 'pretty' (/wp-json/...) 또는 'query' (?rest_route=...)
  }

  endpoint(path) {
    return this.mode === 'query'
      ? `${this.site}/?rest_route=/wp/v2${path.replace('?', '&')}`
      : `${this.site}/wp-json/wp/v2${path}`;
  }

  async req(path, opts = {}) {
    const headers = { Authorization: this.auth, ...(opts.headers || {}) };
    let r;
    try {
      r = await fetch(this.endpoint(path), { ...opts, headers });
    } catch (e) {
      throw new Error('워드프레스에 연결하지 못했어요. 주소를 확인하거나, 보안 플러그인이 외부 연결(REST API)을 막고 있는지 확인해 주세요.');
    }
    if (r.status === 401 || r.status === 403) {
      const j = await r.json().catch(() => ({}));
      throw new Error(`권한이 없어요 (${j.code || r.status}). 사용자 이름과 응용 프로그램 비밀번호를 확인해 주세요.`);
    }
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      const e = new Error(j.message ? `워드프레스 오류: ${j.message}` : `워드프레스 오류 (${r.status})`);
      e.status = r.status;
      throw e;
    }
    try { return await r.json(); }
    catch (err) { const e = new Error('워드프레스 응답이 아니에요'); e.status = 404; throw e; }
  }

  async detect() {
    if (this.mode) return;
    for (const site of this.sites) {
      this.site = site;
      for (const m of ['pretty', 'query']) {
        this.mode = m;
        try { await this.req('/users/me?context=edit'); return; } catch (e) { if (e.status !== 404 && !/연결하지 못했어요/.test(e.message)) { this.mode = null; throw e; } }
      }
    }
    this.mode = null;
    throw new Error('워드프레스 REST API를 찾지 못했어요. 주소가 워드프레스 사이트인지 확인해 주세요.');
  }

  async me() {
    await this.detect();
    return this.req('/users/me?context=edit');
  }

  async uploadImage(blob, filename, alt) {
    await this.detect();
    const media = await this.req('/media', {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'image/jpeg', 'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"` },
      body: blob,
    });
    if (alt) {
      await this.req(`/media/${media.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alt_text: alt, caption: alt }) }).catch(() => {});
    }
    return { id: media.id, url: media.source_url };
  }

  async tagIds(names) {
    await this.detect();
    const ids = [];
    for (const name of names.slice(0, 10)) {
      const n = String(name).trim(); if (!n) continue;
      const found = await this.req(`/tags?search=${encodeURIComponent(n)}&per_page=20`).catch(() => []);
      const hit = found.find((t) => t.name === n);
      if (hit) { ids.push(hit.id); continue; }
      try {
        const t = await this.req('/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }) });
        ids.push(t.id);
      } catch (e) { /* 태그 권한이 없으면 건너뜀 */ }
    }
    return ids;
  }

  async createPost({ title, content, excerpt, slug, status, tags, featured }) {
    await this.detect();
    const body = { title, content, excerpt, slug, status, tags, ...(featured ? { featured_media: featured } : {}) };
    return this.req('/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }
}
