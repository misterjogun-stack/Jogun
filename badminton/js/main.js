// 화면 조작, 점수판, 입력(카메라·마우스·키보드)을 묶고 매 프레임 경기를 진행한다.
import { Match, DT, SHOT_NAME } from "./game.js";
import { PoseTracker } from "./tracking.js";
import { sfx, initAudio, setVolume, haptic } from "./audio.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem("hbad_" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("hbad_" + k, JSON.stringify(v)); } catch {} },
};
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
const QUAL = {
  high: { dpr: 2, bloom: true, reflect: true, shadows: 2048, crowd: 0.9 },
  mid: { dpr: 1.5, bloom: true, reflect: false, shadows: 1024, crowd: 0.6 },
  low: { dpr: 1, bloom: false, reflect: false, shadows: 0, crowd: 0.35 },
};
const opts = {
  name: store.get("name", "JOGUN"), diff: store.get("diff", "easy"), points: store.get("points", 11), games: store.get("games", 1),
  hand: store.get("hand", "right"), sens: store.get("sens", 1), quality: store.get("quality", "auto"), vol: store.get("vol", 1),
  pip: store.get("pip", "m"), ui: store.get("ui", "m"), shake: store.get("shake", "on"),
};
setVolume(opts.vol);
let tracker = null;
// 화면 크기: 카메라 화면 크기, 글자·버튼 크기
function applyLayout() {
  document.body.dataset.pip = opts.pip;
  document.body.dataset.ui = opts.ui;
  requestAnimationFrame(() => { if (tracker) sizePip(); });
}
applyLayout();

const FLAG = {
  KOR: `<svg viewBox="0 0 36 24"><rect width="36" height="24" fill="#fff"/><g transform="rotate(-33.7 18 12)"><circle cx="18" cy="12" r="6" fill="#0047a0"/><path d="M12 12a6 6 0 0 1 12 0a3 3 0 0 1-6 0a3 3 0 0 0-6 0z" fill="#cd2e3a"/></g><g fill="#000"><g transform="rotate(-56.3 7 6)"><rect x="4" y="4.6" width="6" height="0.8"/><rect x="4" y="5.8" width="6" height="0.8"/><rect x="4" y="7" width="6" height="0.8"/></g><g transform="rotate(56.3 29 6)"><rect x="26" y="4.6" width="2.6" height="0.8"/><rect x="29.4" y="4.6" width="2.6" height="0.8"/><rect x="26" y="5.8" width="6" height="0.8"/><rect x="26" y="7" width="2.6" height="0.8"/><rect x="29.4" y="7" width="2.6" height="0.8"/></g><g transform="rotate(56.3 7 18)"><rect x="4" y="16.6" width="6" height="0.8"/><rect x="4" y="17.8" width="2.6" height="0.8"/><rect x="7.4" y="17.8" width="2.6" height="0.8"/><rect x="4" y="19" width="6" height="0.8"/></g><g transform="rotate(-56.3 29 18)"><rect x="26" y="16.6" width="2.6" height="0.8"/><rect x="29.4" y="16.6" width="2.6" height="0.8"/><rect x="26" y="17.8" width="2.6" height="0.8"/><rect x="29.4" y="17.8" width="2.6" height="0.8"/><rect x="26" y="19" width="2.6" height="0.8"/><rect x="29.4" y="19" width="2.6" height="0.8"/></g></g></svg>`,
  JPN: `<svg viewBox="0 0 36 24"><rect width="36" height="24" fill="#fff"/><circle cx="18" cy="12" r="7.2" fill="#bc002d"/></svg>`,
};
$("flagMe").innerHTML = FLAG.KOR; $("flagAi").innerHTML = FLAG.JPN;

// ── 3D 세계 ──
const loading = $("loading");
let World;
try { ({ World } = await import("./world.js")); }
catch (e) { loading.textContent = "3D 화면을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요."; throw e; }
const qName = opts.quality === "auto" ? (isMobile ? "mid" : "high") : opts.quality;
let world;
try { world = new World($("gl"), QUAL[qName]); }
catch (e) { loading.textContent = "이 기기에서는 3D 화면을 켤 수 없어요. 화질을 '낮음'으로 바꾸거나 다른 브라우저로 열어 주세요."; throw e; }
world.setPlayerName(opts.name);

