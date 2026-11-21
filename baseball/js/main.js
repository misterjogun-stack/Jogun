// 야구: 화면 조작, 점수판, 입력(카메라·마우스·키보드)을 묶고 매 프레임 진행한다.
import { Round, DT, DIFF, PITCH_NAME } from "./game.js";
import { PoseTracker } from "./tracking.js";
import { sfx, initAudio, setVolume, haptic } from "./audio.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem("hbase_" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("hbase_" + k, JSON.stringify(v)); } catch {} },
};
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
const QUAL = {
  high: { dpr: 2, bloom: true, shadows: 2048, crowd: 0.85, fielders: true },
  mid: { dpr: 1.5, bloom: true, shadows: 1024, crowd: 0.55, fielders: true },
  low: { dpr: 1, bloom: false, shadows: 0, crowd: 0.3, fielders: false },
};
const opts = {
  name: store.get("name", "JOGUN"), diff: store.get("diff", "easy"), pitches: store.get("pitches", 10),
  hand: store.get("hand", "right"), sens: store.get("sens", 1), quality: store.get("quality", "auto"), vol: store.get("vol", 1),
  pip: store.get("pip", "m"), ui: store.get("ui", "m"), shake: store.get("shake", "on"), view: store.get("view", 1),
  autoCal: store.get("autoCal", "on"),
};
// 카메라 입력 지연(초): 화면을 찍고 몸을 알아보고 휘두름을 알아채기까지 걸리는 대략의 시간
const CAM_LEAD = 0.12;
setVolume(opts.vol);
let tracker = null;
function applyLayout() {
  document.body.dataset.pip = opts.pip; document.body.dataset.ui = opts.ui;
  requestAnimationFrame(() => { if (tracker) sizePip(); });
}
applyLayout();
$("flagMe").innerHTML = `<svg viewBox="0 0 36 24"><rect width="36" height="24" fill="#fff"/><g transform="rotate(-33.7 18 12)"><circle cx="18" cy="12" r="6" fill="#0047a0"/><path d="M12 12a6 6 0 0 1 12 0a3 3 0 0 1-6 0a3 3 0 0 0-6 0z" fill="#cd2e3a"/></g><g fill="#000"><g transform="rotate(-56.3 7 6)"><rect x="4" y="4.6" width="6" height="0.8"/><rect x="4" y="5.8" width="6" height="0.8"/><rect x="4" y="7" width="6" height="0.8"/></g><g transform="rotate(56.3 29 6)"><rect x="26" y="4.6" width="2.6" height="0.8"/><rect x="29.4" y="4.6" width="2.6" height="0.8"/><rect x="26" y="5.8" width="6" height="0.8"/><rect x="26" y="7" width="2.6" height="0.8"/><rect x="29.4" y="7" width="2.6" height="0.8"/></g><g transform="rotate(56.3 7 18)"><rect x="4" y="16.6" width="6" height="0.8"/><rect x="4" y="17.8" width="2.6" height="0.8"/><rect x="7.4" y="17.8" width="2.6" height="0.8"/><rect x="4" y="19" width="6" height="0.8"/></g><g transform="rotate(-56.3 29 18)"><rect x="26" y="16.6" width="2.6" height="0.8"/><rect x="29.4" y="16.6" width="2.6" height="0.8"/><rect x="26" y="17.8" width="2.6" height="0.8"/><rect x="29.4" y="17.8" width="2.6" height="0.8"/><rect x="26" y="19" width="2.6" height="0.8"/><rect x="29.4" y="19" width="2.6" height="0.8"/></g></g></svg>`;

// ── 3D 세계 ──
const loading = $("loading");
let World;
try { ({ World } = await import("./world.js")); }
catch (e) { loading.textContent = "3D 화면을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요."; throw e; }
const qName = opts.quality === "auto" ? (isMobile ? "mid" : "high") : opts.quality;
let world;
try { world = new World($("gl"), QUAL[qName], { park: DIFF[opts.diff].park }); }
catch (e) { loading.textContent = "이 기기에서는 3D 화면을 켤 수 없어요. 화질을 '낮음'으로 바꾸거나 다른 브라우저로 열어 주세요."; throw e; }
world.setPlayerName(opts.name);
world.viewZoom = opts.view;
world.onFirework = () => sfx.firework();

