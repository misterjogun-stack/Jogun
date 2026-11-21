// 손 파리채: 카메라 화면 위에 벌레를 그리고, 손(또는 마우스)으로 찰싹 잡는다.
import { Game, STAGES, drawBackdrop, drawProps, drawBug, drawFx, drawSwatter } from "./game.js";
import { HandTracker } from "./hands.js";
import { drawBugReal, drawPropsReal, drawSwatterReal } from "./real.js";
import { sfx, initAudio, setVolume, haptic } from "./audio.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem("hswat_" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("hswat_" + k, JSON.stringify(v)); } catch {} },
};
const opts = {
  stage: store.get("stage", "kitchen"), duo: store.get("duo", "solo"), time: store.get("time", 60), diff: store.get("diff", "easy"),
  sens: store.get("sens", 1), vol: store.get("vol", 1), ui: store.get("ui", "m"), shake: store.get("shake", "on"), look: store.get("look", "real"),
};
setVolume(opts.vol);
document.body.dataset.ui = opts.ui;
const P_COLOR = ["#4fa3ff", "#ff9f43"];

const cv = $("cv"), g = cv.getContext("2d"), video = $("cam");
let W = 0, H = 0, DPR = 1;
let tracker = null, paused = true, hitStop = 0, shake = 0, timeScale = 1;
const gameOpts = { stage: opts.stage, diff: opts.diff, time: opts.time, duo: opts.duo === "duo" };
const game = new Game(gameOpts, onEvent);
const swatAnim = new Map(); // 손 번호 -> 남은 찰싹 애니메이션
let pointer = { id: "mouse", x: -999, y: -999, speed: 0, dir: -Math.PI / 2, active: false };

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  game.resize(W, H);
}
window.addEventListener("resize", resize);
resize();
// 카메라 영상이 화면을 꽉 채울 때(cover)의 위치
function videoRect() {
  const vw = video.videoWidth || 16, vh = video.videoHeight || 9, s = Math.max(W / vw, H / vh);
  return { x: (W - vw * s) / 2, y: (H - vh * s) / 2, w: vw * s, h: vh * s };
}
const mapNorm = (nx, ny) => { const r = videoRect(); return { x: r.x + nx * r.w, y: r.y + ny * r.h }; };

// ── 화면 글자 ──
let bannerTimer = null;
function banner(k, v, s, ms = 1500, red = false) {
  const b = $("banner");
  $("bannerK").textContent = k; $("bannerK").hidden = !k; $("bannerV").textContent = v; $("bannerS").textContent = s || "";
  b.className = (red ? "ai " : "") + "show";
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => (b.className = red ? "ai" : ""), ms);
}
function updateHud() {
  const ps = game.players || [{ score: 0, combo: 0 }];
  $("ps1Val").textContent = ps[0].score;
  const c1 = ps[0].combo >= 3; $("ps1Combo").classList.toggle("on", c1); $("ps1Combo").textContent = `COMBO ${ps[0].combo} ×${Math.min(5, 1 + Math.floor((ps[0].combo - 1) / 3))}`;
  if (ps[1]) { $("ps2Val").textContent = ps[1].score; const c2 = ps[1].combo >= 3; $("ps2Combo").classList.toggle("on", c2); $("ps2Combo").textContent = `COMBO ${ps[1].combo}`; }
  const left = Math.max(0, Math.ceil(game.left ?? opts.time));
  $("timeVal").textContent = left;
  $("timer").classList.toggle("hurry", game.phase === "play" && left <= 10);
  $("goldBar").hidden = !(game.golden > 0 && game.phase === "play");
  const boss = game.boss;
  $("bossBar").hidden = !(boss && game.phase === "play" && boss.mode !== "dead");
  if (boss) $("bossHp").style.width = `${(Math.max(0, boss.hp) / boss.maxHp) * 100}%`;
}
const KOR = { fly: "파리", mosquito: "모기", big: "왕파리", golden: "황금 파리", boss: "파리왕" };
let lastTick = 99;
function onEvent(type, d) {
  switch (type) {
    case "start":
      banner(STAGES[gameOpts.stage].name, "시작!", gameOpts.duo ? "왼쪽은 1P, 오른쪽은 2P" : "", 1400); sfx.whistle(); lastTick = 99; break;
    case "hit": {
      sfx.swat(true);
      if (d.kills) { sfx.pop(d.combo); hitStop = 0.05; if (opts.shake === "on") shake = 0.18; haptic(d.multi ? [20, 30, 40] : 25); }
      if (d.golden) { sfx.golden(); banner("", "GOLDEN TIME!", "6초 동안 점수 2배", 1300); }
      if (d.bee) { sfx.angryBee(); haptic([60, 40, 60]); }
      if (d.multi) banner("", d.kills >= 3 ? "TRIPLE!" : "DOUBLE!", "", 900);
      if (d.kills && d.combo >= 3 && d.combo % 3 === 0) sfx.combo(d.combo / 3);
      break;
    }
    case "miss": sfx.swat(false); break;
    case "bite": sfx.bite(); haptic([40, 30, 40]); banner("", "앗, 물렸어요!", "모기가 얼굴까지 오기 전에 잡아요 −50", 1300, true); break;
    case "golden": break;
    case "bossHit": sfx.bossHit(); break;
    case "bossDown": banner("", "파리왕을 물리쳤어요!", "남은 시간만큼 보너스", 2400); sfx.cheer(1.4); sfx.point(true); break;
    case "over": endGame(d); break;
  }
}

