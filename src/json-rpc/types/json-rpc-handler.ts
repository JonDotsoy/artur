import type { JsonRpcEvent } from "./json-rpc-event.js";
import type { JsonRpcNotification } from "./json-rpc-notification.js";
import type { JsonRpcRequest } from "./json-rpc-request.js";

export type JsonRpcHandler<P = any, R = any> = (
  params: P,
  request: JsonRpcRequest | JsonRpcNotification,
  event: JsonRpcEvent,
) => Promise<R> | R;
