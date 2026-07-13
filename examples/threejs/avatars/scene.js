// 3D Avatar Sync
// ---------------
// Demonstrates: presence tracking, peer callbacks, scene graph management
//
// Each connected user controls a colored avatar with WASD keys and mouse drag.
// All other users' avatars appear in real-time, smoothly interpolating to their
// latest position. Name labels float above each avatar.
//
// Open this page in multiple browser tabs to see it in action.

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Three.js setup
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 30, 60);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 8, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Ground grid
const grid = new THREE.GridHelper(40, 40, 0x444466, 0x333355);
scene.add(grid);

// ---------------------------------------------------------------------------
// Local player
// ---------------------------------------------------------------------------

const myColor = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
const myName = "Peer-" + Math.floor(Math.random() * 1000);

// Avatar = cylinder body + sphere head
function createAvatar(color) {
  const group = new THREE.Group();

  const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1, 12);
  const mat = new THREE.MeshStandardMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 0.5;
  group.add(body);

  const headGeo = new THREE.SphereGeometry(0.25, 12, 8);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = 1.25;
  group.add(head);

  return group;
}

const localAvatar = createAvatar(myColor);
scene.add(localAvatar);

// Player state
const player = { x: 0, z: 0, ry: 0 };
const keys = {};

window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

// Mouse drag for rotation
let dragging = false;
let lastMouseX = 0;
renderer.domElement.addEventListener("mousedown", (e) => {
  dragging = true;
  lastMouseX = e.clientX;
});
window.addEventListener("mouseup", () => (dragging = false));
window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  player.ry -= (e.clientX - lastMouseX) * 0.005;
  lastMouseX = e.clientX;
});

// ---------------------------------------------------------------------------
// Peer avatar management
// ---------------------------------------------------------------------------

// Map of peerId -> { group, targetPos, targetRy }
const peerAvatars = new Map();

// Create a text sprite for name labels
function createLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 128, 40);

  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthTest: false }),
  );
  sprite.scale.set(2, 0.5, 1);
  sprite.position.y = 1.8;
  return sprite;
}

// ---------------------------------------------------------------------------
// Starfish adapter
// ---------------------------------------------------------------------------

// Create the Starfish Three.js adapter — url + session are required.
// peers callbacks let us add/remove avatar meshes from the scene graph
// as peers join and leave.
const sf = starfishThree({
  url: "ws://localhost:8080/starfish",
  session: "avatars-demo",
  name: myName,
  meta: { color: "#" + myColor.getHexString() },

  // peers.onJoin / peers.onLeave manage the scene graph for remote avatars.
  // This is the Three.js-idiomatic way to handle peer lifecycle — create and
  // dispose of 3D objects rather than re-drawing every frame.
  peers: {
    onJoin(peer) {
      const color = peer.presence?.color ?? "#ff0";
      const group = createAvatar(new THREE.Color(color));
      group.add(createLabel(peer.name ?? peer.id.slice(0, 6)));
      scene.add(group);
      peerAvatars.set(peer.id, { group, targetPos: { x: 0, z: 0 }, targetRy: 0 });
    },

    onLeave(peer) {
      const entry = peerAvatars.get(peer.id);
      if (entry) {
        scene.remove(entry.group);
        peerAvatars.delete(peer.id);
      }
    },
  },
});

// start() connects to the server and joins the session.
sf.start();

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");

function updateHUD() {
  statusDot.style.background = sf.connected ? "#0f0" : "#f00";
  const n = sf.peers.length;
  statusText.textContent = n + " peer" + (n !== 1 ? "s" : "") + " connected";
}

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------

const SPEED = 4; // units per second
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // --- Update local player from keyboard input ---
  const forward = new THREE.Vector3(
    -Math.sin(player.ry),
    0,
    -Math.cos(player.ry),
  );
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  if (keys["w"] || keys["arrowup"]) {
    player.x += forward.x * SPEED * dt;
    player.z += forward.z * SPEED * dt;
  }
  if (keys["s"] || keys["arrowdown"]) {
    player.x -= forward.x * SPEED * dt;
    player.z -= forward.z * SPEED * dt;
  }
  if (keys["a"] || keys["arrowleft"]) {
    player.x -= right.x * SPEED * dt;
    player.z -= right.z * SPEED * dt;
  }
  if (keys["d"] || keys["arrowright"]) {
    player.x += right.x * SPEED * dt;
    player.z += right.z * SPEED * dt;
  }

  localAvatar.position.set(player.x, 0, player.z);
  localAvatar.rotation.y = player.ry;

  // setPresence() broadcasts your 3D transform to all peers at a throttled
  // rate (default 50ms). Here we send position, rotation, and color so other
  // peers can render our avatar.
  sf.setPresence({
    x: player.x,
    z: player.z,
    ry: player.ry,
    color: "#" + myColor.getHexString(),
  });

  // --- Smoothly interpolate each peer's avatar toward their latest presence ---
  // eachPeer() iterates over all peers with their latest presence data.
  // peer.presence contains exactly what each peer passed to setPresence().
  sf.eachPeer((peer) => {
    const entry = peerAvatars.get(peer.id);
    if (!entry || !peer.presence?.x) return;

    entry.targetPos.x = peer.presence.x;
    entry.targetPos.z = peer.presence.z;
    entry.targetRy = peer.presence.ry ?? 0;

    // Lerp position and rotation for smooth movement
    const g = entry.group;
    g.position.x += (entry.targetPos.x - g.position.x) * 0.15;
    g.position.z += (entry.targetPos.z - g.position.z) * 0.15;
    g.rotation.y += (entry.targetRy - g.rotation.y) * 0.15;
  });

  // --- Camera follows local player (third-person) ---
  const camOffset = new THREE.Vector3(0, 8, 10);
  const camTarget = new THREE.Vector3(player.x, 0, player.z);
  camera.position.lerp(camTarget.clone().add(camOffset), 0.05);
  camera.lookAt(camTarget);

  updateHUD();
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
