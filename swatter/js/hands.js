// 카메라로 손을 찾는다 (MediaPipe Hand Landmarker, 최대 4개 = 두 사람).
// 손마다 번호를 붙여 따라가고, 빠르게 휘두르면 "찰싹" 신호를 낸다.
const MP_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const PALM = [0, 5, 9, 13, 17];

export class HandTracker {
  constructor(video, opts) {
    this.video = video; this.opts = opts; // { hands: 2|4, sens: 1 }
    this.lm = null; this.lastTime = -1; this.tracks = []; this.nextId = 1; this.seenAt = -9;
  }
  async start(onStatus) {
    if (!window.isSecureContext) throw new Error("카메라는 https 주소에서만 켜져요.");
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("이 브라우저는 카메라를 지원하지 않아요. 크롬이나 사파리에서 열어 주세요.");
    onStatus("카메라를 켜는 중…");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) {
      throw new Error(e && e.name === "NotAllowedError" ? "카메라 사용이 막혀 있어요. 주소창 옆 카메라 아이콘에서 허용한 뒤 다시 눌러 주세요." : "카메라를 켜지 못했어요. 다른 앱이 카메라를 쓰고 있는지 확인해 주세요.");
    }
    this.video.srcObject = stream;
    await this.video.play();
    onStatus("손 인식 준비 중… (처음에는 10초쯤 걸려요)");
    try {
      const { HandLandmarker, FilesetResolver } = await import(`${MP_URL}/vision_bundle.mjs`);
      const files = await FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
      const o = (delegate) => ({ baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: "VIDEO", numHands: 4, minHandDetectionConfidence: 0.45, minHandPresenceConfidence: 0.45, minTrackingConfidence: 0.45 });
      try { this.lm = await HandLandmarker.createFromOptions(files, o("GPU")); }
      catch { this.lm = await HandLandmarker.createFromOptions(files, o("CPU")); }
    } catch {
      throw new Error("손 인식 프로그램을 받지 못했어요. 인터넷 연결을 확인해 주세요.");
    }
  }
  // 화면 좌표로 바꾸는 함수 map(nx, ny) -> {x, y} 를 받아서, 손 목록과 찰싹 신호를 돌려준다.
  detect(nowS, map, H) {
    const v = this.video, swats = [];
    if (!this.lm || v.readyState < 2) return { hands: this.tracks, swats };
    if (v.currentTime !== this.lastTime) {
      this.lastTime = v.currentTime;
      let res = null;
      try { res = this.lm.detectForVideo(v, nowS * 1000); } catch {}
      const found = (res?.landmarks || []).map((lm) => {
        const px = PALM.reduce((a, i) => a + (1 - lm[i].x), 0) / PALM.length;
        const py = PALM.reduce((a, i) => a + lm[i].y, 0) / PALM.length;
        const p = map(px, py);
        const w = map(1 - lm[0].x, lm[0].y), m = map(1 - lm[9].x, lm[9].y);
        const size = Math.hypot(m.x - w.x, m.y - w.y);
        return { x: p.x, y: p.y, nx: px, size, dir: Math.atan2(m.y - w.y, m.x - w.x) };
      }).slice(0, this.opts.hands);
      // 가까운 것끼리 이어 붙여 손마다 같은 번호를 유지한다
      const used = new Set();
      for (const f of found) {
        let best = null, bd = H * 0.35;
        for (const t of this.tracks) { if (used.has(t)) continue; const d = Math.hypot(t.rx - f.x, t.ry - f.y); if (d < bd) { bd = d; best = t; } }
        if (!best) { best = { id: this.nextId++, x: f.x, y: f.y, rx: f.x, ry: f.y, hist: [], lastSwat: -9, dir: -Math.PI / 2 }; this.tracks.push(best); }
        used.add(best);
        best.rx = f.x; best.ry = f.y; best.nx = f.nx; best.size = f.size; best.seen = nowS;
        best.dir = best.dir + angDiff(f.dir, best.dir) * 0.4;
        best.hist.push({ t: nowS, x: f.x, y: f.y });
        while (best.hist.length && nowS - best.hist[0].t > 0.3) best.hist.shift();
        // 찰싹 판정: 손바닥이 빠르게 움직이면
        const h = best.hist, cur = h[h.length - 1];
        let old = h[0];
        for (const s of h) if (cur.t - s.t <= 0.09) { old = s; break; }
        const dt = cur.t - old.t;
        if (dt > 0.025) {
          const sp = Math.hypot(cur.x - old.x, cur.y - old.y) / dt / H; // 화면 높이/초
          best.speed = sp;
          if (sp > 1.5 * this.opts.sens && nowS - best.lastSwat > 0.28) {
            best.lastSwat = nowS;
            swats.push({ id: best.id, x: cur.x, y: cur.y, px: old.x, py: old.y, power: sp / (1.5 * this.opts.sens), nx: best.nx });
          }
        }
      }
      if (found.length) this.seenAt = nowS;
      this.tracks = this.tracks.filter((t) => nowS - t.seen < 0.4);
    }
    // 화면에 그릴 위치는 부드럽게
    for (const t of this.tracks) { t.x += (t.rx - t.x) * 0.55; t.y += (t.ry - t.y) * 0.55; }
    return { hands: this.tracks, swats };
  }
  visible(nowS) { return nowS - this.seenAt < 0.7; }
}
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
