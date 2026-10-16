import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/**
 * WebGL ribbon field reconstructed from the source video: a wide luminous veil
 * comes from upper-right, condenses at a bright throat, then opens downward.
 */
const canvas = document.getElementById("ribbons");
if (!canvas) throw new Error("The required WebGL ribbon canvas was not found.");

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});

renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.15, 0.72, 0.08);
bloom.threshold = 0.08;
bloom.strength = 1.12;
bloom.radius = 0.7;
composer.addPass(bloom);
composer.addPass(new OutputPass());

const ribbons = new THREE.Group();
const dust = new THREE.Group();
const heads = [];
const mouse = new THREE.Vector2();
const clock = new THREE.Clock();
let viewport = { width: innerWidth, height: innerHeight };
let frameId = 0;
let running = true;

scene.add(ribbons, dust);

function point(x, y, z = 0) {
  return new THREE.Vector3(x - viewport.width / 2, viewport.height / 2 - y, z);
}

function glowTexture() {
  const image = document.createElement("canvas");
  image.width = image.height = 128;
  const context = image.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,235,1)");
  gradient.addColorStop(0.13, "rgba(218,255,92,0.98)");
  gradient.addColorStop(0.36, "rgba(190,255,25,0.42)");
  gradient.addColorStop(1, "rgba(190,255,25,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(image);
}

const glow = glowTexture();

function makeCurve(index, count) {
  const lane = index / (count - 1);
  const centered = lane - 0.5;
  const depth = 12 + ((index * 17) % 54);
  return new THREE.CatmullRomCurve3(
    [
      point(viewport.width * (1.02 + lane * 0.11), viewport.height * (0.02 + lane * 0.44), depth),
      point(viewport.width * (0.82 + centered * 0.1), viewport.height * (0.08 + lane * 0.32), depth * 0.72),
      point(viewport.width * (0.56 + centered * 0.16), viewport.height * (0.45 + centered * 0.2), depth * 0.34),
      point(viewport.width * 0.39, viewport.height * (0.61 + centered * 0.028), 0),
      point(viewport.width * (0.22 + centered * 0.22), viewport.height * (0.76 + Math.abs(centered) * 0.12), -depth * 0.22),
      point(viewport.width * (0.32 + lane * 0.55), viewport.height * (0.95 + centered * 0.075), -depth * 0.68),
      point(viewport.width * (0.16 + lane * 0.86), viewport.height * (1.12 + Math.abs(centered) * 0.26), -depth),
    ],
    false,
    "centripetal",
    0.5
  );
}

function addTube(curve, radius, material) {
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, radius, 5, false), material);
  ribbons.add(mesh);
}

function clearRibbons() {
  while (ribbons.children.length) {
    const child = ribbons.remove(ribbons.children[0]);
    child.geometry?.dispose();
    child.material?.dispose();
  }
  heads.length = 0;
}

function buildRibbons() {
  clearRibbons();
  const count = Math.max(24, Math.min(38, Math.round(viewport.width / 34)));

  for (let index = 0; index < count; index += 1) {
    const curve = makeCurve(index, count);
    const cyan = index % 9 === 0 || index % 13 === 0;
    const color = cyan ? 0x21cbe8 : new THREE.Color().setHSL(0.18 + (index % 5) * 0.012, 1, 0.58);

    addTube(curve, 3.4 + (index % 4) * 0.42, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: cyan ? 0.045 : 0.035,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    addTube(curve, 0.72 + (index % 3) * 0.16, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: cyan ? 0.4 : 0.3 + (index % 4) * 0.09,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));

    if (index % 2 === 0) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glow, color: cyan ? 0x5ce9ff : 0xd7ff45, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      ribbons.add(sprite);
      heads.push({ sprite, curve, offset: index * 0.071, speed: 0.075 + (index % 4) * 0.011, base: 34 + (index % 5) * 5 });
    }
  }

  const knot = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, color: 0xd9ff5c, transparent: true, opacity: 0.92,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  knot.position.copy(point(viewport.width * 0.39, viewport.height * 0.61, 1));
  knot.scale.set(225, 225, 1);
  ribbons.add(knot);
}

function buildDust() {
  while (dust.children.length) dust.remove(dust.children[0]);
  const count = 150;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * viewport.width * 1.08;
    positions[index * 3 + 1] = (Math.random() - 0.5) * viewport.height * 1.08;
    positions[index * 3 + 2] = -120 - Math.random() * 140;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  dust.add(new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xd5ff72, size: 2.1, transparent: true, opacity: 0.48,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  })));
}

function resize() {
  viewport = { width: innerWidth, height: innerHeight };
  camera.aspect = viewport.width / viewport.height;
  camera.position.z = viewport.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  camera.updateProjectionMatrix();
  renderer.setSize(viewport.width, viewport.height, false);
  composer.setSize(viewport.width, viewport.height);
  buildRibbons();
  buildDust();
}

function render() {
  if (!running) return;
  const time = clock.getElapsedTime();
  const scroll = Number(window.__relayScroll || 0);

  ribbons.position.y = scroll * viewport.height * 0.54 + Math.sin(time * 0.28) * 3;
  ribbons.rotation.z = Math.sin(time * 0.16) * 0.012;
  ribbons.rotation.y = mouse.x * 0.055;
  dust.position.x = Math.sin(time * 0.09) * 12;
  dust.position.y = scroll * viewport.height * 0.1 + Math.cos(time * 0.12) * 8;

  for (const head of heads) {
    head.sprite.position.copy(head.curve.getPoint((time * head.speed + head.offset) % 1));
    const size = head.base * (1 + Math.sin(time * 4 + head.offset * 20) * 0.13);
    head.sprite.scale.set(size, size, 1);
  }

  camera.position.x += (mouse.x * 28 - camera.position.x) * 0.035;
  camera.position.y += (-mouse.y * 20 - camera.position.y) * 0.035;
  camera.lookAt(0, 0, 0);
  composer.render();
  frameId = requestAnimationFrame(render);
}

function stop() {
  running = false;
  cancelAnimationFrame(frameId);
}

function start() {
  if (running) return;
  running = true;
  clock.start();
  frameId = requestAnimationFrame(render);
}

addEventListener("pointermove", (event) => {
  mouse.x = event.clientX / innerWidth - 0.5;
  mouse.y = event.clientY / innerHeight - 0.5;
}, { passive: true });
addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

resize();
if (reduceMotion) composer.render();
else frameId = requestAnimationFrame(render);
