import type { Fetch } from "./types/fetch-type.js";
import type { Middleware } from "./types/middleware.js";
import type { TestRoute } from "./types/test-route-type.js";

/**
 * Represents an HTTP route with associated test and fetch logic.
 *
 * @remarks
 * This class encapsulates the definition of a route, including a test function to determine if the route matches a request,
 * and a fetch function to handle the request and generate a response.
 *
 * @param test - A function or object that determines if a request matches this route.
 * @param fetch - A function that handles the request and returns a response.
 */
export class Route {
  constructor(
    public test: TestRoute,
    public middlewares: Middleware[],
    public fetch: Fetch,
  ) {}

  static true(fetch: Fetch) {
    return new Route(() => true, [], fetch);
  }
}
