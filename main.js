import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

const overlay = document.getElementById('overlay');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const hint = document.getElementById('hint');
const hud = document.getElementById('hud');
const phaseLabel = document.getElementById('phaseLabel');
const beat = document.getElementById('beat');

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

const starsGeo = new THREE.BufferGeometry();
const count = 2500;
const pos = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
  const r = 190;
  pos[i * 3] = (Math.random() - 0.5) * r;
  pos[i * 3 + 1] = (Math.random() - 0.5) * r;
  pos[i * 3 + 2] = (Math.random() - 0.5) * r;
}
starsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xc6d4ff, size: 0.22 }));
scene.add(stars);

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

const room = new THREE.Group();
room.visible = false;
scene.add(room);

const roomBox = new THREE.Mesh(
  new THREE.BoxGeometry(70, 28, 70),
  new THREE.MeshStandardMaterial({ color: 0xcfe8d1, side: THREE.BackSide, roughness: 0.95 })
);
room.add(roomBox);

const building = new THREE.Group();
room.add(building);

const interactives = [];
const ritualOrder = [0, 2, 4, 1, 3];
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

for (let i = 0; i < 5; i++) {
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(14 - i * 1.1, 1.3, 11 - i * 0.8),
    new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe8ebee : 0xd6d9dc, roughness: 0.85 })
  );
  floor.position.y = i * 3.1 - 5;
  building.add(floor);

  const accent = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 2.4, 20),
    new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? 0xde3640 : i % 3 === 1 ? 0x2962ff : 0xf5cf3a, roughness: 0.55 })
  );
  accent.position.set((i % 2 ? -1 : 1) * (3.2 - i * 0.45), i * 3.1 - 4, 2.5 - i * 0.7);
  building.add(accent);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: accent.material.color.clone(), emissiveIntensity: 0.25 })
  );
  beacon.position.set((i % 2 ? -1 : 1) * (5.6 - i * 0.5), i * 3.1 - 4.2, -1.6 + i * 0.3);
  beacon.userData = { active: 0, base: beacon.material.emissive.clone() };
  building.add(beacon);
  interactives.push(beacon);
}

const orb = new THREE.Mesh(
  new THREE.SphereGeometry(1.3, 28, 28),
  new THREE.MeshStandardMaterial({ color: 0x4bd1b5, emissive: 0x2bbd95, emissiveIntensity: 0.5 })
);
orb.position.set(0, 10, -2);
building.add(orb);

const chamber = new THREE.Group();
chamber.visible = false;
room.add(chamber);

const harmonyRoom = new THREE.Group();
harmonyRoom.visible = false;
room.add(harmonyRoom);

const chamberFrame = new THREE.Mesh(
  new THREE.TorusGeometry(3.3, 0.24, 20, 80),
  new THREE.MeshStandardMaterial({ color: 0x8be5bf, emissive: 0x46c89a, emissiveIntensity: 0.25 })
);
chamberFrame.rotation.y = Math.PI * 0.5;
chamberFrame.position.set(0, 2.8, -18);
chamber.add(chamberFrame);

const chamberCore = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 24, 24),
  new THREE.MeshStandardMaterial({ color: 0xc8ffe6, emissive: 0x6ff0ba, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 })
);
chamberCore.position.set(0, 2.8, -18);
chamber.add(chamberCore);

const harmonyRing = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.2, 0.25, 120, 16),
  new THREE.MeshStandardMaterial({ color: 0xe7ffd8, emissive: 0x9ef0a8, emissiveIntensity: 0.45, roughness: 0.3, metalness: 0.2 })
);
harmonyRing.position.set(0, 3.2, -10);
harmonyRoom.add(harmonyRing);

const harmonyPillars = [];
for (let i = 0; i < 6; i++) {
  const p = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 7, 20),
    new THREE.MeshStandardMaterial({ color: 0xeaf7df, emissive: 0x7cd89a, emissiveIntensity: 0.2, roughness: 0.8 })
  );
  const a = (i / 6) * Math.PI * 2;
  p.position.set(Math.cos(a) * 6, 0.5, -10 + Math.sin(a) * 6);
  harmonyRoom.add(p);
  harmonyPillars.push(p);
}

const orderGrid = new THREE.GridHelper(46, 23, 0x98d9b5, 0x84c3a1);
orderGrid.position.y = -5.2;
orderGrid.material.transparent = true;
orderGrid.material.opacity = 0;
room.add(orderGrid);

const orderGateLeft = new THREE.Mesh(
  new THREE.BoxGeometry(2.3, 5.5, 0.35),
  new THREE.MeshStandardMaterial({ color: 0xe8f3e8, roughness: 0.72 })
);
const orderGateRight = orderGateLeft.clone();
orderGateLeft.position.set(-1.25, -2.2, 5.8);
orderGateRight.position.set(1.25, -2.2, 5.8);
building.add(orderGateLeft);
building.add(orderGateRight);

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

function setPhase(p) {
  phase = p;
  phaseLabel.textContent = p;
}

