#!/usr/bin/env node

import { accessSync, constants } from "fs";

import { Call } from "./call";
import { Connection } from "./connection";

const connection = new Connection(process.stdin, process.stdout);
const call = new Call(connection);

connection.handle(
  "stream",
  async ({ params }: { params: { audio?: string; video?: string } }) => {
    if (params.audio) {
      accessSync(params.audio, constants.R_OK);
    }
    if (params.video) {
      accessSync(params.video, constants.R_OK);
    }
    await call.stream(params);
    return true;
  }
);

connection.handle("mute", () => call.mute());

connection.handle("unmute", () => call.unmute());

connection.handle("pause", () => call.pause());

connection.handle("resume", () => call.resume());

connection.handle("finish", () => call.finish());

connection.handle("stop", () => call.stop());
