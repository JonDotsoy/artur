import { customRouteSymbol } from "../http/constants/custom-options-symbol";
import {
  DataEventSourceEncoder,
  type DataEventSource,
} from "../json-rpc/utils/event-source/data-event-source";
export { type DataEventSource } from "../json-rpc/utils/event-source/data-event-source";

/**
 * Function type for creating a readable stream of Server-Sent Events.
 * @param request - The sent event request containing client information
 * @returns A promise that resolves to a ReadableStream or a ReadableStream directly
 */
type Create = (
  request: SentEventRequest,
) => Promise<ReadableStream<DataEventSource>> | ReadableStream<DataEventSource>;

/**
 * Configuration options for SentEventStream.
 */
type Options = {
  /** Optional function to create the event stream */
  create?: Create;
};

/**
 * Represents a Server-Sent Events request with client information.
 * Contains the last event ID received by the client for event stream resumption.
 */
export class SentEventRequest {
  #lastEventID: string | null;

  /**
   * Creates a new SentEventRequest instance.
   * @param lastEventID - The last event ID received by the client, used for resuming streams
   */
  constructor(lastEventID: string | null) {
    this.#lastEventID = lastEventID;
  }

  /**
   * Gets the last event ID received by the client.
   * @returns The last event ID or null if none was provided
   */
  get lastEventID() {
    return this.#lastEventID;
  }
}

/**
 * Server-Sent Events (SSE) stream handler that implements the EventSource protocol.
 * Provides real-time data streaming capabilities over HTTP using the text/event-stream content type.
 * Can be integrated with HTTP routers and supports custom stream creation logic.
 */
export class SentEventStream {
  #start?: Create;

  /**
   * Creates a new SentEventStream instance.
   * @param options - Configuration options for the stream
   */
  constructor(options: Options = {}) {
    this.#start = options.create;
  }

  /**
   * Creates a readable stream for the given request.
   * @param request - The sent event request containing client information
   * @returns A promise that resolves to a ReadableStream or null if no create function is provided
   */
  create = async (request: SentEventRequest) => {
    return this.#start?.(request) ?? null;
  };

  /**
   * Handles HTTP requests and returns Server-Sent Events responses.
   * Validates the Accept header and creates appropriate SSE responses.
   * @param request - The HTTP request to handle
   * @returns A Response object with SSE stream or error status
   */
  fetch = async (request: Request) => {
    const accept = request.headers.get("accept");
    const lastEventID = request.headers.get("last-event-id");
    const matchContentType = accept?.includes("text/event-stream");

    if (!matchContentType) {
      return new Response("Not Acceptable", { status: 406 });
    }

    const sentEventRequest = new SentEventRequest(lastEventID);

    const readable = await this.#start?.(sentEventRequest);

    return new Response(
      readable?.pipeThrough(
        new TransformStream<DataEventSource, Uint8Array>({
          transform(chunk: DataEventSource, controller) {
            const encoder = new DataEventSourceEncoder();
            const data = encoder.encode(chunk);
            controller.enqueue(data);
          },
        }),
      ),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Transfer-Encoding": "chunked",
        },
      },
    );
  };

  /**
   * Custom route symbol implementation for HTTP router integration.
   * Allows this stream to be used as a route handler in the HTTP router.
   * @returns An object with test and fetch methods for router compatibility
   */
  get [customRouteSymbol]() {
    return {
      test: () => true,
      fetch: this.fetch,
    };
  }
}
