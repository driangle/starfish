<script setup lang="ts">
import { withBase } from "vitepress";

// Constellation nodes (static peers in the session graphic)
const nodes = [
  { x: "19%", y: "29%", size: "9px", off: "-4.5px", bg: "var(--surface)", border: "1.5px solid var(--text)" },
  { x: "66%", y: "52%", size: "7px", off: "-3.5px", bg: "var(--text)", border: "none" },
  { x: "38%", y: "18%", size: "5px", off: "-2.5px", bg: "var(--faint)", border: "none" },
  { x: "84%", y: "66%", size: "5px", off: "-2.5px", bg: "var(--faint)", border: "none" },
  { x: "28%", y: "82%", size: "5px", off: "-2.5px", bg: "var(--faint)", border: "none" },
];

const features = [
  { tag: "// sdks", title: "Multi-language SDKs", details: "TypeScript, Python, Go, and Swift clients with a consistent API across every language." },
  { tag: "// servers", title: "Multiple servers", details: "Server implementations in TypeScript, Python, and Go. Pick the runtime that fits your stack." },
  { tag: "// adapters", title: "Framework adapters", details: "Ready-made integrations for p5.js, Three.js, and TouchDesigner." },
  { tag: "// transport", title: "WebSocket + WebRTC", details: "A WebSocket control plane with an optional peer-to-peer WebRTC data plane." },
];

const bridgeSources = ["MIDI", "OSC", "MQTT", "DMX / Art-Net", "Serial", "Matter / IoT"];

const bridgeCode = `starfish-bridge midi \\
  --server ws://localhost:8080/starfish \\
  --session jam \\
  --topic midi-in \\
  --device "Launchpad Pro"`;

const heroCode = `import { StarfishClient } from "@starfish/client";

const client = new StarfishClient({ server });
await client.connect();
await client.join("my-session");

client.publish("cursor", { x: 100, y: 200 });`;

const guideLink = withBase("/guide/");
const cookbookLink = withBase("/cookbook/");
</script>

<template>
  <main class="sf-home">
    <!-- Hero -->
    <section class="sf-hero">
      <div class="sf-hero-copy">
        <div class="sf-eyebrow">Realtime protocol · transport-neutral</div>
        <h1 class="sf-hero-title">A realtime layer for<br />creative coding.</h1>
        <p class="sf-hero-lede">
          Sessions, presence, pub/sub, and shared state for networked
          performance, multiplayer sketches, installations, and distributed
          browser artworks — over WebSocket, with peer-to-peer WebRTC when you
          need it.
        </p>
        <div class="sf-hero-actions">
          <a :href="guideLink" class="sf-btn sf-btn-primary">
            Get started <span class="sf-mono">→</span>
          </a>
          <a :href="cookbookLink" class="sf-btn sf-btn-ghost">Cookbook</a>
        </div>
      </div>

      <!-- Constellation graphic -->
      <div class="sf-constellation">
        <div class="sf-lines">
          <div class="sf-line" style="left:19%;top:29%;width:47%;transform:rotate(-8deg);background:var(--border-strong);"></div>
          <div class="sf-line" style="left:19%;top:29%;width:53%;transform:rotate(54deg);background:var(--border-strong);"></div>
          <div class="sf-line" style="left:74%;top:22%;width:54%;transform:rotate(114deg);background:var(--accent);opacity:.55;"></div>
          <div class="sf-line" style="left:52%;top:74%;width:30%;transform:rotate(-42deg);background:var(--border-strong);"></div>
        </div>

        <div
          v-for="(n, i) in nodes"
          :key="i"
          class="sf-node"
          :style="{ left: n.x, top: n.y, width: n.size, height: n.size, marginLeft: n.off, marginTop: n.off, background: n.bg, border: n.border }"
        ></div>

        <!-- Pulsing accent peers -->
        <div class="sf-peer" style="left:74%;top:22%;"></div>
        <div class="sf-peer sf-peer-pulse" style="left:74%;top:22%;"></div>
        <div class="sf-peer" style="left:52%;top:74%;"></div>
        <div class="sf-peer sf-peer-pulse" style="left:52%;top:74%;animation-delay:1.4s;"></div>

        <div class="sf-constellation-caption">session · 3 peers · rtt 12ms</div>
      </div>
    </section>

    <!-- Feature grid -->
    <section class="sf-section">
      <div class="sf-feature-grid">
        <div v-for="f in features" :key="f.title" class="sf-feature">
          <div class="sf-feature-tag">{{ f.tag }}</div>
          <div class="sf-feature-title">{{ f.title }}</div>
          <div class="sf-feature-details">{{ f.details }}</div>
        </div>
      </div>
    </section>

    <!-- Bridges -->
    <section class="sf-section">
      <div class="sf-bridge">
        <div class="sf-bridge-copy">
          <div class="sf-feature-tag">// bridges</div>
          <div class="sf-bridge-title">Bridge the physical world</div>
          <p class="sf-bridge-lede">
            A protocol translator on one side, a starfish session on the other.
            The signal bridge CLI proxies external sources into topics; the
            Matter bridge drives IoT lights, sensors, and actuators from any
            client.
          </p>
          <div class="sf-tags">
            <span v-for="s in bridgeSources" :key="s" class="sf-tag">{{ s }}</span>
          </div>
        </div>
        <div class="sf-bridge-code">
          <div class="sf-code-label">MIDI → starfish topic</div>
          <pre class="sf-pre">{{ bridgeCode }}</pre>
        </div>
      </div>
    </section>

    <!-- Quick-start code -->
    <section class="sf-section sf-section-code">
      <div>
        <div class="sf-eyebrow sf-eyebrow-faint">Six lines to first frame</div>
        <h2 class="sf-code-heading">Connect, join, publish.</h2>
        <p class="sf-code-copy">
          The SDK handles connection management, reconnection, clock sync, and
          transport selection. You work in terms of sessions and topics.
        </p>
      </div>
      <div class="sf-code-card">
        <div class="sf-code-card-head">
          <span class="sf-code-dot"></span>
          cursor-share.ts
        </div>
        <pre class="sf-pre sf-pre-lg">{{ heroCode }}</pre>
      </div>
    </section>
  </main>
