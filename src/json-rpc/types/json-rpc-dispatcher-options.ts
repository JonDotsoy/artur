import type { JsonRpcEvent } from "./json-rpc-event.js";

/**
 * Configuration options for JsonRpcDispatcher.
 */
export type JsonRpcDispatcherOptions = {
  /** Whether Server-Sent Events (SSE) support is enabled for real-time communication */
  sseEnabled: boolean;
  /** Factory function to extract session ID from JSON-RPC events */
  sessionIdFactory: (
    event: JsonRpcEvent,
  ) => string | null | Promise<string | null>;
};
