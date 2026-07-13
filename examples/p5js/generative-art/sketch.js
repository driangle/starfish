// Collaborative Generative Art
// ----------------------------
// Demonstrates: shared data to sync generative parameters across all peers
//
// All connected peers see the same evolving pattern. Any peer can change
// the shared parameters (speed, hue, shape count) by pressing keys,
// and the changes propagate to everyone instantly via sf.setShared().
//
// Controls:
//   UP/DOWN   — change rotation speed
//   LEFT/RIGHT — shift base hue
//   +/-        — add/remove shapes
//
// Open in multiple tabs to see parameters sync across all peers.

let sf;

// Default generative parameters — overridden by shared data when received
let params = {
  speed: 1,
  hue: 0,
  shapeCount: 6,
};

function setup() {
  createCanvas(800, 600);
  colorMode(HSB, 360, 100, 100, 100);
  noFill();

  sf = starfishP5({
    url: "ws://localhost:8080/starfish",
    session: "generative-demo",
    name: "Creator-" + floor(random(1000)),
  });

  // Watch for parameter changes from any peer.
  // getShared() returns the cached value, but onShared() is reactive —
  // it fires whenever any peer calls setShared() on the same key.
  sf.onShared("params", (data) => {
    params = data;
  });

  sf.start();
}

function draw() {
  sf.setPresence({ x: mouseX, y: mouseY });
  background(0, 0, 10, 20);

  translate(width / 2, height / 2);

  const t = frameCount * 0.01 * params.speed;

  for (let i = 0; i < params.shapeCount; i++) {
    const angle = (TWO_PI / params.shapeCount) * i + t;
    const hue = (params.hue + i * (360 / params.shapeCount)) % 360;
    const radius = 100 + sin(t * 2 + i) * 50;

    push();
    rotate(angle);
    stroke(hue, 70, 90, 60);
    strokeWeight(2);

    beginShape();
    for (let j = 0; j < 50; j++) {
      const a = (TWO_PI / 50) * j;
      const r = radius + sin(a * 3 + t + i) * 30;
      vertex(cos(a) * r, sin(a) * r);
    }
    endShape(CLOSE);
    pop();
  }

  // Draw peer cursors in the corner to show who's connected
  resetMatrix();
  drawPeers();
  drawHUD();
}

function drawPeers() {
  // Show each peer's cursor as a small dot with their name
  sf.eachPeer((peer) => {
    fill(0, 0, 80);
    noStroke();
    ellipse(peer.presence.x, peer.presence.y, 8, 8);
    textSize(10);
    textAlign(CENTER);
    text(peer.name ?? peer.id.slice(0, 6), peer.presence.x, peer.presence.y - 10);
  });
}

function drawHUD() {
  noStroke();
  fill(sf.connected ? 120 : 0, 80, 80);
  ellipse(20, 20, 10, 10);

  fill(0, 0, 80);
  textSize(12);
  textAlign(LEFT, TOP);
  text(
    "Speed: " + nf(params.speed, 1, 1) + "  |  " +
    "Hue: " + floor(params.hue) + "  |  " +
    "Shapes: " + params.shapeCount + "  |  " +
    sf.peers.length + " peers",
    32, 14
  );
  text("UP/DOWN = speed   LEFT/RIGHT = hue   +/- = shapes", 32, 32);
}

function keyPressed() {
  // Each key press modifies the shared params, which syncs to all peers.
  if (keyCode === UP_ARROW) {
    params.speed = min(params.speed + 0.2, 5);
  } else if (keyCode === DOWN_ARROW) {
    params.speed = max(params.speed - 0.2, 0.1);
  } else if (keyCode === LEFT_ARROW) {
    params.hue = (params.hue - 15 + 360) % 360;
  } else if (keyCode === RIGHT_ARROW) {
    params.hue = (params.hue + 15) % 360;
  } else if (key === "=" || key === "+") {
    params.shapeCount = min(params.shapeCount + 1, 20);
  } else if (key === "-") {
    params.shapeCount = max(params.shapeCount - 1, 1);
  } else {
    return;
  }

  // setShared() persists to the session and notifies all peers
  sf.setShared("params", { ...params });
}
