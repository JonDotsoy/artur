import { URLPattern } from "urlpattern-polyfill";
import type { Fetch } from "../types/fetch-type.js";
import type { Middleware } from "../types/middleware.js";
import type { TestRoute } from "../types/test-route-type.js";

type HTTPMethod =
  "ALL" |
  "GET" |
  "POST" |
  "PUT" |
  "DELETE" |
  "PATCH" |
  "OPTIONS" |
  "HEAD" |
  "TRACE" |
  "CONNECT"

type RouteArgumentOptions<T> = T & { middlewares?: Middleware[] };

type RouteArguments = {
  test?: TestRoute,
  method?: HTTPMethod,
  urlPattern?: string | URLPattern,
  fetch?: Fetch
  middlewares?: Middleware[]
}

/**
 * Flexible function to parse HTTP route arguments in multiple formats.
 * Supports various argument combinations for defining routes with different levels of flexibility.
 * 
 * @example
 * ```typescript
 * // Method + URL pattern + handler
 * parseRouteArguments("GET", "/users", fetchHandler);
 * 
 * // URL pattern + handler (defaults to GET)
 * parseRouteArguments("/users", fetchHandler);
 * 
 * // Custom test function + handler
 * parseRouteArguments(customTestFn, fetchHandler);
 * 
 * // Options object with all properties
 * parseRouteArguments({ method: "POST", urlPattern: "/users", fetch: fetchHandler });
 * ```
 */
declare function defintionParseRouteArguments(): RouteArguments

/**
 * Parse route arguments with explicit method, URL pattern, and fetch handler.
 * 
 * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param urlPattern - URL pattern as string or URLPattern instance
 * @param fetch - Fetch handler function to process the request
 * @param options - Optional configuration with middlewares
 * @returns Parsed route arguments object
 * 
 * @example
 * ```typescript
 * parseRouteArguments("POST", "/api/users", async (req) => {
 *   return Response.json({ success: true });
 * }, { middlewares: [authMiddleware] });
 * ```
 */
declare function defintionParseRouteArguments(method: HTTPMethod, urlPattern: string | URLPattern, fetch: Fetch, options?: RouteArgumentOptions<{}>): RouteArguments

/**
 * Parse route arguments with URL pattern and fetch handler (method defaults to GET).
 * 
 * @param urlPattern - URL pattern as string or URLPattern instance
 * @param fetch - Fetch handler function to process the request
 * @param options - Optional configuration with method and/or middlewares
 * @returns Parsed route arguments object
 * 
 * @example
 * ```typescript
 * parseRouteArguments("/api/users", fetchHandler, { method: "POST" });
 * parseRouteArguments("/api/users", fetchHandler, { middlewares: [corsMiddleware] });
 * ```
 */
declare function defintionParseRouteArguments(urlPattern: string | URLPattern, fetch: Fetch, options?: RouteArgumentOptions<{ method?: HTTPMethod }>): RouteArguments

/**
 * Parse route arguments with custom test function and fetch handler.
 * Useful for complex routing logic that goes beyond simple URL patterns.
 * 
 * @param test - Custom test function to determine if route matches
 * @param fetch - Fetch handler function to process the request
 * @param options - Optional configuration with middlewares
 * @returns Parsed route arguments object
 * 
 * @example
 * ```typescript
 * const customTest = (req: Request) => req.headers.get('content-type') === 'application/json';
 * parseRouteArguments(customTest, fetchHandler, { middlewares: [jsonMiddleware] });
 * ```
 */
declare function defintionParseRouteArguments(test: TestRoute, fetch: Fetch, options?: RouteArgumentOptions<{}>): RouteArguments

/**
 * Parse route arguments with URL pattern and options object containing fetch handler.
 * 
 * @param urlPattern - URL pattern as string or URLPattern instance
 * @param options - Configuration object with required fetch and optional method/middlewares
 * @returns Parsed route arguments object
 * 
 * @example
 * ```typescript
 * parseRouteArguments("/api/users", {
 *   fetch: fetchHandler,
 *   method: "PUT",
 *   middlewares: [validateMiddleware]
 * });
 * ```
 */
declare function defintionParseRouteArguments(urlPattern: string | URLPattern, options: RouteArgumentOptions<{ fetch: Fetch, method?: HTTPMethod }>): RouteArguments

/**
 * Parse route arguments from a single options object containing all configuration.
 * Most flexible format allowing all route properties to be specified in one object.
 * 
 * @param options - Configuration object with fetch and optional urlPattern/method/middlewares
 * @returns Parsed route arguments object
 * 
 * @example
 * ```typescript
 * parseRouteArguments({
 *   urlPattern: "/api/users/:id",
 *   method: "DELETE",
 *   fetch: deleteUserHandler,
 *   middlewares: [authMiddleware, validateIdMiddleware]
 * });
 * ```
 */
