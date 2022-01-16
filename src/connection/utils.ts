import { randomInt } from "crypto";
import { Request, Response } from "./types";

export function isRequest(data: any): data is Request {
  return typeof data.id === "string" && typeof data.event === "string" &&
    typeof data.params === "object";
}

export function isResponse(data: any): data is Response {
  return typeof data.id === "string" && typeof data.ok === "boolean" &&
    data.result !== undefined;
}

export function getRandomId() {
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += String(randomInt(256));
  }
  return result;
}
