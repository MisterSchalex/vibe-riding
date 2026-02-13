import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

// --- Session ID (persistent per browser) ---
let sessionId = localStorage.getItem('vibe-session');
if (!sessionId) {
  sessionId = 'vr-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  localStorage.setItem('vibe-session', sessionId);
}

// --- DOM refs ---
const overlay = document.getElementById('overlay');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const hint = document.getElementById('hint');
const hud = document.getElementById('hud');
const phaseLabel = document.getElementById('phaseLabel');
const controlsHint = document.getElementById('controlsHint');
const beat = document.getElementById('beat');

const mobileControls = document.getElementById('mobileControls');
const movePad = document.getElementById('movePad');
const moveStick = document.getElementById('moveStick');
const lookPad = document.getElementById('lookPad');
const interactBtn = document.getElementById('interactBtn');
const dropBtn = document.getElementById('dropBtn');
const orderBtn = document.getElementById('orderBtn');
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// Create panel
const createPanel = document.getElementById('createPanel');
const createStatus = document.getElementById('createStatus');
const worldPrompt = document.getElementById('worldPrompt');
const charCount = document.getElementById('charCount');
const createBtn = document.getElementById('createBtn');
const closeCreateBtn = document.getElementById('closeCreateBtn');
const lockIndicator = document.getElementById('lockIndicator');
const lockMsg = document.getElementById('lockMsg');

// Chain panel
const chainPanel = document.getElementById('chainPanel');
const chainCount = document.getElementById('chainCount');
const closeChainBtn = document.getElementById('closeChainBtn');
const chainList = document.getElementById('chainList');

// Chain nav
const chainNav = document.getElementById('chainNav');
const prevWorldBtn = document.getElementById('prevWorldBtn');
const nextWorldBtn = document.getElementById('nextWorldBtn');
const worldIndicator = document.getElementById('worldIndicator');
const chainBrowseBtn = document.getElementById('chainBrowseBtn');

// --- Three.js base setup ---
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x02040b, 45, 200);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 0, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0x7788aa, 0.55);
scene.add(ambient);
const point = new THREE.PointLight(0x88aaff, 1.2, 250);
point.position.set(8, 15, 10);
scene.add(point);

const rimLight = new THREE.DirectionalLight(0xb5ffe0, 0.0);
rimLight.position.set(-12, 14, -8);
scene.add(rimLight);

const floorGlow = new THREE.PointLight(0x7ce0b4, 0.0, 80);
floorGlow.position.set(0, -6, 0);
scene.add(floorGlow);

// Stars (always present)
const starsGeo = new THREE.BufferGeometry();
const starCount = 2500;
const pos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 190;
  pos[i * 3] = (Math.random() - 0.5) * r;
  pos[i * 3 + 1] = (Math.random() - 0.5) * r;
  pos[i * 3 + 2] = (Math.random() - 0.5) * r;
}
starsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xc6d4ff, size: 0.22 }));
scene.add(stars);

// Nebula
const nebula = new THREE.Mesh(
  new THREE.SphereGeometry(3.8, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0x7f45ff, emissive: 0x2d0c5e, emissiveIntensity: 1, transparent: true, opacity: 0.82 })
);
nebula.position.set(0, 0, -14);
scene.add(nebula);

const nebulaCore = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xa8d8ff, transparent: true, opacity: 0.7 })
);
nebula.add(nebulaCore);

const nebulaHalo = new THREE.Mesh(
  new THREE.TorusGeometry(5.1, 0.22, 24, 120),
  new THREE.MeshBasicMaterial({ color: 0xb97dff, transparent: true, opacity: 0.45 })
);
nebulaHalo.rotation.x = Math.PI * 0.35;
scene.add(nebulaHalo);

const nebulaDustGeo = new THREE.BufferGeometry();
const dustCount = 900;
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 4.5 + Math.random() * 4.2;
  const y = (Math.random() - 0.5) * 2.6;
  dustPos[i * 3] = Math.cos(a) * r;
  dustPos[i * 3 + 1] = y;
  dustPos[i * 3 + 2] = -14 + Math.sin(a) * r;
}
nebulaDustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const nebulaDust = new THREE.Points(
  nebulaDustGeo,
  new THREE.PointsMaterial({ color: 0xd8b8ff, size: 0.12, transparent: true, opacity: 0.7 })
);
scene.add(nebulaDust);

// --- Dynamic world container (cleared and rebuilt for each world) ---
const worldGroup = new THREE.Group();
worldGroup.visible = false;
scene.add(worldGroup);

// --- World state ---
let currentWorldData = null;  // params from DB or default
let currentWorldPosition = 0; // 0 = original bauhaus, 1+ = chain worlds
let worldChain = [];
let interactives = [];
let harmonyPillars = [];
let harmonyRing = null;
let chamberFrame = null;
let chamberCore = null;
let orderGrid = null;
let orderGateLeft = null;
let orderGateRight = null;
let building = null;
let orb = null;
let harmonyRoom = null;
let chamber = null;

