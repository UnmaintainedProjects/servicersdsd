import { createReadStream } from "fs";
import { BaseTGCalls, Stream } from "tgcalls-next/lib/base_tgcalls";

import { Connection } from "./connection";

enum Result {
  OK = 0,
  NOT_MUTED = 1,
  ALREADY_MUTED = 1,
  NOT_PAUSED = 1,
  NOT_STREAMING = 1,
  NOT_IN_CALL = 2,
}

export class Calls {
  private instances = new Map<
    string,
    { tgcalls: BaseTGCalls<null>; stream: Stream; track: MediaStreamTrack }
  >();

  constructor(private connection: Connection) {}

  stream(id: string, file: string, joinCallParams?: any) {
    const readable = createReadStream(file);
    const instance = this.instances.get(id);
    if (instance) {
      instance.stream.stop();
      instance.stream.setReadable(readable);
    } else {
      const tgcalls = new BaseTGCalls(null);
      tgcalls.joinVoiceCall = async (payload) => {
        try {
          return JSON.parse(
            await this.connection.dispatch("joinCall", {
              id,
              payload,
              joinCallParams,
            }),
          );
        } catch (err) {
          this.stop(id);
          throw err;
        }
      };
      const stream = new Stream(readable);
      stream.on("finish", () => {
        this.connection.dispatch("finish", { id });
      });
      const track = stream.createTrack();
      this.instances.set(id, { tgcalls, stream, track });
      return tgcalls.start(track);
    }
  }

  mute(id: string) {
    const instance = this.instances.get(id);
    if (instance) {
      if (instance.track.enabled) {
        instance.track.enabled = false;
        return Result.OK;
      }
      return Result.ALREADY_MUTED;
    }
    return Result.NOT_IN_CALL;
  }

  unmute(id: string) {
    const instance = this.instances.get(id);
    if (instance) {
      if (!instance.track.enabled) {
        instance.track.enabled = true;
        return Result.OK;
      }
      return Result.NOT_MUTED;
    }
    return Result.NOT_IN_CALL;
  }

  resume(id: string) {
    const instance = this.instances.get(id);
    if (instance) {
      if (instance.stream.paused) {
        instance.stream.pause();
        return Result.OK;
      }
      return Result.NOT_PAUSED;
    }
    return Result.NOT_IN_CALL;
  }

  pause(id: string) {
    const instance = this.instances.get(id);
    if (instance) {
      if (!instance.stream.paused) {
        instance.stream.pause();
        return Result.OK;
      }
      return Result.NOT_STREAMING;
    }
    return Result.NOT_IN_CALL;
  }

  stop(id: string) {
    const instance = this.instances.get(id);
    if (instance) {
      instance.stream.stop();
      instance.tgcalls.close();
      this.instances.delete(id);
      return true;
    }
    return false;
  }
}
