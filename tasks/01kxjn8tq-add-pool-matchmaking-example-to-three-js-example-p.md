---
title: "Add pool matchmaking example to Three.js example project"
id: "01kxjn8tq"
status: completed
priority: medium
type: feature
tags: ["pool", "example", "threejs"]
created_at: "2026-07-15"
dependencies: ["01kxjn8qn"]
phase: v0.1.1
completed_at: 2026-07-17
---

# Add pool matchmaking example to Three.js example project

## Objective

Add a `pool-matchmaking/` scene to `examples/threejs/` that demonstrates the "distant-touch" use case: the user opens the page in a browser tab and is automatically paired with exactly one other user via pool `auto` mode. Once matched, both users are placed in a shared 3D scene where they can see each other's cursor position as a ring on the ground plane — reusing the peer-cursor pattern from `shared-scene/`. The scene transitions through three visual states (waiting, matched, connected) using an overlay `<div>` so the Three.js render loop stays simple.

## Tasks

- [x] Create `examples/threejs/pool-matchmaking/index.html`:
  - Copy the structure of `shared-scene/index.html` (Three.js import map, HUD div, canvas fill styles).
  - Add an overlay `<div id="overlay">` with three child divs for the waiting, matched, and connected states; only one is shown at a time.
  - Set an appropriate page title (e.g. "Starfish – Pool Matchmaking").
  - Load `pool-matchmaking/scene.js` as a module.

- [x] Create `examples/threejs/pool-matchmaking/scene.js`:
  - Add the standard file header comment block describing what is demonstrated and how to open it.
  - Set up a minimal Three.js scene: a camera, a renderer, ambient + directional light, and a ground plane with a grid helper (same as `shared-scene/scene.js`).
  - Create a `starfishThree` adapter using a temporary staging session name (the real session comes from the match event). Call `sf.joinPool("distant-touch", {}, onMatch)` after `sf.start()`.
  - Define `onMatch({ session, peers })`:
    - Update the overlay to show the "matched" state.
    - Re-join using the matched session (exact call shape depends on adapter API; document a placeholder if the API is not yet finalised).
  - In the animation loop:
    - Use `sf.eachPeer()` to update peer cursor ring positions (same technique as `shared-scene/scene.js`).
    - Use `sf.setPresence({ x, z })` on mouse move over the ground plane (same raycasting pattern as `shared-scene/scene.js`).
    - Show "connected" overlay state once `sf.peers.length > 0`.
  - Handle window resize.

- [x] Add a `pool-matchmaking` entry to the examples list in `examples/threejs/README.md`.

## Acceptance Criteria

- Opening `pool-matchmaking/index.html` in two browser tabs causes both tabs to reach the "Connected" state and display each other's cursor ring on the ground.
- The scene requires no manual session input from the user — matchmaking is automatic.
- The scene uses only the `starfishThree` adapter API (`joinPool`, `setPresence`, `eachPeer`, `peers`, `connected`, `start`).
- The code follows the style and conventions of the existing Three.js examples (`shared-scene/`, `avatars/`).
