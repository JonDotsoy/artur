import type { ExtractValidationType } from "./types/extract-validation-type.js";
import type { ParamsValidation, Validation } from "./types/validation.js";
import type { JsonRpcHandler } from "./types/json-rpc-handler.js";
import type { JsonRpcEvent } from "./types/json-rpc-event.js";
import type { JsonRpcResponse } from "./types/json-rpc-response.js";
import type { JsonRpcRequest } from "./types/json-rpc-request.js";
import type { JsonRpcNotification } from "./types/json-rpc-notification.js";
import { JsonRpcError } from "./json-rpc-error.js";
import { Router } from "../http/router.js";
import { Queue } from "@jondotsoy/utils-js/queue";
import { bodyRequest } from "./schemas/body-request.js";
import type { JsonRpcRouterOptions } from "./types/json-rpc-router-options.js";
import { defaultExtractSessionId } from "./default-extract-session-id.js";
import { sessionMemoryStore } from "./create-session-memory-store.1.js";
import { Session } from "./session.js";
import { defaultRouteArguments } from "../http/utils/parse-route-arguments.js";
import {
  EventSourceRoute,
  EventsReadableStream,
} from "../event-source/event-source-route.js";
import { fromJsonRpcRouter } from "./utils/open-rpc-document.js";
import type { JsonRpcMiddleware } from "./types/json-rpc-middleware.js";
import { decorate } from "@jondotsoy/decorate";

export type { JsonRpcErrorResponse } from "./types/json-rpc-error-response.js";
export type { JsonRpcResultResponse } from "./types/json-rpc-result-response.js";
export type { JsonRpcResponse } from "./types/json-rpc-response.js";
export type { JsonRpcRequest } from "./types/json-rpc-request.js";
export type { JsonRpcNotification } from "./types/json-rpc-notification.js";

/**
 * Main JSON-RPC router class.
 * Handles JSON-RPC 2.0 requests, method registration, session management,
 * and optional Server-Sent Events (SSE) support for real-time communication.
 */
export class JsonRpcRouter {
  /** Static flag to track if SSE warning has been displayed */
  private static sseWarningDisplayed = true;
  /** Map of registered method names to their handlers */
  private handlers = new Map<string, JsonRpcHandler>();
  /** Set of active request promises for cleanup tracking */
  private requests = new Set<Promise<any>>();
  /** Map of method names to their parameter validation schemas */
  private paramsValidations = new Map<
    string,
    { input?: ParamsValidation<any>; output?: Validation<any> }
  >();
  /**
   * A map that stores middleware functions for each JSON-RPC method.
   * The key is the method name and the value is an array of middleware functions
   * that will be executed in order when the corresponding method is called.
   */
  private methodsMiddlewares = new Map<string, JsonRpcMiddleware[]>();

  /** Configuration options for the router */
  readonly options: JsonRpcRouterOptions;

  /**
   * Creates a new JSON-RPC router.
   * @param options - Optional configuration options
   */
  constructor(options?: Partial<JsonRpcRouterOptions>) {
    const extractSessionId =
      options?.extractSessionId ??
      options?.sessionIdFactory ??
      defaultExtractSessionId;
    this.options = {
      sseEnabled: false,
      extractSessionId,
      ...options,
      sessionIdFactory: undefined, // Remove deprecated option
    };

    if (this.options.sseEnabled && JsonRpcRouter.sseWarningDisplayed) {
      console.warn(
        "Warning: SSE support is experimental and should be used with caution.",
      );
      JsonRpcRouter.sseWarningDisplayed = false;
    }
  }

  /**
   * Stops the router and waits for all pending requests to complete.
   */
  async stop() {
    await Promise.allSettled(this.requests);
  }

  /** @deprecated Use {@link method}() instead. */
  get registerMethod() {
    return this.method;
  }

