import { URLPattern } from "urlpattern-polyfill";
import type { Fetch } from "../types/fetch-type.js";
import type { Middleware } from "../types/middleware.js";
import type { TestRoute } from "../types/test-route-type.js";
import { customOptionsSymbol } from "../constants/custom-options-symbol.js";

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
  [customOptionsSymbol]?: T;
} & T;

export type RouteArguments = {
  test?: TestRoute;
  method?: HTTPMethod;
  urlPattern?: string | URLPattern;
  fetch?: Fetch;
  middlewares?: Middleware[];
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
  ): value is { [customOptionsSymbol]: { fetch: Fetch } } =>
    isObject(value) &&
    withProperty(value, customOptionsSymbol) &&
    isObject(value[customOptionsSymbol]) &&
    withProperty(value[customOptionsSymbol], "fetch") &&
    isFunction(value[customOptionsSymbol].fetch);

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
  const { fetch, method, middlewares } =
    options[customOptionsSymbol] ?? options;

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
    options[customOptionsSymbol] ?? options;

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
  const { fetch, middlewares } = options[customOptionsSymbol] ?? options;
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
