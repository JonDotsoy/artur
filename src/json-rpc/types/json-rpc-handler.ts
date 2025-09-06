import type { JsonRpcEvent } from "./json-rpc-event";
import type { JsonRpcRequest } from "./json-rpc-request";

export type JsonRpcHandler<P = any, R = any> = (
  params: P,
  request: JsonRpcRequest,
  event: JsonRpcEvent,
) => Promise<R> | R;