// --- Game state ---
let ritualOrder = [0, 2, 4, 1, 3];
let ritualStep = 0;
let ritualTimer = 0;
let chamberUnlocked = false;
let inHarmony = false;
let rhymeTimer = 0;
let dropActive = false;
let dropTimer = 0;
let dropCooldown = 0;
let improbableChain = [];
let improbableTimer = 0;
let orderMode = false;
let orderGateOpen = 0;
let creationShown = false;

const rhymeLines = {
  enter: [
    'in night we roam, in light we home',
    'shape meets sound, and we are found',
    'stone and tone, now beat as one'
  ],
  motion: [
    'glide then steer, the form grows clear',
    'slow your stride, let rhythm guide',
    'curve and line begin to align'
  ],
  click: [
    'touch the gleam, compose the dream',
    'tap the light, and tune the night',
    'pulse by pulse, the shapes convulse'
  ]
};

function pickLine(kind) {
  const list = rhymeLines[kind] || rhymeLines.enter;
  return list[Math.floor(Math.random() * list.length)];
}

// ========================================================================
//  WORLD BUILDER — builds a Three.js scene from world params
// ========================================================================

const DEFAULT_WORLD_PARAMS = {
  mood: 'default',
  palette: { primary: 0x7ce0b4, secondary: 0xd6d9dc, accent: 0xde3640, bg: 0xaed0b2, fog: 0x98c4a0 },
  shapeStyle: 'angular',
  floorCount: 5,
  buildingWidth: 14,
  buildingDepth: 11,
  floorHeight: 3.1,
  roomSize: 70,
  particleCount: 900,
  beaconCount: 5,
  rotationSpeed: 0.0013,
  fog: { near: 45, far: 200, color: 0x98c4a0 },
  lightIntensity: 0.8,
  beatMult: 1.5,
  hasOrb: true,
  hasRing: true,
  hasPillars: true,
  pillarCount: 6,
  ritualOrder: [0, 2, 4, 1, 3],
  seed: 42
};