// ── 경기 ──
let pointerAim = 0.5, paused = true, timeScale = 1;
const matchOpts = { diff: opts.diff, points: opts.points, games: opts.games, getAim: () => match.auto ? (match.autoAim ?? 0.5) : tracker && tracker.visible(performance.now() / 1000) ? tracker.aim : pointerAim };
const match = new Match(matchOpts, onEvent);
match.placeForServe("me", true);

// ── 화면 글자 ──
const floaters = [];
function floater(pos, text, color, size = 1) {
  const el = document.createElement("div");
  el.className = "floater"; el.textContent = text; el.style.color = color; el.style.fontSize = `${2 * size}rem`;
  $("floaters").appendChild(el);
  floaters.push({ el, pos: { ...pos }, life: 1.1 });
}
function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.life -= dt;
    if (f.life <= 0) { f.el.remove(); floaters.splice(i, 1); continue; }
    const s = world.toScreen({ x: f.pos.x, y: f.pos.y + 0.35 + (1.1 - f.life) * 0.5, z: f.pos.z });
    f.el.style.left = s.x + "px"; f.el.style.top = s.y + "px"; f.el.style.opacity = Math.min(1, f.life * 2);
    f.el.hidden = !s.on;
  }
}
let bannerTimer = null;
function banner(k, v, s, who, ms = 1500) {
  const b = $("banner");
  $("bannerK").textContent = k; $("bannerV").textContent = v; $("bannerS").textContent = s || "";
  $("bannerK").hidden = !k;
  b.className = (who === "ai" ? "ai " : "") + "show";
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => (b.className = who === "ai" ? "ai" : ""), ms);
}
function nameOf(s) { return s === "me" ? opts.name : "KENTA"; }
function updateScore() {
  $("ptMe").textContent = match.score.me; $("ptAi").textContent = match.score.ai;
  $("rowMe").classList.toggle("lead", match.score.me > match.score.ai);
  $("rowAi").classList.toggle("lead", match.score.ai > match.score.me);
  $("rowMe").classList.toggle("serving", match.server === "me");
  $("rowAi").classList.toggle("serving", match.server === "ai");
  $("setNo").textContent = `SET ${match.gameNo}`;
  $("setScore").textContent = `${match.games.me} - ${match.games.ai}`;
  $("nameMe").textContent = opts.name;
}
let shotTimer = null;
function flashShot(type) {
  const map = { smash: "smash", clear: "clear", lift: "clear", long: "clear", drop: "drop", net: "drop", short: "drop", drive: null };
  const k = map[type];
  document.querySelectorAll(".shot").forEach((el) => el.classList.toggle("on", el.dataset.shot === k));
  clearTimeout(shotTimer); shotTimer = setTimeout(() => document.querySelectorAll(".shot").forEach((el) => el.classList.remove("on")), 900);
}
const REASON = { OUT: "아웃", NET: "네트에 걸렸어요", IN: "코트 안에 떨어졌어요" };

