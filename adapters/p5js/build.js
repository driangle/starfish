import { build } from "esbuild";

await build({
  entryPoints: ["dist/index.js"],
  bundle: true,
  format: "iife",
  globalName: "__starfishP5",
  footer: {
    js: "window.starfishP5=__starfishP5.starfishP5;window.StarfishP5=__starfishP5.StarfishP5;",
  },
  outfile: "dist/starfish-p5.global.js",
});
