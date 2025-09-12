import { URLPattern } from "urlpattern-polyfill";
import type { Fetch } from "../types/fetch-type.js";
import type { Middleware } from "../types/middleware.js";
import type { TestRoute } from "../types/test-route-type.js";
import { customRouteSymbol } from "../constants/custom-options-symbol.js";

type HTTPMethod =
  | "ALL"
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD"
  | "TRACE"
  | "CONNECT";

type RouteArgumentOptions<T> = T & { middlewares?: Middleware[] };
type HiddenOptions<T> = {
  [customRouteSymbol]?: T;
} & T;

/**
 * Configuration object that defines the parameters for creating HTTP routes.
 * This type represents the normalized structure of route arguments after parsing
 * various input formats through the `parseRouteArguments` function.
 *
 * @example
 * ```typescript
 * // Example with URL pattern and HTTP method
 * const args: RouteArguments = {
 *   method: "POST",
 *   urlPattern: "/api/users/:id",
 *   fetch: async (req) => new Response("Hello"),
 *   middlewares: [authMiddleware, loggingMiddleware]
 * };
 *
 * // Example with custom test function
 * const customArgs: RouteArguments = {
 *   test: (req) => req.headers.get('content-type') === 'application/json',
 *   fetch: async (req) => new Response("JSON endpoint"),
 *   middlewares: [jsonValidationMiddleware]
 * };
 * ```
 */
export type RouteArguments = {
  /**
   * Custom test function to determine if a route matches an incoming request.
   * When provided, this takes precedence over `urlPattern` and `method` for route matching.
   * The function receives a Request object and should return a boolean indicating
   * whether this route should handle the request.
   *
   * @param request - The incoming HTTP request to test
   * @returns True if this route should handle the request, false otherwise
   *
   * @example
   * ```typescript
   * const jsonOnlyTest: TestRoute = (req) =>
   *   req.headers.get('content-type')?.includes('application/json') ?? false;
   * ```
   */
  test?: TestRoute;

  /**
   * The HTTP method that this route should respond to.
   * If not specified, the route will typically default to handling GET requests.
   * Use "ALL" to match any HTTP method.
   *
   * @example
   * ```typescript
   * method: "POST"     // Only handle POST requests
   * method: "GET"      // Only handle GET requests
   * method: "ALL"      // Handle any HTTP method
   * ```
   */
  method?: HTTPMethod;

  /**
   * URL pattern for matching incoming requests. Can be either a string pattern
   * or a URLPattern instance for more advanced pattern matching.
   *
   * String patterns support parameter placeholders (e.g., `:id`, `:userId`)
   * and wildcard matching. URLPattern instances provide more sophisticated
   * matching capabilities including regex patterns.
   *
   * @example
   * ```typescript
   * urlPattern: "/api/users/:id"           // String with parameter
   * urlPattern: "/api/users/*"             // String with wildcard
   * urlPattern: new URLPattern({           // URLPattern instance
   *   pathname: "/api/users/:id(\\d+)"
   * })
   * ```
   */
  urlPattern?: string | URLPattern;

  /**
   * The fetch handler function that processes matching requests.
   * This function receives the matched request and should return a Response
   * or a Promise that resolves to a Response.
   *
   * The handler has access to URL parameters, query strings, and request body
   * through the Request object and any middleware-provided context.
   *
   * @param request - The HTTP request to handle
   * @returns A Response object or Promise resolving to a Response
   *
   * @example
   * ```typescript
   * fetch: async (req) => {
   *   const body = await req.json();
   *   return new Response(JSON.stringify({ success: true }), {
   *     headers: { 'Content-Type': 'application/json' }
   *   });
   * }
   * ```
   */
  fetch?: Fetch;

  /**
   * Array of middleware functions to be executed before the main fetch handler.
   * Middlewares are executed in the order they appear in the array and can:
   * - Modify the request
   * - Add authentication/authorization
   * - Perform logging
   * - Handle CORS
   * - Validate input
   * - Short-circuit the request by returning early
   *
   * Each middleware receives the request and can either pass it to the next
   * middleware/handler or return a response to end the chain.
   *
   * @example
   * ```typescript
   * middlewares: [
   *   authMiddleware,        // Check authentication
   *   corsMiddleware,        // Handle CORS headers
   *   validationMiddleware   // Validate request data
   * ]
   * ```
   */
  middlewares?: Middleware[];
};

