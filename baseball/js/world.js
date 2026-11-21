// three.js 로 그리는 야간 야구장, 타자·투수·수비수, 공.
// 게임 좌표 (x, y, z) 를 three 좌표 (x, y, -z) 로 바꿔 쓴다. 카메라는 홈플레이트 뒤에서 투수 쪽(-z)을 본다.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FIELD, fenceDist, FENCE_H, clamp, lerp } from "./game.js";

const V = (x, y, z) => new THREE.Vector3(x, y, -z);
const ease = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
function canvasTex(w, h, draw, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function seeded(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

// ═════════════════ 사람 ═════════════════
class Body {
  constructor({ jersey, trim, pants, skin, hair, cap, name, number, glove = false, helmet = false }) {
    const M = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
    const mat = (this.mat = { jersey: M(jersey, 0.75), trim: M(trim, 0.6), pants: M(pants, 0.8), skin: M(skin, 0.55), hair: M(hair, 0.85), cap: M(cap, helmet ? 0.25 : 0.7, helmet ? { metalness: 0.2 } : {}), shoe: M(0x15171c, 0.5), sock: M(trim, 0.8) });
    const add = (geo, m, parent, pos, rot, scl) => {
      const o = new THREE.Mesh(geo, m); o.castShadow = true; o.receiveShadow = true;
      if (pos) o.position.set(...pos); if (rot) o.rotation.set(...rot); if (scl) o.scale.set(...scl);
      parent.add(o); return o;
    };
    const capsule = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
    const G = (parent, pos) => { const g = new THREE.Group(); if (pos) g.position.set(...pos); parent.add(g); return g; };
    this.root = new THREE.Group();
    this.hips = G(this.root, [0, 0.94, 0]);
    add(new THREE.CylinderGeometry(0.165, 0.19, 0.27, 20), mat.pants, this.hips, [0, -0.06, 0], null, [1, 1, 0.75]);
    add(new THREE.CylinderGeometry(0.172, 0.172, 0.04, 20), M(0x111318, 0.6), this.hips, [0, 0.06, 0], null, [1, 1, 0.76]);
    this.spine = G(this.hips, [0, 0.02, 0]);
    add(capsule(0.155, 0.27), mat.jersey, this.spine, [0, 0.27, 0], null, [1.3, 1, 0.8]);
    if (name || number) {
      const tex = canvasTex(512, 512, (g, w, h) => {
        g.clearRect(0, 0, w, h); g.fillStyle = "#" + new THREE.Color(trim).getHexString(); g.textAlign = "center"; g.textBaseline = "middle";
        g.font = "900 96px 'Barlow Condensed', Arial, sans-serif"; if (name) g.fillText(name.toUpperCase(), w / 2, h * 0.2, w * 0.9);
        g.font = "900 230px 'Barlow Condensed', Arial, sans-serif"; if (number) g.fillText(String(number), w / 2, h * 0.6);
      }, { aniso: 4 });
      const back = add(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }), this.spine, [0, 0.3, -0.128], [0, Math.PI, 0]);
      back.castShadow = false;
    }
    add(new THREE.CylinderGeometry(0.048, 0.055, 0.1, 12), mat.skin, this.spine, [0, 0.53, 0]);
    this.head = G(this.spine, [0, 0.665, 0]);
    add(new THREE.SphereGeometry(0.105, 24, 18), mat.skin, this.head, null, null, [0.9, 1.1, 1]);
    add(new THREE.SphereGeometry(0.108, 24, 18), mat.hair, this.head, [0, 0.012, -0.02], null, [0.93, 1.0, 0.95]);
    // 모자 또는 헬멧
    add(new THREE.SphereGeometry(helmet ? 0.128 : 0.116, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), mat.cap, this.head, [0, helmet ? 0.01 : 0.03, -0.005], null, [0.95, 1.05, 1.02]);
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.012, 20, 1, false, 0, Math.PI), mat.cap, this.head, [0, 0.03, 0.06], [0, Math.PI / 2 + Math.PI / 2, 0], [1, 1, 0.75]);
    if (helmet) for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.05, 12, 8), mat.cap, this.head, [s * 0.1, -0.03, -0.01], null, [0.5, 1, 1]);
    const eye = M(0x15171c, 0.4);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.011, 8, 6), eye, this.head, [s * 0.034, 0.002, 0.094]);
    // 팔 (side -1 = 오른팔, 로컬 -x)
    this.arms = {};
    for (const side of [-1, 1]) {
      const sh = G(this.spine, [side * 0.205, 0.43, 0]);
      const abd = G(sh), flex = G(abd);
      add(new THREE.CylinderGeometry(0.058, 0.052, 0.2, 12), mat.jersey, flex, [0, -0.09, 0]);
      add(capsule(0.044, 0.2), mat.skin, flex, [0, -0.17, 0]);
      const elbow = G(flex, [0, -0.29, 0]);
      add(capsule(0.039, 0.19), mat.skin, elbow, [0, -0.13, 0]);
      const wrist = G(elbow, [0, -0.27, 0]);
      add(new THREE.SphereGeometry(0.043, 12, 10), M(0xf2f2f2, 0.7), wrist, [0, -0.04, 0], null, [0.85, 1.25, 0.6]);
      this.arms[side] = { sh, abd, flex, elbow, wrist };
    }
    if (glove) add(new THREE.SphereGeometry(0.09, 14, 10), M(0x6b3d1c, 0.6), this.arms[1].wrist, [0, -0.08, 0.02], null, [0.7, 1.1, 0.5]);
    // 다리 (긴 바지)
    this.legs = {};
    for (const side of [-1, 1]) {
      const hip = G(this.hips, [side * 0.095, -0.03, 0]);
      add(capsule(0.082, 0.3), mat.pants, hip, [0, -0.22, 0]);
      const knee = G(hip, [0, -0.43, 0]);
      add(capsule(0.06, 0.22), mat.pants, knee, [0, -0.13, 0]);
      add(new THREE.CylinderGeometry(0.055, 0.05, 0.2, 12), mat.sock, knee, [0, -0.32, 0]);
      const ankle = G(knee, [0, -0.44, 0]);
      add(new RoundedBoxGeometry(0.1, 0.075, 0.27, 2, 0.03), mat.shoe, ankle, [0, -0.03, 0.05]);
      this.legs[side] = { hip, knee, ankle };
    }
  }
  setArm(side, theta, flex, bend) {
    const a = this.arms[side];
    a.abd.rotation.z = side * theta; a.flex.rotation.x = flex;
    a.elbow.rotation.z = side * bend * 0.5; a.elbow.rotation.x = -Math.abs(bend) * 0.9;
  }
  setLeg(side, hx, kx, ax, hz = 0) {
    const l = this.legs[side];
    l.hip.rotation.x = hx; l.hip.rotation.z = side * hz; l.knee.rotation.x = kx; l.ankle.rotation.x = ax;
  }
  ready(t, crouch = 0.5) {
    this.hips.position.y = 0.94 - 0.14 * crouch;
    this.spine.rotation.x = 0.15 + 0.35 * crouch;
    for (const s of [-1, 1]) this.setLeg(s, -0.45 * crouch - 0.1, 0.9 * crouch + 0.1, -0.4 * crouch, -0.22);
    const b = Math.sin(t * 2) * 0.03;
    this.setArm(-1, 0.35, -0.7 - b, 0.9); this.setArm(1, 0.35, -0.7 + b, 0.9);
  }
}

