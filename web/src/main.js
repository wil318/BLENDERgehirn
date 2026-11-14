import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { ANNOTATIONS, GROUPS, TOUR, GAGE_TOUR, GAGE_TAGS } from './content.js';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const DEG = Math.PI / 180;
const STEP_SECONDS = 12, GAGE_STEP_SECONDS = 24;
let stepSeconds = STEP_SECONDS;
let tour = TOUR;      // aktiver Rundgang (normal oder Fall Gage)
let mode = 'tour';

// Geräteklasse: Tablets/Handys bekommen weniger Nachbearbeitung, damit es flüssig bleibt
const TOUCH = matchMedia('(pointer: coarse)').matches;
const LOW = TOUCH || (navigator.hardwareConcurrency || 8) <= 4;

// ------------------------------------------------------------------ renderer / scene
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const pixelRatio = Math.min(window.devicePixelRatio, LOW ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.95;

const BG = new THREE.Color('#060c18');
const scene = new THREE.Scene();
scene.background = BG;
scene.fog = new THREE.FogExp2(BG, 0.006);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;

const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.2, 800);
camera.position.set(-40, 20, -30);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.zoomToCursor = true;
controls.minDistance = 7;
controls.maxDistance = 140;
controls.screenSpacePanning = true;

scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x120d10, 0.5));
const key = new THREE.DirectionalLight(0xfff0da, 2.3);
key.position.set(-30, 40, -20);
scene.add(key);
const rim = new THREE.DirectionalLight(0x6fb6ff, 1.6);
rim.position.set(30, 18, 40);
scene.add(rim);
const under = new THREE.DirectionalLight(0xf39a2e, 0.4);
under.position.set(-10, -40, -10);
scene.add(under);

// Schwebende Partikel für Tiefe
(() => {
  const n = 1400, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = THREE.MathUtils.randFloat(22, 110), th = Math.random() * Math.PI * 2, ph = Math.acos(THREE.MathUtils.randFloatSpread(2));
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7, r * Math.sin(ph) * Math.sin(th)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size: 0.45, map: dotTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), color: 0x86b6e8, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(g, m));
})();

function dotTexture(inner, outer, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '.45)'));
  gr.addColorStop(1, outer);
  x.fillStyle = gr;
  x.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

// ------------------------------------------------------------------ post-processing
const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: LOW ? 2 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(pixelRatio);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
let gtao = null;
if (!LOW) {
  gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 0.6, scale: 1.0, samples: 12 });
  gtao.blendIntensity = 0.8;
  composer.addPass(gtao);
}
const outline = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
Object.assign(outline, { edgeStrength: 4, edgeGlow: 0.6, edgeThickness: 1.3, pulsePeriod: 0 });
outline.visibleEdgeColor.set('#ffb35c');
outline.hiddenEdgeColor.set('#5a2e08');
composer.addPass(outline);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.45, 0.985);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ------------------------------------------------------------------ state
const state = {
  playing: false, tourIdx: 0, tourT: 0, labels: true,
  xray: false, xrayAmt: 0, explode: 0, explodeGoal: 0, half: false, natural: false,
  selected: null, flight: null, zoomGoal: null, highlight: [], pulseColor: '#ffb84d',
};
const nodes = {};
const meshes = [];
let meta = null;

// ------------------------------------------------------------------ load
const draco = new DRACOLoader();
draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/libs/draco/gltf/');
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
const metaP = fetch('models/meta.json').then((r) => r.json());
loader.load(
  'models/brain.glb',
  async (gltf) => {
    meta = await metaP;
    setup(gltf);
    $('loadBar').style.width = '100%';
    $('loader').classList.add('done');
  },
  (e) => {
    if (e.total) {
      const p = Math.round((e.loaded / e.total) * 100);
      $('loadBar').style.width = p + '%';
      $('loadPct').textContent = p + ' %';
    }
  },
  (err) => { $('loadPct').textContent = 'Fehler beim Laden: ' + err.message; },
);

