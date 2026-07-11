import type { StarfishThreeOptions } from "./types.js";
import { StarfishThree } from "./starfish-three.js";

export function starfishThree(options: StarfishThreeOptions): StarfishThree {
  return new StarfishThree(options);
}
