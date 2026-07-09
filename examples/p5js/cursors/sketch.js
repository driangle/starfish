// Multiplayer Cursors
// ------------------
// Demonstrates: presence tracking, peer rendering, auto-cursor sync
//
// Each connected user sees every other user's cursor in real-time.
// Presence data (mouseX/mouseY) is sent automatically via sf.update().
//
// Open this page in multiple browser tabs to see it in action.

let sf;

function setup() {
  createCanvas(800, 600);
  textAlign(CENTER, CENTER);
  textSize(12);

  // Create the Starfish adapter — url + session are required, everything else is optional.
  sf = starfishP5({
    url: "ws://localhost:8080/starfish",
    session: "cursors-demo",
    name: "Peer-" + floor(random(1000)),
    // meta is attached to your client identity and visible to all peers
    meta: { color: color(random(255), random(255), random(255)).toString() },
  });

  // start() connects to the server and joins the session.
  // Call it in setup() so the sketch is live as soon as the canvas appears.
  sf.start();
}

function draw() {
  background(30);

  // update() sends your cursor position to all peers at a throttled rate (default 50ms).
  // Call it every frame in draw().
  sf.update();

  // --- Draw your own cursor ---
  fill(255);
  noStroke();
  ellipse(mouseX, mouseY, 14, 14);
  text("You", mouseX, mouseY - 18);

  // --- Draw each connected peer's cursor ---
  // eachPeer() iterates over all peers with their latest presence data.
  // peer.x / peer.y come from auto-cursor tracking.
  // peer.data contains the full presence payload (including meta fields).
  sf.eachPeer((peer) => {
    const c = peer.data?.color ?? "#ff0";
    fill(c);
    noStroke();
    ellipse(peer.x, peer.y, 14, 14);
    text(peer.name ?? peer.id.slice(0, 6), peer.x, peer.y - 18);
  });

  // --- Connection status HUD ---
  drawHUD();
}

function drawHUD() {
  // Green dot = connected, red = disconnected
  fill(sf.connected ? "#0f0" : "#f00");
  noStroke();
  ellipse(20, 20, 10, 10);

  fill(200);
  textAlign(LEFT, CENTER);
  text(sf.peers.length + " peer" + (sf.peers.length !== 1 ? "s" : "") + " connected", 32, 20);
  textAlign(CENTER, CENTER);
}
