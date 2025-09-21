import type { JsonRpcHandler } from "./json-rpc-handler.js";

/**
 * A middleware function type for JSON-RPC request processing.
 *
 * Middleware functions follow a chain-of-responsibility pattern, where each middleware
 * can intercept, modify, or handle JSON-RPC requests before passing control to the next
 * handler in the chain.
 *
 * @template P - The type of parameters expected by the JSON-RPC method
 * @template R - The type of result returned by the JSON-RPC method
 *
 * @param next - The next handler in the middleware chain to call
 * @returns A JSON-RPC handler function that processes requests with the middleware logic applied
 *
 * @example
 * ```typescript
 * const loggingMiddleware: JsonRpcMiddleware = (next) => async (request) => {
 *   console.log('Request:', request);
 *   const result = await next(request);
 *   console.log('Response:', result);
 *   return result;
 * };
 * ```
 */
export type JsonRpcMiddleware<P = any, R = any> = (
  next: JsonRpcHandler<P, R>,
) => JsonRpcHandler<P, R>;