/**
 * Creates a default RouteArguments object from a partial configuration.
 * This function serves as a type-safe way to ensure that route arguments
 * conform to the expected RouteArguments structure.
 *
 * The function accepts two different configuration patterns:
 * 1. Routes with custom test functions (test-based routing)
 * 2. Routes with HTTP method and URL pattern (traditional routing)
 *
 * @param routeArguments - Partial route configuration that must include either:
 *   - `test`, `fetch`, and optionally `middlewares` for custom test-based routes
 *   - `method`, `urlPattern`, `fetch`, and optionally `middlewares` for traditional routes
 *
 * @returns A complete RouteArguments object that can be used by the routing system
 *
 * @example
 * ```typescript
 * // Test-based route configuration
 * const customRoute = defaultRouteArguments({
 *   test: (req) => req.headers.get('content-type') === 'application/json',
 *   fetch: async (req) => new Response('JSON endpoint'),
 *   middlewares: [jsonValidationMiddleware]
 * });
 *
 * // Traditional route configuration
 * const standardRoute = defaultRouteArguments({
 *   method: 'POST',
 *   urlPattern: '/api/users/:id',
 *   fetch: async (req) => new Response('User created'),
 *   middlewares: [authMiddleware, validationMiddleware]
 * });
 * ```
 *
 * @remarks
 * This function currently acts as a pass-through identity function,
 * but provides type safety and a consistent API for creating route arguments.
 * It ensures that the provided configuration matches one of the expected patterns
 * and can be extended in the future to provide default values or validation.
 */
export const defaultRouteArguments = (
  routeArguments:
    | Pick<RouteArguments, "test" | "fetch" | "middlewares">
    | Pick<RouteArguments, "method" | "urlPattern" | "fetch" | "middlewares">,
) => {
  return routeArguments;
};

namespace typeVerifier {
  export const isString = (value: unknown): value is string =>
    typeof value === "string";
  export const isFunction = (value: unknown): value is Function =>
    typeof value === "function";
  export const isArray = (value: unknown): value is unknown[] =>
    Array.isArray(value);
  export const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" &&
    value !== null &&
    !isArray(value) &&
    !isFunction(value);
  export const isURLPattern = (value: unknown): value is string | URLPattern =>
    value instanceof URLPattern || isString(value);
  export const isHTTPMethod = (value: unknown): value is HTTPMethod =>
    isString(value) &&
    [
      "ALL",
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
      "HEAD",
      "TRACE",
      "CONNECT",
    ].includes(value);
  export const withProperty = <T, K extends PropertyKey>(
    obj: T,
    property: K,
  ): obj is T & Record<K, unknown> => isObject(obj) && property in obj;

  export const isFetchOptions = (value: unknown): value is { fetch: Fetch } =>
    isObject(value) && withProperty(value, "fetch") && isFunction(value.fetch);

  export const isHiddenFetchOptions = (
    value: unknown,
  ): value is { [customRouteSymbol]: { fetch: Fetch } } =>
    isObject(value) &&
    withProperty(value, customRouteSymbol) &&
    isObject(value[customRouteSymbol]) &&
    withProperty(value[customRouteSymbol], "fetch") &&
    isFunction(value[customRouteSymbol].fetch);

  export const isRouteArgumentsV0 = (value: unknown): value is [] =>
    isArray(value) && value.length === 0;
  export const isRouteArgumentsV1 = (
    value: unknown,
  ): value is [
    method: HTTPMethod,
    urlPattern: string | URLPattern,
    fetch: Fetch,
    options?: RouteArgumentOptions<{}>,
  ] =>
    isArray(value) &&
    isHTTPMethod(value[0]) &&
    isURLPattern(value[1]) &&
    isFunction(value[2]);
  export const isRouteArgumentsV2 = (
    value: unknown,
  ): value is [
    urlPattern: string | URLPattern,
    fetch: Fetch,
    options?: RouteArgumentOptions<{ method?: HTTPMethod }>,
  ] => isArray(value) && isURLPattern(value[0]) && isFunction(value[1]);
  export const isRouteArgumentsV3 = (
    value: unknown,
  ): value is [
    test: TestRoute,
    fetch: Fetch,
    options?: RouteArgumentOptions<{}>,
  ] => isArray(value) && isFunction(value[0]) && isFunction(value[1]);
  export const isRouteArgumentsV4 = (
    value: unknown,
  ): value is [
    urlPattern: string | URLPattern,
    options: HiddenOptions<
      RouteArgumentOptions<{ fetch: Fetch; method?: HTTPMethod }>
    >,
  ] =>
    isArray(value) &&
    isURLPattern(value[0]) &&
    (isFetchOptions(value[1]) || isHiddenFetchOptions(value[1]));
  export const isRouteArgumentsV5 = (
    value: unknown,
  ): value is [
    options: HiddenOptions<
      RouteArgumentOptions<{
        urlPattern?: string | URLPattern;
        fetch: Fetch;
        method?: HTTPMethod;
      }>
    >,
  ] =>
    isArray(value) &&
    (isFetchOptions(value[0]) || isHiddenFetchOptions(value[0]));
  export const isRouteArgumentsV6 = (
    value: unknown,
  ): value is [
    method: HTTPMethod,
    urlPattern: string | URLPattern,
    options: HiddenOptions<RouteArgumentOptions<{ fetch: Fetch }>>,
  ] =>
    isArray(value) &&
    isHTTPMethod(value[0]) &&
    isURLPattern(value[1]) &&
    (isFetchOptions(value[2]) || isHiddenFetchOptions(value[2]));
}

