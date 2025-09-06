export interface JsonRpcResultResponse<T = any> {
  jsonrpc: "2.0";
  id: string | number;
  result: T;
}