startBtn.addEventListener('click', async () => {
  started = true;
  hud.classList.remove('hidden');
  startBtn.classList.add('hidden');
  statusEl.textContent = 'Find the nebula. Click it.';
  try { beat.volume = 0.45; await beat.play(); } catch {}
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
  if (k === 'o' && phase === 'bauhaus') {
    orderMode = !orderMode;
    statusEl.textContent = orderMode ? 'bauhaus world: open for order' : 'bauhaus world: open for flow';
    triggerAudioAccent(orderMode ? 1.2 : 0.8);
  }
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

window.addEventListener('click', () => {
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

        // "Unlikely on top of probable": after probable chamber unlock,
        // hit beacons in a rare combo while moving to trigger hidden beat drop.
        const movingNow = keys['w'] || keys['a'] || keys['s'] || keys['d'];
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
});

let warpT = 0;
const warpState = {
  shake: 0,
  flash: 0,
  startFov: 65
};

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

  desiredMove.set(0, 0, 0);
  if (keys['w']) desiredMove.add(forward);
  if (keys['s']) desiredMove.addScaledVector(forward, -1);
  if (keys['a']) desiredMove.addScaledVector(right, -1);
  if (keys['d']) desiredMove.add(right);
  if (desiredMove.lengthSq() > 0) desiredMove.normalize();

  moveVelocity.lerp(desiredMove.multiplyScalar(accel * dt), 0.18);
  camera.position.add(moveVelocity);

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -24, 24);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -24, 24);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, -2, 16);
}

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
      room.visible = true;
      nebula.visible = false;
      nebulaHalo.visible = false;
      nebulaDust.visible = false;
      camera.fov = 68;
      camera.position.set(0, 2, 20);
      yaw = Math.PI;
      pitch = -0.06;
      renderer.setClearColor(0xaed0b2);
      overlay.style.background = 'radial-gradient(circle at 50% 30%, rgba(190,220,190,0.25), rgba(120,150,120,0.35))';
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
        // pre-drop tension
        beat.playbackRate = THREE.MathUtils.lerp(0.72, 0.6, dropTimer / 1.2);
        beat.volume = THREE.MathUtils.lerp(0.2, 0.06, dropTimer / 1.2);
        renderer.setClearColor(0x050505);
      } else if (dropTimer < 1.45) {
        // blast
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

    const tBeat = beat.paused ? 0 : (Math.sin(beat.currentTime * 2.2) * 0.5 + 0.5);

    orderGateOpen = THREE.MathUtils.lerp(orderGateOpen, orderMode ? 1 : 0, 0.06);
    orderGrid.material.opacity = orderGateOpen * 0.32;
    orderGateLeft.position.x = THREE.MathUtils.lerp(-1.25, -3.5, orderGateOpen);
    orderGateRight.position.x = THREE.MathUtils.lerp(1.25, 3.5, orderGateOpen);

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

    building.rotation.y += 0.0013 * dt * 60;
    orb.position.y = 9.7 + Math.sin(performance.now() * 0.002) * 0.8;

    for (let i = 0; i < interactives.length; i++) {
      const beacon = interactives[i];
      beacon.userData.active = Math.max(0, (beacon.userData.active || 0) - dt * 1.2);
      const glow = beacon.userData.active;
      const isNext = !chamberUnlocked && ritualOrder[ritualStep] === i;
      beacon.material.emissiveIntensity = 0.25 + glow * 2.0 + tBeat * 0.25 + (isNext ? 0.45 : 0);
      beacon.scale.setScalar(1 + glow * 0.35 + tBeat * 0.04 + (isNext ? 0.06 : 0));
    }

    if (chamber.visible) {
      chamberFrame.rotation.z += 0.0035 * dt * 60;
      chamberCore.scale.setScalar(1 + tBeat * 0.12);
      chamberCore.material.emissiveIntensity = 0.55 + tBeat * 0.8;

      const portalPos = chamberCore.getWorldPosition(new THREE.Vector3());
      const dist = camera.position.distanceTo(portalPos);
      if (!inHarmony && dist < 2.7) {
        inHarmony = true;
        harmonyRoom.visible = true;
        camera.position.set(0, 1.8, -10);
        yaw = 0;
        pitch = -0.04;
        statusEl.textContent = pickLine('enter');
        triggerAudioAccent(1.5);
        floorGlow.color.setHex(0xb8ffd6);
      }
    }

    if (inHarmony) {
      rhymeTimer += dt;
      harmonyRing.rotation.x += 0.006 * dt * 60;
      harmonyRing.rotation.y += 0.008 * dt * 60;
      harmonyRing.material.emissiveIntensity = 0.5 + tBeat * 0.9;
      for (let i = 0; i < harmonyPillars.length; i++) {
        const p = harmonyPillars[i];
        p.material.emissiveIntensity = 0.22 + tBeat * 0.55;
        p.scale.y = 1 + Math.sin(performance.now() * 0.0012 + i) * 0.06;
      }

      const moving = keys['w'] || keys['a'] || keys['s'] || keys['d'];
      if (moving && rhymeTimer > 3.5) {
        rhymeTimer = 0;
        statusEl.textContent = pickLine('motion');
      } else if (!moving && rhymeTimer > 7) {
        rhymeTimer = 0;
        statusEl.textContent = pickLine('enter');
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
      renderer.setClearColor(0xaed0b2);
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
