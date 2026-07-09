import type { StarfishP5Options } from "./types.js";
import { StarfishP5 } from "./starfish-p5.js";

export function starfishP5(options: StarfishP5Options): StarfishP5 {
  return new StarfishP5(options);
}
