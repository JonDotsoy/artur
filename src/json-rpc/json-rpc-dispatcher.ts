import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcResultResponse,
  JsonRpcErrorResponse,
  JsonRpcHandler,
  JsonRpcEvent,
  Validation,
  ExtractValidationType,
} from "./types.js";
import { JsonRpcError } from "./types.js";
import { z, toJSONSchema } from "zod";
import { Router } from "../http/router.js";
import { type RouterOptionsDef } from "../http/types/router-options-def.js";
import { DataEventSourceEncoder } from "./utils/event-source/data-event-source.js";
import { Queue, MemoryStore, Store, Message } from "@jondotsoy/utils-js/queue";

/**
 * Zod schema for validating JSON-RPC request structure.
 * Ensures the request conforms to JSON-RPC 2.0 specification.
 */
const jsonRpcRequestSchema = z.object({
  id: z.union([z.string(), z.number()]),
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.any(),
});

/**
 * Zod schema for validating request body.
 * Accepts either a single JSON-RPC request or an array of requests for batch processing.
 */
const bodyRequest = z.union([
  jsonRpcRequestSchema,
  z.array(jsonRpcRequestSchema),
]);

/**
 * Configuration options for JsonRpcDispatcher.
 */
type Options = {
  /** Whether Server-Sent Events (SSE) support is enabled for real-time communication */
  sseEnabled: boolean;
  /** Factory function to extract session ID from JSON-RPC events */
  sessionIdFactory: (
    event: JsonRpcEvent,
  ) => string | null | Promise<string | null>;
};

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
const sessionIdFactory = (event: JsonRpcEvent) => {
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

/**
 * Shared memory store for managing session-based message storage.
 * Maps session IDs to their corresponding memory stores.
 */
const shareMemory = new Map<string, MemoryStore>();

/**
 * Session-specific memory store implementation.
 * Provides isolated message storage per session using a shared memory backend.
 */
class SessionMemoryStore extends Store {
  #sessionId: string;

  /**
   * Creates a new session memory store.
   * @param sessionId - Unique identifier for the session
   */
  constructor(sessionId: string) {
    super();
    this.#sessionId = sessionId;
  }

  /**
   * Adds a message to the session's message store.
   * @param message - The message to add
   */
  async addMessage(message: Message): Promise<void> {
    let messages = shareMemory.get(this.#sessionId);
    if (!messages) {
      messages = new MemoryStore();
      shareMemory.set(this.#sessionId, messages);
    }
    messages.addMessage(message);
  }

  /**
   * Retrieves a message by its ID from the session store.
   * @param messageId - The ID of the message to retrieve
   * @returns The message if found, null otherwise
   */
  async getMessage(messageId: string): Promise<Message | null> {
    return (
      (await shareMemory.get(this.#sessionId)?.getMessage(messageId)) ?? null
    );
  }

  /**
   * Acknowledges a message as processed.
   * @param messageId - The ID of the message to acknowledge
   */
  async acknowledgeMessage(messageId: string): Promise<void> {
    await shareMemory.get(this.#sessionId)?.acknowledgeMessage(messageId);
  }

  /**
   * Deletes a message from the session store.
   * Automatically cleans up empty session stores.
   * @param messageId - The ID of the message to delete
   */
  async deleteMessage(messageId: string): Promise<void> {
    const sessionMemory = shareMemory.get(this.#sessionId);
    if (sessionMemory) {
      await sessionMemory.deleteMessage(messageId);
      if ((await sessionMemory.getSize()) === 0) {
        await sessionMemory.close();
        shareMemory.delete(this.#sessionId);
      }
    }
  }

  /**
   * Claims the next available message for processing.
   * @param acknowledgeTimeoutMs - Timeout in milliseconds for acknowledgment
   * @param now - Current timestamp
   * @param abort - Optional abort signal for cancellation
   * @returns The claimed message if available, null otherwise
   */
  async claimMessage(
    acknowledgeTimeoutMs: number,
    now: number,
    abort?: AbortSignal,
  ): Promise<Message | null> {
    return (
      (await shareMemory
        .get(this.#sessionId)
        ?.claimMessage(acknowledgeTimeoutMs, now, abort)) ?? null
    );
  }

  /**
   * Gets the current number of messages in the session store.
   * @returns The count of messages
   */
  async getSize(): Promise<number> {
    return (await shareMemory.get(this.#sessionId)?.getSize()) ?? 0;
  }

  /**
   * Closes the session store and cleans up resources.
   */
  async close(): Promise<void> {
    await shareMemory.get(this.#sessionId)?.close();
  }
}

/**
 * Factory function to create a session memory store.
 * @param sessionId - The session ID for the store
 * @returns A new SessionMemoryStore instance
 */
const sessionMemoryStore = (sessionId: string) =>
  new SessionMemoryStore(sessionId);

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

/**
 * Main JSON-RPC dispatcher class.
 * Handles JSON-RPC 2.0 requests, method registration, session management,
 * and optional Server-Sent Events (SSE) support for real-time communication.
 */
export class JsonRpcDispatcher {
  /** Static flag to track if SSE warning has been displayed */
  private static sseWarningDisplayed = true;
  /** Map of registered method names to their handlers */
  private handlers = new Map<string, JsonRpcHandler>();
  /** Set of active request promises for cleanup tracking */
  private requests = new Set<Promise<JsonRpcResponse>>();
  /** Map of method names to their parameter validation schemas */
  private paramsValidations = new Map<
    string,
    { input?: Validation<any>; output?: Validation<any> }
  >();

  /** Configuration options for the dispatcher */
  private options: Options;

  /**
   * Creates a new JSON-RPC dispatcher.
   * @param options - Optional configuration options
   */
  constructor(options?: Partial<Options>) {
    this.options = {
      sseEnabled: false,
      sessionIdFactory: sessionIdFactory,
      ...options,
    };

    if (this.options.sseEnabled && JsonRpcDispatcher.sseWarningDisplayed) {
      console.warn(
        "Warning: SSE support is experimental and should be used with caution.",
      );
      JsonRpcDispatcher.sseWarningDisplayed = false;
    }
  }

  /**
   * Stops the dispatcher and waits for all pending requests to complete.
   */
  async stop() {
    await Promise.allSettled(this.requests);
  }

  /**
   * Registers a method handler for JSON-RPC requests.
   * @param method - The method name to register
   * @param handler - The handler function for the method
   */
  registerMethod<
    InputValidation extends Validation<any> = any,
    OutputValidation extends Validation<any> = any,
  >(
    method: string,
    handler: JsonRpcHandler<
      ExtractValidationType<InputValidation>,
      ExtractValidationType<OutputValidation>
    >,
    options?: {
      inputValidation?: InputValidation;
      outputValidation?: OutputValidation;
    },
  ): void {
    this.handlers.set(method, handler);
    if (options?.inputValidation || options?.outputValidation) {
      this.paramsValidations.set(method, {
        input: options.inputValidation,
        output: options.outputValidation,
      });
    }
  }

  /**
   * @deprecated Use {@link registerMethod}() instead. This method is kept for backward compatibility.
   * @param method - The method name to register
   * @param handler - The handler function for the method
   */
  use(method: string, handler: JsonRpcHandler<any, any>): void {
    this.registerMethod(method, handler);
  }

  /**
   * Opens a new session for handling JSON-RPC requests and responses.
   * @param sessionId - Unique identifier for the session
   * @returns A new Session instance
   */
  openSession(sessionId: string) {
    const session = new Session(
      sessionId,
      this,
      new Queue({ store: sessionMemoryStore(sessionId) }),
    );

    return session;
  }

  registerListMethods(
    methodNames: string,
    hiddenMethods: string[] = [methodNames],
  ) {
    this.registerMethod(methodNames, async () => {
      const methods: { name: string; params: any; result: any }[] = [];
      for (const name of this.handlers.keys()) {
        if (hiddenMethods.includes(name)) continue;
        const validations = this.paramsValidations.get(name);
        const method = {
          name,
          params:
            validations?.input && validations?.input instanceof z.ZodType
              ? toJSONSchema(validations.input)
              : {},
          result:
            validations?.output && validations?.output instanceof z.ZodType
              ? toJSONSchema(validations.output)
              : {},
        };
        methods.push(method);
      }
      return {
        methods,
      };
    });
  }

  /**
   * Processes a JSON-RPC request and returns the response.
   * Handles method resolution, parameter validation, and error handling.
   * @param request - The JSON-RPC request to process
   * @param event - Optional event context for the request
   * @returns Object containing the response promise
   */
  request<P = any>(
    request: JsonRpcRequest<P>,
    event?: JsonRpcEvent,
  ): { response: Promise<JsonRpcResponse> } {
    const handler = this.handlers.get(request.method);
    const validation = this.paramsValidations.get(request.method) ?? null;

    const process = Promise.withResolvers<JsonRpcResponse>();

    if (validation?.input) {
      const parsed = validation.input.safeParse(request.params);
      if (!parsed.success) {
        const error = parsed.error;

        const jsonRpcError = new JsonRpcError(-32602, "Invalid params", error);

        process.resolve(jsonRpcError.toJsonRpcResponse(request.id));

        return {
          response: process.promise,
        };
      }
    }

    this.requests.add(process.promise);

    const params = request.params;
    Promise.resolve(handler)
      .then(async (handler): Promise<JsonRpcResultResponse> => {
        if (!handler)
          throw new JsonRpcError(-32601, `Method not found: ${request.method}`);

        const result = await handler(params, request, event ?? {});

        if (validation?.output) {
          const parsed = validation.output.safeParse(result);
          if (!parsed.success) {
            const error = parsed.error;

            console.error(
              `Output validation failed for method ${request.method}:`,
              error,
            );
            throw new JsonRpcError(-32603, "Internal error");
          }
        }

        return {
          id: request.id,
          jsonrpc: "2.0",
          result: result,
        };
      })
      .catch((error): JsonRpcErrorResponse => {
        return JsonRpcError.isJsonRpcError(error)
          ? error.toJsonRpcResponse(request.id)
          : new JsonRpcError(-32603, "Internal error", error).toJsonRpcResponse(
              request.id,
            );
      })
      .then((response) => {
        process.resolve(response);
      })
      .finally(() => {
        this.requests.delete(process.promise);
      });

    return {
      response: process.promise,
    };
  }

  /**
   * HTTP fetch handler for processing JSON-RPC requests over HTTP.
   * Supports POST requests for standard JSON-RPC calls and optional
   * PUT/GET methods for SSE-enabled real-time communication.
   * @param request - The HTTP request to process
   * @returns HTTP response with JSON-RPC result or SSE stream
   */
  fetch = async (request: Request): Promise<Response> => {
    const event: JsonRpcEvent = {
      httpRequest: request,
    };

    try {
      const method = request.method;
      const contentType = request.headers.get("Content-Type");

      if (method === "POST") {
        const body =
          contentType === "application/json" ? await request.json() : null;
        const bodyParsed = bodyRequest.safeParse(body);
        if (!bodyParsed.success) {
          return new Response("Bad Request", { status: 400 });
        }

        const getResponseForPostMethod = (e: {
          response: Promise<JsonRpcResponse>;
        }) => (method === "POST" ? e.response : null);

        const response = Array.isArray(bodyParsed.data)
          ? await Promise.all(
              bodyParsed.data.map((req) =>
                getResponseForPostMethod(this.request(req, event)),
              ),
            )
          : await getResponseForPostMethod(
              this.request(bodyParsed.data, event),
            );

        return new Response(
          method === "POST" ? JSON.stringify(response) : null,
          {
            status: 200,
          },
        );
      }

      if (this.options.sseEnabled && method === "PUT") {
        const sessionId = await this.options.sessionIdFactory(event);

        if (!sessionId) {
          return new Response("Bad Request", { status: 400 });
        }

        const body =
          contentType === "application/json" ? await request.json() : null;

        const bodyParsed = bodyRequest.safeParse(body);

        if (!bodyParsed.success) {
          return new Response("Bad Request", { status: 400 });
        }

        const session = this.openSession(sessionId);

        const parsedDataArray = Array.isArray(bodyParsed.data)
          ? bodyParsed.data
          : [bodyParsed.data];

        for (const jsonRpcRequest of parsedDataArray) {
          await session.request(jsonRpcRequest, event);
        }

        return new Response(null, {
          status: 200,
        });
      }

      if (this.options.sseEnabled && method === "GET") {
        const sessionId = await this.options.sessionIdFactory(event);

        if (!sessionId) {
          return new Response("Bad Request", { status: 400 });
        }

        const abortController = new AbortController();

        const readable = new ReadableStream<Uint8Array>({
          start: async (controller) => {
            const session = this.openSession(sessionId);

            for await (const ctl of session.consume(abortController.signal)) {
              const { message, ack } = ctl;
              controller.enqueue(
                new DataEventSourceEncoder().encode({
                  data: JSON.stringify(message),
                }),
              );
              ack();
            }
          },
          cancel: () => {
            abortController.abort();
          },
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      return new Response("Method not allowed", { status: 405 });
    } catch (error) {
      console.error("Error processing JSON-RPC request:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  };

  /**
   * Router custom options configuration.
   * Provides integration with the HTTP router system.
   */
  // @ts-ignore
  [Router.customOptions]: RouterOptionsDef<any> = {
    fetch: this.fetch,
  };
}
