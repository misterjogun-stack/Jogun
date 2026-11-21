// 카메라로 몸(어깨·팔꿈치·손목)을 인식한다. MediaPipe Pose Landmarker.
// 손목이 빠르게 움직이면 "휘두름", 어깨-팔꿈치-손목 각도는 3D 선수의 라켓 팔에 그대로 옮긴다.
const MP_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const LINKS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28], [15, 19], [16, 20]];
// 어깨너비를 1로 둔 단위로 손목 속도를 잰다. 거리가 달라도 같은 기준이 된다.
const SWING_BASE = 3.6;

export class PoseTracker {
  constructor(video, opts) {
    this.video = video; this.opts = opts; // { hand: "right"|"left", sens: 1 }
    this.lm = null; this.lastTime = -1; this.hist = []; this.lastSwing = -9;
    this.pts = null; this.seenAt = -9; this.arm = null; this.aim = 0.5; this.flash = 0;
  }
  async start(onStatus) {
    if (!window.isSecureContext) throw new Error("카메라는 https 주소에서만 켜져요.");
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("이 브라우저는 카메라를 지원하지 않아요. 크롬이나 사파리에서 열어 주세요.");
    onStatus("카메라를 켜는 중…");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) {
      throw new Error(e && e.name === "NotAllowedError"
        ? "카메라 사용이 막혀 있어요. 주소창 옆 카메라 아이콘에서 허용한 뒤 다시 눌러 주세요."
        : "카메라를 켜지 못했어요. 다른 앱이 카메라를 쓰고 있는지 확인해 주세요.");
    }
    this.video.srcObject = stream;
    await this.video.play();
    onStatus("몸 인식 준비 중… (처음에는 10초쯤 걸려요)");
    try {
      const { PoseLandmarker, FilesetResolver } = await import(`${MP_URL}/vision_bundle.mjs`);
      const files = await FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
      const o = (delegate) => ({ baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: "VIDEO", numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
      try { this.lm = await PoseLandmarker.createFromOptions(files, o("GPU")); }
      catch { this.lm = await PoseLandmarker.createFromOptions(files, o("CPU")); }
    } catch {
      throw new Error("몸 인식 프로그램을 받지 못했어요. 인터넷 연결을 확인해 주세요.");
    }
  }
  idx() { return this.opts.hand === "left" ? { S: 11, E: 13, W: 15, O: 12 } : { S: 12, E: 14, W: 16, O: 11 }; }
  // 매 프레임 호출. 휘두름이 생기면 { dirX, dirY, power } 를 돌려준다.
  detect(nowS) {
    const v = this.video;
    if (!this.lm || v.readyState < 2 || v.currentTime === this.lastTime) return null;
    this.lastTime = v.currentTime;
    let res;
    try { res = this.lm.detectForVideo(v, nowS * 1000); } catch { return null; }
    const lmk = res.landmarks?.[0];
    if (!lmk) { this.pts = null; return null; }
    const aspect = (v.videoWidth || 16) / (v.videoHeight || 9);
    // 거울처럼 좌우를 뒤집은 좌표 (화면에 보이는 그대로)
    this.pts = lmk.map((p) => ({ x: 1 - p.x, y: p.y, vis: p.visibility ?? 1 }));
    const P = this.pts, { S, E, W, O } = this.idx();
    if (P[S].vis < 0.4 || P[W].vis < 0.3) return null;
    this.seenAt = nowS;
    const sw = Math.hypot((P[S].x - P[O].x) * aspect, P[S].y - P[O].y) || 0.1;
    const sign = this.opts.hand === "left" ? -1 : 1;  // 라켓 팔이 바깥쪽으로 들리면 +
    const ux = (P[E].x - P[S].x) * aspect * sign, uy = P[E].y - P[S].y;
    const fx = (P[W].x - P[E].x) * aspect * sign, fy = P[W].y - P[E].y;
    const theta = Math.atan2(ux, uy);
    let bend = Math.atan2(fx, fy) - theta;
    while (bend > Math.PI) bend -= 2 * Math.PI;
    while (bend < -Math.PI) bend += 2 * Math.PI;
    const a = this.arm;
    this.arm = a ? { theta: a.theta + (theta - a.theta) * 0.5, bend: a.bend + (bend - a.bend) * 0.5 } : { theta, bend };
    // 손목 속도 (어깨너비/초)
    const wx = (P[W].x * aspect) / sw, wy = P[W].y / sw;
    this.hist.push({ t: nowS, x: wx, y: wy, ax: P[W].x });
    while (this.hist.length && nowS - this.hist[0].t > 0.3) this.hist.shift();
    const cur = this.hist[this.hist.length - 1];
    let old = this.hist[0];
    for (const s of this.hist) if (cur.t - s.t <= 0.1) { old = s; break; }
    const dt = cur.t - old.t;
    if (dt < 0.03) return null;
    const vx = (cur.x - old.x) / dt, vy = (cur.y - old.y) / dt, sp = Math.hypot(vx, vy);
    const thr = SWING_BASE * this.opts.sens;
    if (sp > thr && nowS - this.lastSwing > 0.38) {
      this.lastSwing = nowS; this.flash = 1;
      this.aim = Math.max(0, Math.min(1, (old.ax - 0.5) * 1.6 + 0.5));
      return { dirX: (vx / sp) * sign, dirY: vy / sp, power: sp / thr };
    }
    return null;
  }
  visible(nowS) { return nowS - this.seenAt < 0.6; }
  drawPip(ctx, w, h) {
    const v = this.video;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, w, h);
    if (v.readyState < 2) return;
    const vw = v.videoWidth, vh = v.videoHeight, s = Math.max(w / vw, h / vh), dw = vw * s, dh = vh * s;
    const ox = (w - dw) / 2, oy = (h - dh) / 2;
    ctx.save(); ctx.translate(ox + dw, oy); ctx.scale(-1, 1); ctx.drawImage(v, 0, 0, dw, dh); ctx.restore();
    const P = this.pts;
    if (!P) return;
    const m = (p) => [ox + p.x * dw, oy + p.y * dh];
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(90,170,255,0.9)"; ctx.shadowBlur = 10;
    ctx.strokeStyle = "rgba(150,205,255,0.95)"; ctx.lineWidth = Math.max(2, w / 110);
    ctx.beginPath();
    for (const [a, b] of LINKS) {
      if (P[a].vis < 0.4 || P[b].vis < 0.4) continue;
      const [x1, y1] = m(P[a]), [x2, y2] = m(P[b]);
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    }
    ctx.stroke();
    ctx.fillStyle = "#e8f3ff";
    for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26]) {
      if (P[i].vis < 0.4) continue;
      const [x, y] = m(P[i]); ctx.beginPath(); ctx.arc(x, y, Math.max(2.5, w / 80), 0, Math.PI * 2); ctx.fill();
    }
    const { W } = this.idx();
    if (P[W].vis > 0.3) {
      const [x, y] = m(P[W]);
      const r = w / 9 * (1 + this.flash * 0.35);
      ctx.strokeStyle = this.flash > 0.1 ? "rgba(216,255,106,0.95)" : "rgba(124,196,255,0.95)";
      ctx.lineWidth = Math.max(2, w / 90);
      ctx.beginPath(); ctx.arc(x, y - r * 0.4, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    this.flash = Math.max(0, this.flash - 0.06);
  }
}
