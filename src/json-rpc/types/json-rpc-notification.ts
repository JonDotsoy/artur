export interface JsonRpcNotification<T = any> {
  jsonrpc: "2.0";
  method: string;
  params?: T;
}