// ── 라운드 ──
let paused = true, timeScale = 1, hitStop = 0;
const roundOpts = { diff: opts.diff, pitches: opts.pitches };
const round = new Round(roundOpts, onEvent);
round.calib = store.get("calib", 0); round.autoCalib = opts.autoCal === "on";
function showCalib() { const c = round.calib; $("calVal").textContent = Math.abs(c) < 0.005 ? "0초" : `${c > 0 ? "+" : "−"}${Math.abs(c).toFixed(2)}초`; }

// ── 화면 글자 ──
const floaters = [];
function floater(pos, text, color, size = 1, life = 1.3) {
  const el = document.createElement("div");
  el.className = "floater"; el.textContent = text; el.style.color = color; el.style.fontSize = `${2 * size}rem`;
  $("floaters").appendChild(el);
  floaters.push({ el, pos: { ...pos }, life, max: life });
}
function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]; f.life -= dt;
    if (f.life <= 0) { f.el.remove(); floaters.splice(i, 1); continue; }
    const s = world.toScreen({ x: f.pos.x, y: f.pos.y + (f.max - f.life) * 0.6, z: f.pos.z });
    f.el.style.left = s.x + "px"; f.el.style.top = s.y + "px"; f.el.style.opacity = Math.min(1, f.life * 2); f.el.hidden = !s.on;
  }
}
let bannerTimer = null;
function banner(k, v, s, ms = 1600, red = false) {
  const b = $("banner");
  $("bannerK").textContent = k; $("bannerK").hidden = !k; $("bannerV").textContent = v; $("bannerS").textContent = s || "";
  b.className = (red ? "ai " : "") + "show";
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => (b.className = red ? "ai" : ""), ms);
}
let flashTimer = null;
function flash(kind) { const f = $("flash"); f.className = "show " + kind; clearTimeout(flashTimer); flashTimer = setTimeout(() => (f.className = ""), 90); }
function updateBoard() {
  $("scoreVal").textContent = round.score;
  $("hrVal").textContent = round.stats.hr;
  $("pitchNo").textContent = `${Math.min(round.n + (round.phase === "result" || round.phase === "over" ? 0 : 1), roundOpts.pitches)} / ${roundOpts.pitches}`;
  $("nameMe").textContent = opts.name;
}
const LOGTXT = { hr: "HOME RUN", triple: "TRIPLE", double: "DOUBLE", single: "SINGLE", out: "OUT", foul: "FOUL", strike: "STRIKE", swingmiss: "MISS", ball: "BALL" };
function addLog(kind, dist) {
  const li = document.createElement("li");
  li.className = kind === "hr" ? "hr" : ["triple", "double", "single"].includes(kind) ? "hit" : ["strike", "swingmiss", "ball", "foul"].includes(kind) ? "miss" : "";
  li.innerHTML = `<span>${LOGTXT[kind]}</span><span>${dist && kind !== "strike" && kind !== "ball" && kind !== "swingmiss" ? dist + "m" : ""}</span>`;
  $("logList").prepend(li);
  while ($("logList").children.length > 10) $("logList").lastChild.remove();
}
let timingTimer = null;
function showTiming(dt, window) {
  const e = Math.max(-1.3, Math.min(1.3, dt / window));
  const t = $("timing");
  $("timingMk").style.left = `${50 + (e / 1.3) * 50}%`;
  const a = Math.abs(e);
  $("timingRes").textContent = a < 0.25 ? "PERFECT!" : a < 0.6 ? (e < 0 ? "조금 빨라요" : "조금 늦어요") : a <= 1.15 ? (e < 0 ? "빨라요" : "늦어요") : (e < 0 ? "너무 빨라요" : "너무 늦어요");
  $("timingRes").style.color = a < 0.25 ? "#7dff8c" : a < 0.6 ? "#ffd84a" : "#ff8094";
  t.style.opacity = 1;
  clearTimeout(timingTimer); timingTimer = setTimeout(() => (t.style.opacity = 0), 2200);
}