// ── 입력 ──
function doSwat(x, y, owner, power = 1) {
  if (paused || game.phase !== "play") return;
  initAudio();
  game.swat({ x, y, owner, power });
}
cv.addEventListener("pointermove", (e) => {
  if (tracker && tracker.visible(performance.now() / 1000)) return;
  const nx = e.clientX, ny = e.clientY;
  pointer.speed = Math.hypot(nx - pointer.x, ny - pointer.y) / H * 60;
  pointer.x = nx; pointer.y = ny; pointer.active = true;
});
cv.addEventListener("pointerdown", (e) => {
  initAudio();
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  swatAnim.set("mouse", 0.22);
  doSwat(e.clientX, e.clientY, gameOpts.duo && e.clientX > W / 2 ? 1 : 0, 1.2);
});
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.code === "Space" && pointer.active) { e.preventDefault(); swatAnim.set("mouse", 0.22); doSwat(pointer.x, pointer.y, gameOpts.duo && pointer.x > W / 2 ? 1 : 0); }
  if (e.code === "Escape" && !paused) pause();
});

// ── 메뉴 ──
const syncers = [];
function bindSeg(id, key, after, sel = "button") {
  const el = $(id);
  const sync = () => el.querySelectorAll(sel).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(opts[key]))));
  el.addEventListener("click", (e) => {
    const b = e.target.closest(sel); if (!b) return;
    const raw = b.dataset.v; opts[key] = isNaN(Number(raw)) ? raw : Number(raw);
    store.set(key, opts[key]); syncers.forEach((f) => f()); after && after();
  });
  sync(); syncers.push(sync);
}
bindSeg("stageSeg", "stage", null, ".stage");
bindSeg("duoSeg", "duo"); bindSeg("timeSeg", "time"); bindSeg("diffSeg", "diff");
for (const id of ["sensSeg", "sensSeg2"]) bindSeg(id, "sens", () => { if (tracker) tracker.opts.sens = opts.sens; });
for (const id of ["volSeg", "volSeg2"]) bindSeg(id, "vol", () => { setVolume(opts.vol); initAudio(); sfx.swat(true); });
for (const id of ["uiSeg", "uiSeg2"]) bindSeg(id, "ui", () => (document.body.dataset.ui = opts.ui));
bindSeg("shakeSeg2", "shake");
for (const id of ["lookSeg", "lookSeg2"]) bindSeg(id, "look");
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
function begin() {
  Object.assign(gameOpts, { stage: opts.stage, diff: opts.diff, time: opts.time, duo: opts.duo === "duo" });
  if (tracker) { tracker.opts.sens = opts.sens; tracker.opts.hands = gameOpts.duo ? 4 : 2; }
  $("ps2").hidden = !gameOpts.duo;
  $("ps1Name").textContent = gameOpts.duo ? "1P" : "SCORE";
  $("startOverlay").hidden = true; $("overOverlay").hidden = true;
  game.resize(W, H);
  paused = false;
  game.start();
}
$("startCam").addEventListener("click", async () => {
  initAudio();
  const btn = $("startCam"), msg = $("startMsg");
  btn.disabled = true;
  try {
    if (!tracker) {
      const t = new HandTracker(video, { hands: 2, sens: opts.sens });
      await t.start((m) => (msg.textContent = m));
      tracker = t;
    }
    msg.textContent = ""; begin();
  } catch (e) { msg.textContent = e.message || "카메라를 켜지 못했어요."; }
  btn.disabled = false;
});
$("startMouse").addEventListener("click", () => { initAudio(); begin(); });
function pause() { if (game.phase !== "play") return; paused = true; sfx.buzz([]); $("pauseOverlay").hidden = false; }
$("pauseBtn").addEventListener("click", (e) => { e.stopPropagation(); pause(); });
$("resumeBtn").addEventListener("click", () => { $("pauseOverlay").hidden = true; paused = false; last = performance.now(); });
$("restartBtn").addEventListener("click", () => { $("pauseOverlay").hidden = true; game.phase = "idle"; game.bugs = []; paused = true; $("startOverlay").hidden = false; });
$("againBtn").addEventListener("click", () => begin());
$("menuBtn").addEventListener("click", () => { $("overOverlay").hidden = true; $("startOverlay").hidden = false; game.bugs = []; });
document.addEventListener("visibilitychange", () => { if (document.hidden && !paused) pause(); });

