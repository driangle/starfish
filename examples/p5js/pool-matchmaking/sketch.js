// Pool Matchmaking
// ----------------
// Demonstrates: pool auto-matching, presence tracking after match
//
// The user opens the page and is automatically paired with another user
// via pool auto mode. Once matched, both users see each other's cursor
// in real-time using presence. The sketch transitions through three
// visual states: waiting, matched, and connected.
//
// Open this page in two browser tabs to see it in action.

let sf;
let state = "waiting"; // "waiting" | "matched" | "connected"
let matchedSession = null;
let matchedPeers = [];

function setup() {
  createCanvas(800, 600);
  textAlign(CENTER, CENTER);
  textSize(14);

  sf = starfishP5({
    url: "ws://localhost:8080/starfish",
    session: "pool-matchmaking-staging",
    name: "Peer-" + floor(random(1000)),
    meta: { color: color(random(255), random(255), random(255)).toString() },
  });

  sf.start().then(() => {
    sf.joinPool("distant-touch", {}, onMatch);
  });
}

function onMatch(match) {
  matchedSession = match.session;
  matchedPeers = match.peers;
  state = "matched";

  // Join the matched session so presence flows between paired peers
  sf.client.join(matchedSession);
}

function draw() {
  background(30);

  if (state === "waiting") {
    drawWaiting();
  } else if (state === "matched") {
    drawMatched();
  }

  if (state === "matched" || state === "connected") {
    // Broadcast cursor position
    sf.setPresence({ x: mouseX, y: mouseY });

    // Transition to connected once we see a peer
    if (state === "matched" && sf.peers.length > 0) {
      state = "connected";
    }
  }

  if (state === "connected") {
    drawConnected();
  }

  drawHUD();
}

function drawWaiting() {
  // Pulsing "Waiting for a match..." text
  let alpha = map(sin(frameCount * 0.05), -1, 1, 80, 255);
  fill(255, alpha);
  textSize(24);
  text("Waiting for a match...", width / 2, height / 2);
  textSize(14);
}

function drawMatched() {
  fill(100, 255, 150);
  textSize(20);
  text("Matched! Connecting...", width / 2, height / 2 - 20);

  fill(150);
  textSize(12);
  text("Session: " + matchedSession, width / 2, height / 2 + 20);
  textSize(14);
}

function drawConnected() {
  // Draw your own cursor
  fill(255);
  noStroke();
  ellipse(mouseX, mouseY, 14, 14);
  text("You", mouseX, mouseY - 18);

  // Draw each peer's cursor
  sf.eachPeer((peer) => {
    if (!peer.presence) return;
    const c = peer.presence.color ?? "#ff0";
    fill(c);
    noStroke();
    ellipse(peer.presence.x, peer.presence.y, 14, 14);
    text(peer.name ?? peer.id.slice(0, 6), peer.presence.x, peer.presence.y - 18);
  });
}

function drawHUD() {
  // Connection status indicator
  fill(sf.connected ? "#0f0" : "#f00");
  noStroke();
  ellipse(20, 20, 10, 10);

  fill(200);
  textAlign(LEFT, CENTER);
  if (state === "waiting") {
    text("Waiting for match...", 32, 20);
  } else {
    text(sf.peers.length + " peer" + (sf.peers.length !== 1 ? "s" : "") + " connected", 32, 20);
  }
  textAlign(CENTER, CENTER);
}
