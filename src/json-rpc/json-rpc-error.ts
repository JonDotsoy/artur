import type { JsonRpcErrorResponse } from "./types/json-rpc-error-response.js";

export class JsonRpcError<T = any> extends Error {
  public code: number;
  public data?: T;

  constructor(code: number, message: string, data?: T) {
    super(message);
    this.name = "JsonRpcError";
    this.code = code;
    this.data = data;
  }

  toJsonRpcResponse(id: null | string | number): JsonRpcErrorResponse<T> {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: this.code,
        message: this.message,
        data: this.data,
      },
    };
  }

  static isJsonRpcError(error: any): error is JsonRpcError {
    return error instanceof JsonRpcError;
  }
}
