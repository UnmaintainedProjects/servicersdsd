import { createReadStream } from "fs";
import { BaseTGCalls, Stream } from "tgcalls-next/lib/base_tgcalls";

import { Connection } from "./connection/connection";

enum Result {
  OK = 0,
  NOT_MUTED = 1,
  ALREADY_MUTED = 1,
  NOT_PAUSED = 1,
  NOT_STREAMING = 1,
  NOT_IN_CALL = 2,
}

export class Call {
  private instances?: {
    tgcalls: BaseTGCalls<null>;
    stream: Stream;
    track: MediaStreamTrack;
  };

  constructor(private connection: Connection) {}

  stream(file: string) {
    const readable = createReadStream(file);
    if (this.instances) {
      this.instances.stream.stop();
      this.instances.stream.setReadable(readable);
    } else {
      const tgcalls = new BaseTGCalls(null);
      tgcalls.joinVoiceCall = async (payload) => {
        try {
          return JSON.parse(
            await this.connection.dispatch("joinCall", {
              payload,
            }),
          );
        } catch (err) {
          this.stop();
          throw err;
        }
      };
      const stream = new Stream(readable);
      stream.on("finish", () => {
        this.connection.dispatch("finish");
      });
      const track = stream.createTrack();
      this.instances = { tgcalls, stream, track };
      return tgcalls.start(track);
    }
  }

  mute() {
    if (this.instances) {
      if (this.instances.track.enabled) {
        this.instances.track.enabled = false;
        return Result.OK;
      }
      return Result.ALREADY_MUTED;
    }
    return Result.NOT_IN_CALL;
  }

  unmute() {
    if (this.instances) {
      if (!this.instances.track.enabled) {
        this.instances.track.enabled = true;
        return Result.OK;
      }
      return Result.NOT_MUTED;
    }
    return Result.NOT_IN_CALL;
  }

  resume() {
    if (this.instances) {
      if (this.instances.stream.paused) {
        this.instances.stream.pause();
        return Result.OK;
      }
      return Result.NOT_PAUSED;
    }
    return Result.NOT_IN_CALL;
  }

  pause() {
    if (this.instances) {
      if (!this.instances.stream.paused) {
        this.instances.stream.pause();
        return Result.OK;
      }
      return Result.NOT_STREAMING;
    }
    return Result.NOT_IN_CALL;
  }

  finish() {
    if (this.instances) {
      if (!this.instances.stream.finished) {
        this.instances.stream.finish();
        return Result.OK;
      }
      return Result.NOT_STREAMING;
    }
    return Result.NOT_IN_CALL;
  }

  stop() {
    if (this.instances) {
      this.instances.stream.stop();
      this.instances.tgcalls.close();
      this.instances = undefined;
      return true;
    }
    return false;
  }
}
