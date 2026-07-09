// Shared Canvas
// -------------
// Demonstrates: topic pub/sub (sf.on / sf.emit), shared data (sf.setShared / sf.onShared)
//
// All connected users draw on the same canvas in real-time.
// Stroke data is published to the "stroke" topic via sf.emit().
// Press any key to randomize the background color for everyone via shared data.
//
// Open this page in multiple browser tabs to see collaborative drawing.

let sf;
let myColor;

function setup() {
  createCanvas(800, 600);
  background(240);
  myColor = color(random(50, 200), random(50, 200), random(50, 200));

  sf = starfishP5({
    url: "ws://localhost:8080/starfish",
    session: "canvas-demo",
    name: "Artist-" + floor(random(1000)),
  });

  // on() subscribes to a topic. The callback receives (payload, fromPeerId).
  // Here we listen for stroke data from other peers and draw it on our canvas.
  sf.on("stroke", (data, from) => {
    stroke(data.color);
    strokeWeight(data.weight);
    line(data.x1, data.y1, data.x2, data.y2);
  });

  // onShared() watches a shared data key for changes from any peer.
  // When any peer calls setShared("bg", ...), this callback fires for everyone.
  sf.onShared("bg", (data) => {
    background(data.r, data.g, data.b);
  });

  sf.start();
}

function draw() {
  // update() is still needed for presence tracking, even if we don't render cursors here.
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
    color: myColor.toString(),
    weight: 3,
  };

  // Draw locally immediately for responsiveness
  stroke(strokeData.color);
  strokeWeight(strokeData.weight);
  line(strokeData.x1, strokeData.y1, strokeData.x2, strokeData.y2);

  // emit() publishes the stroke data to all peers subscribed to this topic
  sf.emit("stroke", strokeData);
}

function keyPressed() {
  // setShared() saves session-scoped data that all peers can read and watch.
  // This changes the background color for everyone in the session.
  sf.setShared("bg", {
    r: floor(random(200, 255)),
    g: floor(random(200, 255)),
    b: floor(random(200, 255)),
  });
}
