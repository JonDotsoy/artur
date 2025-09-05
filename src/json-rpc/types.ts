export interface JsonRpcRequest<T = any> {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: T;
}

export type JsonRpcResponse<T = any, R = any> =
  | JsonRpcResultResponse<T>
  | JsonRpcErrorResponse<R>;

export interface JsonRpcResultResponse<T = any> {
  jsonrpc: "2.0";
  id: string | number;
  result: T;
}

export interface JsonRpcErrorResponse<T = any> {
  jsonrpc: "2.0";
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: T;
  };
}

export class JsonRpcError<T = any> extends Error {
  public code: number;
  public data?: T;

  constructor(code: number, message: string, data?: T) {
    super(message);
    this.name = "JsonRpcError";
    this.code = code;
    this.data = data;
  }

  static isJsonRpcError(error: any): error is JsonRpcError {
    return error instanceof JsonRpcError;
  }
}

export type JsonRpcEvent = {
  httpRequest?: Request;
};

export type JsonRpcHandler<P = any, R = any> = (
  params: P,
  request: JsonRpcRequest,
  event: JsonRpcEvent,
) => Promise<R> | R;

export type ZodValidation<T> = {
  safeParse: (data: any) => { success: boolean; data?: T; error?: any };
};

export type Validation<T> = ZodValidation<T>;

export type ExtractValidationType<A> =
  A extends Validation<infer U> ? U : unknown;
