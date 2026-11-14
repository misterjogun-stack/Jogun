/* ZeroBalance 오프라인 지원
   - 항상 인터넷에서 새 파일을 먼저 받고(최신 유지), 받은 것을 저장해 둔다.
   - 인터넷이 끊기면 저장해 둔 파일로 연다.
   - 기록(매출·급여)은 여기와 상관없이 브라우저 저장소에 있어요. */
const CACHE='zerobalance-v2';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  const same=u.origin===self.location.origin,font=u.hostname==='cdn.jsdelivr.net';
  if(!same&&!font)return;
  e.respondWith(fetch(r).then(res=>{
    if(res&&(res.ok||res.type==='opaque')){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp))}
    return res;
  }).catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('./index.html'):undefined))));
});