function onEvent(type, d) {
  switch (type) {
    case "start": banner("", "PLAY BALL!", "", 1400); sfx.whistle(); updateBoard(); $("logList").innerHTML = ""; break;
    case "windup": updateBoard(); break;
    case "pitch":
      $("speedLab").textContent = "PITCH"; $("speedVal").textContent = Math.round(d.speed);
      floater({ x: 0, y: 2.6, z: 17 }, PITCH_NAME[d.type], "#ffffff", 0.8, 1.0);
      break;
    case "swing": sfx.swoosh(d.power || 1.3); showTiming(round.swing.dt, round.d.window); if (round.swing.miss) sfx.swoosh(1); break;
    case "hit": {
      sfx.bat({ q: d.q, perfect: d.perfect });
      hitStop = d.perfect ? 0.12 : 0.06;
      world.hitFx(d.perfect);
      if (opts.shake !== "on") world.shake = 0;
      if (d.perfect) { flash("lime"); haptic([30, 20, 60]); floater({ ...d.pos, y: d.pos.y + 0.4 }, "PERFECT!", "#d8ff6a", 1.1); } else haptic(25);
      $("speedLab").textContent = "EXIT VELO"; $("speedVal").textContent = Math.round(d.ev);
      world.cheer = Math.max(world.cheer, 0.4);
      break;
    }
    case "wall": sfx.land(0, true); break;
    case "land": sfx.land(0, true); break;
    case "catch": sfx.mitt(); break;
    case "result": {
      const k = d.kind;
      addLog(k, d.dist);
      updateBoard();
      if (k === "hr") {
        banner("", "HOME RUN!", `${d.dist}m · ${Math.round(d.ev)}km/h`, 3200);
        world.fireworks(); world.cheer = 2.4; sfx.cheer(1.6); sfx.point(true); haptic([60, 40, 120]);
      } else if (["triple", "double", "single"].includes(k)) {
        banner("HIT", d.label, `${d.dist}m`, 1800); world.cheer = 1.2; sfx.cheer(0.9);
      } else if (k === "out") { banner("", "OUT", d.dist ? `${d.dist}m` : "", 1300, true); sfx.aww(); }
      else if (k === "foul") { banner("", "FOUL", "", 1000, true); }
      else if (k === "strike") { banner("", "STRIKE!", "치기 좋은 공이었어요", 1000, true); sfx.umpire(true); }
      else if (k === "swingmiss") { banner("", "STRIKE!", d.early ? "조금 빨랐어요" : "조금 늦었어요", 1000, true); sfx.umpire(true); }
      else if (k === "ball") { banner("", "BALL", "잘 참았어요", 900); sfx.umpire(false); }
      break;
    }
    case "over": endRound(); break;
    case "calib": store.set("calib", d.calib); showCalib(); break;
  }
}

// ── 안내 ──
let lastHint = "";
function updateHint(nowS) {
  let h = "";
  if (paused || round.phase === "idle" || round.phase === "over") h = "";
  else if (tracker && !tracker.visible(nowS)) h = "상체와 팔이 카메라에 다 보이게 서 주세요";
  else if (round.phase === "wait") h = "투수가 준비해요";
  else if (round.phase === "windup") h = "공을 잘 보세요…";
  else if (round.phase === "pitch") { const left = round.ballNearPlate(); h = left < 0.4 ? "지금 휘둘러요!" : "공이 와요!"; }
  if (h !== lastHint) { lastHint = h; $("hint").textContent = h; $("hint").hidden = !h; }
  $("swingBtn").classList.toggle("go", round.phase === "pitch" && round.ballNearPlate() < 0.4 && !round.swing);
}