  /**
   * Registers a method handler for JSON-RPC requests with optional validation and middleware support.
   *
   * This method allows you to register handlers for specific JSON-RPC method names with comprehensive
   * configuration options including input/output validation using Zod schemas and middleware chains
   * for cross-cutting concerns like authentication, logging, and request/response transformation.
   *
   * @template InputValidation - Type of the input validation schema (extends ParamsValidation<any>)
   * @template OutputValidation - Type of the output validation schema (extends Validation<any>)
   *
   * @param method - The JSON-RPC method name to register (e.g., 'user.getById', 'system.info', 'auth.login')
   * @param handler - The async function that handles the JSON-RPC request. Receives:
   *                  - params: The request parameters (type-safe if inputValidation is provided)
   *                  - request: The full JSON-RPC request object (JsonRpcRequest | JsonRpcNotification)
   *                  - event: Additional event context (e.g., HTTP request info, session data)
   * @param options - Optional configuration object for validation and middleware
   * @param options.inputValidation - Zod schema for validating input parameters before calling the handler.
   *                                  If validation fails, returns a JSON-RPC error (-32602 Invalid params).
   *                                  Provides compile-time type safety for the params argument.
   * @param options.outputValidation - Zod schema for validating the handler's return value.
   *                                   If validation fails, returns a JSON-RPC error (-32603 Internal error).
   *                                   Ensures consistent response format and type safety.
   * @param options.middlewares - Array of method-specific middleware functions that will be executed
   *                              in addition to any router-level middlewares. Method middlewares
   *                              execute first, followed by router middlewares. Each middleware
   *                              can transform the request, response, or completely override the handler.
   *
   * @example
   * ```typescript
   * // Simple method without validation or middleware
   * router.method('ping', async () => 'pong');
   *
   * // Method with input validation and type safety
   * router.method(
   *   'user.getById',
   *   async (params) => {
   *     // params is now typed as { id: string }
   *     return getUserById(params.id);
   *   },
   *   {
   *     inputValidation: z.object({ id: z.string() })
   *   }
   * );
   *
   * // Method with both input and output validation
   * router.method(
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
   *       email: z.string(),
   *       createdAt: z.date()
   *     })
   *   }
   * );
   *
   * // Method with middleware for authentication and logging
   * const authMiddleware: JsonRpcMiddleware = (next) => async (params, request, event) => {
   *   if (!event.httpRequest?.headers.get('authorization')) {
   *     throw new JsonRpcError(-32001, 'Authentication required');
   *   }
   *   return next(params, request, event);
   * };
   *
   * const loggingMiddleware: JsonRpcMiddleware = (next) => async (params, request, event) => {
   *   console.log(`Processing method: ${request.method}`);
   *   const result = await next(params, request, event);
   *   console.log(`Method ${request.method} completed`);
   *   return result;
   * };
   *
   * router.method(
   *   'admin.deleteUser',
   *   async (params) => deleteUser(params.userId),
   *   {
   *     inputValidation: z.object({ userId: z.string() }),
   *     middlewares: [authMiddleware, loggingMiddleware]
   *   }
   * );
   *
   * // Middleware that completely overrides the handler response
   * const cacheMiddleware: JsonRpcMiddleware = (next) => async (params, request, event) => {
   *   const cacheKey = `${request.method}:${JSON.stringify(params)}`;
   *   const cached = getFromCache(cacheKey);
   *   if (cached) {
   *     return cached; // Skip calling next() to override handler
   *   }
   *   const result = await next(params, request, event);
   *   setCache(cacheKey, result);
   *   return result;
   * };
   * ```
   *
   * @remarks
   * **Middleware Execution Order:**
   * 1. Method-level middlewares (specified in options.middlewares) execute first
   * 2. Router-level middlewares (specified in constructor) execute second
   * 3. The original handler executes last (unless a middleware returns early)
   *
   * **Validation Flow:**
   * 1. Input validation runs before any middleware or handler
   * 2. Handler and middleware logic execute
   * 3. Output validation runs on the final result
   *
   * **Type Safety:**
   * When inputValidation is provided, the params argument in the handler becomes
   * type-safe based on the Zod schema. Without validation, params is typed as `unknown`.
   *
   * @throws Will not throw directly, but validation errors are returned as JSON-RPC error responses:
   *         - -32602 "Invalid params" for input validation failures
   *         - -32603 "Internal error" for output validation failures
   *         - -32601 "Method not found" if the method is not registered
   *
   * @see {@link use} - Deprecated alias for this method
   * @see {@link enableMethodListing} - For registering method discovery/introspection endpoints
   * @see {@link JsonRpcMiddleware} - For creating custom middleware functions
   * @see {@link JsonRpcHandler} - For the handler function signature
   */
  method<
    InputValidation extends ParamsValidation<any> = any,
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
      middlewares?: JsonRpcMiddleware[];
    },
  ): void {
    this.handlers.set(method, handler);
    if (options?.middlewares) {
      this.methodsMiddlewares.set(method, options.middlewares);
    }
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
   * router.registerListMethods('system.listMethods');
   *
   * // Register with custom hidden methods
   * router.registerListMethods('system.listMethods', ['system.listMethods', 'internal.debug']);
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
  enableMethodListing(
    methodNames: string,
    hiddenMethods: string[] = [methodNames],
  ) {
    this.method(methodNames, async () => {
      return fromJsonRpcRouter(this, { hiddenMethods });
    });
  }

  parseParams = (method: string, value: unknown) => {
    const validationInput = this.paramsValidations.get(method)?.input ?? null;
    if (!validationInput) {
      return value;
    }
    const parsed = validationInput.safeParse(value);
    if (!parsed.success) {
      const error = parsed.error;
      throw new JsonRpcError(-32602, "Invalid params", error);
    }
    return parsed.data;
  };

  parseResult = (method: string, value: unknown) => {
    const validationOutput = this.paramsValidations.get(method)?.output ?? null;
    if (!validationOutput) {
      return value;
    }
    const parsed = validationOutput.safeParse(value);
    if (!parsed.success) {
      const error = parsed.error;
      throw new JsonRpcError(-32603, "Internal error", error);
    }
    return parsed.data;
  };

  /**
   * Processes a JSON-RPC request or notification and returns a response.
   *
   * This method handles the complete lifecycle of a JSON-RPC request including:
   * - Method resolution and validation
   * - Parameter validation using Zod schemas (if configured)
   * - Handler execution
   * - Result validation using Zod schemas (if configured)
   * - Response formatting
   *
   * @template P - The type of the request parameters
   * @param request - The JSON-RPC request or notification to process
   * @param event - Optional event context passed to the handler
   * @returns A Promise that resolves to a JSON-RPC response for requests, or null for notifications
   *
   * @throws {JsonRpcError} -32601 - When the requested method is not found
   * @throws {JsonRpcError} -32602 - When request parameters fail validation
   * @throws {JsonRpcError} -32603 - When the handler result fails output validation
   *
   * @example
   * ```typescript
   * const request = { jsonrpc: "2.0", method: "add", params: [1, 2], id: 1 };
   * const response = await router.processRequest(request);
   * // Returns: { jsonrpc: "2.0", result: 3, id: 1 }
   * ```
   */
  processRequest = async <P = any>(
    request: JsonRpcRequest<P> | JsonRpcNotification<P>,
    event?: JsonRpcEvent,
  ): Promise<JsonRpcResponse | null> => {
    const requestId = "id" in request ? request.id : null;
    const method = request.method;

    const handler = this.handlers.get(method);

    if (!handler) {
      throw new JsonRpcError(-32601, `Method not found: ${method}`);
    }

    const params = this.parseParams(method, request.params);

    const routerMiddlewares = this.options.middlewares ?? [];
    const methodMiddlewares = this.methodsMiddlewares.get(method) ?? [];

    /**
     * Creates a middleware chain by reducing an array of middlewares into a single handler.
     * The middlewares are applied in reverse order, where each middleware wraps the next
     * handler in the chain, starting from the base handler.
     *
     * @remarks
     * This follows the common middleware pattern where each middleware function takes
     * the next handler as a parameter and returns a new handler that can optionally
     * call the next handler in the chain.
     */
    const next = decorate(handler, ...routerMiddlewares, ...methodMiddlewares);

    const result = this.parseResult(
      method,
      await next(params, request, event ?? {}),
    );

    if (!requestId) return null;

    return {
      id: requestId,
      jsonrpc: "2.0",
      result,
    };
  };

  /**
   * Processes a JSON-RPC request and returns the response.
   * Handles method resolution, parameter validation, and error handling.
   * @param request - The JSON-RPC request to process
   * @param event - Optional event context for the request
   * @returns Object containing the response promise
   */
  request<P = any>(
    request: JsonRpcRequest<P> | JsonRpcNotification<P>,
    event?: JsonRpcEvent,
  ): {
    then: Promise<null | JsonRpcResponse | JsonRpcError>["then"];
    /**
     * @deprecated Use the returned promise directly via `.then` instead of accessing `.response`.
     */
    response: Promise<null | JsonRpcResponse | JsonRpcError>;
  } {
    const process = this.processRequest(request, event)
      .catch((error) => {
        if (JsonRpcError.isJsonRpcError(error)) {
          return error.toJsonRpcResponse(
            "id" in request ? request.id ?? null : null,
          );
        }
        console.error("Internal error processing request:", error);
        return new JsonRpcError(-32603, "Internal error").toJsonRpcResponse(
          "id" in request ? request.id ?? null : null,
        );
      })
      .finally(() => {
        this.requests.delete(process);
      });

    this.requests.add(process);

    const then = <TResult1 = JsonRpcResponse | null, TResult2 = never>(
      onfulfilled?:
        | ((value: JsonRpcResponse | null) => TResult1 | PromiseLike<TResult1>)
        | undefined
        | null,
      onrejected?:
        | ((reason: any) => TResult2 | PromiseLike<TResult2>)
        | undefined
        | null,
    ) => process.then(onfulfilled, onrejected);

    return {
      then,
      response: process,
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
    const sseEnabled = this.options.sseEnabled;

    const event: JsonRpcEvent = {
      httpRequest: request,
    };

    const router = new Router();

    if (sseEnabled) {
      const sessionId = await this.options.extractSessionId(event);

      router.route({
        test: (request: Request) => {
          const isMethodGet = request.method === "GET";
          const isMethodPost = request.method === "POST";
          const acceptEventStream =
            request.headers.get("accept")?.includes("text/event-stream") ??
            false;

          return acceptEventStream && (isMethodGet || isMethodPost);
        },
        fetch: async (request: Request) => {
          if (!sessionId) {
            return new Response("Bad Request", { status: 400 });
          }

          const session = this.openSession(sessionId);

          const eventSource = new EventSourceRoute({
            async start() {
              return new EventsReadableStream({
                start: async (controller) => {
                  for await (const ctl of session.consume(request.signal)) {
                    const { message, ack } = ctl;
                    controller.enqueue({ data: message });
                    ack();
                  }
                },
              });
            },
          });

          return eventSource.fetch(request);
        },
      });

      router.route({
        method: "PUT",
        test: (request: Request) =>
          request.headers.get("content-type")?.includes("application/json") ??
          false,
        fetch: async (request) => {
          if (!sessionId) {
            return new Response("Bad Request", { status: 400 });
          }

          const session = this.openSession(sessionId);

          const body = await request.json();

          const bodyParsed = bodyRequest.safeParse(body);

          if (!bodyParsed.success) {
            return new Response("Bad Request", { status: 400 });
          }

          const parsedDataArray = Array.isArray(bodyParsed.data)
            ? bodyParsed.data
            : [bodyParsed.data];

          for (const jsonRpcRequest of parsedDataArray) {
            const responseOrError = await this.request(jsonRpcRequest, event);
            if (!responseOrError) continue;
            await session.enqueueResponseOrError(responseOrError);
          }

          return new Response(null, {
            status: 200,
          });
        },
      });
    }

    router.route({
      method: "POST",
      test: (request: Request) =>
        request.headers.get("content-type")?.includes("application/json") ??
        false,
      fetch: async (request) => {
        const body = await request.json();

        const bodyParsed = bodyRequest.safeParse(body);

        if (!bodyParsed.success) {
          return new Response("Bad Request", { status: 400 });
        }

        if (Array.isArray(bodyParsed.data)) {
          const responses = await Promise.all(
            bodyParsed.data.map(async (req) => {
              try {
                return await this.request(req, event);
              } catch (error) {
                if (JsonRpcError.isJsonRpcError(error)) {
                  return error.toJsonRpcResponse(req.id ?? null);
                }
                console.error("Internal error processing request:", error);
                return new JsonRpcError(
                  -32603,
                  "Internal error",
                ).toJsonRpcResponse(req.id ?? null);
              }
            }),
          );
          return Response.json(responses);
        }

        try {
          const singleResponse = await this.request(bodyParsed.data, event);
          return Response.json(singleResponse);
        } catch (error) {
          if (JsonRpcError.isJsonRpcError(error)) {
            return Response.json(
              error.toJsonRpcResponse(bodyParsed.data.id ?? null),
            );
          }
          return Response.json(
            new JsonRpcError(-32603, "Internal error").toJsonRpcResponse(
              bodyParsed.data.id ?? null,
            ),
          );
        }
      },
    });

    return router.fetch(request);
  };

  /**
   * Router custom options configuration.
   * Provides integration with the HTTP router system.
   */
  // @ts-ignore
  [Router.customRoute] = defaultRouteArguments({
    method: "ALL",
    fetch: this.fetch,
  });

  static *getMethods(jsonRpcRouter: JsonRpcRouter) {
    for (const method of jsonRpcRouter.handlers.keys()) {
      const methodKey = method;
      const validations = jsonRpcRouter.paramsValidations.get(method);

      yield {
        method: methodKey,
        params: validations?.input,
        result: validations?.output,
      };
    }
  }
}