const parseRouteArgumentsV1 = (
  method: HTTPMethod,
  urlPattern: string | URLPattern,
  fetch: Fetch,
  options?: RouteArgumentOptions<{}>,
): RouteArguments => ({
  method,
  urlPattern,
  fetch,
  middlewares: options?.middlewares,
});
const parseRouteArgumentsV2 = (
  urlPattern: string | URLPattern,
  fetch: Fetch,
  options?: RouteArgumentOptions<{ method?: HTTPMethod }>,
): RouteArguments => ({
  urlPattern,
  fetch,
  method: options?.method,
  middlewares: options?.middlewares,
});
const parseRouteArgumentsV3 = (
  test: TestRoute,
  fetch: Fetch,
  options?: RouteArgumentOptions<{}>,
): RouteArguments => ({ test, fetch, middlewares: options?.middlewares });
const parseRouteArgumentsV4 = (
  urlPattern: string | URLPattern,
  options: HiddenOptions<
    RouteArgumentOptions<{ fetch: Fetch; method?: HTTPMethod }>
  >,
): RouteArguments => {
  const { fetch, method, middlewares } = options[customRouteSymbol] ?? options;

  return {
    urlPattern,
    fetch: fetch,
    method: method,
    middlewares: middlewares,
  };
};
const parseRouteArgumentsV5 = (
  options: HiddenOptions<
    RouteArgumentOptions<{
      urlPattern?: string | URLPattern;
      fetch: Fetch;
      method?: HTTPMethod;
    }>
  >,
): RouteArguments => {
  const { urlPattern, fetch, method, middlewares } =
    options[customRouteSymbol] ?? options;

  return {
    urlPattern,
    fetch,
    method,
    middlewares,
  };
};
const parseRouteArgumentsV6 = (
  method: HTTPMethod,
  urlPattern: string | URLPattern,
  options: HiddenOptions<RouteArgumentOptions<{ fetch: Fetch }>>,
): RouteArguments => {
  const { fetch, middlewares } = options[customRouteSymbol] ?? options;
  return {
    method,
    urlPattern,
    fetch,
    middlewares,
  };
};

export const parseRouteArguments = (...args: unknown[]): RouteArguments => {
  if (typeVerifier.isRouteArgumentsV0(args)) return {};
  if (typeVerifier.isRouteArgumentsV1(args))
    return parseRouteArgumentsV1(...args);
  if (typeVerifier.isRouteArgumentsV2(args))
    return parseRouteArgumentsV2(...args);
  if (typeVerifier.isRouteArgumentsV3(args))
    return parseRouteArgumentsV3(...args);
  if (typeVerifier.isRouteArgumentsV4(args))
    return parseRouteArgumentsV4(...args);
  if (typeVerifier.isRouteArgumentsV5(args))
    return parseRouteArgumentsV5(...args);
  if (typeVerifier.isRouteArgumentsV6(args))
    return parseRouteArgumentsV6(...args);
  throw new TypeError(
    "Invalid route arguments. Please refer to the documentation for the correct usage.",
  );
};

/**
 * Generic route interface that defines multiple overloaded function signatures
 * for creating HTTP routes with different argument patterns.
 *
 * This interface provides flexibility in how routes can be defined, supporting
 * various combinations of method, URL pattern, fetch handler, and options.
 *
 * @template T - The return type of the route function
 *
 * @example
 * ```typescript
 * // Using with explicit method, URL pattern, and handler
 * const route1: route<void> = (method, urlPattern, fetch, options) => {
 *   // Implementation
 * };
 *
 * // Using with URL pattern and handler (method defaults to GET)
 * const route2: route<void> = (urlPattern, fetch, options) => {
 *   // Implementation
 * };
 * ```
 */