// ── 입력 ──
function doSwing(power = 1.3, cam = false) { if (paused) return; initAudio(); round.doSwing({ power, cam, lead: cam ? CAM_LEAD : 0 }); }
$("swingBtn").addEventListener("pointerdown", (e) => { e.stopPropagation(); e.preventDefault(); doSwing(1.4); });
const gl = $("gl");
const phist = []; let lastPointerSwing = -9;
gl.addEventListener("pointermove", (e) => {
  const t = performance.now() / 1000;
  if (tracker && tracker.visible(t)) return;
  phist.push({ t, x: e.clientX / innerHeight, y: e.clientY / innerHeight });
  while (phist.length && t - phist[0].t > 0.25) phist.shift();
  const cur = phist[phist.length - 1]; let old = phist[0];
  for (const s of phist) if (cur.t - s.t <= 0.09) { old = s; break; }
  const dt = cur.t - old.t; if (dt < 0.025) return;
  const sp = Math.hypot(cur.x - old.x, cur.y - old.y) / dt;
  if (sp > 1.6 && t - lastPointerSwing > 0.5) { lastPointerSwing = t; doSwing(sp / 1.6); }
});
gl.addEventListener("pointerdown", () => {
  initAudio();
  const t = performance.now() / 1000;
  if (t - lastPointerSwing > 0.3) { lastPointerSwing = t; doSwing(1.3); }
});
window.addEventListener("keydown", (e) => {
  if (e.repeat || e.target.tagName === "INPUT") return;
  if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); doSwing(1.4); }
  if (e.code === "Escape" && !paused) pause();
});
// 경기 화면 확대·축소
let viewSaveTimer = null;
function setView(v) { opts.view = Math.max(0.6, Math.min(1.6, v)); world.viewZoom = opts.view; clearTimeout(viewSaveTimer); viewSaveTimer = setTimeout(() => { store.set("view", opts.view); syncAll(); }, 300); }
gl.addEventListener("wheel", (e) => { e.preventDefault(); setView(opts.view * (1 + Math.sign(e.deltaY) * 0.06)); }, { passive: false });

// ── 메뉴 ──
const syncers = [];
function bindSeg(id, key, after) {
  const el = $(id);
  const sync = () => el.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(opts[key]))));
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const raw = b.dataset.v; opts[key] = isNaN(Number(raw)) ? raw : Number(raw);
    store.set(key, opts[key]); syncAll(); after && after();
  });
  sync(); syncers.push(sync); return sync;
}
function syncAll() { syncers.forEach((f) => f()); }
// 난이도에 따라 담장 거리가 달라서 바꾸면 경기장을 새로 그린다.
bindSeg("diffSeg", "diff", () => location.reload());
bindSeg("pitchSeg", "pitches"); bindSeg("handSeg", "hand");
for (const id of ["sensSeg", "sensSeg2"]) bindSeg(id, "sens", () => { if (tracker) tracker.opts.sens = opts.sens; });
bindSeg("qualSeg", "quality", () => location.reload());
for (const id of ["volSeg", "volSeg2"]) bindSeg(id, "vol", () => { setVolume(opts.vol); initAudio(); sfx.bat({ q: 0.8 }); });
for (const id of ["pipSeg", "pipSeg2"]) bindSeg(id, "pip", applyLayout);
for (const id of ["uiSeg", "uiSeg2"]) bindSeg(id, "ui", applyLayout);
for (const id of ["viewSeg", "viewSeg2"]) bindSeg(id, "view", () => (world.viewZoom = opts.view));
bindSeg("shakeSeg2", "shake");
for (const id of ["calSeg", "calSeg2"]) bindSeg(id, "autoCal", () => { round.autoCalib = opts.autoCal === "on"; });
$("calReset").addEventListener("click", () => { round.calib = 0; store.set("calib", 0); showCalib(); });
showCalib();
$("nameInput").value = opts.name;
const fsOk = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
for (const id of ["fsBtn", "fsBtn2"]) {
  const b = $(id); b.hidden = !fsOk;
  b.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else await (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
    } catch {}
  });
}
$("pipSize").addEventListener("click", (e) => { e.stopPropagation(); const o = ["s", "m", "l"]; opts.pip = o[(o.indexOf(opts.pip) + 1) % 3]; store.set("pip", opts.pip); applyLayout(); syncAll(); });