function endGame(d) {
  paused = true; sfx.buzz([]); sfx.horn();
  const ps = d.players;
  const sum = (k) => ps.reduce((a, p) => a + (p.caught[k] || 0), 0);
  $("stFly").textContent = sum("fly"); $("stMos").textContent = sum("mosquito"); $("stBig").textContent = sum("big"); $("stGold").textContent = sum("golden");
  $("stCombo").textContent = Math.max(...ps.map((p) => p.best)); $("stBite").textContent = ps.reduce((a, p) => a + p.bites, 0);
  $("soloRes").hidden = gameOpts.duo; $("duoRes").hidden = !gameOpts.duo;
  let title = d.bossWin === false ? "파리왕이 도망갔어요" : d.bossWin ? "파리왕 격파!" : "TIME UP!";
  let rec = "";
  if (gameOpts.duo) {
    $("fin1").textContent = ps[0].score; $("fin2").textContent = ps[1].score;
    title = ps[0].score === ps[1].score ? "무승부!" : ps[0].score > ps[1].score ? "1P 승리!" : "2P 승리!";
  } else {
    $("finScore").textContent = ps[0].score;
    const key = `best_${gameOpts.stage}_${gameOpts.diff}_${gameOpts.time}`;
    const best = store.get(key, 0);
    if (ps[0].score > best) { store.set(key, ps[0].score); rec = best ? `새 기록! (이전 ${best}점)` : "첫 기록!"; }
    else rec = `최고 기록 ${best}점`;
  }
  $("overTitle").textContent = title; $("recordLine").textContent = rec;
  $("overOverlay").hidden = false;
  if (rec.startsWith("새") || d.bossWin || gameOpts.duo) sfx.cheer(1.2);
}

