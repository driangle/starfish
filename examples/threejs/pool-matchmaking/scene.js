// Pool Matchmaking
// ----------------
// Demonstrates: pool auto-matching (sf.joinPool), presence tracking after match
//
// The user opens the page and is automatically paired with exactly one other
// user via pool auto mode. Once matched, both users are placed in a shared 3D
// scene where they can see each other's cursor position as a ring on the ground
// plane. The scene transitions through three visual states: waiting, matched,
// and connected.
//
// Open this page in two browser tabs to see it in action.

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Three.js setup
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x16213e);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 12, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Ground plane
const groundGeo = new THREE.PlaneGeometry(20, 20);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x2a2a4a,
  roughness: 0.9,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.name = "ground";
scene.add(ground);

const gridHelper = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
scene.add(gridHelper);

// ---------------------------------------------------------------------------
// Raycasting helpers
// ---------------------------------------------------------------------------

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// ---------------------------------------------------------------------------
// Peer cursor display
// ---------------------------------------------------------------------------

const peerCursors = new Map();

function ensureCursorMesh(peerId) {
  if (peerCursors.has(peerId)) return peerCursors.get(peerId);
  const geo = new THREE.RingGeometry(0.3, 0.4, 24);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: Math.random() * 0xffffff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.02;
  scene.add(mesh);
  peerCursors.set(peerId, mesh);
  return mesh;
}

// ---------------------------------------------------------------------------
// Overlay state management
// ---------------------------------------------------------------------------

const waitingEl = document.getElementById("waiting");
const matchedEl = document.getElementById("matched");
const connectedEl = document.getElementById("connected");
const matchedSessionEl = document.getElementById("matched-session");

let state = "waiting"; // "waiting" | "matched" | "connected"

function setOverlayState(newState) {
  state = newState;
  waitingEl.classList.toggle("active", newState === "waiting");
  matchedEl.classList.toggle("active", newState === "matched");
  connectedEl.classList.toggle("active", newState === "connected");
}

// ---------------------------------------------------------------------------
// Starfish adapter
// ---------------------------------------------------------------------------

const sf = starfishThree({
  url: "ws://localhost:8080/starfish",
  session: "pool-matchmaking-staging",
  name: "Peer-" + Math.floor(Math.random() * 1000),
});

function onMatch(match) {
  matchedSessionEl.textContent = "Session: " + match.session;
  setOverlayState("matched");

  // Join the matched session so presence flows between paired peers
  sf.client.join(match.session);
}

sf.start().then(() => {
  sf.joinPool("distant-touch", {}, onMatch);
});

// ---------------------------------------------------------------------------
// Mouse tracking
// ---------------------------------------------------------------------------

window.addEventListener("mousemove", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const groundHits = raycaster.intersectObject(ground);

  if (groundHits.length > 0 && state !== "waiting") {
    const pt = groundHits[0].point;
    sf.setPresence({ x: pt.x, z: pt.z });
  }
});

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------

function animate() {
  requestAnimationFrame(animate);

  // --- Draw peer cursors ---
  const activePeers = new Set();
  sf.eachPeer((peer) => {
    if (!peer.presence?.x) return;
    activePeers.add(peer.id);
    const cursor = ensureCursorMesh(peer.id);
    cursor.position.x = peer.presence.x;
    cursor.position.z = peer.presence.z;
  });

  // Clean up cursors for peers that have left
  for (const [id, mesh] of peerCursors) {
    if (!activePeers.has(id)) {
      scene.remove(mesh);
      peerCursors.delete(id);
    }
  }

  // Transition to connected once we see a peer
  if (state === "matched" && sf.peers.length > 0) {
    setOverlayState("connected");
    // Hide the connected overlay after a brief moment
    setTimeout(() => {
      connectedEl.classList.remove("active");
    }, 2000);
  }

  // Update HUD
  statusDot.style.background = sf.connected ? "#0f0" : "#f00";
  if (state === "waiting") {
    statusText.textContent = "Waiting for match...";
  } else {
    const n = sf.peers.length;
    statusText.textContent = n + " peer" + (n !== 1 ? "s" : "") + " connected";
  }

  renderer.render(scene, camera);
}

animate();

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
