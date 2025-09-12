import { customRouteSymbol } from "../http/constants/custom-options-symbol.js";
import { defaultRouteArguments } from "../http/utils/parse-route-arguments.js";
import { EventEncoder, type Event } from "./event-encoder/event-encoder.js";

const t = async <T>(promise: () => Promise<T>) => {
  try {
    return [null, await promise()] as const;
  } catch (error) {
    return [error, null] as const;
  }
};

/**
 * Function type for creating a readable stream of Server-Sent Events.
 * @param request - The sent event request containing client information
 * @returns A promise that resolves to a ReadableStream or a ReadableStream directly
 */
type Start = (
  request: EventSourceRequest,
) =>
  | Promise<EventsReadableStream | ReadableStream<Event> | void>
  | EventsReadableStream
  | ReadableStream<Event>
  | void;

/**
 * Configuration options for SentEventStream.
 */
type Options = {
  /** Optional function to create the event stream */
  start?: Start;
};

/**
 * Represents a Server-Sent Events request with client information.
 * Contains the last event ID received by the client for event stream resumption.
 */
export class EventSourceRequest {
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

export class EventsReadableStream extends ReadableStream<Event> {
  async *iterable(): AsyncIterable<Event> {
    const reader = this.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }
  async toArray(): Promise<Event[]> {
    const result: Event[] = [];
    for await (const chunk of this.iterable()) {
      result.push(chunk);
    }
    return result;
  }

  static from(
    iterable: null | EventsReadableStream | ReadableStream<Event>,
  ): EventsReadableStream | null {
    if (iterable === null) return null;
    if (iterable instanceof EventsReadableStream) {
      return iterable;
    }
    return new EventsReadableStream(iterable);
  }
}

/**
 * Server-Sent Events (SSE) stream handler that implements the EventSource protocol.
 * Provides real-time data streaming capabilities over HTTP using the text/event-stream content type.
 * Can be integrated with HTTP routers and supports custom stream creation logic.
 */
export class EventSource {
  #start?: Start;

  /**
   * Creates a new SentEventStream instance.
   * @param options - Configuration options for the stream
   */
  constructor(options: Options = {}) {
    this.#start = options.start;
  }

  /**
   * Creates a readable stream for the given request.
   * @param request - The sent event request containing client information
   * @returns A promise that resolves to a ReadableStream or null if no create function is provided
   */
  create = async (
    request: EventSourceRequest,
  ): Promise<EventsReadableStream> => {
    return (
      EventsReadableStream.from((await this.#start?.(request)) ?? null) ??
      new EventsReadableStream({
        start(controller) {
          controller.close();
        },
      })
    );
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

    const sentEventRequest = new EventSourceRequest(lastEventID);

    const [error, readable] = await t(async () =>
      this.#start?.(sentEventRequest),
    );

    if (error) {
      console.error("Error creating event stream:", error);
      return new Response("Internal Server Error", { status: 500 });
    }

    return new Response(
      readable?.pipeThrough(
        new TransformStream<Event, Uint8Array>({
          transform(chunk: Event, controller) {
            const encoder = new EventEncoder();
            const data = encoder.encode(chunk);
            controller.enqueue(data);
          },
        }),
      ) ?? null,
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
  [customRouteSymbol] = defaultRouteArguments({
    method: "GET",
    test: (request) => {
      const accept = request.headers.get("accept");
      const matchContentType = accept?.includes("text/event-stream") ?? false;

      return matchContentType;
    },
    fetch: this.fetch,
  });
}
