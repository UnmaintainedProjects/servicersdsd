#!/usr/bin/env node

import { accessSync, constants } from "fs";

import { Calls } from "./calls";
import { Connection } from "./connection";

const connection = new Connection(process.stdin, process.stdout);
const calls = new Calls(connection);

connection.handle("stream", async ({ params }) => {
  accessSync(params.file, constants.R_OK);
  await calls.stream(
    params.id,
    params.file,
    params.joinCallParams,
  );
  return true;
});

connection.handle("mute", ({ params: { id } }) => calls.mute(id));

connection.handle("unmute", ({ params: { id } }) => calls.unmute(id));

connection.handle("pause", ({ params: { id } }) => calls.pause(id));

connection.handle("resume", ({ params: { id } }) => calls.resume(id));

connection.handle("stop", ({ params: { id } }) => calls.stop(id));
