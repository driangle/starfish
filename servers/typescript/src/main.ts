#!/usr/bin/env node
import { StarfishServer } from "./starfish_server.js";
import { defaultConfig } from "./config.js";

const config = defaultConfig();

const portIdx = process.argv.indexOf("--port");
if (portIdx !== -1 && process.argv[portIdx + 1]) {
  config.port = parseInt(process.argv[portIdx + 1], 10);
}

const server = new StarfishServer(config);
server.start();
