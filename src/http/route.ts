import { urlParamsSymbol } from "./constants/url-params-symbol.js";
import type { Fetch } from "./types/fetch-type.js";
import type { Middleware } from "./types/middleware.js";
import type { TestRoute } from "./types/test-route-type.js";
import type { URLParams } from "./types/url-params.js";
import type { RouteArguments } from "./utils/parse-route-arguments.js";
import { RequestReflect } from "./utils/request-reflect.js";
import { urlPatternFrom } from "./utils/url-pattern-from.js";

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
    const existsFetch = !!routeParameters.fetch;
    if (!existsFetch) return false;
    return true;
  }

  /**
   * Parses route parameters into a Route instance with appropriate test, middleware, and fetch functions.
   *
   * This method converts flexible route arguments into a standardized Route object. If no custom
   * test function is provided, it generates one based on the HTTP method and URL pattern.
   *
   * @param routeParameters - The route arguments to parse into a Route
   * @returns A new Route instance configured with the provided parameters
   * @throws {Error} When the route parameters cannot be parsed (use `canParse` to check first)
   *
   * @example
   * ```typescript
   * // Parse with custom test function
   * const customRoute = Route.parse({
   *   test: (req) => req.url.includes('/api'),
   *   fetch: async () => Response.json({ api: true }),
   *   middlewares: [corsMiddleware]
   * });
   *
   * // Parse with URL pattern and method (auto-generates test)
   * const patternRoute = Route.parse({
   *   method: 'POST',
   *   urlPattern: '/users/:id',
   *   fetch: async (req) => Response.json({ userId: req.params.id })
   * });
   *
   * // Parse minimal route (defaults to GET method)
   * const simpleRoute = Route.parse({
   *   urlPattern: '/health',
   *   fetch: async () => Response.json({ status: 'ok' })
   * });
   * ```
   *
   * @remarks
   * The parsing logic:
   * - Uses custom test function if provided
   * - Otherwise generates test from method (defaults to GET) and URL pattern
   * - Supports "ALL" method to match any HTTP method
   * - Extracts URL parameters and makes them available via RequestReflect
   * - Applies middlewares in the order specified
   */
  static parse(routeParameters: RouteArguments): Route {
    if (!Route.canParse(routeParameters)) {
      throw new Error("Cannot parse route parameters");
    }

    const test =
      routeParameters.test ??
      ((request: Request) => {
        const urlPattern = routeParameters.urlPattern
          ? urlPatternFrom(routeParameters.urlPattern)
          : null;
        const method = routeParameters.method;

        const methodExpected = method?.toUpperCase() ?? "GET";
        const isHttpMethodValid = (method: string, methodExpected: string) => {
          if (methodExpected === "ALL") return true;
          return method.toUpperCase() === methodExpected;
        };
        if (!isHttpMethodValid(request.method, methodExpected)) return false;
        if (urlPattern === null || urlPattern === undefined) return false;
        const m = (request: Request) => {
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
        if (!m(request)) return false;
        return true;
      });

    const fetch = routeParameters.fetch!;
    const middlewares = routeParameters.middlewares ?? [];

    return new Route(test, middlewares, fetch);
  }
}
