// Shared Cursors — each connected peer sees the others' mouse position
// Usage: open this sketch in multiple browser tabs

let sf;

function setup() {
  createCanvas(800, 600);
  textAlign(CENTER, CENTER);
  textSize(12);

  sf = starfishP5({
    url: "ws://localhost:8080",
    session: "cursors-demo",
    name: "Peer-" + floor(random(1000)),
    meta: { color: color(random(255), random(255), random(255)).toString() },
  });

  sf.start();
}

function draw() {
  background(30);
  sf.update();

  // Draw own cursor
  fill(255);
  noStroke();
  ellipse(mouseX, mouseY, 12, 12);
  text("You", mouseX, mouseY - 16);

  // Draw each peer's cursor
  sf.eachPeer((peer) => {
    fill(peer.data?.color ?? "#ff0");
    noStroke();
    ellipse(peer.x, peer.y, 12, 12);
    text(peer.name ?? peer.id.slice(0, 6), peer.x, peer.y - 16);
  });

  // Connection status
  fill(sf.connected ? "#0f0" : "#f00");
  noStroke();
  ellipse(20, 20, 10, 10);
  fill(255);
  text(sf.peers.length + " peers", 60, 20);
}