function buildWorld(params) {
  // Clear previous world
  while (worldGroup.children.length) {
    const child = worldGroup.children[0];
    worldGroup.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material.dispose();
    }
  }
  interactives = [];
  harmonyPillars = [];

  const p = { ...DEFAULT_WORLD_PARAMS, ...params };
  const pal = p.palette;

  // Room box
  const roomBox = new THREE.Mesh(
    new THREE.BoxGeometry(p.roomSize, 28, p.roomSize),
    new THREE.MeshStandardMaterial({ color: pal.secondary, side: THREE.BackSide, roughness: 0.95 })
  );
  worldGroup.add(roomBox);

  // Building
  building = new THREE.Group();
  worldGroup.add(building);

  // Beacon colors cycle through primary, accent, and a derived color
  const beaconColors = [
    new THREE.Color(pal.accent),
    new THREE.Color(pal.primary),
    new THREE.Color(pal.accent).lerp(new THREE.Color(pal.primary), 0.5)
  ];

  for (let i = 0; i < p.floorCount; i++) {
    const floorW = p.buildingWidth - i * (p.buildingWidth * 0.07);
    const floorD = p.buildingDepth - i * (p.buildingDepth * 0.07);
    const floorY = i * p.floorHeight - 5;

    let floorGeo;
    if (p.shapeStyle === 'organic') {
      floorGeo = new THREE.CylinderGeometry(floorW / 2, floorW / 2, 1.3, 24);
    } else if (p.shapeStyle === 'crystal') {
      floorGeo = new THREE.OctahedronGeometry(floorW / 3);
    } else if (p.shapeStyle === 'spiral') {
      floorGeo = new THREE.TorusGeometry(floorW / 3, 0.6, 12, 32);
    } else {
      floorGeo = new THREE.BoxGeometry(floorW, 1.3, floorD);
    }

    const floorColor = i % 2 ? pal.secondary : new THREE.Color(pal.secondary).lerp(new THREE.Color(pal.primary), 0.15).getHex();
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.85 }));
    floor.position.y = floorY;
    if (p.shapeStyle === 'spiral') floor.rotation.x = Math.PI / 2;
    building.add(floor);

    // Accent pillars
    let accentGeo;
    if (p.shapeStyle === 'organic') {
      accentGeo = new THREE.SphereGeometry(0.7, 16, 16);
    } else if (p.shapeStyle === 'spire') {
      accentGeo = new THREE.ConeGeometry(0.5, 3.2, 12);
    } else if (p.shapeStyle === 'crystal') {
      accentGeo = new THREE.OctahedronGeometry(0.6);
    } else {
      accentGeo = new THREE.CylinderGeometry(0.6, 0.6, 2.4, 20);
    }

    const accentColor = beaconColors[i % 3].getHex();
    const accent = new THREE.Mesh(accentGeo, new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.55 }));
    accent.position.set((i % 2 ? -1 : 1) * (3.2 - i * 0.45), floorY + 1, 2.5 - i * 0.7);
    building.add(accent);

    // Beacons
    if (i < p.beaconCount) {
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 20, 20),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: beaconColors[i % 3].clone(),
          emissiveIntensity: 0.25
        })
      );
      beacon.position.set((i % 2 ? -1 : 1) * (5.6 - i * 0.5), floorY - 0.2, -1.6 + i * 0.3);
      beacon.userData = { active: 0, base: beacon.material.emissive.clone() };
      building.add(beacon);
      interactives.push(beacon);
    }
  }

  // Orb
  orb = null;
  if (p.hasOrb) {
    orb = new THREE.Mesh(
      new THREE.SphereGeometry(1.3, 28, 28),
      new THREE.MeshStandardMaterial({ color: pal.primary, emissive: pal.primary, emissiveIntensity: 0.5 })
    );
    orb.position.set(0, p.floorCount * p.floorHeight - 2, -2);
    building.add(orb);
  }

  // Chamber (hidden until ritual)
  chamber = new THREE.Group();
  chamber.visible = false;
  worldGroup.add(chamber);

  chamberFrame = new THREE.Mesh(
    new THREE.TorusGeometry(3.3, 0.24, 20, 80),
    new THREE.MeshStandardMaterial({ color: pal.primary, emissive: pal.primary, emissiveIntensity: 0.25 })
  );
  chamberFrame.rotation.y = Math.PI * 0.5;
  chamberFrame.position.set(0, 2.8, -18);
  chamber.add(chamberFrame);

  chamberCore = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 24, 24),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(pal.primary).lerp(new THREE.Color(0xffffff), 0.5).getHex(),
      emissive: pal.primary,
      emissiveIntensity: 0.5,
      transparent: true, opacity: 0.85
    })
  );
  chamberCore.position.set(0, 2.8, -18);
  chamber.add(chamberCore);

  // Harmony room
  harmonyRoom = new THREE.Group();
  harmonyRoom.visible = false;
  worldGroup.add(harmonyRoom);

  if (p.hasRing) {
    harmonyRing = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.2, 0.25, 120, 16),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(pal.primary).lerp(new THREE.Color(0xffffff), 0.6).getHex(),
        emissive: pal.primary,
        emissiveIntensity: 0.45,
        roughness: 0.3, metalness: 0.2
      })
    );
    harmonyRing.position.set(0, 3.2, -10);
    harmonyRoom.add(harmonyRing);
  } else {
    harmonyRing = null;
  }

  harmonyPillars = [];
  if (p.hasPillars) {
    for (let i = 0; i < p.pillarCount; i++) {
      const pil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, 7, 20),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(pal.primary).lerp(new THREE.Color(0xffffff), 0.4).getHex(),
          emissive: pal.primary,
          emissiveIntensity: 0.2,
          roughness: 0.8
        })
      );
      const a = (i / p.pillarCount) * Math.PI * 2;
      pil.position.set(Math.cos(a) * 6, 0.5, -10 + Math.sin(a) * 6);
      harmonyRoom.add(pil);
      harmonyPillars.push(pil);
    }
  }

  // Particles
  if (p.particleCount > 0) {
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(p.particleCount * 3);
    for (let i = 0; i < p.particleCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * p.roomSize * 0.8;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * p.roomSize * 0.8;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: pal.primary,
      size: 0.1,
      transparent: true,
      opacity: 0.5
    }));
    worldGroup.add(particles);
  }

  // Order grid
  orderGrid = new THREE.GridHelper(46, 23, pal.primary, new THREE.Color(pal.primary).lerp(new THREE.Color(pal.secondary), 0.4).getHex());
  orderGrid.position.y = -5.2;
  orderGrid.material.transparent = true;
  orderGrid.material.opacity = 0;
  worldGroup.add(orderGrid);

  // Order gates
  orderGateLeft = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 5.5, 0.35),
    new THREE.MeshStandardMaterial({ color: pal.secondary, roughness: 0.72 })
  );
  orderGateRight = orderGateLeft.clone();
  orderGateLeft.position.set(-1.25, -2.2, 5.8);
  orderGateRight.position.set(1.25, -2.2, 5.8);
  building.add(orderGateLeft);
  building.add(orderGateRight);

  // Update fog and lighting
  scene.fog = new THREE.Fog(p.fog.color, p.fog.near, p.fog.far);
  ambient.intensity = p.lightIntensity * 0.7;

  // Update ritual order
  ritualOrder = p.ritualOrder || [0, 2, 4, 1, 3];
  if (ritualOrder.length > interactives.length) {
    ritualOrder = ritualOrder.slice(0, interactives.length);
  }

  currentWorldData = p;
}

// Build default world on startup (hidden until bauhaus phase)
buildWorld(DEFAULT_WORLD_PARAMS);

