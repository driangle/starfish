// Collaborative Scene Editor
// --------------------------
// Demonstrates: shared data per-key (sf.setShared / sf.getShared / sf.onShared),
//               presence for selection awareness, pub/sub for structural changes
//
// A pre-populated 3D scene with several objects. Click to select an object,
// then use keyboard shortcuts to edit its properties — color (C), scale (+/-),
// rotation (R). Every change syncs to all peers via shared data, stored as
// one key per object. Peer selections appear as colored outlines.
//
// Open this page in multiple browser tabs to see collaborative editing.

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Three.js setup
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f3460);

const camera = new THREE.PerspectiveCamera(
  55,
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

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

const grid = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
scene.add(grid);

// ---------------------------------------------------------------------------
// Object definitions & management
// ---------------------------------------------------------------------------

// The scene starts with these default objects. Each is stored as a separate
// shared data key ("obj:<id>") so multiple peers can edit different objects
// simultaneously without conflicts.
const DEFAULT_OBJECTS = [
  { id: "cube-1", type: "box", color: 0xe94560, x: -3, y: 0.5, z: 0, scale: 1, ry: 0 },
  { id: "sphere-1", type: "sphere", color: 0x0f3460, x: 0, y: 0.5, z: -2, scale: 1, ry: 0 },
  { id: "cone-1", type: "cone", color: 0x533483, x: 3, y: 0.6, z: 0, scale: 1, ry: 0 },
  { id: "cyl-1", type: "cylinder", color: 0x16213e, x: -1, y: 0.5, z: 3, scale: 1, ry: 0 },
  { id: "cube-2", type: "box", color: 0x1a1a2e, x: 2, y: 0.5, z: 2, scale: 1.2, ry: 0.4 },
];

const GEOMETRIES = {
  box: () => new THREE.BoxGeometry(1, 1, 1),
  sphere: () => new THREE.SphereGeometry(0.5, 16, 12),
  cone: () => new THREE.ConeGeometry(0.4, 1.2, 12),
  cylinder: () => new THREE.CylinderGeometry(0.3, 0.3, 1, 12),
};

// objects maps id -> { mesh, outline, data }
const objects = new Map();

function createObjectMesh(data) {
  const geo = GEOMETRIES[data.type]();
  const mat = new THREE.MeshStandardMaterial({ color: data.color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.objId = data.id;
  applyProps(mesh, data);

  // Outline mesh for selection highlight
  const outlineGeo = GEOMETRIES[data.type]();
  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0,
  });
  const outline = new THREE.Mesh(outlineGeo, outlineMat);
  outline.scale.setScalar(1.08);
  mesh.add(outline);

  scene.add(mesh);
  objects.set(data.id, { mesh, outline, data: { ...data } });
}

function applyProps(mesh, data) {
  mesh.position.set(data.x, data.y, data.z);
  mesh.scale.setScalar(data.scale);
  mesh.rotation.y = data.ry;
  mesh.material.color.set(data.color);
}

function updateObjectFromData(id, data) {
  const entry = objects.get(id);
  if (!entry) {
    createObjectMesh(data);
    return;
  }
  entry.data = { ...data };
  applyProps(entry.mesh, data);
}

// ---------------------------------------------------------------------------
// Raycasting
// ---------------------------------------------------------------------------

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function hitTest(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const meshes = [...objects.values()].map((o) => o.mesh);
  const hits = raycaster.intersectObjects(meshes);
  return hits.length > 0 ? hits[0].object.userData.objId : null;
}

// ---------------------------------------------------------------------------
// Starfish adapter
// ---------------------------------------------------------------------------

const myColor = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);

const sf = starfishThree({
  url: "ws://localhost:8080/starfish",
  session: "scene-editor-demo",
  name: "Editor-" + Math.floor(Math.random() * 1000),
  meta: { color: "#" + myColor.getHexString() },
});

// Watch each object's shared data key for changes from any peer.
// onShared() fires whenever any peer calls setShared() with this key.
// Each object has its own key ("obj:<id>") so edits to different objects
// don't conflict.
for (const obj of DEFAULT_OBJECTS) {
  sf.onShared("obj:" + obj.id, (data) => {
    updateObjectFromData(obj.id, data);
  });
}

// start() connects to the server and joins the session.
// After connecting, seed default objects into shared data if they don't exist.
sf.start().then(() => {
  for (const obj of DEFAULT_OBJECTS) {
    // getShared() returns the cached value for this key, or undefined if
    // no value has been received yet. We use it to check if the scene
    // has already been initialized by another peer.
    const existing = sf.getShared("obj:" + obj.id);
    if (existing) {
      updateObjectFromData(obj.id, existing);
    } else {
      createObjectMesh(obj);
      // setShared() saves session-scoped data that all peers can read and watch.
      // Each object is stored under its own key for fine-grained sync.
      sf.setShared("obj:" + obj.id, obj);
    }
  }
});

// ---------------------------------------------------------------------------
// Selection & editing
// ---------------------------------------------------------------------------

let selectedId = null;

renderer.domElement.addEventListener("click", (e) => {
  selectedId = hitTest(e);

  // setPresence() broadcasts which object you have selected.
  // Other peers render a colored outline around your selection so
  // everyone can see who is editing what.
  sf.setPresence({ selectedId });
});

window.addEventListener("keydown", (e) => {
  if (!selectedId) return;
  const entry = objects.get(selectedId);
  if (!entry) return;

  let changed = false;

  if (e.key.toLowerCase() === "c") {
    // Change color to a random hue
    entry.data.color = new THREE.Color()
      .setHSL(Math.random(), 0.7, 0.5)
      .getHex();
    changed = true;
  }

  if (e.key === "=" || e.key === "+") {
    entry.data.scale = Math.min(entry.data.scale + 0.2, 4);
    changed = true;
  }

  if (e.key === "-" || e.key === "_") {
    entry.data.scale = Math.max(entry.data.scale - 0.2, 0.2);
    changed = true;
  }

  if (e.key.toLowerCase() === "r") {
    entry.data.ry += Math.PI / 4;
    changed = true;
  }

  if (changed) {
    applyProps(entry.mesh, entry.data);
    // Persist the updated properties to shared data.
    // All peers watching this key via onShared() will receive the update.
    sf.setShared("obj:" + selectedId, entry.data);
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

  // --- Highlight selections ---
  // Build a map of peer selections: { objId -> peerColor }
  const peerSelections = new Map();
  sf.eachPeer((peer) => {
    if (peer.presence?.selectedId) {
      peerSelections.set(peer.presence.selectedId, peer.presence?.color ?? "#ff0");
    }
  });

  // Update outlines for all objects
  for (const [id, { outline }] of objects) {
    if (id === selectedId) {
      // Local selection: white outline
      outline.material.opacity = 0.5;
      outline.material.color.set(0xffffff);
    } else if (peerSelections.has(id)) {
      // Another peer has this selected: show their color
      outline.material.opacity = 0.4;
      outline.material.color.set(peerSelections.get(id));
    } else {
      outline.material.opacity = 0;
    }
  }

  // Update HUD
  statusDot.style.background = sf.connected ? "#0f0" : "#f00";
  const n = sf.peers.length;
  statusText.textContent =
    n + " peer" + (n !== 1 ? "s" : "") + " · " + objects.size + " objects";

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