// ------------------------------------------------------------------ Materialien
const CORTEX_MATS = new Set(['Frontal', 'Parietal', 'Temporal', 'Okzipital', 'Kleinhirn']);
const NATURAL = {
  Frontal: '#dcab9e', Parietal: '#dcab9e', Temporal: '#dcab9e', Okzipital: '#dcab9e', Kleinhirn: '#d29f96',
  Hirnstamm: '#e6cdbb', Rueckenmark: '#ecdac8', Balken: '#f3ece2', Thalamus: '#e1beb0', Hypothalamus: '#e2b3aa',
  Hypophyse: '#d9978f', Epiphyse: '#d8b49f', Hippocampus: '#ddb0a3', Amygdala: '#d89e95', Basalganglien: '#d5ae9e',
  Sehbahn: '#f0e4cf', Sehstrahlung: '#efe0c4', Mark: '#efe6da',
};
// Explosionsrichtung je Lappen (x seitlich, y oben, z hinten; Vorzeichen von x folgt der Hemisphäre)
const LOBE_EXPLODE = { Frontal: [3.0, 0.8, -4.2], Parietal: [3.4, 3.6, 1.2], Temporal: [4.2, -2.6, -0.8], Okzipital: [3.0, 0.2, 4.4] };
const LOBE_OF = { Motor: 'Frontal', Broca: 'Frontal', Somato: 'Parietal', Hoer: 'Temporal', Wernicke: 'Temporal' };

function setup(gltf) {
  const root = gltf.scene;
  scene.add(root);
  root.traverse((o) => { if (o.name) nodes[o.name] = o; });
  root.updateMatrixWorld(true);

  root.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.material;
    const isCap = src.name === 'Mark'; // Schnittfläche eines Lappens (nur bei der Explosion sichtbar)
    const isCortex = CORTEX_MATS.has(src.name) || isCap;
    const isLiquor = src.name === 'Liquor';
    const m = new THREE.MeshPhysicalMaterial({
      name: src.name, color: src.color.clone(), roughness: isLiquor ? 0.12 : Math.max(0.42, src.roughness ?? 0.5), metalness: 0,
      sheen: isLiquor ? 0 : 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffe6dc'),
      clearcoat: src.name === 'Auge' || src.name === 'Iris' || src.name === 'Pupille' || isLiquor ? 0.8 : 0.08, clearcoatRoughness: 0.35,
      emissive: src.emissive?.clone() ?? new THREE.Color(0), emissiveIntensity: src.emissiveIntensity ?? 1,
      transparent: isLiquor, opacity: isLiquor ? 0.55 : 1, depthWrite: !isLiquor,
    });
    if (isLiquor) o.renderOrder = 5;
    o.material = m;
    o.geometry.computeBoundingBox();
    o.geometry.computeBoundsTree();
    const box = new THREE.Box3().setFromObject(o);
    o.userData = {
      base: m.color.clone(), natural: new THREE.Color(NATURAL[src.name] || '#' + m.color.getHexString()), baseEmissive: m.emissive.clone(),
      cortex: isCortex, cap: isCap, center: box.getCenter(new THREE.Vector3()), off: new THREE.Vector3(), rest: o.position.clone(), ann: null,
    };
    meshes.push(o);
  });

  // Explosionsrichtungen: Lappen (inkl. ihrer Funktionsareale) bewegen sich gemeinsam
  const groupBoxes = {};
  const groupOf = (name) => {
    const [base, side] = name.split('_');
    const lobe = LOBE_OF[base] || base;
    return ['Frontal', 'Parietal', 'Temporal', 'Okzipital'].includes(lobe) ? lobe + '_' + side : null;
  };
  for (const o of meshes) {
    const g = groupOf(o.name);
    if (!g) continue;
    (groupBoxes[g] ||= new THREE.Box3()).expandByObject(o);
  }
  for (const o of meshes) {
    const n = o.name, u = o.userData, side = Math.sign(u.center.x) || 1;
    const g = groupOf(n);
    if (g) {
      // jeder Lappen weicht in seine Richtung aus (Stirn vor, Hinterhaupt zurück, Scheitel hoch, Schläfe seitlich runter)
      const [ox, oy, oz] = LOBE_EXPLODE[g.split('_')[0]];
      u.off.set(Math.sign(groupBoxes[g].getCenter(new THREE.Vector3()).x) * ox, oy, oz);
    } else if (n === 'Kleinhirn') u.off.set(0, -2.2, 3.6);
    else if (['Mittelhirn', 'Bruecke', 'Medulla', 'Rueckenmark'].includes(n)) u.off.set(0, -3.2, 0.6);
    else if (/^(Auge|Iris|Pupille)_/.test(n)) u.off.set(side * 0.6, -0.4, -3.2);
    else if (/_(L|R)$/.test(n) && !n.startsWith('Sehstrahlung')) u.off.set(side * 0.9, 0, 0);
    else if (n.startsWith('Sehstrahlung')) u.off.set(side * 1.2, 0, 0.4);
  }

  for (const a of ANNOTATIONS) a.list = meshesFor(a);
  for (const o of meshes) o.userData.ann = annotationForName(o.name);

  buildUI();
  computeHome();
  goToStep(0, { instant: true });
  // Einflug
  camera.position.copy(state.flight.toPos).sub(state.flight.toTarget).multiplyScalar(2.2).add(state.flight.toTarget);
  state.flight.fromPos.copy(camera.position);
}

