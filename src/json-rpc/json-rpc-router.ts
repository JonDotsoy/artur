import type { ExtractValidationType } from "./types/extract-validation-type.js";
import type { Validation } from "./types/validation.js";
import type { JsonRpcHandler } from "./types/json-rpc-handler.js";
import type { JsonRpcEvent } from "./types/json-rpc-event.js";
import type { JsonRpcErrorResponse } from "./types/json-rpc-error-response.js";
import type { JsonRpcResultResponse } from "./types/json-rpc-result-response.js";
import type { JsonRpcResponse } from "./types/json-rpc-response.js";
import type { JsonRpcRequest } from "./types/json-rpc-request.js";
import { JsonRpcError } from "./json-rpc-error.js";
import { z, toJSONSchema } from "zod";
import { Router } from "../http/router.js";
import { type RouterOptionsDef } from "../http/types/router-options-def.js";
import { DataEventSourceEncoder } from "./utils/event-source/data-event-source.js";
import { Queue } from "@jondotsoy/utils-js/queue";
import { bodyRequest } from "./schemas/body-request.js";
import type { JsonRpcDispatcherOptions } from "./types/json-rpc-dispatcher-options.js";
import { defaultExtractSessionId } from "./default-extract-session-id.js";
import { sessionMemoryStore } from "./create-session-memory-store.1.js";
import { Session } from "./session.js";

/**
 * Main JSON-RPC dispatcher class.
 * Handles JSON-RPC 2.0 requests, method registration, session management,
 * and optional Server-Sent Events (SSE) support for real-time communication.
 */
export class JsonRpcRouter {
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
  private options: JsonRpcDispatcherOptions;

  /**
   * Creates a new JSON-RPC dispatcher.
   * @param options - Optional configuration options
   */
  constructor(options?: Partial<JsonRpcDispatcherOptions>) {
    this.options = {
      sseEnabled: false,
      extractSessionId: defaultExtractSessionId,
      ...options,
    };

    if (this.options.sseEnabled && JsonRpcRouter.sseWarningDisplayed) {
      console.warn(
        "Warning: SSE support is experimental and should be used with caution.",
      );
      JsonRpcRouter.sseWarningDisplayed = false;
    }
  }

  /**
   * Stops the dispatcher and waits for all pending requests to complete.
   */
  async stop() {
    await Promise.allSettled(this.requests);
  }

  /** @deprecated Use {@link method}() instead. */
  get registerMethod() {
    return this.method;
  }

  /**
   * Registers a method handler for JSON-RPC requests with optional input/output validation.
   *
   * This method allows you to register handlers for specific JSON-RPC method names.
   * You can optionally provide Zod validation schemas for both input parameters and
   * output results to ensure type safety and data validation.
   *
   * @template InputValidation - Type of the input validation schema (extends Validation<any>)
   * @template OutputValidation - Type of the output validation schema (extends Validation<any>)
   *
   * @param method - The JSON-RPC method name to register (e.g., 'user.getById', 'system.info')
   * @param handler - The async function that handles the JSON-RPC request. Receives:
   *                  - params: The request parameters (validated if inputValidation is provided)
   *                  - request: The full JSON-RPC request object
   *                  - event: Additional event context (e.g., HTTP request info)
   * @param options - Optional configuration object for validation
   * @param options.inputValidation - Zod schema for validating input parameters before calling the handler.
   *                                  If validation fails, returns a JSON-RPC error (-32602 Invalid params)
   * @param options.outputValidation - Zod schema for validating the handler's return value.
   *                                   If validation fails, returns a JSON-RPC error (-32603 Internal error)
   *
   * @example
   * ```typescript
   * // Simple method without validation
   * dispatcher.registerMethod('ping', async () => 'pong');
   *
   * // Method with input validation
   * dispatcher.registerMethod(
   *   'user.getById',
   *   async (params) => getUserById(params.id),
   *   {
   *     inputValidation: z.object({ id: z.string() })
   *   }
   * );
   *
   * // Method with both input and output validation
   * dispatcher.registerMethod(
   *   'user.create',
   *   async (params) => createUser(params),
   *   {
   *     inputValidation: z.object({
   *       name: z.string(),
   *       email: z.string().email()
   *     }),
   *     outputValidation: z.object({
   *       id: z.string(),
   *       name: z.string(),
   *       email: z.string()
   *     })
   *   }
   * );
   * ```
   *
   * @throws Will not throw directly, but validation errors are returned as JSON-RPC error responses
   *
   * @see {@link use} - Deprecated alias for this method
   * @see {@link registerListMethods} - For registering introspection methods
   */
  method<
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
   * @deprecated Use {@link method}() instead. This method is kept for backward compatibility.
   * @param method - The method name to register
   * @param handler - The handler function for the method
   */
  use(method: string, handler: JsonRpcHandler<any, any>): void {
    this.method(method, handler);
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

  /**
   * Registers a JSON-RPC method that returns a list of available methods and their schemas.
   * This method provides introspection capabilities for JSON-RPC clients by exposing
   * the available methods along with their parameter and result validation schemas.
   *
   * @param methodNames - The name of the method to register (typically 'system.listMethods')
   * @param hiddenMethods - Array of method names to exclude from the returned list.
   *                        Defaults to an array containing the methodNames parameter
   *                        to prevent self-reference in the list.
   *
   * @example
   * ```typescript
   * // Register a listMethods endpoint
   * dispatcher.registerListMethods('system.listMethods');
   *
   * // Register with custom hidden methods
   * dispatcher.registerListMethods('system.listMethods', ['system.listMethods', 'internal.debug']);
   * ```
   *
   * @remarks
   * The returned method list includes:
   * - `name`: The method name
   * - `params`: JSON Schema for input parameters (if validation is defined)
   * - `result`: JSON Schema for output result (if validation is defined)
   *
   * Methods without validation will have empty objects for params and result schemas.
   */
  registerListMethods(
    methodNames: string,
    hiddenMethods: string[] = [methodNames],
  ) {
    this.method(methodNames, async () => {
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
        const sessionId = await this.options.extractSessionId(event);

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
        const sessionId = await this.options.extractSessionId(event);

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