function onEvent(type, d) {
  switch (type) {
    case "countdown":
      banner("", "READY", "", "me", 850); sfx.whistle();
      setTimeout(() => { if (match.phase !== "idle") banner("", "PLAY!", "", "me", 700); }, 900);
      updateScore(); break;
    case "swing": sfx.swoosh(d.power || 1); break;
    case "hit": {
      world.hitFx(d.pos, d.by, d.type);
      const smash = d.type === "smash", mine = d.by === "me";
      sfx.hit({ power: Math.min(1, 0.45 + d.speed / 260), smash, x: d.pos.x, far: !mine });
      // 타격감: 아주 짧게 멈춤(히트 스톱) + 화면 흔들림 + 번쩍임 + 진동
      if (mine || smash) {
        hitStop = smash ? 0.11 : mine ? 0.05 : 0;
        if (opts.shake === "on") world.shake = Math.max(world.shake, smash ? 0.45 : 0.14);
        if (smash) flash(mine ? "lime" : "red");
        haptic(smash ? [30, 20, 50] : 18);
      }
      $("speedVal").textContent = Math.round(d.speed);
      if (d.by === "me") {
        flashShot(d.type);
        floater(d.pos, d.type === "smash" ? `SMASH ${Math.round(d.speed)} km/h` : SHOT_NAME[d.type], d.type === "smash" ? "#d8ff6a" : "#ffffff", d.type === "smash" ? 1.15 : 0.9);
      } else if (d.type === "smash") floater(d.pos, "SMASH!", "#ff8094", 1);
      break;
    }
    case "perfect": floater({ ...d.pos, y: d.pos.y + 0.55 }, "PERFECT!", "#7cc4ff", 0.95); sfx.perfect(); break;
    case "land":
      sfx.land(d.x, d.z > 6.7);
      if (!d.net) { world.landMark(d.x, d.z, d.in); floater({ x: d.x, y: 0.1, z: d.z }, d.in ? "IN" : "OUT", d.in ? "#8dffb0" : "#ff8094", 0.9); }
      break;
    case "net": sfx.net(); break;
    case "outcall": floater({ ...match.sh.p, y: 1.4 }, "OUT? 그냥 둬요", "#ffb4c0", 0.75); break;
    case "point": {
      updateScore();
      const mine = d.winner === "me";
      world.cheer = mine ? 1.6 : 0.7;
      sfx.point(mine); if (mine) sfx.cheer(d.gameWon ? 1.4 : 1); else sfx.aww();
      const k = d.matchWon ? "MATCH" : d.gameWon ? "GAME" : "POINT";
      banner(k, nameOf(d.winner), REASON[d.reason] || "", d.winner, d.gameWon ? 2200 : 1500);
      if (!d.gameWon) {
        const mp = Math.max(match.score.me, match.score.ai) === match.opts.points - 1;
        if (mp) setTimeout(() => { if (match.phase === "point") banner("", match.games.me + match.games.ai + 1 >= match.opts.games || match.opts.games === 1 ? "MATCH POINT" : "GAME POINT", "", "me", 1000); }, 1550);
      }
      break;
    }
    case "newgame": updateScore(); banner("", `SET ${d.gameNo}`, "", "me", 1200); sfx.whistle(); break;
    case "serve": updateScore(); break;
    case "match": endMatch(d.winner); break;
  }
}

// ── 안내 문구와 기술 카드 ──
let lastHint = "";
function updateHint(nowS) {
  let h = "";
  const camOn = !!tracker;
  const sh = match.sh;
  if (paused || match.phase === "idle") h = "";
  else if (camOn && !tracker.visible(nowS)) h = "상체와 팔이 카메라에 다 보이게 서 주세요";
  else if (match.phase === "serve" && match.server === "me") h = "팔을 휘둘러 서브! 위로 크게 휘두르면 롱 서브";
  else if (match.phase === "serve") h = "KENTA가 서브해요";
  else if (match.phase === "rally" && sh.lastHitter === "ai") h = sh.willOut ? "밖으로 나가는 공이에요. 치지 말고 그냥 둬요" : match.hittableByMe() ? "지금 휘둘러요!" : "셔틀콕이 다가오면 휘둘러요";
  if (h !== lastHint) { lastHint = h; $("hint").textContent = h; $("hint").hidden = !h; }
  const ready = !paused && (match.hittableByMe() || (match.phase === "serve" && match.server === "me"));
  document.querySelectorAll(".shot").forEach((el) => el.classList.toggle("ready", ready));
}

// ── 입력 ──
function doSwing(sw) { if (paused) return; initAudio(); match.swing(sw); }
const forced = { smash: { dirX: 0, dirY: 1, power: 2 }, clear: { dirX: 0, dirY: -1, power: 2 }, drop: { dirX: 0, dirY: 0, power: 1.1 } };
document.querySelectorAll(".shot").forEach((el) => el.addEventListener("click", (e) => { e.stopPropagation(); doSwing({ ...forced[el.dataset.shot], force: el.dataset.shot }); }));
const gl = $("gl");
const phist = [];
let lastPointerSwing = -9;
gl.addEventListener("pointermove", (e) => {
  const t = performance.now() / 1000;
  pointerAim = e.clientX / innerWidth;
  if (tracker && tracker.visible(t)) return;
  phist.push({ t, x: e.clientX / innerHeight, y: e.clientY / innerHeight });
  while (phist.length && t - phist[0].t > 0.25) phist.shift();
  const cur = phist[phist.length - 1];
  let old = phist[0];
  for (const s of phist) if (cur.t - s.t <= 0.09) { old = s; break; }
  const dt = cur.t - old.t;
  if (dt < 0.025) return;
  const vx = (cur.x - old.x) / dt, vy = (cur.y - old.y) / dt, sp = Math.hypot(vx, vy);
  if (sp > 1.3 && t - lastPointerSwing > 0.38) { lastPointerSwing = t; doSwing({ dirX: vx / sp, dirY: vy / sp, power: sp / 1.3 }); }
});
gl.addEventListener("pointerdown", (e) => {
  initAudio();
  pointerAim = e.clientX / innerWidth;
  const t = performance.now() / 1000;
  setTimeout(() => { if (t - lastPointerSwing > 0.2) { lastPointerSwing = t; doSwing({ ...forced.clear }); } }, 70);
});
window.addEventListener("keydown", (e) => {
  if (e.repeat || e.target.tagName === "INPUT") return;
  const map = { Space: "clear", KeyX: "smash", KeyZ: "drop" };
  if (map[e.code]) { e.preventDefault(); doSwing({ ...forced[map[e.code]], force: map[e.code] }); }
  if (e.code === "Escape" && !paused) pause();
});