function annotationForName(name) {
  // spezifische Areale (mit parent) vor den Lappen prüfen
  const order = [...ANNOTATIONS].sort((a, b) => (b.parent ? 1 : 0) - (a.parent ? 1 : 0));
  for (const a of order) for (const p of a.meshes) if (p.endsWith('_') ? name.startsWith(p) : name === p) return a;
  return null;
}
function meshesFor(a) {
  return meshes.filter((o) => a.meshes.some((p) => (p.endsWith('_') ? o.name.startsWith(p) : o.name === p)));
}
const annById = (id) => ANNOTATIONS.find((a) => a.id === id);

// ------------------------------------------------------------------ Kamera
let home = { az: -128, el: 16, d: 40, t: [0, -0.8, 0] };
function computeHome() {
  const aspect = innerWidth / innerHeight;
  state.distScale = aspect >= 1.2 ? 1 : aspect >= 0.8 ? 1.25 : 1.75;
}
function viewToPose(v) {
  const t = new THREE.Vector3().fromArray(v.t || [0, 0, 0]);
  const d = v.d * state.distScale;
  const az = v.az * DEG, el = v.el * DEG;
  const p = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(d).add(t);
  return { pos: p, target: t };
}
function flyTo(pos, target, dur = 1.6) {
  state.flight = { fromPos: camera.position.clone(), fromTarget: controls.target.clone(), toPos: pos.clone(), toTarget: target.clone(), t: 0, dur };
}
function resetView() {
  const p = viewToPose(tour[state.tourIdx]?.view || home);
  flyTo(p.pos, p.target);
}
function focusOn(a) {
  const box = new THREE.Box3();
  for (const o of a.list) if (o.visible) box.expandByObject(o);
  if (box.isEmpty()) return;
  const c = box.getCenter(new THREE.Vector3());
  const r = box.getSize(new THREE.Vector3()).length() * 0.5;
  const dir = camera.position.clone().sub(controls.target).normalize();
  const dist = clamp(r / Math.sin((camera.fov * DEG) / 2) * 1.15, 9, 60);
  flyTo(c.clone().addScaledVector(dir, dist), c, 1.2);
}
canvas.addEventListener('pointerdown', () => { state.flight = null; state.zoomGoal = null; });
canvas.addEventListener('wheel', () => { state.flight = null; state.zoomGoal = null; }, { passive: true });

// ------------------------------------------------------------------ Signalpulse
const pulseGroup = new THREE.Group();
scene.add(pulseGroup);
const pulseTex = dotTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 128);
let pulses = [];
function setPulses(names, color, reverse) {
  for (const c of [...pulseGroup.children]) {
    pulseGroup.remove(c);
    c.geometry?.dispose();
    c.material?.dispose();
  }
  pulses = [];
  if (!names?.length || !meta) return;
  const col = new THREE.Color(color);
  for (const name of names) {
    let pts = meta.paths[name]?.map((p) => new THREE.Vector3().fromArray(p));
    if (!pts) continue;
    if (reverse) pts = pts.reverse();
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 160, 0.07, 8, false),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    tube.renderOrder = 20;
    pulseGroup.add(tube);
    const len = curve.getLength();
    const sprites = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pulseTex, color: col, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.scale.setScalar(1.1);
      s.renderOrder = 21;
      pulseGroup.add(s);
      sprites.push(s);
    }
    pulses.push({ curve, sprites, period: clamp(len / 7, 1.6, 3.6) });
  }
}
function updatePulses(time) {
  for (const p of pulses) {
    p.sprites.forEach((s, i) => {
      const u = ((time / p.period + i / p.sprites.length) % 1 + 1) % 1;
      p.curve.getPointAt(u, s.position);
      const fade = Math.min(1, u * 8, (1 - u) * 8);
      s.material.opacity = fade;
      s.scale.setScalar(0.8 + 0.5 * fade);
    });
  }
}

