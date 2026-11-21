// three.js 로 그리는 3D 경기장, 선수, 셔틀콕.
// 게임 좌표 (x, y, z) 를 three 좌표 (x, y, -z) 로 바꿔 쓴다. 카메라는 내 선수 뒤에서 -z 쪽(상대 코트)을 본다.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { COURT, clamp, lerp } from "./game.js";

const { L, NET_Z, HW, DHW, NET_H, NET_BOTTOM, SHORT, LONG } = COURT;
const V = (x, y, z) => new THREE.Vector3(x, y, -z);
const ease = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);

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

// ═════════════════ 선수 (3D 사람) ═════════════════
class Athlete {
  constructor({ shirt, trim, shorts, skin, hair, shoe, name, emblem, racket, scale = 1 }) {
    const M = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
    this.mat = {
      shirt: M(shirt, 0.75), trim: M(trim, 0.6), shorts: M(shorts, 0.8), skin: M(skin, 0.55),
      hair: M(hair, 0.85), shoe: M(shoe, 0.5), sole: M(0x2a2d36, 0.8), sock: M(0xf2f3f7, 0.9),
    };
    const add = (geo, mat, parent, pos, rot, scl) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true; m.receiveShadow = true;
      if (pos) m.position.set(...pos);
      if (rot) m.rotation.set(...rot);
      if (scl) m.scale.set(...scl);
      parent.add(m); return m;
    };
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);
    const G = (parent, pos) => { const g = new THREE.Group(); if (pos) g.position.set(...pos); parent.add(g); return g; };
    const { mat } = this;

    this.root = new THREE.Group();
    this.body = G(this.root); this.body.scale.setScalar(scale);
    this.hips = G(this.body, [0, 0.94, 0]);
    add(new THREE.CylinderGeometry(0.165, 0.19, 0.27, 20), mat.shorts, this.hips, [0, -0.06, 0], null, [1, 1, 0.72]);
    this.spine = G(this.hips, [0, 0.02, 0]);
    add(cap(0.155, 0.27), mat.shirt, this.spine, [0, 0.27, 0], null, [1.3, 1, 0.78]);
    add(new THREE.TorusGeometry(0.06, 0.016, 8, 20), mat.trim, this.spine, [0, 0.5, 0], [Math.PI / 2, 0, 0], [1, 0.8, 1]);
    // 등 번호판 (이름)
    if (name) {
      const tex = canvasTex(512, 512, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = "#1b1f2a"; g.textAlign = "center"; g.textBaseline = "middle";
        g.font = "900 118px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif";
        g.fillText(name.toUpperCase(), w / 2, h * 0.3, w * 0.92);
        if (emblem) { // 셔틀콕 모양 엠블럼
          g.save(); g.translate(w / 2, h * 0.62); g.fillStyle = "#1b1f2a";
          for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 18, 30); g.lineTo(s * 78, -34); g.lineTo(s * 40, -34); g.lineTo(s * 2, 14); g.closePath(); g.fill(); }
          g.beginPath(); g.arc(0, 42, 18, 0, Math.PI * 2); g.fill();
          g.restore();
        }
      }, { aniso: 4 });
      const back = add(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }), this.spine, [0, 0.31, -0.125], [0, Math.PI, 0]);
      back.castShadow = false;
    }
    add(new THREE.CylinderGeometry(0.048, 0.055, 0.1, 12), mat.skin, this.spine, [0, 0.53, 0]);
    this.head = G(this.spine, [0, 0.665, 0]);
    add(new THREE.SphereGeometry(0.105, 28, 20), mat.skin, this.head, null, null, [0.9, 1.1, 1]);
    add(new THREE.SphereGeometry(0.11, 28, 20), mat.hair, this.head, [0, 0.022, -0.016], null, [0.94, 1.02, 0.98]);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.02, 8, 6), mat.skin, this.head, [s * 0.094, -0.005, 0], null, [0.6, 1, 1]);
    const eye = M(0x15171c, 0.4);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.011, 8, 6), eye, this.head, [s * 0.034, 0.008, 0.094]);

    // 팔: side -1 = 오른팔 (몸 기준 오른쪽은 로컬 -x)
    this.arms = {};
    for (const side of [-1, 1]) {
      const sh = G(this.spine, [side * 0.205, 0.43, 0]);
      const abd = G(sh), flex = G(abd);
      add(new THREE.CylinderGeometry(0.058, 0.052, 0.13, 12), mat.shirt, flex, [0, -0.05, 0]);
      add(cap(0.044, 0.2), mat.skin, flex, [0, -0.155, 0]);
      const elbow = G(flex, [0, -0.29, 0]);
      add(cap(0.039, 0.19), mat.skin, elbow, [0, -0.13, 0]);
      const wrist = G(elbow, [0, -0.27, 0]);
      add(new THREE.SphereGeometry(0.043, 12, 10), mat.skin, wrist, [0, -0.04, 0], null, [0.85, 1.25, 0.6]);
      this.arms[side] = { sh, abd, flex, elbow, wrist };
    }
    // 라켓 (오른손)
    this.racket = G(this.arms[-1].wrist, [0, -0.05, 0]);
    this.racket.rotation.y = Math.PI / 2;
    const frame = M(racket, 0.35, { metalness: 0.4 });
    add(new THREE.CylinderGeometry(0.0155, 0.0145, 0.2, 10), M(0x22252e, 0.9), this.racket, [0, -0.08, 0]);
    add(new THREE.CylinderGeometry(0.0055, 0.0055, 0.26, 6), M(0xcfd5e2, 0.3, { metalness: 0.6 }), this.racket, [0, -0.31, 0]);
    add(new THREE.TorusGeometry(0.104, 0.0075, 8, 40), frame, this.racket, [0, -0.555, 0], null, [1, 1.17, 1]);
    const strings = canvasTex(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.strokeStyle = "rgba(235,240,250,0.85)"; g.lineWidth = 1.2;
      for (let i = 6; i < w; i += 9) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    }, { aniso: 2 });
    const sm = add(new THREE.CircleGeometry(0.1, 32), new THREE.MeshBasicMaterial({ map: strings, transparent: true, side: THREE.DoubleSide, depthWrite: false }), this.racket, [0, -0.555, 0], null, [1, 1.17, 1]);
    sm.castShadow = false;

    // 다리
    this.legs = {};
    for (const side of [-1, 1]) {
      const hip = G(this.hips, [side * 0.095, -0.03, 0]);
      add(new THREE.CylinderGeometry(0.09, 0.083, 0.2, 14), mat.shorts, hip, [0, -0.09, 0]);
      add(cap(0.07, 0.3), mat.skin, hip, [0, -0.22, 0]);
      const knee = G(hip, [0, -0.43, 0]);
      add(cap(0.052, 0.31), mat.skin, knee, [0, -0.2, 0]);
      add(new THREE.CylinderGeometry(0.052, 0.048, 0.13, 12), mat.sock, knee, [0, -0.36, 0]);
      const ankle = G(knee, [0, -0.44, 0]);
      add(new RoundedBoxGeometry(0.1, 0.075, 0.27, 2, 0.03), mat.shoe, ankle, [0, -0.03, 0.05]);
      add(new RoundedBoxGeometry(0.104, 0.022, 0.275, 2, 0.01), mat.sole, ankle, [0, -0.068, 0.05]);
      this.legs[side] = { hip, knee, ankle };
    }
    this.swingStart = -9;
  }
  setArm(side, theta, flex, bend, twist = 0) {
    const a = this.arms[side];
    a.abd.rotation.z = side * theta;
    a.flex.rotation.x = flex;
    a.elbow.rotation.z = side * bend * 0.5;
    a.elbow.rotation.x = -Math.abs(bend) * 0.9;
    a.wrist.rotation.x = twist;
  }
  // s: 경기 쪽 선수 상태, t: 게임 시각, opt: { facing, turn, arm: {theta, bend} | null }
  update(s, t, opt) {
    const { root, hips, spine, legs } = this;
    root.position.copy(V(s.x, 0, s.z));
    root.rotation.y = opt.facing + (opt.turn || 0);
    const run = clamp(s.speed / 3.5, 0, 1), lunge = s.lunge || 0;
    const ph = s.walk;
    hips.position.y = 0.92 - 0.05 * (1 - run) - lunge * 0.3 + Math.abs(Math.sin(ph)) * 0.03 * run;
    spine.rotation.x = 0.14 + run * 0.12 + lunge * 0.28;
    // 다리: 준비 자세 + 달리기 + 런지
    for (const side of [-1, 1]) {
      const l = legs[side];
      const p = ph + (side < 0 ? 0 : Math.PI);
      let hx = -0.38 + Math.sin(p) * 0.75 * run;
      let kx = 0.72 + Math.max(0, Math.sin(p + Math.PI / 2)) * 1.0 * run;
      let ax = -0.32;
      if (side < 0) { hx = lerp(hx, -1.45, lunge); kx = lerp(kx, 1.5, lunge); ax = lerp(ax, -0.05, lunge); }
      else { hx = lerp(hx, 0.8, lunge); kx = lerp(kx, 0.25, lunge); ax = lerp(ax, 0.45, lunge); }
      l.hip.rotation.x = hx; l.hip.rotation.z = side * -0.13 * (1 - lunge * 0.5);
      l.knee.rotation.x = kx; l.ankle.rotation.x = ax;
    }
    // 팔: 휘두르는 중이면 동작, 아니면 카메라에 보이는 팔 각도나 준비 자세
    const k = (t - s.swingT) / 0.3;
    let twist = 0;
    if (k >= 0 && k < 1) {
      const e = ease(k), kind = s.swingKind;
      if (kind === "smash" || kind === "clear" || kind === "long" || kind === "drop") {
        this.setArm(-1, lerp(2.75, 0.45, e), lerp(0.35, -0.95, e), k < 0.45 ? lerp(1.9, 0.15, ease(k / 0.45)) : 0.15);
        twist = lerp(-0.55, 0.45, e);
      } else if (kind === "drive") {
        this.setArm(-1, lerp(1.55, 1.25, e), lerp(1.0, -1.3, e), lerp(0.7, 0.1, e));
        twist = lerp(-0.6, 0.5, e);
      } else {
        this.setArm(-1, lerp(0.35, 0.7, e), lerp(0.9, -1.3, e), lerp(0.4, 0.1, e));
        twist = lerp(-0.3, 0.3, e);
      }
      this.setArm(1, lerp(0.9, 0.3, e), lerp(-1.2, -0.2, e), 0.3);
    } else if (opt.arm) {
      this.setArm(-1, opt.arm.theta, -0.35, opt.arm.bend);
      this.setArm(1, 0.28, -0.55, 0.3);
    } else {
      const idle = Math.sin(t * 2.2) * 0.04;
      this.setArm(-1, 0.55 + idle, -0.45, 1.75);
      this.setArm(1, 0.28, -0.55, 0.3 + idle);
    }
    spine.rotation.y = twist;
  }
}

