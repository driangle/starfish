// Instance Mode
// -------------
// Demonstrates: using starfishP5 with p5.js instance mode
//
// This allows multiple p5 sketches on the same page, each with their own
// Starfish connection. Cursor tracking is done explicitly via setPresence().
//
// This example creates two side-by-side canvases in the same session,
// simulating two separate peers on one page.

const sketchA = (p) => {
  let sf;

  p.setup = () => {
    p.createCanvas(380, 400);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(12);

    sf = starfishP5({
      url: "ws://localhost:8080/starfish",
      session: "instance-demo",
      p5: p,
      name: "Left Canvas",
      meta: { color: "#4af" },
    });

    sf.start();
  };

  p.draw = () => {
    p.background(30);
    sf.setPresence({ x: p.mouseX, y: p.mouseY });

    // Draw own cursor
    p.fill(255);
    p.noStroke();
    p.ellipse(p.mouseX, p.mouseY, 12, 12);
    p.fill(200);
    p.text("You (left)", p.mouseX, p.mouseY - 16);

    // Draw peers (including the right canvas if connected)
    sf.eachPeer((peer) => {
      p.fill(peer.presence?.color ?? "#ff0");
      p.noStroke();
      p.ellipse(peer.presence.x, peer.presence.y, 12, 12);
      p.text(peer.name ?? peer.id.slice(0, 6), peer.presence.x, peer.presence.y - 16);
    });

    // HUD
    p.fill(sf.connected ? "#0f0" : "#f00");
    p.noStroke();
    p.ellipse(15, 15, 8, 8);
    p.fill(200);
    p.textAlign(p.LEFT);
    p.text("Left — " + sf.peers.length + " peers", 25, 15);
    p.textAlign(p.CENTER, p.CENTER);
  };
};

const sketchB = (p) => {
  let sf;

  p.setup = () => {
    p.createCanvas(380, 400);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(12);

    sf = starfishP5({
      url: "ws://localhost:8080/starfish",
      session: "instance-demo",
      p5: p,
      name: "Right Canvas",
      meta: { color: "#f84" },
    });

    sf.start();
  };

  p.draw = () => {
    p.background(20, 20, 40);
    sf.setPresence({ x: p.mouseX, y: p.mouseY });

    p.fill(255);
    p.noStroke();
    p.ellipse(p.mouseX, p.mouseY, 12, 12);
    p.fill(200);
    p.text("You (right)", p.mouseX, p.mouseY - 16);

    sf.eachPeer((peer) => {
      p.fill(peer.presence?.color ?? "#ff0");
      p.noStroke();
      p.ellipse(peer.presence.x, peer.presence.y, 12, 12);
      p.text(peer.name ?? peer.id.slice(0, 6), peer.presence.x, peer.presence.y - 16);
    });

    p.fill(sf.connected ? "#0f0" : "#f00");
    p.noStroke();
    p.ellipse(15, 15, 8, 8);
    p.fill(200);
    p.textAlign(p.LEFT);
    p.text("Right — " + sf.peers.length + " peers", 25, 15);
    p.textAlign(p.CENTER, p.CENTER);
  };
};

// Create two p5 instances on the same page
new p5(sketchA);
new p5(sketchB);
