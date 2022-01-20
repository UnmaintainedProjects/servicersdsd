import { createReadStream } from "fs";
import { TGCalls, Stream } from "tgcalls-next";

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
    tgcalls: TGCalls<null>;
    stream: Stream;
  };

  constructor(private connection: Connection) {}

  stream({ audio, video }: { audio?: string; video?: string }) {
    if (!audio && !video) {
      throw new Error("No audio or video passed");
    }
    if (this.instances) {
      if (audio) {
        this.instances.stream.setAudio(createReadStream(audio));
      }
      if (video) {
        this.instances.stream.setVideo(createReadStream(video));
      }
    } else {
      const tgcalls = new TGCalls(null);
      tgcalls.joinVoiceCall = async (payload) => {
        try {
          return JSON.parse(
            await this.connection.dispatch("joinCall", {
              payload,
            })
          );
        } catch (err) {
          this.stop();
          throw err;
        }
      };
      const stream = new Stream();
      stream.on("finish", () => {
        this.connection.dispatch("finish");
      });
      this.instances = { tgcalls, stream };
      return tgcalls.start(stream);
    }
  }

  mute() {
    if (this.instances) {
      if (this.instances.stream.mute()) {
        return Result.OK;
      }
      return Result.ALREADY_MUTED;
    }
    return Result.NOT_IN_CALL;
  }

  unmute() {
    if (this.instances) {
      if (!this.instances.stream.unmute()) {
        return Result.OK;
      }
      return Result.NOT_MUTED;
    }
    return Result.NOT_IN_CALL;
  }

  resume() {
    if (this.instances) {
      if (this.instances.stream.resume()) {
        return Result.OK;
      }
      return Result.NOT_PAUSED;
    }
    return Result.NOT_IN_CALL;
  }

  pause() {
    if (this.instances) {
      if (!this.instances.stream.pause()) {
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
