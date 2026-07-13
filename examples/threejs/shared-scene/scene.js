// Shared 3D Scene
// ----------------
// Demonstrates: pub/sub (sf.on / sf.emit / sf.stream), shared data (sf.setShared / sf.onShared),
//               presence for peer cursors
//
// Click the ground to place random 3D primitives. Click and drag an object to
// move it. Press Delete or Backspace to remove the selected object.
// All actions sync across connected tabs. Late joiners receive the full scene
// via shared data.
//
// Open this page in multiple browser tabs to see it in action.

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
// Object management
// ---------------------------------------------------------------------------

// objects maps id -> { mesh, data } where data is the serializable state
const objects = new Map();

const SHAPES = ["box", "sphere", "cone", "cylinder"];

const GEOMETRIES = {
  box: () => new THREE.BoxGeometry(0.8, 0.8, 0.8),
  sphere: () => new THREE.SphereGeometry(0.5, 16, 12),
  cone: () => new THREE.ConeGeometry(0.4, 1, 12),
  cylinder: () => new THREE.CylinderGeometry(0.3, 0.3, 1, 12),
};

function addObject(data) {
  if (objects.has(data.id)) return;
  const geo = GEOMETRIES[data.type]();
  const mat = new THREE.MeshStandardMaterial({ color: data.color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(data.x, data.y, data.z);
  mesh.userData.objId = data.id;
  scene.add(mesh);
  objects.set(data.id, { mesh, data });
}

function moveObject(id, x, z) {
  const entry = objects.get(id);
  if (!entry) return;
  entry.mesh.position.x = x;
  entry.mesh.position.z = z;
  entry.data.x = x;
  entry.data.z = z;
}

function removeObject(id) {
  const entry = objects.get(id);
  if (!entry) return;
  scene.remove(entry.mesh);
  entry.mesh.geometry.dispose();
  entry.mesh.material.dispose();
  objects.delete(id);
}

function serializeScene() {
  const list = [];
  for (const [, { data }] of objects) list.push({ ...data });
  return list;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Raycasting helpers
// ---------------------------------------------------------------------------

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function getIntersection(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  // Check objects first
  const meshes = [...objects.values()].map((o) => o.mesh);
  const hits = raycaster.intersectObjects(meshes);
  if (hits.length > 0) {
    return { type: "object", id: hits[0].object.userData.objId, point: hits[0].point };
  }

  // Then check ground
  const groundHits = raycaster.intersectObject(ground);
  if (groundHits.length > 0) {
    return { type: "ground", point: groundHits[0].point };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Peer cursor display
// ---------------------------------------------------------------------------

// Small ring meshes showing where each peer is pointing
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
// Starfish adapter
// ---------------------------------------------------------------------------

const sf = starfishThree({
  url: "ws://localhost:8080/starfish",
  session: "shared-scene-demo",
  name: "Builder-" + Math.floor(Math.random() * 1000),
});

// on() subscribes to a topic. The callback receives (payload, fromPeerId).
// Here we listen for object add/move/remove events from other peers.

sf.on("add-object", (data) => {
  addObject(data);
});

sf.on("move-object", (data) => {
  moveObject(data.id, data.x, data.z);
});

sf.on("remove-object", (data) => {
  removeObject(data.id);
});

// onShared() watches a shared data key for changes from any peer.
// When the scene state is saved via setShared(), late joiners receive
// the full scene so they can reconstruct all objects.
sf.onShared("scene-state", (data) => {
  // Rebuild scene from authoritative shared state
  const incomingIds = new Set(data.map((d) => d.id));

  // Remove objects not in the shared state
  for (const id of objects.keys()) {
    if (!incomingIds.has(id)) removeObject(id);
  }

  // Add or update objects from shared state
  for (const objData of data) {
    if (!objects.has(objData.id)) {
      addObject(objData);
    } else {
      moveObject(objData.id, objData.x, objData.z);
    }
  }
});

// start() connects to the server and joins the session.
sf.start();

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------

let selected = null;
let isDragging = false;

renderer.domElement.addEventListener("mousedown", (e) => {
  const hit = getIntersection(e);
  if (!hit) return;

  if (hit.type === "object") {
    selected = hit.id;
    isDragging = true;
  } else if (hit.type === "ground") {
    // Place a new random primitive on the ground
    const type = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const data = {
      id: generateId(),
      type,
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5).getHex(),
      x: hit.point.x,
      y: type === "cone" || type === "cylinder" ? 0.5 : 0.4,
      z: hit.point.z,
    };

    // Add locally for immediate feedback
    addObject(data);

    // emit() publishes to all peers subscribed to this topic (reliable delivery)
    sf.emit("add-object", data);

    // setShared() saves session-scoped data so late joiners get the full scene
    sf.setShared("scene-state", serializeScene());
  }
});

window.addEventListener("mousemove", (e) => {
  // Update pointer for presence broadcast
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const groundHits = raycaster.intersectObject(ground);

  if (groundHits.length > 0) {
    const pt = groundHits[0].point;

    // setPresence() broadcasts your cursor position to all peers
    sf.setPresence({ x: pt.x, z: pt.z });

    // Drag selected object
    if (isDragging && selected) {
      moveObject(selected, pt.x, pt.z);
      // stream() publishes with unreliable delivery — fast, low-latency,
      // ideal for high-frequency updates like dragging
      sf.stream("move-object", { id: selected, x: pt.x, z: pt.z });
    }
  }
});

window.addEventListener("mouseup", () => {
  if (isDragging && selected) {
    // Persist final position to shared data so late joiners see it
    sf.setShared("scene-state", serializeScene());
  }
  isDragging = false;
});

window.addEventListener("keydown", (e) => {
  if ((e.key === "Delete" || e.key === "Backspace") && selected) {
    removeObject(selected);
    // emit() for reliable delivery of the remove event
    sf.emit("remove-object", { id: selected });
    sf.setShared("scene-state", serializeScene());
    selected = null;
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
  // eachPeer() iterates over all peers with their latest presence data.
  // We show each peer's cursor as a ring on the ground plane.
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
