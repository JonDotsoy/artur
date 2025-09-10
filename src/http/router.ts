import { type Descriptor, decorate } from "@jondotsoy/decorate";
import { errorToResponse } from "../utils/describeErrorResponse.js";
import type { IncomingMessage } from "http";
import { customOptionsSymbol } from "./constants/custom-options-symbol.js";
import type { Fetch } from "./types/fetch-type.js";
import type { Middleware } from "./types/middleware.js";
import { Route } from "./route.js";
import {
  useRouteArguments,
  type RouteArguments,
} from "./utils/parse-route-arguments.js";
import { RequestReflect } from "./utils/request-reflect.js";
import type { URLParams } from "./types/url-params.js";
import { urlParamsSymbol } from "./constants/url-params-symbol.js";

/** @deprecated */
const mapRequestParamas = new WeakMap<
  Request,
  Record<string, string | undefined>
>();

type P<T> = T extends string
  ? Record<T, string>
  : Record<string, undefined | string>;

export const params = (request: Request) => {
  return RequestReflect.get<URLParams>(request, urlParamsSymbol) ?? {};
};

export type RequestWithParams<T> = Request & { ["[[[s]]]"]?: T };
export type LikePromise<T> = Promise<T> | T;

export type FetcherResponse = LikePromise<Response | null>;

export type MiddlewareWrapResponse = (response: Response) => Promise<Response>;

export type FetchDescriptor<T> = Descriptor<
  [request: Request],
  Promise<Response>
>;

export const defaultCatching = (ex: unknown) => {
  const { response, options } = errorToResponse(ex);

  const expose = options.expose ?? response.status >= 500;

  if (expose) {
    console.error(ex);
  }

  return response;
};

type ErrorHandler = (ex: unknown) => Promise<Response> | Response;

/** @deprecated */
type ReturnFetch<T> = T extends "pass"
  ? null | Response | Promise<Response>
  : T extends "default-catching"
    ? Response | Promise<Response>
    : T extends ErrorHandler
      ? Response | Promise<Response> | ReturnType<T> | Promise<ReturnType<T>>
      : FetcherResponse;

type ErrorHandling = "pass" | "default-catching" | ErrorHandler;

export type RouterOptions<E extends ErrorHandling> = {
  middlewares?: Middleware<any>[];
  errorHandling: E;
};

/** @deprecated */
const groupURLPatternComponentResult = (object: URLPatternComponentResult) => {
  const { 0: _, ...variables } = object.groups;
  return variables;
};

export class Router<E extends ErrorHandling = "default-catching"> {
  static customOptions = customOptionsSymbol;

  routes: Route[] = [];

  options: RouterOptions<E>;

  constructor(options?: Partial<RouterOptions<E>>) {
    this.options = {
      errorHandling: "default-catching" as E,
      ...options,
    };
  }

  /** @deprecated Use {@link route}() instead. */
  get use() {
    return this.route;
  }

  /**
   * Registers a new route with the router.
   *
   * This method accepts various argument patterns to define routes with different levels of specificity.
   * Routes are tested in the order they are registered, and the first matching route handles the request.
   *
   * @template T - Generic type parameter for the route
   * @param args - Variable arguments that can follow one of the following patterns:
   *
   * **Pattern 1:** `route(fetch)`
   * - Registers a route that matches all requests (`*` pattern)
   * - @param fetch - Function that handles the request and returns a Response
   * - Useful for global middleware or fallback handling
   *
   * **Pattern 2:** `route(urlPattern, fetch)`
   * - Registers a route with a specific URL pattern
   * - @param urlPattern - URLPattern instance or string pattern to match against request URLs
   * - @param fetch - Function that handles the request and returns a Response
   * - Supports URL parameters like `/users/:id` or wildcards like `/api/*`
   *
   * **Pattern 3:** `route(test, fetch)`
   * - Registers a route with custom test logic
   * - @param test - Function that determines if the route matches the request (can be async)
   * - @param fetch - Function that handles the request and returns a Response
   * - Allows complex matching logic based on headers, body, etc.
   *
   * **Pattern 4:** `route(method, urlPattern, fetch)`
   * - Registers a route with specific HTTP method and URL pattern
   * - @param method - HTTP method ("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD", "TRACE", "CONNECT", "ALL")
   * - @param urlPattern - String pattern to match against request URLs
   * - @param fetch - Function that handles the request and returns a Response
   * - Most common combination for REST APIs
   *
   * **Pattern 5:** `route(urlPattern, options)`
   * - Registers a route with URL pattern and configuration options
   * - @param urlPattern - String or URLPattern instance to match against request URLs
   * - @param options - Configuration object with optional method, middlewares array, and required fetch function
   * - Allows more granular configuration with route-specific middlewares
   *
   * **Pattern 6:** `route(fetch, options)`
   * - Registers a global route with configuration options
   * - @param fetch - Function that handles the request and returns a Response
   * - @param options - Object with optional method and middlewares
   *
   * **Pattern 7:** `route(method, urlPattern, options)`
   * - Registers a route with method, pattern, and options
   * - @param method - Specific HTTP method
   * - @param urlPattern - String or URLPattern for matching
   * - @param options - Object with fetch function and optional middlewares
   *
   * @returns The router instance for method chaining
   *
   * @example
   * ```typescript
   * // Match all requests (global middleware)
   * router.route(async (request) => {
   *   console.log(`${request.method} ${request.url}`);
   *   return new Response("Hello World");
   * });
   *
   * // Match specific URL pattern (GET by default)
   * router.route("/api/users", async (request) =>
   *   Response.json({ users: await getUsers() })
   * );
   *
   * // Match with HTTP method and URL parameters
   * router.route("GET", "/api/users/:id", async (request) => {
   *   const { id } = params(request);
   *   const user = await getUserById(id);
   *   return Response.json({ user });
   * });
   *
   * // Custom test function (e.g., authentication)
   * router.route(
   *   (request) => request.headers.get("authorization") !== null,
   *   async (request) => Response.json({ authenticated: true })
   * );
   *
   * // With middlewares and advanced configuration
   * router.route("/api/admin", {
   *   method: "POST",
   *   middlewares: [authMiddleware, logMiddleware, validateMiddleware],
   *   fetch: async (request) => {
   *     const body = await request.json();
   *     return Response.json({ created: await createAdminResource(body) });
   *   }
   * });
   *
   * // Multiple HTTP methods handling
   * router.route("PUT", "/api/users/:id", async (request) => {
   *   const { id } = params(request);
   *   const updates = await request.json();
   *   return Response.json({ user: await updateUser(id, updates) });
   * });
   *
   * // Wildcards and complex patterns
   * router.route("/static/*", async (request) => {
   *   const url = new URL(request.url);
   *   const filePath = url.pathname.replace("/static/", "");
   *   return serveStaticFile(filePath);
   * });
   *
   * // Route chaining
   * router
   *   .route("GET", "/health", () => Response.json({ status: "ok" }))
   *   .route("GET", "/version", () => Response.json({ version: "1.0.0" }))
   *   .route("*", () => new Response("Not Found", { status: 404 }));
   * ```
   *
   * @throws {ArgumentsError} When arguments don't match any valid pattern
   *
   * @see {@link RouteArguments} for detailed argument type definitions
   * @see {@link Route} for the internal route representation
   * @see {@link params} for extracting URL parameters in fetch functions
   * @see {@link Middleware} for middleware information
   *
   * @since 1.0.0
   */
  route<T>(...args: RouteArguments) {
    const route = useRouteArguments(...args);

    if (route) {
      this.routes.push(route);
    }

    return this;
  }