declare function defintionParseRouteArguments(options: RouteArgumentOptions<{ urlPattern?: string | URLPattern, fetch: Fetch, method?: HTTPMethod }>): RouteArguments

namespace typeVerifier {
  export const isString = (value: unknown): value is string => typeof value === "string"
  export const isFunction = (value: unknown): value is Function => typeof value === "function"
  export const isArray = (value: unknown): value is unknown[] => Array.isArray(value)
  export const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !isArray(value) && !isFunction(value)
  export const isURLPattern = (value: unknown): value is string | URLPattern => value instanceof URLPattern || isString(value)
  export const isHTTPMethod = (value: unknown): value is HTTPMethod => isString(value) && ["ALL", "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD", "TRACE", "CONNECT"].includes(value)
  export const withProperty = <T, K extends PropertyKey>(obj: T, property: K): obj is T & Record<K, unknown> => isObject(obj) && property in obj
  export const isRouteArgumentsV0 = (value: unknown): value is [] => isArray(value) && value.length === 0
  export const isRouteArgumentsV1 = (value: unknown): value is [method: HTTPMethod, urlPattern: string | URLPattern, fetch: Fetch, options?: RouteArgumentOptions<{}>] =>
    isArray(value) &&
    isHTTPMethod(value[0]) &&
    isURLPattern(value[1]) &&
    isFunction(value[2])
  export const isRouteArgumentsV2 = (value: unknown): value is [urlPattern: string | URLPattern, fetch: Fetch, options?: RouteArgumentOptions<{ method?: HTTPMethod }>] =>
    isArray(value) &&
    isURLPattern(value[0]) &&
    isFunction(value[1])
  export const isRouteArgumentsV3 = (value: unknown): value is [test: TestRoute, fetch: Fetch, options?: RouteArgumentOptions<{}>] =>
    isArray(value) &&
    isFunction(value[0]) &&
    isFunction(value[1])
  export const isRouteArgumentsV4 = (value: unknown): value is [urlPattern: string | URLPattern, options: RouteArgumentOptions<{ fetch: Fetch, method?: HTTPMethod }>] =>
    isArray(value) &&
    isURLPattern(value[0]) &&
    isObject(value[1]) &&
    withProperty(value[1], "fetch") &&
    isFunction(value[1].fetch)
  export const isRouteArgumentsV5 = (value: unknown): value is [options: RouteArgumentOptions<{ urlPattern?: string | URLPattern, fetch: Fetch, method?: HTTPMethod }>] =>
    isArray(value) &&
    isObject(value[0]) &&
    withProperty(value[0], "fetch") &&
    isFunction(value[0].fetch)
}

const parseRouteArgumentsV1 = (method: HTTPMethod, urlPattern: string | URLPattern, fetch: Fetch, options?: RouteArgumentOptions<{}>): RouteArguments => ({ method, urlPattern, fetch, middlewares: options?.middlewares })
const parseRouteArgumentsV2 = (urlPattern: string | URLPattern, fetch: Fetch, options?: RouteArgumentOptions<{ method?: HTTPMethod }>): RouteArguments => ({ urlPattern, fetch, method: options?.method, middlewares: options?.middlewares })
const parseRouteArgumentsV3 = (test: TestRoute, fetch: Fetch, options?: RouteArgumentOptions<{}>): RouteArguments => ({ test, fetch, middlewares: options?.middlewares })
const parseRouteArgumentsV4 = (urlPattern: string | URLPattern, options: RouteArgumentOptions<{ fetch: Fetch, method?: HTTPMethod }>): RouteArguments => ({ urlPattern, fetch: options.fetch, method: options.method, middlewares: options.middlewares })
const parseRouteArgumentsV5 = (options: RouteArgumentOptions<{ urlPattern?: string | URLPattern, fetch: Fetch, method?: HTTPMethod }>): RouteArguments => ({ urlPattern: options.urlPattern, fetch: options.fetch, method: options.method, middlewares: options.middlewares })

export const parseRouteArguments: typeof defintionParseRouteArguments = (...args: unknown[]): RouteArguments => {
  if (typeVerifier.isRouteArgumentsV0(args)) return {};
  if (typeVerifier.isRouteArgumentsV1(args)) return parseRouteArgumentsV1(...args)
  if (typeVerifier.isRouteArgumentsV2(args)) return parseRouteArgumentsV2(...args)
  if (typeVerifier.isRouteArgumentsV3(args)) return parseRouteArgumentsV3(...args)
  if (typeVerifier.isRouteArgumentsV4(args)) return parseRouteArgumentsV4(...args)
  if (typeVerifier.isRouteArgumentsV5(args)) return parseRouteArgumentsV5(...args)
  throw new TypeError("Invalid route arguments. Please refer to the documentation for the correct usage.");
}