// ------------------------------------------------------------------ UI
const hotspots = [];
function buildUI() {
  const list = $('partList');
  let n = 0;
  GROUPS.forEach(([label, ids]) => {
    list.insertAdjacentHTML('beforeend', `<li class="grp">${label}</li>`);
    for (const id of ids) {
      const a = annById(id);
      a.no = ++n;
      const li = document.createElement('li');
      li.innerHTML = `<button data-id="${a.id}"><span class="n">${String(a.no).padStart(2, '0')}</span><span class="dot" style="background:${a.color}"></span><span>${a.title}</span></button>`;
      li.firstChild.addEventListener('click', () => select(a.id, true));
      list.appendChild(li);
    }
  });
  $('partCount').textContent = `· ${n}`;
  $('indexToggle').addEventListener('click', () => {
    const c = $('index').classList.toggle('collapsed');
    $('indexToggle').setAttribute('aria-expanded', String(!c));
  });
  if (innerWidth < 1100 || innerHeight < 760) $('index').classList.add('collapsed');

  const host = $('hotspots');
  for (const a of ANNOTATIONS) {
    const anchor = meta.anchors[a.anchor];
    if (!anchor) continue;
    const el = document.createElement('button');
    el.className = 'hs';
    el.style.setProperty('--c', a.color);
    el.setAttribute('aria-label', a.title);
    el.innerHTML = `<span class="ring">${a.no}</span><span class="lbl">${a.title}</span>`;
    el.addEventListener('click', (ev) => { ev.stopPropagation(); select(a.id); });
    host.appendChild(el);
    hotspots.push({ a, el, rest: new THREE.Vector3().fromArray(anchor), pos: new THREE.Vector3(), occluded: false, node: nodes[a.anchor] });
  }

  buildTimeline();

  $('play').addEventListener('click', togglePlay);
  $('scrub').addEventListener('input', () => {
    const v = +$('scrub').value / 1000;
    const i = Math.floor(v);
    state.tourT = (v - i) * stepSeconds;
    if (i !== state.tourIdx) goToStep(i, { keepT: true });
  });
  $('phasePrev').addEventListener('click', () => step(-1));
  $('phaseNext').addEventListener('click', () => step(1));

  chip('modeBtn', () => setMode(mode === 'gage' ? 'tour' : 'gage'));
  chip('xray', () => setXray(!state.xray));
  chip('explode', () => setExplode(state.explodeGoal > 0.5 ? 0 : 1));
  chip('half', () => setHalf(!state.half));
  chip('natural', () => setNatural(!state.natural));
  chip('labels', () => {
    state.labels = !state.labels;
    setChip('labels', state.labels);
    $('hotspots').classList.toggle('hide-labels', !state.labels);
  });
  $('reset').addEventListener('click', resetView);
  $('infoClose').addEventListener('click', () => select(null));
  $('infoFocus').addEventListener('click', () => state.selected && focusOn(state.selected));
  const order = [...ANNOTATIONS].sort((x, y) => x.no - y.no);
  const cycle = (d) => {
    const i = state.selected ? order.indexOf(state.selected) : -1;
    select(order[(i + d + order.length) % order.length].id, true);
  };
  $('infoPrev').addEventListener('click', () => cycle(-1));
  $('infoNext').addEventListener('click', () => cycle(1));

  const slider = $('zoomSlider');
  slider.addEventListener('input', () => { state.zoomGoal = sliderToDist(+slider.value); state.sliderActive = true; state.flight = null; });
  slider.addEventListener('change', () => { state.sliderActive = false; });
  $('zoomIn').addEventListener('click', () => { state.flight = null; state.zoomGoal = clamp(currentDist() / 1.5, controls.minDistance, controls.maxDistance); });
  $('zoomOut').addEventListener('click', () => { state.flight = null; state.zoomGoal = clamp(currentDist() * 1.5, controls.minDistance, controls.maxDistance); });

  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (e.key === 'Escape') select(null);
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'x' || e.key === 'X') setXray(!state.xray);
    if (e.key === 'e' || e.key === 'E') setExplode(state.explodeGoal > 0.5 ? 0 : 1);
    if (e.key === '+' || e.key === '=') $('zoomIn').click();
    if (e.key === '-') $('zoomOut').click();
  });

  // Picking: Klick/Tap ohne Ziehen wählt Struktur
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const hit = pick(e.clientX, e.clientY);
    select(hit ? hit.id : null);
  });
  if (!TOUCH) {
    let raf = 0;
    canvas.addEventListener('pointermove', (e) => {
      if (raf || e.buttons) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const a = pick(e.clientX, e.clientY);
        const tip = $('hoverTip');
        tip.classList.toggle('on', !!a);
        canvas.style.cursor = a ? 'pointer' : '';
        if (a) {
          tip.textContent = a.title;
          tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 12}px)`;
        }
      });
    });
  }
}

// Rundgang-Zeitleiste (wird beim Wechsel zwischen den Rundgängen neu aufgebaut)
function buildTimeline() {
  const ticks = $('ticks');
  ticks.innerHTML = '';
  tour.forEach((s, i) => {
    const x = (i / tour.length) * 100;
    ticks.insertAdjacentHTML('beforeend', `<i style="left:${x}%"></i><span style="left:${x + 50 / tour.length}%">${i + 1}</span>`);
  });
  $('phaseTrack').innerHTML = tour.map(() => '<i style="--w:1"><b></b></i>').join('');
  $('scrub').max = String(tour.length * 1000 - 1);
}

// Umschalten zwischen dem normalen Rundgang und dem Fall Phineas Gage
function setMode(m) {
  mode = m;
  const gage = m === 'gage';
  tour = gage ? GAGE_TOUR : TOUR;
  stepSeconds = gage ? GAGE_STEP_SECONDS : STEP_SECONDS;
  $('phase').classList.toggle('gage', gage);
  setChip('modeBtn', gage);
  $('modeBtn').textContent = gage ? '← Rundgang' : 'Fall Gage';
  $('modeBtn').title = gage ? 'Zurück zum normalen Rundgang' : 'Der Fall Phineas Gage (Unterrichtsmodus)';
  if (gage) {
    $('index').classList.add('collapsed');
    $('indexToggle').setAttribute('aria-expanded', 'false');
  }
  buildTimeline();
  goToStep(0);
}

function renderNotes(s) {
  const host = $('phaseNotes');
  host.replaceChildren();
  for (const [tag, text] of s.notes || []) {
    const d = document.createElement('div');
    d.className = 'note ' + tag;
    const b = document.createElement('b');
    b.textContent = GAGE_TAGS[tag] || tag;
    const t = document.createElement('span');
    t.textContent = text;
    d.append(b, t);
    host.appendChild(d);
  }
  if (s.sources) {
    const ul = document.createElement('ul');
    ul.className = 'src';
    for (const q of s.sources) {
      const li = document.createElement('li');
      if (q.url) {
        const a = document.createElement('a');
        a.href = q.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = q.t;
        li.appendChild(a);
      } else li.textContent = q.t;
      ul.appendChild(li);
    }
    host.appendChild(ul);
  }
  host.scrollTop = 0;
}

function chip(id, fn) { $(id).addEventListener('click', fn); }
function setChip(id, on) {
  $(id).classList.toggle('on', on);
  $(id).setAttribute('aria-pressed', String(on));
}
function setXray(on) { state.xray = on; setChip('xray', on); }
function setExplode(v) { state.explodeGoal = v; setChip('explode', v > 0.5); }
function setHalf(on) {
  state.half = on;
  setChip('half', on);
  for (const o of meshes) if (o.userData.cortex && o.name.endsWith('_R')) o.visible = !on;
}
function setNatural(on) {
  state.natural = on;
  setChip('natural', on);
  for (const o of meshes) o.material.color.copy(on ? o.userData.natural : o.userData.base);
}

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pickables() {
  return meshes.filter((o) => o.visible && o.userData.ann && !(o.userData.cortex && state.xrayAmt > 0.5));
}
function pick(x, y) {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  ray.firstHitOnly = true;
  const hits = ray.intersectObjects(pickables(), false);
  return hits.length ? hits[0].object.userData.ann : null;
}

function select(id, fly = false) {
  const a = id ? annById(id) : null;
  state.selected = a;
  document.querySelectorAll('#partList button').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
  hotspots.forEach((h) => h.el.classList.toggle('active', h.a === a));
  outline.selectedObjects = a ? a.list.filter((o) => o.visible) : state.highlight.length < 4 ? state.highlight.flatMap((h) => h.list) : [];
  if (a) outline.visibleEdgeColor.set(a.color);
  const info = $('info');
  if (!a) {
    info.classList.remove('open');
    info.setAttribute('aria-hidden', 'true');
    return;
  }
  info.style.setProperty('--c', a.color);
  $('infoKicker').textContent = a.kicker;
  $('infoTitle').textContent = a.title;
  $('infoText').textContent = a.text;
  $('infoFacts').innerHTML = (a.facts || []).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  info.classList.add('open');
  info.setAttribute('aria-hidden', 'false');
  // innere Strukturen brauchen Röntgenblick
  if (a.layer === 'inner' && !state.xray && state.explodeGoal < 0.5) setXray(true);
  if (fly) focusOn(a);
}

// ------------------------------------------------------------------ Rundgang
function goToStep(i, { instant = false, keepT = false } = {}) {
  state.tourIdx = ((i % tour.length) + tour.length) % tour.length;
  if (!keepT) state.tourT = 0;
  gageT = 0;
  const s = tour[state.tourIdx];
  $('phaseNo').textContent = String(state.tourIdx + 1).padStart(2, '0');
  $('phaseStep').textContent = s.kicker;
  const h3 = $('phaseTitle');
  h3.textContent = s.title;
  h3.classList.remove('swap');
  void h3.offsetWidth;
  h3.classList.add('swap');
  $('phaseText').textContent = s.text;
  renderNotes(s);
  setXray(!!s.xray);
  setExplode(s.explode || 0);
  if (state.half) setHalf(false);
  state.highlight = (s.highlight || []).map(annById);
  const col = state.highlight[0]?.color || '#ffb84d';
  setPulses(s.pulses, col, s.reverse);
  select(null);
  outline.selectedObjects = state.highlight.length < 4 ? state.highlight.flatMap((a) => a.list) : [];
  outline.visibleEdgeColor.set(col);
  const p = viewToPose(s.view);
  if (instant) {
    state.flight = { fromPos: p.pos.clone(), fromTarget: p.target.clone(), toPos: p.pos, toTarget: p.target, t: 0, dur: 2.4 };
    controls.target.copy(p.target);
  } else flyTo(p.pos, p.target, 1.8);
}
function step(d) { goToStep(state.tourIdx + d); }
function togglePlay() {
  state.playing = !state.playing;
  $('play').classList.toggle('paused', !state.playing);
  $('play').setAttribute('aria-label', state.playing ? 'Pause' : 'Rundgang abspielen');
}

// ------------------------------------------------------------------ Fall Phineas Gage
// Geometrie in Three-Koordinaten (Blender x, z, −y; 1 Einheit = 1 cm).
// Bahn: gerade Linie nach der Rekonstruktion (Eintritt unter dem linken Jochbein,
// Austritt oben/vorn nahe der Pfeilnaht). s = Strecke entlang der Bahn in cm.
const GAGE_P0 = new THREE.Vector3(-5.04, -10, -4.39);
const GAGE_D = new THREE.Vector3(0.2446, 0.9667, -0.0699).normalize();
const GAGE_S_IN = 7.65, GAGE_S_OUT = 14.38;   // Strecke im Gehirn
const ROD_LEN = 109, ROD_R = 1.6, ROD_SECONDS = 5;
let gageT = 0;
const gage = (() => {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), GAGE_D);
  const at = (s) => GAGE_P0.clone().addScaledVector(GAGE_D, s);

  // Stange: Spitze im Ursprung, Körper nach −y (Originalmaße: 109 cm, ⌀ 3,2 cm, ≈ 30 cm lange Spitze)
  const prof = [[0, 0], [0.35, -0.3], [ROD_R, -30], [ROD_R, -ROD_LEN], [0, -ROD_LEN]].map(([r, y]) => new THREE.Vector2(r, y));
  const rodMat = new THREE.MeshStandardMaterial({ color: '#aeb9c7', metalness: 0.55, roughness: 0.38, emissive: '#1b2434', transparent: true, side: THREE.DoubleSide });
  const rod = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), rodMat);
  rod.quaternion.copy(q);
  rod.visible = false;
  group.add(rod);

  // Kanal im Gehirn (rot, durchscheinend) + dünne Bahnlinie auch außerhalb des Gehirns
  const len = GAGE_S_OUT - GAGE_S_IN;
  const canalMat = new THREE.MeshBasicMaterial({ color: '#ff4d3d', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const canal = new THREE.Mesh(new THREE.CylinderGeometry(ROD_R, ROD_R, len, 40, 1), canalMat);
  canal.position.copy(at(GAGE_S_IN + len / 2));
  canal.quaternion.copy(q);
  canal.renderOrder = 12;
  group.add(canal);
  const coreLen = 17;
  const coreMat = new THREE.MeshBasicMaterial({ color: '#ff8a7a', transparent: true, opacity: 0, depthWrite: false });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, coreLen, 8, 1), coreMat);
  core.position.copy(at(coreLen / 2));
  core.quaternion.copy(q);
  core.renderOrder = 13;
  group.add(core);

  // Beschriftungen an der Bahn
  const marks = {};
  const defs = { entry: [at(0.8), 'Eintritt: unter dem linken Wangenknochen'], exit: [at(GAGE_S_OUT + 0.3), 'Austritt: oben am Schädel'] };
  for (const [k, [pos, text]] of Object.entries(defs)) {
    const el = document.createElement('div');
    el.className = 'gm gone';
    el.innerHTML = '<span></span>';
    el.firstChild.textContent = text;
    $('hotspots').appendChild(el);
    marks[k] = { el, pos };
  }
  return { group, rod, rodMat, canalMat, coreMat, marks, at, amt: 0 };
})();

function updateGage(dt) {
  const on = mode === 'gage';
  gage.group.visible = on;
  for (const m of Object.values(gage.marks)) if (!on) m.el.classList.add('gone');
  if (!on) return;
  gageT += dt;
  const g = tour[state.tourIdx].gage || {};
  gage.amt = damp(gage.amt, g.canal ? 1 : 0, 4, dt);
  gage.canalMat.opacity = 0.42 * gage.amt;
  gage.coreMat.opacity = 0.9 * gage.amt;
  gage.canalMat.visible = gage.coreMat.visible = gage.amt > 0.01;
  // Stange: Spitze wandert entlang der Bahn, danach blendet sie aus (sie flog weiter)
  if (g.rod) {
    const [a, b] = g.rod;
    const k = easeInOut(clamp(gageT / ROD_SECONDS, 0, 1));
    gage.rod.position.copy(gage.at(a + (b - a) * k));
    gage.rodMat.opacity = g.rodFade ? clamp(1 - (gageT - ROD_SECONDS - 0.3) / 1.4, 0, 1) : 1;
    gage.rod.visible = gage.rodMat.opacity > 0.01;
  } else gage.rod.visible = false;
  for (const [k, m] of Object.entries(gage.marks)) {
    const show = (g.marks || []).includes(k);
    _v.copy(m.pos).project(camera);
    const gone = !show || _v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1;
    m.el.classList.toggle('gone', gone);
    if (!gone) m.el.style.transform = `translate(${((_v.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-_v.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px)`;
  }
}

// ------------------------------------------------------------------ Zoom
const currentDist = () => camera.position.distanceTo(controls.target);
const sliderToDist = (v) => controls.minDistance * Math.pow(controls.maxDistance / controls.minDistance, 1 - v / 1000);
const distToSlider = (d) => 1000 * (1 - Math.log(d / controls.minDistance) / Math.log(controls.maxDistance / controls.minDistance));

// ------------------------------------------------------------------ Schleife
const clock = new THREE.Clock();
let frame = 0;
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const _hsl = {};

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  frame++;

  if (meshes.length) {
    // Rundgang
    if (state.playing) {
      state.tourT += dt;
      if (state.tourT >= stepSeconds) goToStep(state.tourIdx + 1);
    }
    const prog = (state.tourIdx + state.tourT / stepSeconds) / tour.length;
    const scrub = $('scrub');
    if (document.activeElement !== scrub) scrub.value = String(Math.round(prog * tour.length * 1000));
    scrub.style.setProperty('--p', (prog * 100).toFixed(2) + '%');
    $('phaseTrack').querySelectorAll('b').forEach((b, i) => {
      const p = i < state.tourIdx ? 100 : i > state.tourIdx ? 0 : (state.tourT / stepSeconds) * 100;
      b.style.width = p + '%';
    });

    // Röntgen & Explosion
    state.xrayAmt = damp(state.xrayAmt, state.xray ? 1 : 0, 6, dt);
    state.explode = damp(state.explode, state.explodeGoal, 3.5, dt);
    const op = 1 - 0.86 * state.xrayAmt;
    const pulseT = 0.5 + 0.5 * Math.sin(time * 3.2);
    for (const o of meshes) {
      const u = o.userData, m = o.material;
      o.position.copy(u.rest).addScaledVector(u.off, state.explode * 1.0);
      if (u.cap) o.visible = state.explode > 0.03 && !(state.half && o.name.includes('_R_'));
      if (u.cortex) {
        const tr = op < 0.995;
        if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
        m.opacity = op;
        m.depthWrite = !tr;
        o.renderOrder = tr ? 10 : 0;
      }
      const hl = u.ann && (state.highlight.includes(u.ann) || state.highlight.some((a) => a.id === u.ann.parent));
      if (hl) m.emissive.copy(m.color).multiplyScalar((0.06 + 0.12 * pulseT) * (1.2 - m.color.getHSL(_hsl).l));
      else m.emissive.copy(u.baseEmissive);
    }
    // Hervorgehobene Rinde im Röntgenmodus etwas deckender
    for (const a of state.highlight) for (const o of a.list) if (o.userData.cortex && state.xrayAmt > 0.01) o.material.opacity = Math.max(o.material.opacity, 0.55);
    updatePulses(time);
  }
  updateGage(dt);

  // Kameraflug
  if (state.flight) {
    const f = state.flight;
    f.t += dt / f.dur;
    const k = easeInOut(Math.min(f.t, 1));
    camera.position.lerpVectors(f.fromPos, f.toPos, k);
    controls.target.lerpVectors(f.fromTarget, f.toTarget, k);
    if (f.t >= 1) state.flight = null;
  } else if (state.zoomGoal) {
    const d = currentDist();
    const nd = damp(d, state.zoomGoal, 8, dt);
    camera.position.sub(controls.target).setLength(nd).add(controls.target);
    if (Math.abs(nd - state.zoomGoal) < 0.01) state.zoomGoal = null;
  }
  controls.update();

  // Hotspots, Maßstab, Messwerte
  if (meshes.length) {
    updateHotspots();
    const dist = currentDist();
    if (!state.sliderActive) $('zoomSlider').value = String(Math.round(distToSlider(dist)));
    const worldPerPx = (2 * dist * Math.tan((camera.fov * DEG) / 2)) / innerHeight;
    const cmPx = 1 / worldPerPx;
    const len = [0.5, 1, 2, 5, 10, 20].find((l) => l * cmPx >= 60) || 20;
    $('scaleBar').style.width = (len * cmPx).toFixed(0) + 'px';
    $('scaleLabel').textContent = (len < 1 ? '5 mm' : len + ' cm');
    if (frame % 10 === 0) {
      $('rStep').textContent = `${state.tourIdx + 1} / ${tour.length}`;
      $('rXray').textContent = state.xray ? 'an' : 'aus';
      $('rExplode').textContent = Math.round(state.explode * 100) + ' %';
      $('rMag').textContent = '×' + (cmPx / 37.8).toFixed(2).replace('.', ',');
    }
  }

  composer.render();
  requestAnimationFrame(tick);
}

function updateHotspots() {
  const doOcc = frame % 6 === 0;
  const pickSet = doOcc ? pickables() : null;
  for (const h of hotspots) {
    const a = h.a;
    const u = h.node?.userData;
    h.pos.copy(h.rest);
    if (u) h.pos.addScaledVector(u.off, state.explode);
    let gone = false;
    if (a.layer === 'inner' && state.xrayAmt < 0.5 && state.explode < 0.5) gone = true;
    if (a.parent && !(state.selected === a || state.selected?.id === a.parent || state.highlight.includes(a))) gone = true;
    if (h.node && !h.node.visible) gone = true;
    if (tour[state.tourIdx]?.hideHotspots && state.selected !== a) gone = true;
    // Während einer Rundgang-Station nur die besprochenen Strukturen markieren
    if (state.highlight.length && !state.highlight.includes(a) && state.selected !== a) gone = true;
    _v.copy(h.pos).project(camera);
    if (_v.z > 1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1) gone = true;
    h.el.classList.toggle('gone', gone);
    if (gone) continue;
    if (doOcc) {
      _w.copy(h.pos).sub(camera.position);
      const dist = _w.length();
      ray.set(camera.position, _w.normalize());
      ray.firstHitOnly = true;
      ray.far = dist - 0.25;
      const hits = ray.intersectObjects(pickSet, false);
      ray.far = Infinity;
      h.occluded = hits.length > 0 && hits[0].object.userData.ann !== a && !(a.list.includes(hits[0].object));
      h.el.classList.toggle('occluded', h.occluded);
    }
    const x = (_v.x * 0.5 + 0.5) * innerWidth, y = (-_v.y * 0.5 + 0.5) * innerHeight;
    h.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setSize(innerWidth, innerHeight);
  gtao?.setSize(innerWidth, innerHeight);
  computeHome();
});
// iOS: Seiten-Pinch verhindern (Zoom gehört dem 3D-Modell)
document.addEventListener('gesturestart', (e) => e.preventDefault());

requestAnimationFrame(tick);

// PWA: Service Worker für Offline-Nutzung und schnelles Laden
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
