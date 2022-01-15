interface Dat {
  id: string;
}

export interface Req extends Dat {
  method: string;
  params: Record<string, any>;
}

export interface Res extends Dat {
  ok: boolean;
  result: any;
}

function isDat(data: any): boolean {
  return typeof data.id === "string" && typeof data.type === "string" &&
    typeof data.data !== "undefined";
}

export function isReq(data: any): data is Req {
  return isDat(data) &&
    typeof data.method === "string" &&
    typeof data.params === "object";
}

export function isRes(data: any): data is Res {
  return isDat(data) && typeof data.ok == "boolean" &&
    typeof data.result !== "undefined";
}
