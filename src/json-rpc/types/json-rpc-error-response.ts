export interface JsonRpcErrorResponse<T = any> {
  jsonrpc: "2.0";
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: T;
  };
}
