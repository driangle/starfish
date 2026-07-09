// Shared Canvas — collaborative drawing via topic pub/sub
// Usage: open in multiple tabs, drag to draw, press any key to change background

let sf;
let drawing = [];

function setup() {
  createCanvas(800, 600);
  background(240);

  sf = starfishP5({
    url: "ws://localhost:8080",
    session: "canvas-demo",
    name: "Artist-" + floor(random(1000)),
  });

  sf.on("stroke", (data) => {
    stroke(data.color);
    strokeWeight(data.weight);
    line(data.x1, data.y1, data.x2, data.y2);
  });

  sf.onShared("bg", (data) => {
    background(data.r, data.g, data.b);
    // Redraw isn't possible without history — this is a simple demo
  });

  sf.start();
}

function draw() {
  sf.update();

  // Connection indicator
  noStroke();
  fill(sf.connected ? "#0f0" : "#f00");
  ellipse(20, 20, 10, 10);
}

function mouseDragged() {
  const strokeData = {
    x1: pmouseX,
    y1: pmouseY,
    x2: mouseX,
    y2: mouseY,
    color: "#222",
    weight: 3,
  };

  // Draw locally
  stroke(strokeData.color);
  strokeWeight(strokeData.weight);
  line(strokeData.x1, strokeData.y1, strokeData.x2, strokeData.y2);

  // Send to peers
  sf.emit("stroke", strokeData);
}

function keyPressed() {
  sf.setShared("bg", {
    r: floor(random(200, 255)),
    g: floor(random(200, 255)),
    b: floor(random(200, 255)),
  });
}