// ========================================================================
//  GAME STATE & CONTROLS
// ========================================================================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let phase = 'space';
let clickPower = 0;
let idleMs = 0;
let started = false;
let dragging = false;
let yaw = 0;
let pitch = 0;
const keys = {};
const moveVelocity = new THREE.Vector3();
const desiredMove = new THREE.Vector3();
const touchMove = { active: false, x: 0, y: 0, centerX: 0, centerY: 0 };

function setPhase(p) {
  phase = p;
  phaseLabel.textContent = p;
}

function toggleOrderMode() {
  if (phase !== 'bauhaus') return;
  orderMode = !orderMode;
  statusEl.textContent = orderMode ? 'bauhaus world: open for order' : 'bauhaus world: open for flow';
  triggerAudioAccent(orderMode ? 1.2 : 0.8);
}

startBtn.addEventListener('click', async () => {
  started = true;
  hud.classList.remove('hidden');
  startBtn.classList.add('hidden');
  if (isTouchDevice) {
    controlsHint.textContent = 'Mobile: swipe up/down to move · swipe left/right to look · tap to interact';
  }
  statusEl.textContent = 'Find the nebula. Tap it.';
  try { beat.volume = 0.45; await beat.play(); } catch {}
  // Show chain nav if there are worlds
  loadWorldChain();
});

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  if (dragging && phase === 'bauhaus') {
    yaw -= e.movementX * 0.0027;
    pitch -= e.movementY * 0.0022;
    pitch = Math.max(-1.1, Math.min(1.1, pitch));
  }
  idleMs = 0;
  hint.classList.add('hidden');
});

window.addEventListener('mousedown', () => { dragging = true; idleMs = 0; });
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === 'm') triggerBeatDrop();
  if (k === 'o') toggleOrderMode();
  if (k === 'c' && inHarmony && !creationShown) showCreatePanel();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function triggerAudioAccent(strength = 1) {
  if (!beat || beat.paused) return;
  const target = Math.min(0.9, 0.62 + strength * 0.12);
  beat.volume = target;
  setTimeout(() => {
    beat.volume = Math.max(0.45, beat.volume - 0.18);
  }, 140);
}

function triggerBeatDrop(source = 'hotkey') {
  if (!inHarmony || dropCooldown > 0 || !beat || beat.paused) return;
  dropActive = true;
  dropTimer = 0;
  dropCooldown = 10;
  statusEl.textContent = source === 'improbable'
    ? 'unlikely on top of likely — DROP'
    : 'mic check... one, two — DROP';
  beat.playbackRate = 0.72;
  beat.volume = 0.2;
}

function handlePrimaryAction() {
  if (!started) return;

  raycaster.setFromCamera(mouse, camera);

  if (phase === 'space') {
    const hits = raycaster.intersectObject(nebula);
    if (hits.length) {
      clickPower += 1;
      nebula.material.emissiveIntensity = Math.min(4, 1 + clickPower * 0.45);
      nebula.scale.setScalar(1 + clickPower * 0.05);
      statusEl.textContent = clickPower < 3 ? 'yes... stronger.' : 'go deeper.';
      triggerAudioAccent(0.7);
      if (clickPower >= 4) beginWarp();
    }
    return;
  }

  if (phase === 'bauhaus') {
    const hits = raycaster.intersectObjects(interactives, false);
    if (hits.length) {
      const obj = hits[0].object;
      const idx = interactives.indexOf(obj);
      obj.userData.active = 1;
      obj.material.emissiveIntensity = 2.2;
      obj.scale.setScalar(1.35);

      if (inHarmony) {
        statusEl.textContent = pickLine('click');

        const movingNow = keys['w'] || keys['a'] || keys['s'] || keys['d'] || Math.abs(touchMove.x) > 0.22 || Math.abs(touchMove.y) > 0.22;
        improbableTimer = 2.8;
        improbableChain.push({ idx, moving: movingNow });
        if (improbableChain.length > 3) improbableChain.shift();

        if (
          improbableChain.length === 3 &&
          improbableChain[0].idx === 4 &&
          improbableChain[1].idx === 1 &&
          improbableChain[2].idx === 3 &&
          improbableChain.every((s) => s.moving)
        ) {
          improbableChain = [];
          triggerBeatDrop('improbable');
        }
      }

      if (!chamberUnlocked) {
        if (idx === ritualOrder[ritualStep]) {
          ritualStep += 1;
          ritualTimer = 3.5;
          statusEl.textContent = `ritual ${ritualStep}/${ritualOrder.length}`;
          triggerAudioAccent(1.1);
          if (ritualStep >= ritualOrder.length) {
            chamberUnlocked = true;
            chamber.visible = true;
            statusEl.textContent = 'hidden chamber unlocked — step through the light';
            triggerAudioAccent(1.4);
          }
        } else {
          ritualStep = 0;
          ritualTimer = 0;
          statusEl.textContent = 'ritual broken — begin again';
          triggerAudioAccent(0.5);
        }
      } else {
        statusEl.textContent = 'bauhaus resonance engaged';
        triggerAudioAccent(1.0);
      }
    }
  }
}

