import { urlParamsSymbol } from "./constants/url-params-symbol.js";
import type { Fetch } from "./types/fetch-type.js";
import type { Middleware } from "./types/middleware.js";
import type { TestRoute } from "./types/test-route-type.js";
import type { URLParams } from "./types/url-params.js";
import type { RouteArguments } from "./utils/parse-route-arguments.js";
import { RequestReflect } from "./utils/request-reflect.js";
import { urlPatternFrom } from "./utils/url-pattern-from.js";

const urlPatternMatch = (urlPattern: URLPattern, request: Request) => {
  const urlPatternResult = urlPattern.exec(request.url);
  if (urlPatternResult === null) return false;
  const groupParams: URLParams = {
    ...RequestReflect.get<URLParams>(request, urlParamsSymbol),
    ...urlPatternResult.protocol.groups,
    ...urlPatternResult.username.groups,
    ...urlPatternResult.password.groups,
    ...urlPatternResult.hostname.groups,
    ...urlPatternResult.hash.groups,
    ...urlPatternResult.pathname.groups,
    0: undefined,
  };
  RequestReflect.set(request, urlParamsSymbol, groupParams);
  return true;
};

const assetHTTPMethod = (method: string, methodExpected: string) => {
  if (methodExpected === "ALL") return true;
  return method.toUpperCase() === methodExpected;
};

/**
 * Represents an HTTP route with associated test and fetch logic.
 *
 * @remarks
 * This class encapsulates the definition of a route, including a test function to determine if the route matches a request,
 * middleware functions to process the request/response, and a fetch function to handle the request and generate a response.
 *
 * @example
 * ```typescript
 * // Create a simple route that always matches
 * const route = Route.true(async (request) => Response.json({ hello: "world" }));
 *
 * // Create a route with custom test logic
 * const route = new Route(
 *   (request) => request.url.includes("/api"),
 *   [authMiddleware],
 *   async (request) => Response.json({ authenticated: true })
 * );
 * ```
 *
 * @param test - A function that determines if a request matches this route.
 * @param middlewares - Array of middleware functions to process the request/response.
 * @param fetch - A function that handles the request and returns a response.
 */
export class Route {
  constructor(
    public test: TestRoute,
    public middlewares: Middleware[],
    public fetch: Fetch,
  ) {}

  /**
   * Creates a route that always matches any request.
   *
   * @param fetch - The fetch function to handle requests
   * @returns A new Route instance that matches all requests
   */
  static true(fetch: Fetch) {
    return new Route(() => true, [], fetch);
  }

  /**
   * Determines whether the given route parameters can be parsed into a valid Route instance.
   *
   * This method validates that the route parameters contain the minimum required information
   * to create a functional route. At minimum, a fetch function must be present to handle requests.
   *
   * @param routeParameters - The route arguments to validate for parsing compatibility
   * @returns `true` if the parameters can be successfully parsed into a Route, `false` otherwise
   *
   * @example
   * ```typescript
   * // Valid parameters - has required fetch function
   * const validParams = {
   *   method: 'GET',
   *   urlPattern: '/api/users',
   *   fetch: async (req) => Response.json({ users: [] })
   * };
   * Route.canParse(validParams); // returns true
   *
   * // Invalid parameters - missing fetch function
   * const invalidParams = {
   *   method: 'POST',
   *   urlPattern: '/api/users'
   * };
   * Route.canParse(invalidParams); // returns false
   *
   * // Valid with minimal configuration
   * const minimalParams = {
   *   fetch: async () => new Response('OK')
   * };
   * Route.canParse(minimalParams); // returns true
   * ```
   *
   * @remarks
   * The validation ensures that:
   * - A fetch function is present (required for handling requests)
   * - Other parameters like method, urlPattern, test, and middlewares are optional
   * - The method should be called before `Route.parse()` to avoid parsing errors
   *
   * @see {@link Route.parse} - For actually parsing the validated parameters
   */
  static canParse(routeParameters: RouteArguments): boolean {
    const existsFetch =
      !!routeParameters.fetch && typeof routeParameters.fetch === "function";
    if (!existsFetch) return false;
    return true;
  }

  /**
   * Parses route parameters and creates a new Route instance.
   *
   * This method validates the provided route parameters and constructs a Route object
   * with appropriate test functions, middlewares, and fetch handler. It builds assertion
   * functions for HTTP method validation, URL pattern matching, and custom test logic.
   *
   * @param routeParameters - The route configuration object containing method, URL pattern,
   *                         test function, fetch handler, and optional middlewares
   * @returns A new Route instance configured with the parsed parameters
   * @throws {Error} Throws an error if the route parameters cannot be parsed
   *
   * @example
   * ```typescript
   * const route = Route.parse({
   *   method: 'GET',
   *   urlPattern: '/api/users/:id',
   *   fetch: (request) => new Response('Hello')
   * });
   * ```
   */
  static parse(routeParameters: RouteArguments): Route {
    if (!Route.canParse(routeParameters)) {
      throw new Error("Cannot parse route parameters");
    }

    const asserts: ((request: Request) => boolean | Promise<boolean>)[] = [];

    if (routeParameters.method) {
      asserts.push((request: Request) =>
        assetHTTPMethod(request.method, routeParameters.method!),
      );
    }

    if (routeParameters.urlPattern) {
      const urlPattern = urlPatternFrom(routeParameters.urlPattern);
      asserts.push((request: Request) => urlPatternMatch(urlPattern, request));
    }

    const t = routeParameters.test;

    if (t) {
      asserts.push((request) => t(request));
    }

    const test = async (request: Request) => {
      for (const assert of asserts) {
        const result = await assert(request);
        if (!result) return false;
      }
      return true;
    };

    const fetch = routeParameters.fetch!;
    const middlewares = routeParameters.middlewares ?? [];

    return new Route(test, middlewares, fetch);
  }
}
