import type { Queue } from "@jondotsoy/utils-js/queue";
import type { JsonRpcResponse, JsonRpcRouter } from "./json-rpc-router.js";
import type { JsonRpcEvent } from "./types/json-rpc-event.js";
import type { JsonRpcRequest } from "./types/json-rpc-request.js";
import type { JsonRpcError } from "./json-rpc-error.js";

/**
 * Represents a JSON-RPC session for handling requests and responses.
 * Provides methods for making requests and consuming responses in a session context.
 */

export class Session {
  #id: string;
  #jsonRpcRouter: JsonRpcRouter;
  #queue: Queue;

  /**
   * Creates a new JSON-RPC session.
   * @param id - Unique session identifier
   * @param jsonRpcRouter - The router instance to handle requests
   * @param queue - Message queue for handling responses
   */
  constructor(id: string, jsonRpcRouter: JsonRpcRouter, queue: Queue) {
    this.#id = id;
    this.#jsonRpcRouter = jsonRpcRouter;
    this.#queue = queue;
  }

  /**
   * Makes a JSON-RPC request within the session context.
   * The response is automatically queued for consumption.
   * @param request - The JSON-RPC request to make
   * @param event - Optional event context for the request
   * @deprecated Use the router's request method directly and handle responses as needed.
   */
  async request<P = any>(request: JsonRpcRequest<P>, event?: JsonRpcEvent) {
    const response = await this.#jsonRpcRouter.request(request, event).response;
    if (response) await this.enqueueResponseOrError(response);
  }

  /**
   * Enqueues a JSON-RPC response or error to be processed by the session queue.
   *
   * @param responseOrError - The JSON-RPC response object or error object to be added to the queue
   * @returns A promise that resolves when the response or error has been successfully added to the queue
   */
  async enqueueResponseOrError(
    responseOrError: JsonRpcResponse | JsonRpcError<any>,
  ) {
    await this.#queue.add(responseOrError);
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