// ── 메뉴 ──
function bindSeg(id, key, after) {
  const el = $(id);
  const sync = () => el.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(opts[key]))));
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const raw = b.dataset.v;
    opts[key] = isNaN(Number(raw)) ? raw : Number(raw);
    store.set(key, opts[key]); sync(); after && after();
  });
  sync();
  syncers.push(sync);
  return sync;
}
const syncers = [];
bindSeg("diffSeg", "diff"); bindSeg("ptsSeg", "points"); bindSeg("gamesSeg", "games"); bindSeg("handSeg", "hand");
const syncSens2 = bindSeg("sensSeg2", "sens", () => { syncSens(); if (tracker) tracker.opts.sens = opts.sens; });
const syncSens = bindSeg("sensSeg", "sens", () => { syncSens2(); if (tracker) tracker.opts.sens = opts.sens; });
bindSeg("qualSeg", "quality", () => location.reload());
for (const id of ["volSeg", "volSeg2"]) bindSeg(id, "vol", () => { setVolume(opts.vol); syncAll(); initAudio(); sfx.hit({ power: 0.8 }); });
for (const id of ["pipSeg", "pipSeg2"]) bindSeg(id, "pip", () => { applyLayout(); syncAll(); });
for (const id of ["uiSeg", "uiSeg2"]) bindSeg(id, "ui", () => { applyLayout(); syncAll(); });
bindSeg("shakeSeg2", "shake");
function syncAll() { syncers.forEach((f) => f()); }
// 전체 화면 (지원하는 브라우저에서만 보인다)
const fsOk = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
for (const id of ["fsBtn", "fsBtn2"]) {
  const b = $(id); if (!b) continue;
  b.hidden = !fsOk;
  b.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else await (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
    } catch {}
  });
}
$("pipSize").addEventListener("click", (e) => { e.stopPropagation(); const order = ["s", "m", "l"]; opts.pip = order[(order.indexOf(opts.pip) + 1) % 3]; store.set("pip", opts.pip); applyLayout(); syncAll(); });
$("nameInput").value = opts.name;

function begin() {
  const nm = ($("nameInput").value || "JOGUN").trim().toUpperCase().slice(0, 10) || "JOGUN";
  if (nm !== opts.name) { opts.name = nm; store.set("name", nm); world.setPlayerName(nm); }
  Object.assign(matchOpts, { diff: opts.diff, points: opts.points, games: opts.games });
  if (tracker) { tracker.opts.hand = opts.hand; tracker.opts.sens = opts.sens; }
  $("startOverlay").hidden = true; $("overOverlay").hidden = true;
  paused = false;
  sfx.ambience(true);
  match.start();
  updateScore();
  if (innerHeight > innerWidth) setTimeout(() => banner("", "", "휴대폰을 가로로 돌려 세우면 더 넓게 보여요", "me", 2600), 2600);
}
function sizePip() {
  const c = $("pip"), r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
}
$("startCam").addEventListener("click", async () => {
  initAudio();
  const btn = $("startCam"), msg = $("startMsg");
  btn.disabled = true;
  try {
    if (!tracker) {
      const t = new PoseTracker($("cam"), { hand: opts.hand, sens: opts.sens });
      await t.start((m) => (msg.textContent = m));
      tracker = t;
      $("pipBox").hidden = false; document.body.classList.add("cam"); sizePip();
    }
    msg.textContent = "";
    begin();
  } catch (e) { msg.textContent = e.message || "카메라를 켜지 못했어요."; }
  btn.disabled = false;
});
$("startMouse").addEventListener("click", () => { initAudio(); begin(); });
function pause() { if (match.phase === "idle") return; paused = true; sfx.ambience(false); $("pauseOverlay").hidden = false; }
$("pauseBtn").addEventListener("click", (e) => { e.stopPropagation(); pause(); });
$("resumeBtn").addEventListener("click", () => { $("pauseOverlay").hidden = true; paused = false; sfx.ambience(true); last = performance.now(); });
$("restartBtn").addEventListener("click", () => { $("pauseOverlay").hidden = true; match.phase = "idle"; paused = true; match.placeForServe("me", true); $("startOverlay").hidden = false; });
$("againBtn").addEventListener("click", () => { $("overOverlay").hidden = true; begin(); });
$("menuBtn").addEventListener("click", () => { $("overOverlay").hidden = true; $("startOverlay").hidden = false; });
document.addEventListener("visibilitychange", () => { if (document.hidden && !paused) pause(); });