function begin() {
  const nm = ($("nameInput").value || "JOGUN").trim().toUpperCase().slice(0, 10) || "JOGUN";
  if (nm !== opts.name) { opts.name = nm; store.set("name", nm); world.setPlayerName(nm); }
  Object.assign(roundOpts, { diff: opts.diff, pitches: opts.pitches });
  if (tracker) { tracker.opts.hand = opts.hand; tracker.opts.sens = opts.sens; }
  $("startOverlay").hidden = true; $("overOverlay").hidden = true;
  paused = false;
  sfx.ambience(true);
  round.start();
}
function sizePip() { const c = $("pip"), r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
$("startCam").addEventListener("click", async () => {
  initAudio();
  const btn = $("startCam"), msg = $("startMsg");
  btn.disabled = true;
  try {
    if (!tracker) {
      const t = new PoseTracker($("cam"), { hand: opts.hand, sens: opts.sens });
      await t.start((m) => (msg.textContent = m));
      tracker = t; $("pipBox").hidden = false; document.body.classList.add("cam"); sizePip();
    }
    msg.textContent = ""; begin();
  } catch (e) { msg.textContent = e.message || "카메라를 켜지 못했어요."; }
  btn.disabled = false;
});
$("startMouse").addEventListener("click", () => { initAudio(); begin(); });
function pause() { if (round.phase === "idle" || round.phase === "over") return; paused = true; sfx.ambience(false); $("pauseOverlay").hidden = false; }
$("pauseBtn").addEventListener("click", (e) => { e.stopPropagation(); pause(); });
$("resumeBtn").addEventListener("click", () => { $("pauseOverlay").hidden = true; paused = false; sfx.ambience(true); last = performance.now(); });
$("restartBtn").addEventListener("click", () => { $("pauseOverlay").hidden = true; round.phase = "idle"; paused = true; $("startOverlay").hidden = false; });
$("againBtn").addEventListener("click", () => { $("overOverlay").hidden = true; begin(); });
$("menuBtn").addEventListener("click", () => { $("overOverlay").hidden = true; $("startOverlay").hidden = false; });
document.addEventListener("visibilitychange", () => { if (document.hidden && !paused) pause(); });

function endRound() {
  paused = true; sfx.ambience(false);
  const s = round.stats;
  $("overTitle").textContent = s.hr >= 3 ? "HOME RUN KING!" : s.hits >= Math.ceil(roundOpts.pitches / 2) ? "GREAT HITTING!" : "GAME SET";
  $("finScore").textContent = round.score;
  $("stHr").textContent = s.hr; $("stHits").textContent = s.hits; $("stLong").textContent = s.longest;
  $("stEv").textContent = Math.round(s.topEv); $("stPerfect").textContent = s.perfect;
  $("overOverlay").hidden = false;
  if (s.hr) { world.fireworks(); sfx.cheer(1.4); }
}

// ── 루프 ──
function resize() { world.resize(innerWidth, innerHeight); if (tracker) sizePip(); }
window.addEventListener("resize", resize);
resize();
let last = performance.now(), acc = 0, firstFrame = true;
function frame(now) {
  const nowS = now / 1000, dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (tracker) { const sw = tracker.detect(nowS); if (sw) doSwing(sw.power, true); }
  if (hitStop > 0) hitStop -= dt;
  else if (!paused || round.phase === "over") {
    acc += dt * timeScale;
    let n = 0;
    while (acc >= DT && n < 2400 && hitStop <= 0) { round.step(); acc -= DT; n++; }
  }
  world.update(round, dt, nowS);
  world.render();
  if (tracker) tracker.drawPip($("pip").getContext("2d"), $("pip").width, $("pip").height);
  updateFloaters(dt);
  updateHint(nowS);
  if (firstFrame) { firstFrame = false; loading.hidden = true; }
  requestAnimationFrame(frame);
}
updateBoard();
requestAnimationFrame(frame);

window.bTest = {
  auto(on, skill = 1) { round.auto = on; round.autoSkill = skill; },
  speed(n) { timeScale = n; },
  state: () => ({ phase: round.phase, n: round.n, score: round.score, stats: { ...round.stats }, log: [...round.log], ball: round.ball.state }),
  begin: () => begin(),
};
