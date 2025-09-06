import type { JsonRpcErrorResponse } from "./json-rpc-error-response";
import type { JsonRpcResultResponse } from "./json-rpc-result-response";

export type JsonRpcResponse<T = any, R = any> =
  | JsonRpcResultResponse<T>
  | JsonRpcErrorResponse<R>;
