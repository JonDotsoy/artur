import type { JsonRpcErrorResponse } from "./json-rpc-error-response.js";
import type { JsonRpcResultResponse } from "./json-rpc-result-response.js";

export type JsonRpcResponse<T = any, R = any> =
  | JsonRpcResultResponse<T>
  | JsonRpcErrorResponse<R>;