export interface route<T> {
  /**
   * Creates a route with explicit HTTP method, URL pattern, and fetch handler.
   *
   * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param urlPattern - URL pattern as string or URLPattern instance for matching requests
   * @param fetch - Fetch handler function to process matching requests
   * @param options - Optional configuration object with middlewares
   * @returns The configured route of type T
   *
   * @example
   * ```typescript
   * route("POST", "/api/users", async (req) => {
   *   return Response.json({ success: true });
   * }, { middlewares: [authMiddleware] });
   * ```
   */
  (
    method: HTTPMethod,
    urlPattern: string | URLPattern,
    fetch: Fetch,
    options?: RouteArgumentOptions<{}>,
  ): T;

  /**
   * Creates a route with explicit HTTP method, URL pattern, and options object containing the fetch handler.
   *
   * @param method - HTTP method (GET, POST, PUT, DELETE, etc.)
   * @param urlPattern - URL pattern as string or URLPattern instance for matching requests
   * @param options - Configuration object with required fetch handler and optional middlewares
   * @returns The configured route of type T
   *
   * @example
   * ```typescript
   * route("POST", "/api/users", {
   *   fetch: async (req) => Response.json({ success: true }),
   *   middlewares: [authMiddleware]
   * });
   * ```
   */
  (
    method: HTTPMethod,
    urlPattern: string | URLPattern,
    options: RouteArgumentOptions<{ fetch: Fetch }>,
  ): T;

  /**
   * Creates a route with URL pattern and fetch handler (HTTP method defaults to GET).
   *
   * @param urlPattern - URL pattern as string or URLPattern instance for matching requests
   * @param fetch - Fetch handler function to process matching requests
   * @param options - Optional configuration object with method override and/or middlewares
   * @returns The configured route of type T
   *
   * @example
   * ```typescript
   * route("/api/users", fetchHandler, { method: "POST" });
   * route("/api/users", fetchHandler, { middlewares: [corsMiddleware] });
   * ```
   */
  (
    urlPattern: string | URLPattern,
    fetch: Fetch,
    options?: RouteArgumentOptions<{ method?: HTTPMethod }>,
  ): T;

  /**
   * Creates a route with a custom test function and fetch handler.
   * Useful for complex routing logic that goes beyond simple URL patterns.
   *
   * @param test - Custom test function to determine if the route matches a request
   * @param fetch - Fetch handler function to process matching requests
   * @param options - Optional configuration object with middlewares
   * @returns The configured route of type T
   *
   * @example
   * ```typescript
   * const customTest = (req: Request) => req.headers.get('content-type') === 'application/json';
   * route(customTest, fetchHandler, { middlewares: [jsonMiddleware] });
   * ```
   */
  (test: TestRoute, fetch: Fetch, options?: RouteArgumentOptions<{}>): T;

  /**
   * Creates a route with URL pattern and options object containing the fetch handler.
   *
   * @param urlPattern - URL pattern as string or URLPattern instance for matching requests
   * @param options - Configuration object with required fetch handler and optional method/middlewares
   * @returns The configured route of type T
   *
   * @example
   * ```typescript
   * route("/api/users", {
   *   fetch: fetchHandler,
   *   method: "PUT",
   *   middlewares: [validateMiddleware]
   * });
   * ```
   */
  (
    urlPattern: string | URLPattern,
    options: RouteArgumentOptions<{ fetch: Fetch; method?: HTTPMethod }>,
  ): T;

  /**
   * Creates a route from a single options object containing all configuration.
   * Most flexible format allowing all route properties to be specified in one object.
   *
   * @param options - Configuration object with required fetch handler and optional urlPattern/method/middlewares
   * @returns The configured route of type T
   *
   * @example
   * ```typescript
   * route({
   *   urlPattern: "/api/users/:id",
   *   method: "DELETE",
   *   fetch: deleteUserHandler,
   *   middlewares: [authMiddleware, validateIdMiddleware]
   * });
   * ```
   */
  (
    options: RouteArgumentOptions<{
      urlPattern?: string | URLPattern;
      fetch: Fetch;
      method?: HTTPMethod;
    }>,
  ): T;
}
