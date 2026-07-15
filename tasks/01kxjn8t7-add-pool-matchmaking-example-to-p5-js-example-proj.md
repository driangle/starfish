---
title: "Add pool matchmaking example to p5.js example project"
id: "01kxjn8t7"
status: pending
priority: medium
type: feature
tags: ["pool", "example", "p5js"]
created_at: "2026-07-15"
dependencies: ["01kxjn8q4"]
phase: v0.1.1
---

# Add pool matchmaking example to p5.js example project

## Objective

Add a `pool-matchmaking/` sketch to `examples/p5js/` that demonstrates the "distant-touch" use case: the user opens the page, is automatically paired with one other user via pool `auto` mode, and then both users see each other's mouse cursor in real-time using presence. The sketch transitions through three visual states — waiting, matched, and connected — to make the pool lifecycle visible without any UI framework.

## Tasks

- [ ] Create `examples/p5js/pool-matchmaking/index.html`:
  - Copy the structure of an existing example HTML file (e.g. `cursors/index.html`).
  - Load `starfish-p5.global.js` from the parent directory.
  - Load `sketch.js`.
  - Set an appropriate page title (e.g. "Starfish – Pool Matchmaking").

- [ ] Create `examples/p5js/pool-matchmaking/sketch.js`:
  - Add the standard file header comment block describing what is demonstrated and how to open it.
  - In `setup()`, create the canvas and call `sf.joinPool("distant-touch", {}, onMatch)` where `sf` is a `starfishP5` adapter (session can be a temporary staging name like `"pool-staging"` since the matched session will be the real destination).
  - Define `onMatch({ session, peers })`:
    - Log the match to the canvas (e.g. "Matched! Session: ...").
    - Call `sf.start()` with the matched session to join it (or re-configure the adapter to use the new session — document the exact call shape once the adapter API is clear).
  - In `draw()`, render one of three states:
    - **Waiting**: display "Waiting for a match..." with a pulsing animation.
    - **Matched**: briefly display "Matched! Connecting..." before presence data arrives.
    - **Connected**: show the peer's cursor as a colored dot using `sf.eachPeer()` and `sf.setPresence({ x: mouseX, y: mouseY })`.
  - Draw a small connection status indicator (green/red dot) as in the other sketches.

- [ ] Add a `pool-matchmaking` entry to the examples list in `examples/p5js/README.md`.

## Acceptance Criteria

- Opening `pool-matchmaking/index.html` in two browser tabs causes both tabs to reach the "Connected" state and show each other's cursor.
- The sketch never requires the user to type a session name or click a join button — matchmaking is fully automatic.
- The sketch uses only the `starfishP5` global adapter API (`joinPool`, `setPresence`, `eachPeer`, `connected`).
- The code follows the style and conventions of the existing p5.js examples (`cursors/`, `shared-canvas/`).
