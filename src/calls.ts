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
    number,
    { tgcalls: BaseTGCalls<null>; stream: Stream; track: MediaStreamTrack }
  >();

  constructor(private connection: Connection) {}

  stream(chatId: number, file: string) {
    const readable = createReadStream(file);
    const instance = this.instances.get(chatId);
    if (instance) {
      instance.stream.stop();
      instance.stream.setReadable(readable);
    } else {
      const tgcalls = new BaseTGCalls(null);
      tgcalls.joinVoiceCall = (params) =>
        this.connection.dispatch("joinCall", params);
      const stream = new Stream(readable);
      stream.on("finish", () => {
        this.connection.dispatch("finish", { chatId });
      });
      const track = stream.createTrack();
      this.instances.set(chatId, { tgcalls, stream, track });
      return tgcalls.start(track);
    }
  }

  mute(chatId: number) {
    const instance = this.instances.get(chatId);
    if (instance) {
      if (instance.track.enabled) {
        instance.track.enabled = false;
        return Result.OK;
      }
      return Result.ALREADY_MUTED;
    }
    return Result.NOT_IN_CALL;
  }

  unmute(chatId: number) {
    const instance = this.instances.get(chatId);
    if (instance) {
      if (!instance.track.enabled) {
        instance.track.enabled = true;
        return Result.OK;
      }
      return Result.NOT_MUTED;
    }
    return Result.NOT_IN_CALL;
  }

  resume(chatId: number) {
    const instance = this.instances.get(chatId);
    if (instance) {
      if (instance.stream.paused) {
        instance.stream.pause();
        return Result.OK;
      }
      return Result.NOT_PAUSED;
    }
    return Result.NOT_IN_CALL;
  }

  pause(chatId: number) {
    const instance = this.instances.get(chatId);
    if (instance) {
      if (!instance.stream.paused) {
        instance.stream.pause();
        return Result.OK;
      }
      return Result.NOT_STREAMING;
    }
    return Result.NOT_IN_CALL;
  }

  stop(chatId: number) {
    const instance = this.instances.get(chatId);
    if (instance) {
      instance.stream.stop();
      instance.tgcalls.close();
      this.instances.delete(chatId);
      return true;
    }
    return false;
  }
}