// ── 루프 ──
let last = performance.now(), firstFrame = true;
function frame(now) {
  const nowS = now / 1000, dt = Math.min(0.05, (now - last) / 1000) * timeScale;
  last = now;
  // 손 찾기
  let hands = [];
  const camOn = !!tracker && video.readyState >= 2;
  if (tracker) {
    const r = tracker.detect(nowS, mapNorm, H);
    hands = r.hands.map((h) => ({ ...h, owner: gameOpts.duo && h.x > W / 2 ? 1 : 0 }));
    for (const sw of r.swats) {
      swatAnim.set(sw.id, 0.22);
      doSwat(sw.x, sw.y, gameOpts.duo && sw.x > W / 2 ? 1 : 0, sw.power);
    }
  }
  if (!hands.length && pointer.active) hands = [{ ...pointer, owner: gameOpts.duo && pointer.x > W / 2 ? 1 : 0 }];
  pointer.speed *= 0.8;
  if (sTest.autoOn) autoPlay(hands);
  // 진행
  if (hitStop > 0) hitStop -= dt;
  else if (!paused) {
    const before = Math.ceil(game.left ?? 99);
    game.update(dt, hands);
    const after = Math.ceil(game.left ?? 99);
    if (game.phase === "play" && after !== before && after <= 10 && after > 0 && after !== lastTick) { lastTick = after; sfx.tick(after <= 3); }
  } else game.updateFx(dt);
  sfx.buzz(!paused && game.phase === "play" ? game.buzzers() : []);
  // 그리기
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (shake > 0) { g.translate((Math.random() - 0.5) * shake * 30, (Math.random() - 0.5) * shake * 30); shake = Math.max(0, shake - dt); }
  if (camOn) {
    const r = videoRect();
    g.save(); g.translate(r.x + r.w, r.y); g.scale(-1, 1); g.drawImage(video, 0, 0, r.w, r.h); g.restore();
  } else { g.fillStyle = "#05070f"; g.fillRect(-20, -20, W + 40, H + 40); }
  drawBackdrop(g, W, H, gameOpts.stage, camOn);
  const real = opts.look === "real";
  (real ? drawPropsReal : drawProps)(g, W, H, gameOpts.stage, nowS);
  const bugs = [...game.bugs].sort((a, b) => (a.kind === "mosquito" ? a.approach : 0) - (b.kind === "mosquito" ? b.approach : 0));
  for (const b of bugs) (real ? drawBugReal : drawBug)(g, b, game.S, nowS);
  drawFx(g, game, game.S);
  if (gameOpts.duo) { g.strokeStyle = "rgba(255,255,255,0.35)"; g.setLineDash([12, 10]); g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke(); g.setLineDash([]); }
  for (const h of hands) {
    const k = swatAnim.get(h.id) || 0;
    (real ? drawSwatterReal : drawSwatter)(g, h, game.S, P_COLOR[h.owner], k > 0 ? 1 - k / 0.22 : 0);
  }
  for (const [id, k] of swatAnim) { if (k - dt <= 0) swatAnim.delete(id); else swatAnim.set(id, k - dt); }
  updateHud();
  updateHint(nowS, hands);
  if (firstFrame) { firstFrame = false; $("loading").hidden = true; }
  requestAnimationFrame(frame);
}
let lastHint = "";
function updateHint(nowS, hands) {
  let h = "";
  if (!paused && game.phase === "play") {
    if (tracker && !tracker.visible(nowS)) h = "손을 카메라에 보여 주세요. 손이 파리채가 돼요";
    else if (game.t < 4) h = gameOpts.stage === "picnic" ? "노란 꿀벌은 잡으면 안 돼요!" : gameOpts.stage === "camp" ? "모기가 커지기 전에 잡아요!" : "벌레 위에서 손을 빠르게 휘둘러요!";
  }
  if (h !== lastHint) { lastHint = h; $("hint").textContent = h; $("hint").hidden = !h; }
}
requestAnimationFrame(frame);

// 자동 점검용
const sTest = (window.sTest = {
  autoOn: false, autoT: 0,
  auto(on) { this.autoOn = on; },
  speed(n) { timeScale = n; },
  state: () => ({ phase: game.phase, left: game.left, players: game.players, bugs: game.bugs.length, kinds: game.bugs.map((b) => b.kind), pos: game.bugs.map((b) => [b.kind, Math.round(b.x), Math.round(b.y), b.mode]) }),
  begin: () => begin(),
  game,
});
function autoPlay(hands) {
  if (paused || game.phase !== "play") return;
  sTest.autoT -= 1 / 60;
  if (sTest.autoT > 0) return;
  sTest.autoT = 0.35;
  const target = game.alive().filter((b) => b.kind !== "bee").sort((a, b) => (b.kind === "mosquito" ? b.approach : 0) - (a.kind === "mosquito" ? a.approach : 0))[0];
  if (!target) return;
  pointer = { ...pointer, x: target.x + (Math.random() - 0.5) * game.S * 0.8, y: target.y + (Math.random() - 0.5) * game.S * 0.8, active: true };
  swatAnim.set("mouse", 0.22);
  doSwat(pointer.x, pointer.y, gameOpts.duo && pointer.x > W / 2 ? 1 : 0);
}