window.addEventListener('click', handlePrimaryAction);

if (isTouchDevice) {
  mouse.set(0, 0);
  mobileControls.classList.add('hidden');

  let touchActive = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let movedFar = false;

  window.addEventListener('touchstart', (e) => {
    if (!started) return;
    const t = e.touches[0];
    touchActive = true;
    movedFar = false;
    startX = lastX = t.clientX;
    startY = lastY = t.clientY;
    mouse.x = (t.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(t.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!started || !touchActive) return;
    const t = e.touches[0];
    const dx = t.clientX - lastX;
    const totalY = t.clientY - startY;

    if (phase === 'bauhaus') {
      yaw -= dx * 0.0062;
    }

    touchMove.y = THREE.MathUtils.clamp(totalY / 120, -1, 1);

    if (Math.abs(t.clientX - startX) > 12 || Math.abs(t.clientY - startY) > 12) {
      movedFar = true;
    }

    lastX = t.clientX;
    lastY = t.clientY;
    mouse.x = (t.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(t.clientY / window.innerHeight) * 2 + 1;
    idleMs = 0;
    hint.classList.add('hidden');
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('touchend', () => {
    if (!started) return;
    if (!movedFar) {
      handlePrimaryAction();
    }
    touchActive = false;
    touchMove.y = 0;
    touchMove.x = 0;
  }, { passive: true });

  interactBtn.addEventListener('click', (e) => { e.preventDefault(); handlePrimaryAction(); });
  dropBtn.addEventListener('click', (e) => { e.preventDefault(); triggerBeatDrop(); });
  orderBtn.addEventListener('click', (e) => { e.preventDefault(); toggleOrderMode(); });
}

let warpT = 0;
const warpState = { shake: 0, flash: 0, startFov: 65 };

function beginWarp() {
  setPhase('transition');
  statusEl.textContent = 'You are entering the nebula.';
  hint.classList.add('hidden');
  warpState.shake = 0;
  warpState.flash = 0;
  warpState.startFov = camera.fov;
}

function updateBauhausControls(dt) {
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const accel = 20;

  const forwardOn = keys['w'] || touchMove.y < -0.22;
  const backOn = keys['s'] || touchMove.y > 0.22;
  const leftOn = keys['a'] || touchMove.x < -0.22;
  const rightOn = keys['d'] || touchMove.x > 0.22;

  desiredMove.set(0, 0, 0);
  if (forwardOn) desiredMove.add(forward);
  if (backOn) desiredMove.addScaledVector(forward, -1);
  if (leftOn) desiredMove.addScaledVector(right, -1);
  if (rightOn) desiredMove.add(right);
  if (desiredMove.lengthSq() > 0) desiredMove.normalize();

  moveVelocity.lerp(desiredMove.multiplyScalar(accel * dt), 0.18);
  camera.position.add(moveVelocity);

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -24, 24);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -24, 24);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, -2, 16);
}

// ========================================================================
//  WORLD CHAIN API
// ========================================================================

async function loadWorldChain() {
  try {
    const res = await fetch('/api/worlds');
    const data = await res.json();
    worldChain = data.chain || [];
    if (worldChain.length > 0) {
      chainNav.classList.remove('hidden');
      updateChainNav();
    }
  } catch (e) {
    console.warn('Could not load world chain:', e);
  }
}

function updateChainNav() {
  if (currentWorldPosition === 0) {
    worldIndicator.textContent = 'Original';
    prevWorldBtn.disabled = true;
  } else {
    const w = worldChain[currentWorldPosition - 1];
    worldIndicator.textContent = `World #${currentWorldPosition}`;
    prevWorldBtn.disabled = currentWorldPosition <= 0;
  }
  nextWorldBtn.disabled = currentWorldPosition >= worldChain.length;
}

function switchToWorld(position) {
  // Reset game state for the new world
  ritualStep = 0;
  ritualTimer = 0;
  chamberUnlocked = false;
  inHarmony = false;
  rhymeTimer = 0;
  dropActive = false;
  dropTimer = 0;
  dropCooldown = 0;
  improbableChain = [];
  improbableTimer = 0;
  orderMode = false;
  orderGateOpen = 0;
  creationShown = false;

  currentWorldPosition = position;

  if (position === 0) {
    // Rebuild original default world
    buildWorld(DEFAULT_WORLD_PARAMS);
    renderer.setClearColor(0xaed0b2);
    statusEl.textContent = 'Welcome to the original Bauhaus world.';
  } else {
    const w = worldChain[position - 1];
    if (w && w.params) {
      buildWorld(w.params);
      const bg = w.params.palette ? w.params.palette.bg : 0xaed0b2;
      renderer.setClearColor(bg);
      statusEl.textContent = `World #${position}: "${w.prompt}"`;
    }
  }

  // Reset camera to world entry point
  worldGroup.visible = true;
  camera.position.set(0, 2, 20);
  yaw = Math.PI;
  pitch = -0.06;
  camera.fov = 68;
  camera.updateProjectionMatrix();

  updateChainNav();
}

prevWorldBtn.addEventListener('click', () => {
  if (currentWorldPosition > 0) {
    switchToWorld(currentWorldPosition - 1);
  }
});

nextWorldBtn.addEventListener('click', () => {
  if (currentWorldPosition < worldChain.length) {
    switchToWorld(currentWorldPosition + 1);
  }
});

chainBrowseBtn.addEventListener('click', () => {
  chainPanel.classList.toggle('hidden');
  if (!chainPanel.classList.contains('hidden')) {
    renderChainList();
  }
});

closeChainBtn.addEventListener('click', () => {
  chainPanel.classList.add('hidden');
});

function renderChainList() {
  chainCount.textContent = `${worldChain.length} world${worldChain.length !== 1 ? 's' : ''}`;
  chainList.innerHTML = '';

  // Original world entry
  const origItem = document.createElement('div');
  origItem.className = 'chain-item' + (currentWorldPosition === 0 ? ' active' : '');
  origItem.innerHTML = `
    <div class="chain-position">Origin</div>
    <div class="chain-prompt">Original Bauhaus World</div>
    <div class="chain-mood">default</div>
  `;
  origItem.addEventListener('click', () => {
    if (phase === 'bauhaus') switchToWorld(0);
    chainPanel.classList.add('hidden');
  });
  chainList.appendChild(origItem);

  for (const w of worldChain) {
    const item = document.createElement('div');
    item.className = 'chain-item' + (currentWorldPosition === w.chain_position ? ' active' : '');
    const date = w.created_at ? new Date(w.created_at).toLocaleString() : '';
    item.innerHTML = `
      <div class="chain-position">World #${w.chain_position}</div>
      <div class="chain-prompt">"${escapeHtml(w.prompt)}"</div>
      <div class="chain-mood">${w.params.mood || 'unknown'}</div>
      <div class="chain-date">${date}</div>
    `;
    item.addEventListener('click', () => {
      if (phase === 'bauhaus') switchToWorld(w.chain_position);
      chainPanel.classList.add('hidden');
    });
    chainList.appendChild(item);
  }
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ========================================================================
//  WORLD CREATION — "ES KANN NUR EINEN GEBEN"
// ========================================================================

let harmonyCreateTimer = 0;

function showCreatePanel() {
  creationShown = true;
  createPanel.classList.remove('hidden');
  worldPrompt.value = '';
  charCount.textContent = '0 / 500';
  createBtn.disabled = false;
  lockIndicator.classList.add('hidden');
  checkLockStatus();
}

async function checkLockStatus() {
  try {
    const res = await fetch('/api/lock');
    const data = await res.json();
    if (data.is_locked) {
      createBtn.disabled = true;
      lockIndicator.classList.remove('hidden');
      lockMsg.textContent = 'ES KANN NUR EINEN GEBEN — someone is creating right now. Wait...';
    } else {
      createBtn.disabled = false;
      lockIndicator.classList.add('hidden');
    }
  } catch (e) {
    console.warn('Lock check failed:', e);
  }
}

worldPrompt.addEventListener('input', () => {
  charCount.textContent = `${worldPrompt.value.length} / 500`;
});

createBtn.addEventListener('click', async () => {
  const prompt = worldPrompt.value.trim();
  if (!prompt) {
    createStatus.textContent = 'Enter a prompt to describe your world.';
    return;
  }

  createBtn.disabled = true;
  createStatus.textContent = 'Acquiring creation lock...';

  try {
    // Step 1: Acquire lock
    const lockRes = await fetch('/api/lock/acquire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    });

    if (!lockRes.ok) {
      const err = await lockRes.json();
      createStatus.textContent = err.error || 'Could not acquire lock.';
      lockIndicator.classList.remove('hidden');
      lockMsg.textContent = err.error;
      createBtn.disabled = false;
      return;
    }

    createStatus.textContent = 'Generating your world...';

    // Step 2: Create world
    const createRes = await fetch('/api/worlds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, session_id: sessionId })
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      createStatus.textContent = err.error || 'Creation failed.';
      createBtn.disabled = false;
      // Release lock on failure
      await fetch('/api/lock/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      return;
    }

    const result = await createRes.json();
    createStatus.textContent = `World #${result.world.chain_position} created! Entering...`;

    // Reload chain and switch to the new world
    await loadWorldChain();
    setTimeout(() => {
      createPanel.classList.add('hidden');
      switchToWorld(result.world.chain_position);
    }, 1500);

  } catch (e) {
    createStatus.textContent = 'Network error. Try again.';
    createBtn.disabled = false;
    console.error('Creation error:', e);
  }
});

closeCreateBtn.addEventListener('click', () => {
  createPanel.classList.add('hidden');
});

// ========================================================================
//  ANIMATION LOOP
// ========================================================================

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);

  const beatPulse = beat.paused ? 0 : (Math.sin(beat.currentTime * 2.5) * 0.5 + 0.5);

  stars.rotation.y += (0.0035 + beatPulse * 0.0015) * dt * 60;
  nebula.rotation.y += 0.002 * dt * 60;
  nebulaHalo.position.copy(nebula.position);
  nebulaHalo.rotation.z += (0.002 + beatPulse * 0.004) * dt * 60;
  nebulaHalo.material.opacity = 0.28 + beatPulse * 0.35 + Math.min(0.25, clickPower * 0.03);
  nebulaCore.scale.setScalar(1 + Math.sin(performance.now() * 0.0025) * 0.08 + clickPower * 0.02 + beatPulse * 0.08);
  nebulaDust.rotation.y += (0.0018 + beatPulse * 0.002) * dt * 60;

  if (started && phase === 'space') {
    idleMs += dt * 1000;
    if (idleMs > 7000) hint.classList.remove('hidden');
  }

  if (phase === 'transition') {
    warpT += dt * 0.42;
    const t = Math.min(1, warpT);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    warpState.shake = Math.max(0, 1 - ease) * 0.22;
    warpState.flash = Math.max(0, (ease - 0.75) / 0.25);

    const shakeX = (Math.random() - 0.5) * warpState.shake;
    const shakeY = (Math.random() - 0.5) * warpState.shake * 0.6;
    camera.position.set(shakeX, shakeY, THREE.MathUtils.lerp(18, -42, ease));

    camera.fov = THREE.MathUtils.lerp(warpState.startFov, 94, ease);
    camera.updateProjectionMatrix();

    const warpColor = new THREE.Color().lerpColors(new THREE.Color(0x02030a), new THREE.Color(0xb8d9b9), ease * 0.9);
    renderer.setClearColor(warpColor);

    if (nebula.visible) {
      nebula.scale.setScalar(1 + ease * 1.3);
      nebula.material.opacity = Math.max(0, 0.82 - ease * 0.55);
      nebulaCore.material.opacity = Math.max(0, 0.7 - ease * 0.4);
      nebulaHalo.material.opacity = Math.max(0, 0.45 - ease * 0.35);
      nebulaDust.material.opacity = Math.max(0, 0.7 - ease * 0.6);
    }

    beat.playbackRate = 1 + ease * 0.12;
    beat.volume = THREE.MathUtils.lerp(0.45, 0.6, ease);

    if (t >= 1) {
      setPhase('bauhaus');
      statusEl.textContent = 'Welcome to Bauhaus world.';
      worldGroup.visible = true;
      nebula.visible = false;
      nebulaHalo.visible = false;
      nebulaDust.visible = false;
      camera.fov = 68;
      camera.position.set(0, 2, 20);
      yaw = Math.PI;
      pitch = -0.06;

      const bg = currentWorldData && currentWorldData.palette ? currentWorldData.palette.bg : 0xaed0b2;
      renderer.setClearColor(bg);
      overlay.style.background = 'radial-gradient(circle at 50% 30%, rgba(190,220,190,0.25), rgba(120,150,120,0.35))';

      // Show chain nav
      chainNav.classList.remove('hidden');
      updateChainNav();
    }
  }

  if (phase === 'bauhaus') {
    updateBauhausControls(dt);
    if (dropCooldown > 0) dropCooldown = Math.max(0, dropCooldown - dt);
    if (improbableTimer > 0) {
      improbableTimer = Math.max(0, improbableTimer - dt);
      if (improbableTimer === 0) improbableChain = [];
    }

    if (dropActive) {
      dropTimer += dt;
      if (dropTimer < 1.2) {
        beat.playbackRate = THREE.MathUtils.lerp(0.72, 0.6, dropTimer / 1.2);
        beat.volume = THREE.MathUtils.lerp(0.2, 0.06, dropTimer / 1.2);
        renderer.setClearColor(0x050505);
      } else if (dropTimer < 1.45) {
        beat.playbackRate = 1.18;
        beat.volume = 0.92;
        camera.position.y += Math.sin(performance.now() * 0.08) * 0.06;
      } else {
        dropActive = false;
        beat.playbackRate = 1.0;
        beat.volume = 0.52;
        statusEl.textContent = pickLine('motion');
      }
    }

    const bm = currentWorldData ? (currentWorldData.beatMult || 1.5) : 1.5;
    const tBeat = beat.paused ? 0 : (Math.sin(beat.currentTime * 2.2) * 0.5 + 0.5);
    const rotSpeed = currentWorldData ? (currentWorldData.rotationSpeed || 0.0013) : 0.0013;

    orderGateOpen = THREE.MathUtils.lerp(orderGateOpen, orderMode ? 1 : 0, 0.06);
    if (orderGrid) orderGrid.material.opacity = orderGateOpen * 0.32;
    if (orderGateLeft) orderGateLeft.position.x = THREE.MathUtils.lerp(-1.25, -3.5, orderGateOpen);
    if (orderGateRight) orderGateRight.position.x = THREE.MathUtils.lerp(1.25, 3.5, orderGateOpen);

    if (orderMode) {
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2.2, 0.08);
      yaw = THREE.MathUtils.lerp(yaw, Math.round(yaw / (Math.PI / 4)) * (Math.PI / 4), 0.06);
      floorGlow.intensity = THREE.MathUtils.lerp(floorGlow.intensity, 0.7, 0.08);
    }

    if (ritualTimer > 0 && !chamberUnlocked) {
      ritualTimer -= dt;
      if (ritualTimer <= 0) {
        ritualStep = 0;
        statusEl.textContent = 'ritual faded — restart sequence';
      }
    }

    if (building) building.rotation.y += rotSpeed * dt * 60;
    if (orb) orb.position.y = 9.7 + Math.sin(performance.now() * 0.002) * 0.8;

    for (let i = 0; i < interactives.length; i++) {
      const beacon = interactives[i];
      beacon.userData.active = Math.max(0, (beacon.userData.active || 0) - dt * 1.2);
      const glow = beacon.userData.active;
      const isNext = !chamberUnlocked && ritualOrder[ritualStep] === i;
      beacon.material.emissiveIntensity = 0.25 + glow * 2.0 + tBeat * 0.25 + (isNext ? 0.45 : 0);
      beacon.scale.setScalar(1 + glow * 0.35 + tBeat * 0.04 + (isNext ? 0.06 : 0));
    }

    if (chamber && chamber.visible) {
      if (chamberFrame) chamberFrame.rotation.z += 0.0035 * dt * 60;
      if (chamberCore) {
        chamberCore.scale.setScalar(1 + tBeat * 0.12);
        chamberCore.material.emissiveIntensity = 0.55 + tBeat * 0.8;
      }

      const portalPos = chamberCore.getWorldPosition(new THREE.Vector3());
      const dist = camera.position.distanceTo(portalPos);
      if (!inHarmony && dist < 2.7) {
        inHarmony = true;
        if (harmonyRoom) harmonyRoom.visible = true;
        camera.position.set(0, 1.8, -10);
        yaw = 0;
        pitch = -0.04;
        statusEl.textContent = pickLine('enter');
        triggerAudioAccent(1.5);
        floorGlow.color.setHex(0xb8ffd6);
        harmonyCreateTimer = 0;
      }
    }

    if (inHarmony) {
      rhymeTimer += dt;
      harmonyCreateTimer += dt;

      if (harmonyRing) {
        harmonyRing.rotation.x += 0.006 * dt * 60;
        harmonyRing.rotation.y += 0.008 * dt * 60;
        harmonyRing.material.emissiveIntensity = 0.5 + tBeat * 0.9;
      }
      for (let i = 0; i < harmonyPillars.length; i++) {
        const p = harmonyPillars[i];
        p.material.emissiveIntensity = 0.22 + tBeat * 0.55;
        p.scale.y = 1 + Math.sin(performance.now() * 0.0012 + i) * 0.06;
      }

      const moving = keys['w'] || keys['a'] || keys['s'] || keys['d'] || Math.abs(touchMove.x) > 0.22 || Math.abs(touchMove.y) > 0.22;
      if (moving && rhymeTimer > 3.5) {
        rhymeTimer = 0;
        statusEl.textContent = pickLine('motion');
      } else if (!moving && rhymeTimer > 7) {
        rhymeTimer = 0;
        statusEl.textContent = pickLine('enter');
      }

      // Show creation prompt after 5 seconds in harmony
      if (harmonyCreateTimer > 5 && !creationShown) {
        statusEl.textContent = 'Press C to create your world — or keep vibing';
        if (isTouchDevice && !creationShown) {
          showCreatePanel();
        }
      }
    }

    const dropMult = dropActive ? 1.8 : 1.0;
    point.color.setHex(dropActive ? 0xc8fff0 : 0x8ed9b1);
    point.intensity = (1.15 + tBeat * 0.45) * dropMult;
    point.position.x = Math.sin(performance.now() * 0.0004) * 10;

    rimLight.intensity = (0.6 + tBeat * 0.6) * dropMult;
    rimLight.color.setHSL(dropActive ? 0.47 : 0.38, 0.75, 0.72);

    floorGlow.intensity = (0.55 + tBeat * 0.85) * dropMult;
    floorGlow.distance = 55 + tBeat * 20;

    if (!dropActive) {
      const bg = currentWorldData && currentWorldData.palette ? currentWorldData.palette.bg : 0xaed0b2;
      renderer.setClearColor(bg);
    }
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
