import { Duplex } from "stream";
import { Handler, Params, Request, Response } from "./types";
import { getRandomId, isRequest, isResponse } from "./utils";

export class Connection {
  private handlers: Map<
    string,
    Handler
  >;
  private promises: Map<
    string,
    { resolve: (result: any) => void; reject: (reason?: any) => void }
  >;

  constructor(
    private input: Duplex,
    private output: NodeJS.WritableStream,
  ) {
    this.handlers = new Map();
    this.promises = new Map();
    this.input.resume();
    this.input.on("data", (chunk) => {
      this.handleChunk(chunk);
    });
  }

  dispatch(method: string, params: Params = {}) {
    const id = getRandomId();
    const data: Request = { method, params, id };
    const promise = new Promise<any>((resolve, reject) => {
      this.promises.set(id, { resolve, reject });
    });
    this.output.write(JSON.stringify(data) + "\n");
    return promise;
  }

  respond({ id }: Request, ok: boolean, result: any) {
    const response: Response = { id, ok, result };
    this.output.write(JSON.stringify(response) + "\n");
  }

  handle(method: string, handler: Handler) {
    this.handlers.set(method, handler);
  }

  private async handleChunk(chunk: string) {
    let data;
    try {
      data = JSON.parse(chunk);
    } catch (_err) {
      return;
    }
    if (isRequest(data)) {
      const handler = this.handlers.get(data.method);
      if (handler !== undefined) {
        try {
          const result = await handler(data);
          if (result !== undefined) {
            this.respond(data, true, result);
          }
        } catch (err) {
          this.respond(
            data,
            false,
            err instanceof Error ? err.message : String(err),
          );
        }
      }
    } else if (isResponse(data)) {
      const { ok, result } = data;
      const promise = this.promises.get(data.id);
      if (promise) {
        if (ok) {
          promise.resolve(result);
        } else {
          promise.reject(result);
        }
        this.promises.delete(data.id);
      }
    }
  }
}
