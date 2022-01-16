#!/usr/bin/env node

import { accessSync, constants } from "fs";

import { Call } from "./call";
import { Connection } from "./connection";

const connection = new Connection(process.stdin, process.stdout);
const call = new Call(connection);

connection.handle("stream", async ({ params }) => {
  accessSync(params.file, constants.R_OK);
  await call.stream(params.file);
  return true;
});

connection.handle("mute", () => call.mute());

connection.handle("unmute", () => call.unmute());

connection.handle("pause", () => call.pause());

connection.handle("resume", () => call.resume());

connection.handle("stop", () => call.stop());