</template>

<style scoped>
.sf-home {
  color: var(--text);
  font-family: var(--vp-font-family-base);
}
.sf-mono {
  font-family: var(--vp-font-family-mono);
}

/* Hero -------------------------------------------------------------------- */
.sf-hero {
  max-width: 1180px;
  margin: 0 auto;
  padding: 88px 28px 40px;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 56px;
  align-items: center;
}
.sf-eyebrow {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 22px;
}
.sf-eyebrow-faint {
  color: var(--faint);
  margin-bottom: 16px;
}
.sf-hero-title {
  font-size: 58px;
  line-height: 1.02;
  letter-spacing: -0.03em;
  font-weight: 600;
  margin: 0 0 22px;
  text-wrap: balance;
}
.sf-hero-lede {
  font-size: 18px;
  line-height: 1.55;
  color: var(--muted);
  max-width: 480px;
  margin: 0 0 34px;
  text-wrap: pretty;
}
.sf-hero-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.sf-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-weight: 600;
  font-size: 15px;
  padding: 13px 22px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.sf-btn-primary {
  background: var(--accent);
  color: var(--accent-fg);
}
.sf-btn-primary:hover {
  color: var(--accent-fg);
  text-decoration: none;
  filter: brightness(1.05);
}
.sf-btn-ghost {
  font-weight: 500;
  padding: 13px 20px;
  border: 1px solid var(--border-strong);
  color: var(--text);
}
.sf-btn-ghost:hover {
  color: var(--text);
  text-decoration: none;
  border-color: var(--accent);
}

/* Constellation ----------------------------------------------------------- */
.sf-constellation {
  position: relative;
  aspect-ratio: 1 / 1;
  width: 100%;
  max-width: 420px;
  justify-self: end;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  background-image: radial-gradient(var(--dot) 1.3px, transparent 1.3px);
  background-size: 34px 34px;
  background-position: 17px 17px;
  overflow: hidden;
}
.sf-lines {
  position: absolute;
  inset: 0;
}
.sf-line {
  position: absolute;
  height: 1.5px;
  transform-origin: left center;
}
.sf-node {
  position: absolute;
  border-radius: 50%;
  z-index: 2;
}
.sf-peer {
  position: absolute;
  width: 11px;
  height: 11px;
  margin: -5.5px 0 0 -5.5px;
  border-radius: 50%;
  background: var(--accent);
}
.sf-peer-pulse {
  animation: sf-pulse 2.8s ease-out infinite;
}
.sf-constellation-caption {
  position: absolute;
  left: 16px;
  bottom: 14px;
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  color: var(--faint);
  letter-spacing: 0.04em;
}

/* Sections ---------------------------------------------------------------- */
.sf-section {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 28px 20px;
}

/* Feature grid ------------------------------------------------------------ */
.sf-feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}
.sf-feature {
  background: var(--surface);
  padding: 26px 24px 30px;
  min-height: 172px;
  display: flex;
  flex-direction: column;
}
.sf-feature-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--accent);
  margin-bottom: 16px;
}
.sf-feature-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 9px;
}
.sf-feature-details {
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--muted);
  text-wrap: pretty;
}

/* Bridges ----------------------------------------------------------------- */
.sf-bridge {
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--surface);
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.sf-bridge-copy {
  padding: 30px 30px 32px;
  border-right: 1px solid var(--border);
}
.sf-bridge-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 14px 0 10px;
}
.sf-bridge-lede {
  font-size: 14px;
  line-height: 1.55;
  color: var(--muted);
  margin: 0 0 20px;
  max-width: 400px;
  text-wrap: pretty;
}
.sf-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.sf-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 10px;
}
.sf-bridge-code {
  padding: 26px 30px;
  background: var(--surface-2);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.sf-code-label {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--faint);
  margin-bottom: 12px;
  letter-spacing: 0.04em;
}

/* Quick-start code -------------------------------------------------------- */
.sf-section-code {
  padding: 36px 28px 100px;
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 44px;
  align-items: center;
}
.sf-code-heading {
  font-size: 30px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-weight: 600;
  margin: 0 0 14px;
}
.sf-code-copy {
  font-size: 15px;
  line-height: 1.6;
  color: var(--muted);
  margin: 0;
  max-width: 360px;
  text-wrap: pretty;
}
.sf-code-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-2);
  box-shadow: 0 1px 2px oklch(0 0 0 / 0.04);
}
.sf-code-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 15px;
  border-bottom: 1px solid var(--border);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--faint);
}
.sf-code-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
  display: inline-block;
}

.sf-pre {
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--text);
  overflow-x: auto;
  white-space: pre-wrap;
}
.sf-pre-lg {
  padding: 20px;
  font-size: 13px;
  white-space: pre;
}

/* Responsive -------------------------------------------------------------- */
@media (max-width: 860px) {
  .sf-hero,
  .sf-section-code {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  .sf-hero {
    padding-top: 56px;
  }
  .sf-hero-title {
    font-size: 44px;
  }
  .sf-constellation {
    justify-self: start;
  }
  .sf-feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .sf-bridge {
    grid-template-columns: 1fr;
  }
  .sf-bridge-copy {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}
@media (max-width: 520px) {
  .sf-feature-grid {
    grid-template-columns: 1fr;
  }
}
</style>