function endMatch(winner) {
  paused = true;
  const win = winner === "me";
  $("overTitle").textContent = win ? "YOU WIN!" : "KENTA WINS";
  const one = match.opts.games === 1;
  $("finMe").textContent = one ? match.score.me : match.games.me;
  $("finAi").textContent = one ? match.score.ai : match.games.ai;
  $("stRally").textContent = match.stats.longest;
  $("stSmash").textContent = match.stats.smashes;
  $("stSpeed").textContent = Math.round(match.stats.topSpeed);
  $("stPerfect").textContent = match.stats.perfects;
  $("overOverlay").hidden = false;
  sfx.ambience(false);
  if (win) { world.cheer = 2.2; sfx.cheer(1.6); }
}

// ── 크기와 루프 ──
function resize() { world.resize(innerWidth, innerHeight); if (tracker) sizePip(); }
window.addEventListener("resize", resize);
resize();
let last = performance.now(), acc = 0, firstFrame = true, hitStop = 0;
const prevMove = { me: { lunge: 0, speed: 0 }, ai: { lunge: 0, speed: 0 } };
let flashTimer = null;
function flash(kind) {
  const f = $("flash"); f.className = "show " + kind;
  clearTimeout(flashTimer); flashTimer = setTimeout(() => (f.className = ""), 90);
}
// 운동화 끽 소리: 런지를 시작하거나 빠르게 달리다 멈출 때
function footsteps() {
  for (const side of ["me", "ai"]) {
    const e = match.ent(side), pv = prevMove[side];
    if ((e.lunge > 0.35 && pv.lunge <= 0.35) || (pv.speed > 3 && e.speed < 1.2)) sfx.squeak(e.x, side === "ai");
    pv.lunge = e.lunge; pv.speed = e.speed;
  }
}
function frame(now) {
  const nowS = now / 1000, dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (tracker) { const sw = tracker.detect(nowS); if (sw) doSwing(sw); }
  if (hitStop > 0) hitStop -= dt;
  else if (!paused) {
    acc += dt * timeScale;
    let n = 0;
    while (acc >= DT && n < 2400 && hitStop <= 0) { match.step(); acc -= DT; n++; }
    footsteps();
  }
  const arm = tracker && tracker.visible(nowS) ? tracker.arm : null;
  world.update(match, dt, nowS, arm);
  world.render();
  if (tracker) tracker.drawPip($("pip").getContext("2d"), $("pip").width, $("pip").height);
  updateFloaters(dt);
  updateHint(nowS);
  if (firstFrame) { firstFrame = false; loading.hidden = true; }
  requestAnimationFrame(frame);
}
updateScore();
requestAnimationFrame(frame);

// 자동 점검용
window.bTest = {
  auto(on, skill = 1) { match.auto = on; match.autoSkill = skill; },
  speed(n) { timeScale = n; },
  state: () => ({ phase: match.phase, me: match.score.me, ai: match.score.ai, games: { ...match.games }, rally: match.rally, stats: { ...match.stats }, sh: match.sh.state, hitter: match.sh.lastHitter, ft: match.sh.flightT }),
  swing: (sw) => doSwing(sw),
  begin: () => begin(),
};
