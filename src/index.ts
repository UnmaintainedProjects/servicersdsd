#!/usr/bin/env node

import { accessSync, constants } from "fs";

import { Calls } from "./calls";
import { Connection } from "./connection";

const connection = new Connection(process.stdin, process.stdout);
const calls = new Calls(connection);

connection.handle("stream", async ({ params }) => {
  accessSync(params.file, constants.R_OK);
  await calls.stream(
    params.chatId,
    params.isChat,
    params.file,
    params.accessHash,
  );
  return true;
});

connection.handle("mute", ({ params: { chatId } }) => calls.mute(chatId));

connection.handle("unmute", ({ params: { chatId } }) => calls.unmute(chatId));

connection.handle("pause", ({ params: { chatId } }) => calls.pause(chatId));

connection.handle("resume", ({ params: { chatId } }) => calls.resume(chatId));

connection.handle("stop", ({ params: { chatId } }) => calls.stop(chatId));