  fetch: Fetch = async (request: Request): Promise<Response> => {
    const middlewareDecorators: Middleware<any>[] = [
      ...(this.options.middlewares ?? []),
    ];

    try {
      for (const route of this.routes) {
        if (await route.test(request)) {
          middlewareDecorators.push(...route.middlewares);
          const fetch: Fetch = route.fetch;
          const fetchDecorate = decorate(fetch, ...middlewareDecorators);
          return await fetchDecorate(request);
        }
      }

      if (this.options.errorHandling === "pass") {
        throw new Error(
          'The "pass" error handler is deprecated and should not be used. Request was not handled.',
        );
      }

      return new Response(null, { status: 404 });
    } catch (ex) {
      if (typeof this.options.errorHandling === "function")
        return this.options.errorHandling(ex);

      if (this.options.errorHandling === "pass") {
        throw ex;
      }

      return defaultCatching(ex);
    }
  };

  requestListener = async (
    req: IncomingMessage,
    res: import("http").ServerResponse<import("http").IncomingMessage> & {
      req: import("http").IncomingMessage;
    },
  ) => {
    const toReadable = (req: IncomingMessage) => {
      const cleanupTasks = new Set<() => void>();
      const cleanup = () => {
        for (const cleanupTask of cleanupTasks) {
          cleanupTask();
          cleanupTasks.delete(cleanupTask);
        }
      };

      if (!req.method || ["GET", "HEAD"].includes(req.method)) return undefined;
      return new ReadableStream<Uint8Array>({
        start: (controller) => {
          const onData = (chunk: number[]) => {
            controller.enqueue(new Uint8Array(chunk));
          };
          const onClose = () => {
            controller.close();
            cleanup();
          };

          req.addListener("data", onData);
          req.addListener("close", onClose);

          cleanupTasks.add(() => {
            req.removeListener("data", onData);
            req.removeListener("close", onClose);
          });
        },
        cancel: (reason) => {
          cleanup();
        },
      });
    };
    const url = new URL(
      req.url ?? "/",
      new URL(`http://${req.headers.host ?? "localhost"}/`),
    ).toString();
    const method = req.method;
    const headers = new Headers();
    for (const [headerName, headerValue] of Object.entries(req.headers)) {
      if (typeof headerValue === "string") headers.set(headerName, headerValue);
      if (Array.isArray(headerValue))
        headerValue.forEach((headerValue) =>
          headers.append(headerName, headerValue),
        );
    }
    const request = new Request(url, {
      method,
      headers,
      body: toReadable(req),
      duplex: "half",
    });
    const response = await this.fetch(request);

    if (!(response instanceof Response)) return false;

    res.statusCode = response.status;
    res.statusMessage = response.statusText;
    for (const [key, value] of response.headers) {
      res.appendHeader(key, value);
    }
    if (response.body) {
      for await (const chunk of response.body) {
        res.write(chunk);
      }
    }
    res.end();

    return true;
    // console.log("🚀 ~ Router ~ requestListener ~ url:", url)
    // throw new Error("Method not implemented.");
  };

  [customOptionsSymbol] = {
    fetch: this.fetch,
  };
}
