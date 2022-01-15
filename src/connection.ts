import { Duplex } from "stream";
import { randomInt } from "crypto";

type Params = Record<string, any>;
type Handler = (data: Data) => Promise<any> | any;

interface WithID {
  id: string;
}

interface Data extends WithID {
  event: string;
  params: Params;
}

interface Response extends WithID {
  ok: boolean;
  result: any;
}

function isWithId(data: any) {
  return typeof data.id === "string";
}

function isData(data: any): data is Data {
  return isWithId(data) && typeof data.event === "string" &&
    typeof data.params === "object";
}

function isResponse(data: any): data is Response {
  return isWithId(data) && typeof data.ok === "boolean" &&
    data.result !== undefined;
}

function getId() {
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += String(randomInt(256));
  }
  return result;
}

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

  dispatch(event: string, params: Params) {
    const id = getId();
    const data: Data = { event, params, id };
    const promise = new Promise<any>((resolve, reject) => {
      this.promises.set(id, { resolve, reject });
    });
    this.output.write(JSON.stringify(data) + "\n");
    return promise;
  }

  respond({ id }: Data, ok: boolean, result: any) {
    const response: Response = { id, ok, result };
    this.output.write(JSON.stringify(response) + "\n");
  }

  handle(event: string, handler: Handler) {
    this.handlers.set(event, handler);
  }

  private async handleChunk(chunk: string) {
    let data;
    try {
      data = JSON.parse(chunk);
    } catch (_err) {
      return;
    }
    if (isData(data)) {
      const handler = this.handlers.get(data.event);
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