// ═════════════════ 세계 ═════════════════
export class World {
  constructor(canvas, quality, opts) {
    this.q = quality; this.park = opts.park || 1;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.dpr <= 1.5, powerPreference: "high-performance" }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.95;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = quality.shadows > 0; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050915);
    this.scene.fog = new THREE.Fog(0x050915, 140, 320);
    this.camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 600);
    this.camPos = V(0.6, 1.8, -3.8); this.camLook = V(0, 1, 12);
    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.shake = 0; this.cheer = 0; this.mode = "bat"; this.viewZoom = 1;
    this.buildSky(); this.buildLights(); this.buildField(); this.buildFence(); this.buildStands(); this.buildPeople(); this.buildBall(); this.buildFx();
    if (quality.bloom) {
      this.composer = new EffectComposer(r);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.45, 1.15);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
  }
  buildSky() {
    const rnd = seeded(3), n = 500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = rnd() * Math.PI * 2, ph = rnd() * 0.45 + 0.08, R = 420;
      pos[i * 3] = Math.cos(th) * Math.cos(ph) * R; pos[i * 3 + 1] = Math.sin(ph) * R; pos[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * R - 120;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc8d6ff, size: 1.3, sizeAttenuation: false, fog: false }));
    this.scene.add(stars);
  }
  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0x8fa4d8, 0x1c2a12, 0.5));
    const key = new THREE.DirectionalLight(0xfff4e2, 1.8);
    key.position.copy(V(-25, 45, -20)); key.target.position.copy(V(0, 0, 20));
    s.add(key, key.target);
    if (this.q.shadows) {
      key.castShadow = true; key.shadow.mapSize.set(this.q.shadows, this.q.shadows);
      const c = key.shadow.camera; c.left = -35; c.right = 35; c.top = 40; c.bottom = -25; c.near = 10; c.far = 140;
      key.shadow.bias = -0.0005; key.shadow.normalBias = 0.03;
    }
    const fill = new THREE.DirectionalLight(0xbcd0ff, 0.7); fill.position.copy(V(30, 30, 60)); s.add(fill);
  }
  buildField() {
    const s = this.scene, park = this.park;
    // 잔디와 흙을 한 장의 큰 그림으로 그린다.
    const X0 = -130, X1 = 130, Z0 = -30, Z1 = 170, S = 4096 / (X1 - X0);
    const field = canvasTex(4096, Math.round((Z1 - Z0) * S), (g, w, h) => {
      const px = (x) => (x - X0) * S, py = (z) => (Z1 - z) * S;
      g.fillStyle = "#2f6b2a"; g.fillRect(0, 0, w, h);
      // 잔디 깎은 줄무늬
      g.save(); g.translate(px(0), py(0)); g.rotate(Math.PI / 4);
      for (let i = -40; i < 40; i++) { g.fillStyle = i % 2 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.05)"; g.fillRect(i * 6 * S, -400 * S, 6 * S, 800 * S); }
      g.rotate(-Math.PI / 2);
      for (let i = -40; i < 40; i++) { if (i % 2) { g.fillStyle = "rgba(255,255,255,0.03)"; g.fillRect(i * 6 * S, -400 * S, 6 * S, 800 * S); } }
      g.restore();
      const rnd = seeded(9);
      for (let i = 0; i < 40000; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)"; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
      const dirt = "#a8714a";
      // 내야 흙 (투수판 중심 반지름 29m 부채꼴)
      g.fillStyle = dirt;
      g.save();
      g.beginPath(); g.moveTo(px(0), py(-1));
      g.lineTo(px(-150), py(150)); g.lineTo(px(150), py(150)); g.closePath(); g.clip();
      g.beginPath(); g.arc(px(0), py(FIELD.MOUND_Z), 28.96 * S, 0, Math.PI * 2); g.fill();
      g.restore();
      // 내야 잔디 (다이아몬드 안쪽)
      const B = FIELD.BASE / Math.SQRT2;
      g.fillStyle = "#2f6b2a";
      g.beginPath(); g.moveTo(px(0), py(2.2)); g.lineTo(px(B - 1.9), py(B)); g.lineTo(px(0), py(2 * B - 2.2)); g.lineTo(px(-B + 1.9), py(B)); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,255,255,0.04)";
      for (let i = 0; i < 6; i++) { g.fillRect(px(-B), py(B + 9 - i * 3.6), (2 * B) * S, 1.8 * S); }
      // 홈 주변, 투수 마운드, 베이스 주변 흙
      const circ = (x, z, r) => { g.beginPath(); g.arc(px(x), py(z), r * S, 0, Math.PI * 2); g.fillStyle = dirt; g.fill(); };
      circ(0, 0, 4.2); circ(0, FIELD.MOUND_Z, 2.75); circ(B, B, 2.2); circ(-B, B, 2.2); circ(0, 2 * B, 2.2);
      // 흙 질감
      for (let i = 0; i < 16000; i++) { const x = rnd() * 70 - 35, z = rnd() * 50 - 4; g.fillStyle = rnd() < 0.5 ? "rgba(255,230,200,0.05)" : "rgba(60,30,10,0.07)"; g.fillRect(px(x), py(z), 2, 2); }
      // 흰 선: 파울 라인, 타석
      g.strokeStyle = "#f4f2ec"; g.lineWidth = 0.09 * S; g.lineCap = "butt";
      for (const sd of [-1, 1]) { const R = fenceDist(45, park) + 2; g.beginPath(); g.moveTo(px(0), py(0)); g.lineTo(px(sd * R / Math.SQRT2), py(R / Math.SQRT2)); g.stroke(); }
      g.lineWidth = 0.07 * S;
      for (const sd of [-1, 1]) g.strokeRect(px(sd * 0.72 - 0.6), py(0.9), 1.2 * S, 1.8 * S);
      // 홈플레이트
      g.fillStyle = "#fbfbf8"; g.beginPath();
      g.moveTo(px(-0.215), py(0.43)); g.lineTo(px(0.215), py(0.43)); g.lineTo(px(0.215), py(0.215)); g.lineTo(px(0), py(0)); g.lineTo(px(-0.215), py(0.215)); g.closePath(); g.fill();
      // 워닝 트랙
      g.strokeStyle = "#8f6040"; g.lineWidth = 4.5 * S;
      g.beginPath();
      for (let a = -45; a <= 45; a += 1) { const ar = (a * Math.PI) / 180, R = fenceDist(a, park) - 2.4; const x = Math.sin(ar) * R, z = Math.cos(ar) * R; if (a === -45) g.moveTo(px(x), py(z)); else g.lineTo(px(x), py(z)); }
      g.stroke();
    }, { aniso: 16 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), new THREE.MeshStandardMaterial({ map: field, roughness: 0.92 }));
    ground.rotation.x = -Math.PI / 2; ground.position.copy(V((X0 + X1) / 2, 0, (Z0 + Z1) / 2)); ground.receiveShadow = true;
    s.add(ground);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x1d3a1b, roughness: 1 }));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.02; s.add(outer);
    // 마운드와 투수판, 베이스
    const mound = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.75, 0.25, 40), new THREE.MeshStandardMaterial({ color: 0xa8714a, roughness: 1 }));
    mound.position.copy(V(0, 0.125, FIELD.MOUND_Z)); mound.receiveShadow = true; s.add(mound);
    const white = new THREE.MeshStandardMaterial({ color: 0xf8f8f4, roughness: 0.6 });
    const rubber = new THREE.Mesh(new THREE.BoxGeometry(0.61, 0.04, 0.15), white); rubber.position.copy(V(0, 0.27, FIELD.MOUND_Z)); s.add(rubber);
    const B = FIELD.BASE / Math.SQRT2;
    for (const [x, z] of [[B, B], [0, 2 * B], [-B, B]]) {
      const base = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.08, 0.38, 2, 0.02), white); base.position.copy(V(x, 0.04, z)); base.rotation.y = Math.PI / 4; base.castShadow = true; s.add(base);
    }
    // 스트라이크 존 테두리
    const Z = FIELD.ZONE;
    const pts = [[Z.x0, Z.y0], [Z.x1, Z.y0], [Z.x1, Z.y1], [Z.x0, Z.y1], [Z.x0, Z.y0]].map(([x, y]) => V(x, y, FIELD.CONTACT_Z - 0.2));
    this.zone = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.35 }));
    s.add(this.zone);
    // 타이밍 원: 공이 올 때까지 줄어들다가 칠 순간에 초록색이 된다
    this.timeRing = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.4, 56), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    this.timeRing.position.copy(V(0, (Z.y0 + Z.y1) / 2, FIELD.CONTACT_Z - 0.2)); this.timeRing.visible = false; s.add(this.timeRing);
    this.pitchMark = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.9, toneMapped: false }));
    this.pitchMark.visible = false; s.add(this.pitchMark);
  }
  buildFence() {
    const s = this.scene, park = this.park;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x173b2a, roughness: 0.85 });
    const capMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 0.3), toneMapped: false });
    const step = 2;
    for (let a = -45; a < 45; a += step) {
      const a0 = (a * Math.PI) / 180, a1 = ((a + step) * Math.PI) / 180;
      const R0 = fenceDist(a, park), R1 = fenceDist(a + step, park);
      const p0 = V(Math.sin(a0) * R0, 0, Math.cos(a0) * R0), p1 = V(Math.sin(a1) * R1, 0, Math.cos(a1) * R1);
      const len = p0.distanceTo(p1) + 0.05, mid = p0.clone().add(p1).multiplyScalar(0.5);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(len, FENCE_H, 0.5), wallMat);
      wall.position.set(mid.x, FENCE_H / 2, mid.z); wall.rotation.y = -Math.atan2(p1.z - p0.z, p1.x - p0.x); wall.receiveShadow = true;
      s.add(wall);
      const top = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, 0.55), capMat);
      top.position.set(mid.x, FENCE_H + 0.06, mid.z); top.rotation.y = wall.rotation.y; s.add(top);
    }
    // 거리 표시
    for (const a of [-45, -22, 0, 22, 45]) {
      const R = fenceDist(a, park), ar = (a * Math.PI) / 180;
      const tex = canvasTex(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#f4f2ec"; g.font = "900 96px 'Barlow Condensed', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(`${Math.round(R)}`, w / 2, h / 2 + 4); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      const p = V(Math.sin(ar) * (R - 1.1), 1.6, Math.cos(ar) * (R - 1.1));
      m.position.copy(p); m.lookAt(V(0, 1.6, 0)); s.add(m);
    }
    // 파울 폴
    const poleMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.3, 0.2), toneMapped: false });
    for (const sd of [-1, 1]) {
      const R = fenceDist(45, park), p = V(sd * R / Math.SQRT2, 11, R / Math.SQRT2);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 22, 8), poleMat); pole.position.copy(p); s.add(pole);
    }
    // 가운데 전광판
    const R = fenceDist(0, park);
    const board = canvasTex(1024, 384, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0b1a3a"); gr.addColorStop(1, "#071028");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
      let fs = 150; g.textAlign = "left";
      g.font = `italic 900 ${fs}px 'Barlow Condensed', Arial, sans-serif`;
      const tw = g.measureText("HAND BASEBALL").width;
      if (tw > w * 0.88) { fs = Math.floor((fs * w * 0.88) / tw); g.font = `italic 900 ${fs}px 'Barlow Condensed', Arial, sans-serif`; }
      const a = g.measureText("HAND "), bb = g.measureText("BASEBALL"), x0 = (w - a.width - bb.width) / 2;
      g.fillText("HAND ", x0, h / 2 - 10); g.fillStyle = "#7cc4ff"; g.fillText("BASEBALL", x0 + a.width, h / 2 - 10);
      g.fillStyle = "rgba(255,255,255,0.05)"; for (let y = 0; y < h; y += 5) g.fillRect(0, y, w, 2);
    });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(36, 13.5), new THREE.MeshBasicMaterial({ map: board, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) }));
    scr.position.copy(V(0, 26, R + 42)); s.add(scr);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(38, 15.5, 1), new THREE.MeshStandardMaterial({ color: 0x0c0f18, roughness: 0.7 }));
    frame.position.copy(V(0, 26, R + 42.6)); s.add(frame);
  }
  buildStands() {
    const s = this.scene, park = this.park, q = this.q;
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x14244f, roughness: 0.9 });
    const rnd = seeded(21), spots = [];
    // 외야 관중석: 담장 뒤로 계단식 (가운데 전광판 자리는 비움)
    for (let a = -58; a < 58; a += 4) {
      if (Math.abs(a + 2) < 12) continue;
      const ar = ((a + 2) * Math.PI) / 180, R = fenceDist(clamp(a + 2, -45, 45), park) + 4;
      for (let i = 0; i < 14; i++) {
        const rr = R + i * 1.4, y = 1 + i * 0.75;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(rr * 0.0702, 0.75, 1.4), seatMat);
        seg.position.copy(V(Math.sin(ar) * rr, y - 0.375, Math.cos(ar) * rr)); seg.rotation.y = -ar; s.add(seg);
        for (let k = 0; k < 5; k++) if (rnd() < q.crowd) { const aa = ar + (k - 2) * 0.012; spots.push([Math.sin(aa) * (rr - 0.2), y, Math.cos(aa) * (rr - 0.2)]); }
      }
    }
    // 내야 관중석: 1·3루 쪽과 홈 뒤
    for (const sd of [-1, 1]) {
      for (let d = 8; d < 90; d += 1.6) {
        for (let i = 0; i < 16; i++) {
          const off = 18 + i * 1.3, y = 1.2 + i * 0.7;
          const x = sd * (d / Math.SQRT2 + off / Math.SQRT2), z = d / Math.SQRT2 - off / Math.SQRT2;
          if (rnd() < q.crowd * 0.9) spots.push([x, y, z]);
        }
      }
    }
    // 내야 관중석 계단: 파울 라인과 나란한 줄
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 16; i++) {
        const off = 18 + i * 1.3, y = 1.2 + i * 0.7, dm = 49;
        const x = sd * (dm / Math.SQRT2 + off / Math.SQRT2), z = dm / Math.SQRT2 - off / Math.SQRT2;
        const row = new THREE.Mesh(new THREE.BoxGeometry(84, y, 1.3), seatMat);
        row.position.copy(V(x, y / 2 - 0.35, z)); row.rotation.y = Math.atan2(1, sd); s.add(row);
      }
    }
    const palette = [0x1e3a8a, 0x2563eb, 0xf1f5f9, 0x0f172a, 0xdc2626, 0xfacc15, 0x64748b, 0x93c5fd, 0xffffff];
    const skins = [0xf1c6a5, 0xd9a07b, 0xb8805c, 0xf5d0b5];
    const n = spots.length;
    const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.3, 2, 6), new THREE.MeshStandardMaterial({ roughness: 0.9 }), n);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
    const m4 = new THREE.Matrix4(), c = new THREE.Color();
    spots.forEach(([x, y, z], i) => {
      m4.makeTranslation(x, y + 0.34, -z); bodies.setMatrixAt(i, m4);
      m4.makeTranslation(x, y + 0.72, -z); heads.setMatrixAt(i, m4);
      bodies.setColorAt(i, c.setHex(palette[Math.floor(rnd() * palette.length)]).multiplyScalar(0.5));
      heads.setColorAt(i, c.setHex(skins[Math.floor(rnd() * skins.length)]).multiplyScalar(0.55));
    });
    s.add(bodies, heads);
    this.crowd = { bodies, heads, spots, phase: spots.map(() => rnd() * 6.28) };
    // 조명탑
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 7, 6.3), toneMapped: false });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3c, roughness: 0.6, metalness: 0.4 });
    const towers = [[-75, 30], [75, 30], [-95, 105], [95, 105], [-40, -18], [40, -18]];
    for (const [x, z] of towers) {
      const h = 42;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, h, 8), poleMat); pole.position.copy(V(x, h / 2, z)); s.add(pole);
      const panel = new THREE.Group(); panel.position.copy(V(x, h + 2, z)); panel.lookAt(V(0, 0, 40)); s.add(panel);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.3), lampMat); l.position.set(-3.3 + j * 1.3, -1.9 + i * 1.3, 0); panel.add(l);
      }
    }
  }
  buildPeople() {
    const s = this.scene;
    this.batter = new Body({ jersey: 0xdfe3ea, trim: 0x1f4fd6, pants: 0xdfe3ea, skin: 0xe8b996, hair: 0x15100c, cap: 0x1a3fb0, name: "PLAYER", number: 7, helmet: true });
    this.batter.root.position.copy(V(-0.78, 0, 0.25)); this.batter.root.rotation.y = Math.PI / 2;
    s.add(this.batter.root);
    // 방망이: 가슴 앞 손잡이 지점에서 뻗는다
    this.batPivot = new THREE.Group(); this.batPivot.position.set(0, 0.42, 0.16); this.batter.spine.add(this.batPivot);
    this.batPivot.rotation.order = "YXZ";
    const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.013, 0.86, 16), new THREE.MeshStandardMaterial({ color: 0xc89a5e, roughness: 0.4, metalness: 0.05 }));
    bat.position.y = 0.36; bat.castShadow = true; this.batPivot.add(bat);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 })); knob.position.y = -0.08; this.batPivot.add(knob);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })); grip.position.y = 0.02; this.batPivot.add(grip);
    this.pitcher = new Body({ jersey: 0x15171d, trim: 0xe11d48, pants: 0x2b2f3a, skin: 0xe2b28f, hair: 0x0f0c0a, cap: 0x15171d, glove: true });
    this.pitcher.root.position.copy(V(0, 0.25, FIELD.MOUND_Z)); s.add(this.pitcher.root);
    // 수비수
    this.fielders = [];
    if (this.q.fielders) {
      const B = FIELD.BASE / Math.SQRT2;
      for (const [x, z] of [[B + 1.5, B + 3], [6, 2 * B - 1], [-7, 2 * B - 2], [-B - 1, B + 3], [-30, 70], [0, 82], [30, 70]]) {
        const f = new Body({ jersey: 0x15171d, trim: 0xe11d48, pants: 0x2b2f3a, skin: 0xe2b28f, hair: 0x0f0c0a, cap: 0x15171d, glove: true });
        f.root.position.copy(V(x, 0, z)); f.root.lookAt(V(0, 0, 0));
        f.home = { x, z }; s.add(f.root); this.fielders.push(f);
      }
    }
  }
  setPlayerName(name) {
    const old = this.batter.root;
    this.scene.remove(old);
    this.batter = new Body({ jersey: 0xdfe3ea, trim: 0x1f4fd6, pants: 0xdfe3ea, skin: 0xe8b996, hair: 0x15100c, cap: 0x1a3fb0, name, number: 7, helmet: true });
    this.batter.root.position.copy(V(-0.78, 0, 0.25)); this.batter.root.rotation.y = Math.PI / 2;
    this.batter.spine.add(this.batPivot);
    this.scene.add(this.batter.root);
  }
  buildBall() {
    const tex = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = "#f7f5ef"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#c8202c"; g.lineWidth = 4;
      for (const off of [0, w / 2]) { g.beginPath(); for (let x = 0; x <= w / 2; x += 4) { const y = h / 2 + Math.sin((x / (w / 2)) * Math.PI * 2) * h * 0.28; if (x === 0) g.moveTo(off + x, y); else g.lineTo(off + x, y); } g.stroke(); }
    });
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.037, 20, 14), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
    this.ball.scale.setScalar(1.7); this.ball.castShadow = true; this.scene.add(this.ball);
    const glowTex = canvasTex(64, 64, (c, w, h) => {
      const r = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(180,215,255,0.45)"); r.addColorStop(1, "rgba(120,180,255,0)");
      c.fillStyle = r; c.fillRect(0, 0, w, h);
    }, { srgb: false });
    this.glowTex = glowTex;
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.6, 1.8, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true }));
    this.glow.scale.setScalar(0.4); this.scene.add(this.glow);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; this.ballShadow = shadow; this.scene.add(shadow);
    // 꼬리
    const N = (this.trailN = 26); this.trailPts = [];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    const idx = []; for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    this.trail = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    this.trail.frustumCulled = false; this.scene.add(this.trail);
  }
  buildFx() {
    const P = 900, g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(P * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(P * 3), 3));
    this.sparks = { geo: g, list: [], max: P };
    this.sparkPts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.12, map: this.glowTex, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    this.sparkPts.frustumCulled = false; this.scene.add(this.sparkPts);
    const ringTex = canvasTex(256, 256, (c, w) => {
      c.clearRect(0, 0, w, w); const cx = w / 2;
      c.strokeStyle = "rgba(255,220,90,0.95)"; c.lineWidth = 8; c.beginPath(); c.arc(cx, cx, cx * 0.85, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = "rgba(255,220,90,0.45)"; c.lineWidth = 5; c.beginPath(); c.arc(cx, cx, cx * 0.55, 0, Math.PI * 2); c.stroke();
    }, { srgb: false });
    this.landRing = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.landRing.rotation.x = -Math.PI / 2; this.landRing.visible = false; this.scene.add(this.landRing);
  }
  burst(pos, color, n = 30, speed = 4, size = 1, life = 1) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      if (this.sparks.list.length >= this.sparks.max) this.sparks.list.shift();
      const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.7));
      this.sparks.list.push({ p: pos.clone ? pos.clone() : V(pos.x, pos.y, pos.z), v: d, life, max: life, c, g: size > 1 ? 4 : 6 });
    }
  }
  fireworks() {
    const cols = [0xffd84a, 0x7cc4ff, 0xff5a7a, 0x8dffb0, 0xffffff];
    for (let i = 0; i < 6; i++) setTimeout(() => {
      const p = V(rand(-60, 60), rand(35, 60), rand(90, 150));
      this.burst(p, cols[i % cols.length], 90, 18, 2, 2.2);
      this.onFirework && this.onFirework();
    }, i * 320);
  }
  hitFx(perfect) {
    const p = this.ball.position.clone();
    this.burst(p, perfect ? 0xd8ff6a : 0xffffff, perfect ? 50 : 24, perfect ? 6 : 3.5);
    this.shake = perfect ? 0.4 : 0.18;
  }
  resize(w, h) {
    this.W = w; this.H = h;
    this.renderer.setSize(w, h, false);
    const aspect = w / h; this.camera.aspect = aspect;
    this.portrait = aspect < 0.9;
    this.camera.fov = this.portrait ? Math.min(90, (2 * Math.atan(Math.tan((52 * Math.PI) / 360) / aspect) * 180) / Math.PI) : aspect < 1.25 ? 58 : 48;
    this.camera.updateProjectionMatrix();
    if (this.composer) { this.composer.setSize(w, h); const pr = this.renderer.getPixelRatio(); this.bloom.resolution.set(w * pr * 0.5, h * pr * 0.5); }
  }
  toScreen(p) {
    const v = V(p.x, p.y, p.z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.W, y: ((1 - v.y) / 2) * this.H, on: v.z < 1 };
  }
  animBatter(round, t) {
    const b = this.batter, k = (t - round.batter.swingT) / 0.34;
    b.hips.position.y = 0.86;
    b.setLeg(-1, -0.25, 0.45, -0.2, -0.3); b.setLeg(1, -0.35, 0.5, -0.15, -0.35);
    b.spine.rotation.x = 0.28;
    let yaw, tilt, twist;
    if (k >= 0 && k < 1.6) {
      const e = k < 1 ? ease(k) : 1;
      // 방망이: 어깨 뒤에서 앞으로 수평으로 돌아 나온다 (k≈0.35 에서 공과 만남)
      yaw = lerp(-0.7, 2.6, e); tilt = k < 0.35 ? lerp(0.35, 1.5, smooth(k / 0.35)) : lerp(1.5, 1.9, smooth((k - 0.35) / 0.65));
      twist = lerp(-0.45, 1.25, e);
      b.setLeg(1, lerp(-0.35, -0.7, e), lerp(0.5, 0.25, e), -0.1, -0.35);
    } else {
      const bob = Math.sin(t * 3) * 0.05;
      yaw = -0.7 + bob; tilt = 0.35; twist = -0.45;
    }
    b.spine.rotation.y = twist;
    this.batPivot.rotation.set(tilt, yaw - twist * 0.3, -0.25);
    // 두 손은 방망이 손잡이 쪽으로
    b.setArm(-1, 0.5, -1.15, 1.0); b.setArm(1, 0.45, -1.25, 0.8);
  }
  animPitcher(round, t) {
    const p = this.pitcher, w = t - round.pitcher.windT, rel = t - round.pitcher.relT;
    p.root.rotation.y = 0;
    if (round.phase === "windup" && w >= 0) {
      const k = w / 1.35;
      if (k < 0.45) { // 세트
        p.ready(t, 0.15); p.setArm(-1, 0.25, -1.0, 1.6); p.setArm(1, 0.25, -1.0, 1.6);
      } else if (k < 0.78) { // 다리 들기
        const e = smooth((k - 0.45) / 0.33);
        p.hips.position.y = 0.94; p.spine.rotation.x = 0.05;
        p.setLeg(1, lerp(-0.1, -1.5, e), lerp(0.1, 1.6, e), 0); p.setLeg(-1, -0.05, 0.1, 0);
        p.root.rotation.y = lerp(0, -0.9, e);
        p.setArm(-1, 0.3, -1.0, 1.6); p.setArm(1, 0.3, -1.0, 1.6);
      } else { // 내딛으며 팔 뒤로
        const e = smooth((k - 0.78) / 0.22);
        p.root.rotation.y = lerp(-0.9, -0.3, e);
        p.hips.position.y = lerp(0.94, 0.8, e); p.spine.rotation.x = lerp(0.05, 0.2, e);
        p.setLeg(1, lerp(-1.5, -0.9, e), lerp(1.6, 0.6, e), 0.2); p.setLeg(-1, lerp(-0.05, 0.6, e), lerp(0.1, 0.5, e), 0.3);
        p.setArm(-1, lerp(1.2, 2.6, e), lerp(-0.2, 0.9, e), lerp(1.2, 1.6, e)); p.setArm(1, lerp(0.3, 1.2, e), lerp(-1.0, -1.4, e), 0.4);
      }
    } else if (rel >= 0 && rel < 0.7) { // 공 놓고 팔로 스로
      const e = ease(rel / 0.35);
      p.root.rotation.y = lerp(-0.3, 0.15, e);
      p.hips.position.y = 0.8; p.spine.rotation.x = lerp(0.2, 0.75, e);
      p.setLeg(1, -0.9, 0.6, 0.2); p.setLeg(-1, lerp(0.6, 0.2, e), lerp(0.5, 1.3, e), 0.4);
      p.setArm(-1, lerp(2.6, 0.6, e), lerp(0.9, -1.5, e), lerp(1.6, 0.2, e)); p.setArm(1, lerp(1.2, 0.6, e), -0.5, 1.2);
    } else {
      p.ready(t, 0.15); p.setArm(-1, 0.25, -0.6, 1.2); p.setArm(1, 0.25, -0.8, 1.4);
    }
  }
  update(round, dt, tS) {
    const t = round.t, b = round.ball;
    this.animBatter(round, t);
    this.animPitcher(round, t);
    for (const f of this.fielders) f.ready(tS + f.home.x, 0.7);
    // 공
    const visible = b.state !== "held";
    this.ball.visible = visible; this.glow.visible = visible; this.ballShadow.visible = visible;
    const pos = V(b.p.x, Math.max(0.04, b.p.y), b.p.z);
    this.ball.position.copy(pos); this.ball.rotation.x += dt * 30; this.ball.rotation.z += dt * 12;
    this.glow.position.copy(pos);
    this.ballShadow.position.copy(V(b.p.x, 0.02, b.p.z));
    this.ballShadow.scale.setScalar(1 + Math.max(0, b.p.y) * 0.05);
    this.ballShadow.material.opacity = clamp(0.45 - b.p.y * 0.01, 0.12, 0.45);
    this.glow.scale.setScalar(b.state === "batted" ? 0.9 : 0.4);
    const moving = b.state === "pitch" || (b.state === "batted" && b.p.y > 0.05);
    this.updateTrail(moving ? pos : null, b.state === "batted");
    // 스트라이크 존과 공이 지나간 자리
    this.zone.material.opacity = round.phase === "pitch" || round.phase === "windup" ? 0.45 : 0.18;
    if (round.pitch && (round.phase === "result" || round.phase === "wait") && round.ball.state === "caught") {
      this.pitchMark.visible = true; this.pitchMark.position.copy(V(round.pitch.tgt.x, round.pitch.tgt.y, FIELD.CONTACT_Z - 0.2));
    } else if (round.phase !== "result") this.pitchMark.visible = false;
    // 타이밍 원
    if (round.phase === "pitch" && b.state === "pitch" && !round.swing) {
      const left = round.pitch.relT + round.pitch.T - t, w = round.d.window;
      this.timeRing.visible = left > -w;
      this.timeRing.scale.setScalar(1 + clamp(left / 0.7, 0, 1) * 1.4);
      const c = this.timeRing.material.color;
      if (Math.abs(left) < w * 0.6) c.setRGB(0.5, 2.2, 0.6); else if (left < 0.35) c.setRGB(2, 1.7, 0.4); else c.setRGB(1.4, 1.5, 1.7);
      this.timeRing.material.opacity = clamp(1 - left / 1.2, 0.25, 1);
    } else this.timeRing.visible = false;
    // 떨어진 자리 고리
    if (round.landing && round.phase === "result") {
      this.landRing.visible = true; this.landRing.position.copy(V(round.landing.x, 0.05, round.landing.z));
      this.landRing.scale.setScalar(1 + Math.sin(tS * 6) * 0.08);
    } else this.landRing.visible = false;
    // 불꽃
    const list = this.sparks.list, pa = this.sparks.geo.attributes.position.array, ca = this.sparks.geo.attributes.color.array;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i]; s.life -= dt; s.v.y -= s.g * dt; s.v.multiplyScalar(0.985); s.p.addScaledVector(s.v, dt);
      if (s.life <= 0) list.splice(i, 1);
    }
    for (let i = 0; i < this.sparks.max; i++) {
      const s = list[i];
      if (s) { const f = (s.life / s.max) * 2.2; pa[i * 3] = s.p.x; pa[i * 3 + 1] = s.p.y; pa[i * 3 + 2] = s.p.z; ca[i * 3] = s.c.r * f; ca[i * 3 + 1] = s.c.g * f; ca[i * 3 + 2] = s.c.b * f; }
      else pa[i * 3 + 1] = -100;
    }
    this.sparks.geo.attributes.position.needsUpdate = true; this.sparks.geo.attributes.color.needsUpdate = true;
    this.sparkPts.material.size = this.mode === "follow" ? 0.6 : 0.12;
    // 관중
    this.cheer = Math.max(0, this.cheer - dt * 0.4);
    if (this.cheer > 0.01 || this._cheerWas) {
      const { bodies, heads, spots, phase } = this.crowd, m4 = new THREE.Matrix4();
      for (let i = 0; i < spots.length; i++) {
        const [x, y, z] = spots[i], j = Math.max(0, Math.sin(tS * 9 + phase[i])) * 0.3 * this.cheer;
        m4.makeTranslation(x, y + 0.34 + j, -z); bodies.setMatrixAt(i, m4);
        m4.makeTranslation(x, y + 0.72 + j, -z); heads.setMatrixAt(i, m4);
      }
      bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
      this._cheerWas = this.cheer > 0.01;
    }
    // 카메라: 칠 때는 포수 자리 뒤, 맞은 공은 따라간다
    const zv = this.viewZoom;
    let want, look, k = 1 - Math.exp(-dt * 3);
    const follow = b.state === "batted" && (round.phase === "batted" || round.phase === "result");
    this.mode = follow ? "follow" : "bat";
    if (follow) {
      const bp = b.p, d = Math.hypot(bp.x, bp.z);
      want = V(bp.x * 0.35, 5 + Math.min(18, d * 0.12), Math.max(-14, bp.z * 0.35 - 16));
      look = V(bp.x, Math.max(1, bp.y * 0.8), bp.z);
      k = 1 - Math.exp(-dt * 2.2);
    } else if (this.portrait) {
      want = V(0.5, 1.4 + 1.2 * zv, -2.4 - 3.4 * zv); look = V(0.05, 0.8, 11);
    } else {
      want = V(0.55, 1.05 + 0.75 * zv, -1.5 - 2.3 * zv); look = V(0.1, 1.0, 12);
    }
    this.camPos.lerp(want, k); this.camLook.lerp(look, follow ? 1 - Math.exp(-dt * 6) : k);
    this.camera.position.copy(this.camPos);
    this.shake = Math.max(0, this.shake - dt);
    if (this.shake > 0) this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake * 0.2, (Math.random() - 0.5) * this.shake * 0.2, 0));
    this.camera.lookAt(this.camLook);
  }
  updateTrail(pos, hot) {
    const pts = this.trailPts, N = this.trailN;
    if (pos) pts.push(pos.clone()); else if (pts.length) pts.shift();
    while (pts.length > N) pts.shift();
    const maxLen = hot ? 14 : 4;
    let len = 0;
    for (let i = pts.length - 1; i > 0; i--) { len += pts[i].distanceTo(pts[i - 1]); if (len > maxLen) { pts.splice(0, i); break; } }
    const pa = this.trail.geometry.attributes.position.array, ca = this.trail.geometry.attributes.color.array;
    const cam = this.camera.position, n = pts.length;
    const base = hot ? new THREE.Color(1.8, 1.6, 0.7) : new THREE.Color(0.8, 1.35, 2.4);
    if (n) base.multiplyScalar(clamp((pts[n - 1].distanceTo(cam) - 1.5) / 3, 0, 1));
    const width = hot ? 0.12 : 0.05;
    const tmp = new THREE.Vector3(), side = new THREE.Vector3(), view = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const o = i * 6;
      if (i >= n || n < 2) { for (let j = 0; j < 6; j++) { pa[o + j] = 0; ca[o + j] = 0; } continue; }
      const p = pts[i], a = pts[Math.max(0, i - 1)], b2 = pts[Math.min(n - 1, i + 1)];
      tmp.subVectors(b2, a); view.subVectors(cam, p); side.crossVectors(tmp, view).normalize();
      const f = (i + 1) / n, w = width * Math.pow(f, 1.2);
      pa[o] = p.x + side.x * w; pa[o + 1] = p.y + side.y * w; pa[o + 2] = p.z + side.z * w;
      pa[o + 3] = p.x - side.x * w; pa[o + 4] = p.y - side.y * w; pa[o + 5] = p.z - side.z * w;
      const fade = Math.pow(f, 1.5);
      for (const off of [0, 3]) { ca[o + off] = base.r * fade; ca[o + off + 1] = base.g * fade; ca[o + off + 2] = base.b * fade; }
    }
    this.trail.geometry.attributes.position.needsUpdate = true; this.trail.geometry.attributes.color.needsUpdate = true;
  }
  render() { if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera); }
}
const rand = (a, b) => a + Math.random() * (b - a);
