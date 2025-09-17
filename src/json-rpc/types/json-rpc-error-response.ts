export interface JsonRpcErrorResponse<T = any> {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: T;
  };
}
