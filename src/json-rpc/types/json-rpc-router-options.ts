import type { JsonRpcEvent } from "./json-rpc-event.js";
import type { JsonRpcMiddleware } from "./json-rpc-middleware.js";

/**
 * Configuration options for JsonRpcRouter.
 */
export type JsonRpcRouterOptions = {
  /** Whether Server-Sent Events (SSE) support is enabled for real-time communication */
  sseEnabled: boolean;
  /** @deprecated Use {@link extractSessionId} instead. */
  sessionIdFactory?: (
    event: JsonRpcEvent,
  ) => string | null | Promise<string | null>;
  /** Factory function to extract session ID from JSON-RPC events */
  extractSessionId: (
    event: JsonRpcEvent,
  ) => string | null | Promise<string | null>;

  info?: {
    title?: string;
    version?: string;
    description?: string;
  };

  /** Array of middleware functions to be applied to JSON-RPC requests and notifications */
  middlewares?: JsonRpcMiddleware[];
};
