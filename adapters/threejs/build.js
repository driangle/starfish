import { build } from "esbuild";

await build({
  entryPoints: ["dist/index.js"],
  bundle: true,
  format: "iife",
  globalName: "__starfishThree",
  footer: {
    js: "window.starfishThree=__starfishThree.starfishThree;window.StarfishThree=__starfishThree.StarfishThree;",
  },
  outfile: "dist/starfish-three.global.js",
});
