import type { JsonRpcEvent } from "./types/json-rpc-event.js";

/**
 * Default session ID factory function.
 * Extracts session identifier from HTTP request using various methods:
 * - URL search parameter 'json_rpc_token'
 * - HTTP header 'x-json-rpc-token'
 * - URL search parameter 'token'
 *
 * @param event - The JSON-RPC event containing HTTP request information
 * @returns Session ID string if found, null otherwise
 */
export const sessionIdFactory = (event: JsonRpcEvent) => {
  if (event.httpRequest) {
    const request = event.httpRequest;
    const url = new URL(request.url);
    const jsonRpcToken = url.searchParams.get("json_rpc_token");
    if (jsonRpcToken) {
      return jsonRpcToken;
    }
    const headerJsonRpcToken = request.headers.get("x-json-rpc-token")?.trim();
    if (headerJsonRpcToken) {
      return headerJsonRpcToken;
    }
    const token = url.searchParams.get("token");
    if (token) {
      return token;
    }
  }
  return null;
};
