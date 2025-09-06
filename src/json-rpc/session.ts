import type { Queue } from "@jondotsoy/utils-js/queue";
import type { JsonRpcDispatcher } from "./json-rpc-dispatcher.js";
import type { JsonRpcEvent } from "./types/json-rpc-event.js";
import type { JsonRpcRequest } from "./types/json-rpc-request.js";

/**
 * Represents a JSON-RPC session for handling requests and responses.
 * Provides methods for making requests and consuming responses in a session context.
 */

export class Session {
  #id: string;
  #jsonRpcDispatcher: JsonRpcDispatcher;
  #queue: Queue;

  /**
   * Creates a new JSON-RPC session.
   * @param id - Unique session identifier
   * @param jsonRpcDispatcher - The dispatcher instance to handle requests
   * @param queue - Message queue for handling responses
   */
  constructor(id: string, jsonRpcDispatcher: JsonRpcDispatcher, queue: Queue) {
    this.#id = id;
    this.#jsonRpcDispatcher = jsonRpcDispatcher;
    this.#queue = queue;
  }

  /**
   * Makes a JSON-RPC request within the session context.
   * The response is automatically queued for consumption.
   * @param request - The JSON-RPC request to make
   * @param event - Optional event context for the request
   */
  async request<P = any>(request: JsonRpcRequest<P>, event?: JsonRpcEvent) {
    const response = await this.#jsonRpcDispatcher.request(request, event)
      .response;
    await this.#queue.add(response);
  }

  /**
   * Consumes messages from the session queue.
   * Provides an async iterator for processing responses with acknowledgment capability.
   * @param signal - Optional abort signal for cancellation
   * @yields Object containing the message and acknowledgment function
   */
  async *consume(signal?: AbortSignal) {
    for await (const message of this.#queue.consume(signal)) {
      yield {
        message,
        ack: () => this.#queue.ack(message.id),
      };
    }
  }
}
