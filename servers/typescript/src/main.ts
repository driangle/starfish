import { Hub } from "./hub.js";
import { defaultConfig } from "./config.js";

const config = defaultConfig();

const portIdx = process.argv.indexOf("--port");
if (portIdx !== -1 && process.argv[portIdx + 1]) {
  config.port = parseInt(process.argv[portIdx + 1], 10);
}

const hub = new Hub(config);
hub.start();
