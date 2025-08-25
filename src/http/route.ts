import type { Fetch } from "./types/fetch-type.js";
import type { Middleware } from "./types/middleware.js";
import type { TestRoute } from "./types/test-route-type.js";

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
}