// ═════════════════ 세계 ═════════════════
export class World {
  constructor(canvas, quality) {
    this.q = quality; // { dpr, bloom, reflect, shadows, crowd }
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality.dpr <= 1.5, powerPreference: "high-performance" }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.92;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = quality.shadows > 0; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04060e);
    this.scene.fog = new THREE.Fog(0x04060e, 26, 70);
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 160);
    this.camPos = V(1.3, 2.3, 0); this.camLook = V(0.5, 0.85, 12);
    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.45;
    this.shake = 0; this.cheer = 0;
    this.viewZoom = 1; // 경기 화면 거리: 1보다 작으면 가깝게, 크면 멀게
    this.buildLights();
    this.buildFloor();
    this.buildNet();
    this.buildArena();
    this.buildPlayers();
    this.buildShuttle();
    this.buildFx();
    if (quality.bloom) {
      this.composer = new EffectComposer(r);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.38, 0.4, 1.05);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
  }
  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0x9fb4ff, 0x2a1a0c, 0.32));
    const key = new THREE.DirectionalLight(0xfff4e6, 2.0);
    key.position.copy(V(3, 16, 2)); key.target.position.copy(V(0, 0, NET_Z));
    s.add(key, key.target);
    if (this.q.shadows) {
      key.castShadow = true;
      key.shadow.mapSize.set(this.q.shadows, this.q.shadows);
      const c = key.shadow.camera; c.left = -9; c.right = 9; c.top = 11; c.bottom = -11; c.near = 4; c.far = 40;
      key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    }
    for (const [x, z] of [[-6, 1], [6, 1], [-6, 12], [6, 12]]) {
      const sp = new THREE.SpotLight(0xdfe8ff, 60, 40, 0.6, 0.6, 1.6);
      sp.position.copy(V(x, 14, z)); sp.target.position.copy(V(0, 0, NET_Z));
      s.add(sp, sp.target);
    }
  }
  buildFloor() {
    const s = this.scene, q = this.q;
    if (q.reflect) {
      const refl = new Reflector(new THREE.PlaneGeometry(70, 70), {
        textureWidth: Math.round(window.innerWidth * 0.5), textureHeight: Math.round(window.innerHeight * 0.5), color: 0x8a8a8a, clipBias: 0.003,
      });
      refl.rotation.x = -Math.PI / 2; refl.position.y = -0.002;
      s.add(refl);
    }
    const rnd = seeded(11);
    const wood = canvasTex(512, 512, (g, w, h) => {
      const tones = ["#8a5630", "#9a6236", "#7d4b28", "#a46a3c", "#915a32"];
      const pw = w / 8;
      for (let i = 0; i < 8; i++) {
        let y = -rnd() * 200;
        while (y < h) {
          const len = 150 + rnd() * 220;
          g.fillStyle = tones[Math.floor(rnd() * tones.length)];
          g.fillRect(i * pw, y, pw, len);
          g.strokeStyle = "rgba(40,20,8,0.12)"; g.lineWidth = 1;
          for (let k = 0; k < 6; k++) { const gx = i * pw + rnd() * pw; g.beginPath(); g.moveTo(gx, y); g.lineTo(gx + (rnd() - 0.5) * 6, y + len); g.stroke(); }
          g.fillStyle = "rgba(30,14,4,0.55)"; g.fillRect(i * pw, y, pw, 2);
          y += len;
        }
        g.fillStyle = "rgba(30,14,4,0.5)"; g.fillRect(i * pw, 0, 2, h);
      }
    }, { repeat: [14, 14] });
    const floorMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.42, metalness: 0, transparent: !!q.reflect, opacity: q.reflect ? 0.9 : 1 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    floor.position.copy(V(0, 0, NET_Z));
    s.add(floor);

    // 코트 (초록 매트 + 흰 선)
    const X0 = -3.6, X1 = 3.6, Z0 = -0.7, Z1 = L + 0.7;
    const S = 150;
    const court = canvasTex(Math.round((X1 - X0) * S), Math.round((Z1 - Z0) * S), (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, "#1a7458"); gr.addColorStop(0.5, "#1f8463"); gr.addColorStop(1, "#1a7458");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const r2 = seeded(5);
      for (let i = 0; i < 9000; i++) { g.fillStyle = r2() < 0.5 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.03)"; g.fillRect(r2() * w, r2() * h, 2, 2); }
      const px = (x) => (x - X0) * S, py = (z) => (Z1 - z) * S;
      const lw = 0.04 * S;
      g.fillStyle = "#f4f6f8";
      const lineZ = (x, z0, z1) => g.fillRect(px(x) - lw / 2, py(z1), lw, py(z0) - py(z1));
      const lineX = (z, x0, x1) => g.fillRect(px(x0), py(z) - lw / 2, px(x1) - px(x0), lw);
      lineZ(-DHW, 0, L); lineZ(DHW, 0, L); lineZ(-HW, 0, L); lineZ(HW, 0, L);
      lineX(0, -DHW, DHW); lineX(L, -DHW, DHW); lineX(LONG, -DHW, DHW); lineX(L - LONG, -DHW, DHW);
      lineX(NET_Z - SHORT, -DHW, DHW); lineX(NET_Z + SHORT, -DHW, DHW);
      lineZ(0, 0, NET_Z - SHORT); lineZ(0, NET_Z + SHORT, L);
    }, { aniso: 16 });
    const courtMat = new THREE.MeshPhysicalMaterial({ map: court, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.22, transparent: !!q.reflect, opacity: q.reflect ? 0.88 : 1 });
    const cm = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), courtMat);
    cm.rotation.x = -Math.PI / 2; cm.position.copy(V(0, 0.003, (Z0 + Z1) / 2)); cm.receiveShadow = true;
    s.add(cm);
  }
  buildNet() {
    const s = this.scene;
    const blue = new THREE.MeshStandardMaterial({ color: 0x1d4fd6, roughness: 0.4, metalness: 0.3 });
    for (const x of [-DHW - 0.05, DHW + 0.05]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, NET_H + 0.02, 12), blue);
      post.position.copy(V(x, (NET_H + 0.02) / 2, NET_Z)); post.castShadow = true; s.add(post);
      const base = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.3, 0.5, 2, 0.04), blue);
      base.position.copy(V(x + Math.sign(x) * 0.12, 0.15, NET_Z)); base.castShadow = true; s.add(base);
    }
    const netTex = canvasTex(1024, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.strokeStyle = "rgba(12,14,22,0.9)"; g.lineWidth = 1.4;
      for (let x = 0; x <= w; x += 6.5) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 6.5) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = "rgba(12,14,22,0.9)"; g.fillRect(0, h - 4, w, 4);
    }, { aniso: 8 });
    const net = new THREE.Mesh(new THREE.PlaneGeometry(DHW * 2, NET_H - NET_BOTTOM), new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, roughness: 1 }));
    net.position.copy(V(0, (NET_H + NET_BOTTOM) / 2, NET_Z)); net.castShadow = true;
    s.add(net);
    const tape = new THREE.Mesh(new THREE.BoxGeometry(DHW * 2, 0.075, 0.012), new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: 0.6 }));
    tape.position.copy(V(0, NET_H - 0.0375, NET_Z)); tape.castShadow = true; s.add(tape);
  }
  buildArena() {
    const s = this.scene, q = this.q;
    // LED 광고판
    const words = ["HAND BADMINTON", "손 배드민턴", "OPEN 2026", "HAND BADMINTON", "SMASH IT"];
    const led = canvasTex(2048, 160, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1a4fe0"); gr.addColorStop(1, "#0b2a8f");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffffff"; g.textBaseline = "middle"; g.textAlign = "center";
      g.font = "900 92px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif";
      const seg = w / words.length;
      words.forEach((t, i) => g.fillText(t, seg * (i + 0.5), h / 2 + 4, seg * 0.9));
      g.fillStyle = "rgba(255,255,255,0.06)"; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    }, { repeat: [1, 1] });
    const ledMat = new THREE.MeshBasicMaterial({ map: led, toneMapped: false, color: new THREE.Color(0.85, 0.85, 0.85) });
    const board = (x, z, len, rotY) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.82, 0.12), ledMat);
      m.position.copy(V(x, 0.41, z)); m.rotation.y = rotY; s.add(m);
    };
    for (let i = 0; i < 3; i++) board(-8 + i * 8, L + 2.8, 7.8, 0);
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) board(sd * (DHW + 2.6), -1.4 + i * 7.4, 7.2, Math.PI / 2);

    // 관중석과 관중
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x10205a, roughness: 0.85 });
    const rows = 17;
    const spots = [];
    const rnd = seeded(23);
    const tier = (axis, sd) => {
      for (let i = 0; i < rows; i++) {
        const y = 0.9 + i * 0.5;
        if (axis === "far") {
          const z = L + 8.5 + i * 0.95;
          const m = new THREE.Mesh(new THREE.BoxGeometry(46, 0.46, 0.92), seatMat);
          m.position.copy(V(0, y - 0.23, z)); s.add(m);
          for (let x = -22; x < 22; x += 0.56) if (rnd() < q.crowd) spots.push([x + (rnd() - 0.5) * 0.15, y, z - 0.15]);
        } else {
          const x = sd * (DHW + 7.5 + i * 0.95);
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.46, 30), seatMat);
          m.position.copy(V(x, y - 0.23, NET_Z + 2)); s.add(m);
          for (let z = -8; z < 22; z += 0.56) if (rnd() < q.crowd) spots.push([x - sd * 0.15, y, z + (rnd() - 0.5) * 0.15]);
        }
      }
    };
    tier("far"); tier("side", -1); tier("side", 1);
    const palette = [0x1e3a8a, 0x2563eb, 0xf1f5f9, 0x0f172a, 0x334155, 0x1d4ed8, 0xe11d48, 0xfacc15, 0x64748b, 0x93c5fd];
    const skins = [0xf1c6a5, 0xd9a07b, 0xb8805c, 0xf5d0b5];
    const n = spots.length;
    const bodyGeo = new THREE.CapsuleGeometry(0.19, 0.3, 3, 8), headGeo = new THREE.SphereGeometry(0.105, 10, 8);
    const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), n);
    const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
    const m4 = new THREE.Matrix4(), c = new THREE.Color();
    this.crowd = { bodies, heads, spots, phase: spots.map(() => rnd() * 6.28) };
    spots.forEach(([x, y, z], i) => {
      m4.makeTranslation(x, y + 0.34, -z); bodies.setMatrixAt(i, m4);
      m4.makeTranslation(x, y + 0.72, -z); heads.setMatrixAt(i, m4);
      bodies.setColorAt(i, c.setHex(palette[Math.floor(rnd() * palette.length)]).multiplyScalar(0.42));
      heads.setColorAt(i, c.setHex(skins[Math.floor(rnd() * skins.length)]).multiplyScalar(0.5));
    });
    s.add(bodies, heads);

    // 천장 조명 (빛번짐용)
    const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.12, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 5.4), toneMapped: false }), 40);
    let li = 0;
    for (let x = -14; x <= 14; x += 7) for (let z = -6; z <= 22; z += 4) if (li < 40) { m4.makeTranslation(x, 12.5 + Math.abs(x) * 0.12, -z); lamps.setMatrixAt(li++, m4); }
    lamps.count = li; s.add(lamps);

    // 심판석
    const chair = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x2a3348, roughness: 0.5, metalness: 0.5 });
    for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.7, 0.05), metal); leg.position.set(dx, 0.85, dz); leg.castShadow = true; chair.add(leg);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.8), metal); seat.position.y = 1.7; chair.add(seat);
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.3), metal); step.position.set(0, 0.85, 0.45); chair.add(step);
    chair.position.copy(V(-(DHW + 1.35), 0, NET_Z)); chair.rotation.y = -Math.PI / 2;
    s.add(chair);
    const ump = new Athlete({ shirt: 0x1c2436, trim: 0xd4d8e2, shorts: 0x1c2436, skin: 0xe6b894, hair: 0x221a14, shoe: 0x111111, racket: 0x000000 });
    ump.racket.visible = false;
    ump.root.position.copy(V(-(DHW + 1.35), 0.82, NET_Z)); ump.root.rotation.y = Math.PI / 2;
    for (const sd of [-1, 1]) { ump.legs[sd].hip.rotation.x = -1.5; ump.legs[sd].knee.rotation.x = 1.5; }
    ump.setArm(-1, 0.12, -0.6, 0.2); ump.setArm(1, 0.12, -0.6, 0.2);
    ump.spine.rotation.x = 0.05;
    s.add(ump.root);
  }
  buildPlayers() {
    this.mePl = new Athlete({ shirt: 0xf2f4f8, trim: 0x2f6bff, shorts: 0x15171d, skin: 0xe8b996, hair: 0x15100c, shoe: 0xf6f7fa, name: "PLAYER", emblem: true, racket: 0x3a7bff });
    this.aiPl = new Athlete({ shirt: 0x17191f, trim: 0xe11d48, shorts: 0x17191f, skin: 0xe2b28f, hair: 0x0f0c0a, shoe: 0xf6f7fa, name: "KENTA", racket: 0xe11d48 });
    this.scene.add(this.mePl.root, this.aiPl.root);
  }
  setPlayerName(name) {
    const old = this.mePl.root;
    this.scene.remove(old);
    this.mePl = new Athlete({ shirt: 0xf2f4f8, trim: 0x2f6bff, shorts: 0x15171d, skin: 0xe8b996, hair: 0x15100c, shoe: 0xf6f7fa, name, emblem: true, racket: 0x3a7bff });
    this.scene.add(this.mePl.root);
  }
  buildShuttle() {
    const g = (this.shuttle = new THREE.Group());
    const cork = new THREE.Mesh(new THREE.SphereGeometry(0.0145, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.6 }));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0148, 0.0148, 0.006, 16), new THREE.MeshStandardMaterial({ color: 0x2f6bff, roughness: 0.5 }));
    band.position.y = 0.006;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.012, 0.07, 22, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, transparent: true, opacity: 0.93, side: THREE.DoubleSide }));
    skirt.position.y = 0.045;
    for (const m of [cork, band, skirt]) { m.castShadow = true; g.add(m); }
    g.scale.setScalar(1.7);
    const glowTex = canvasTex(64, 64, (c, w, h) => {
      const r = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(160,210,255,0.5)"); r.addColorStop(1, "rgba(120,180,255,0)");
      c.fillStyle = r; c.fillRect(0, 0, w, h);
    }, { srgb: false });
    this.glowTex = glowTex;
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.6, 1.8, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true }));
    this.glow.scale.setScalar(0.32);
    this.scene.add(g, this.glow);
    // 빛나는 꼬리
    const N = (this.trailN = 22);
    this.trailPts = [];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
    const idx = [];
    for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    this.trail = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    this.trail.frustumCulled = false;
    this.scene.add(this.trail);
  }
  buildFx() {
    // 떨어질 자리 안내 원
    const ringTex = canvasTex(256, 256, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      const cx = w / 2;
      const r = c.createRadialGradient(cx, cx, 0, cx, cx, cx);
      r.addColorStop(0, "rgba(255,255,255,0.95)"); r.addColorStop(0.08, "rgba(150,210,255,0.6)"); r.addColorStop(0.12, "rgba(80,160,255,0.0)");
      c.fillStyle = r; c.fillRect(0, 0, w, h);
      c.strokeStyle = "rgba(120,190,255,0.95)"; c.lineWidth = 7; c.beginPath(); c.arc(cx, cx, cx * 0.86, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = "rgba(120,190,255,0.45)"; c.lineWidth = 4; c.beginPath(); c.arc(cx, cx, cx * 0.58, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = "rgba(120,190,255,0.3)"; c.lineWidth = 3; c.beginPath(); c.arc(cx, cx, cx * 0.32, 0, Math.PI * 2); c.stroke();
    }, { srgb: false });
    const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color: new THREE.Color(1.2, 1.5, 2.2) });
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), ringMat);
    this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false;
    this.scene.add(this.ring);
    this.marks = [];
    this.markMat = (color) => new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, color });
    // 불꽃 입자
    const P = 260;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(P * 3), 3));
    pg.setAttribute("color", new THREE.BufferAttribute(new Float32Array(P * 3), 3));
    this.sparks = { geo: pg, list: [], max: P };
    this.sparkPts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.07, map: this.glowTex, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    this.sparkPts.frustumCulled = false;
    this.scene.add(this.sparkPts);
  }
  burst(pos, color, n = 24, speed = 3) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      if (this.sparks.list.length >= this.sparks.max) this.sparks.list.shift();
      const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()));
      this.sparks.list.push({ p: V(pos.x, pos.y, pos.z), v: d, life: 1, c });
    }
  }
  landMark(x, z, isIn) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), this.markMat(isIn ? new THREE.Color(0.6, 2.2, 0.9) : new THREE.Color(2.4, 0.5, 0.5)));
    m.rotation.x = -Math.PI / 2; m.position.copy(V(x, 0.012, z));
    this.scene.add(m); this.marks.push({ m, life: 1.6 });
  }
  hitFx(pos, by, type) {
    const col = by === "me" ? 0x8fd0ff : 0xff6b81;
    this.burst(pos, type === "smash" ? 0xd8ff6a : col, type === "smash" ? 46 : 20, type === "smash" ? 5 : 3);
    if (type === "smash") this.shake = 0.35;
  }
  resize(w, h) {
    this.W = w; this.H = h;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // 세로 화면에서는 좌우 시야를 넓혀서 코트 폭이 들어오게 한다.
    const base = 46;
    this.camera.fov = aspect < 1.25 ? Math.min(88, (2 * Math.atan(Math.tan((base * Math.PI) / 360) * 1.25 / aspect) * 180) / Math.PI) : base;
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setSize(w, h);
      const pr = this.renderer.getPixelRatio();
      this.bloom.resolution.set(w * pr * 0.5, h * pr * 0.5);
    }
  }
  toScreen(p) {
    const v = V(p.x, p.y, p.z).project(this.camera);
    return { x: (v.x + 1) / 2 * this.W, y: (1 - v.y) / 2 * this.H, on: v.z < 1 };
  }
  update(match, dt, tS, armPose) {
    const { me, ai, sh } = match;
    // 선수
    const meTurn = clamp((sh.p.x - me.x) * 0.12, -0.35, 0.35);
    this.mePl.update(me, match.t, { facing: Math.PI, turn: -meTurn, arm: armPose });
    const aiTurn = clamp((sh.p.x - ai.x) * 0.12, -0.35, 0.35);
    this.aiPl.update(ai, match.t, { facing: 0, turn: aiTurn, arm: null });
    // 셔틀콕
    const sp = Math.hypot(sh.v.x, sh.v.y, sh.v.z);
    const pos = V(sh.p.x, Math.max(0.02, sh.p.y), sh.p.z);
    this.shuttle.position.copy(pos);
    const tail = sp > 0.3 ? new THREE.Vector3(-sh.v.x, -sh.v.y, sh.v.z).normalize() : (sh.state === "ground" ? new THREE.Vector3(0.9, 0.3, 0).normalize() : new THREE.Vector3(0, 1, 0));
    this.shuttle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tail);
    this.glow.position.copy(pos);
    const flying = sh.state === "fly" || sh.state === "net";
    this.glow.material.opacity = flying ? 0.95 : 0.35;
    this.glow.scale.setScalar(flying ? (sh.type === "smash" ? 0.5 : 0.34) : 0.2);
    this.updateTrail(flying ? pos : null, sh.type === "smash");
    // 떨어질 자리
    const land = match.incomingLanding();
    if (land) {
      this.ring.visible = true;
      this.ring.position.copy(V(land.x, 0.011, land.z));
      const pulse = 1 + Math.sin(tS * 7) * 0.08;
      this.ring.scale.setScalar(pulse);
      this.ring.material.color.set(sh.willOut ? new THREE.Color(2.4, 0.6, 0.6) : new THREE.Color(1.2, 1.5, 2.2));
    } else this.ring.visible = false;
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const mk = this.marks[i]; mk.life -= dt;
      mk.m.material.opacity = Math.max(0, mk.life / 1.6);
      mk.m.scale.setScalar(1 + (1.6 - mk.life) * 0.4);
      if (mk.life <= 0) { this.scene.remove(mk.m); mk.m.geometry.dispose(); mk.m.material.dispose(); this.marks.splice(i, 1); }
    }
    // 불꽃
    const list = this.sparks.list, pa = this.sparks.geo.attributes.position.array, ca = this.sparks.geo.attributes.color.array;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i]; s.life -= dt * 1.6; s.v.y -= 6 * dt; s.p.addScaledVector(s.v, dt);
      if (s.life <= 0) list.splice(i, 1);
    }
    for (let i = 0; i < this.sparks.max; i++) {
      const s = list[i];
      if (s) { pa[i * 3] = s.p.x; pa[i * 3 + 1] = s.p.y; pa[i * 3 + 2] = s.p.z; ca[i * 3] = s.c.r * s.life * 2; ca[i * 3 + 1] = s.c.g * s.life * 2; ca[i * 3 + 2] = s.c.b * s.life * 2; }
      else { pa[i * 3 + 1] = -50; }
    }
    this.sparks.geo.attributes.position.needsUpdate = true; this.sparks.geo.attributes.color.needsUpdate = true;
    // 관중 환호
    this.cheer = Math.max(0, this.cheer - dt * 0.5);
    if (this.cheer > 0.01 || this._cheerWas) {
      const { bodies, heads, spots, phase } = this.crowd, m4 = new THREE.Matrix4();
      for (let i = 0; i < spots.length; i++) {
        const [x, y, z] = spots[i];
        const j = Math.max(0, Math.sin(tS * 9 + phase[i])) * 0.22 * this.cheer;
        m4.makeTranslation(x, y + 0.34 + j, -z); bodies.setMatrixAt(i, m4);
        m4.makeTranslation(x, y + 0.72 + j, -z); heads.setMatrixAt(i, m4);
      }
      bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
      this._cheerWas = this.cheer > 0.01;
    }
    // 카메라: 내 선수 오른쪽 뒤에서 상대 코트를 본다
    const zv = this.viewZoom;
    const want = V(me.x * 0.65 + 0.75, 0.6 + 1.8 * zv, me.z - 5.0 * zv);
    const look = V(me.x * 0.3 + 0.3 + (sh.p.x - me.x) * 0.06, 0.6, me.z + 7.0);
    const k = 1 - Math.exp(-dt * 3);
    this.camPos.lerp(want, k); this.camLook.lerp(look, k);
    this.camera.position.copy(this.camPos);
    this.shake = Math.max(0, this.shake - dt);
    if (this.shake > 0) this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake * 0.25, (Math.random() - 0.5) * this.shake * 0.25, 0));
    this.camera.lookAt(this.camLook);
  }
  updateTrail(pos, hot) {
    const pts = this.trailPts, N = this.trailN;
    if (pos) pts.push(pos.clone()); else if (pts.length) pts.shift();
    while (pts.length > N) pts.shift();
    // 꼬리 길이를 제한한다 (스매시만 길게)
    const maxLen = hot ? 3.2 : 1.3;
    let len = 0;
    for (let i = pts.length - 1; i > 0; i--) {
      len += pts[i].distanceTo(pts[i - 1]);
      if (len > maxLen) { pts.splice(0, i); break; }
    }
    const pa = this.trail.geometry.attributes.position.array, ca = this.trail.geometry.attributes.color.array;
    const cam = this.camera.position;
    const n = pts.length;
    const base = hot ? new THREE.Color(1.6, 2.2, 1.0) : new THREE.Color(0.8, 1.35, 2.4);
    // 카메라 가까이 지나갈 때는 꼬리가 화면을 가로지르지 않게 흐리게 한다.
    if (n) base.multiplyScalar(clamp((pts[n - 1].distanceTo(cam) - 2) / 4, 0, 1));
    const width = hot ? 0.09 : 0.06;
    const tmp = new THREE.Vector3(), side = new THREE.Vector3(), view = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      let o = i * 6;
      if (i >= n || n < 2) { for (let j = 0; j < 6; j++) { pa[o + j] = 0; ca[o + j] = 0; } continue; }
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      tmp.subVectors(b, a); view.subVectors(cam, p);
      side.crossVectors(tmp, view).normalize();
      const f = (i + 1) / n;
      const w = width * Math.pow(f, 1.3);
      pa[o] = p.x + side.x * w; pa[o + 1] = p.y + side.y * w; pa[o + 2] = p.z + side.z * w;
      pa[o + 3] = p.x - side.x * w; pa[o + 4] = p.y - side.y * w; pa[o + 5] = p.z - side.z * w;
      const fade = Math.pow(f, 1.6);
      for (const off of [0, 3]) { ca[o + off] = base.r * fade; ca[o + off + 1] = base.g * fade; ca[o + off + 2] = base.b * fade; }
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trail.geometry.attributes.color.needsUpdate = true;
  }
  render() {
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
}
