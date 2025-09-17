import { decorate } from "@jondotsoy/decorate";
import { errorToResponse } from "../utils/describeErrorResponse.js";
import type { IncomingMessage } from "http";
import { customRouteSymbol } from "./constants/custom-options-symbol.js";
import type { Fetch } from "./types/fetch-type.js";
import type { Middleware } from "./types/middleware.js";
import { Route } from "./route.js";
import {
  parseRouteArguments,
  type route,
} from "./utils/parse-route-arguments.js";
import { RequestReflect } from "./utils/request-reflect.js";
import type { URLParams } from "./types/url-params.js";
import { urlParamsSymbol } from "./constants/url-params-symbol.js";
import { requestFromIncomingMessage } from "./utils/request-from-incoming-message.js";

export const params = (request: Request) => {
  return RequestReflect.get<URLParams>(request, urlParamsSymbol) ?? {};
};

export const defaultCatching = (ex: unknown) => {
  const { response, options } = errorToResponse(ex);

  const expose = options.expose ?? response.status >= 500;

  if (expose) {
    console.error(ex);
  }

  return response;
};

type ErrorHandler = (ex: unknown) => Promise<Response> | Response;

type ErrorHandling = "pass" | "default-catching" | ErrorHandler;

export type RouterOptions<E extends ErrorHandling> = {
  middlewares?: Middleware<any>[];
  errorHandling: E;
};

export class Router<E extends ErrorHandling = "default-catching"> {
  static customRoute = customRouteSymbol;

  /** @deprecated Use Router.customRoute instead */
  static customOptions = customRouteSymbol;
  /** @deprecated Use Router.customRoute instead */
  static deprecated_customOptions = customRouteSymbol;

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

  route: route<this> = (...args: any[]): this => {
    const routeArguments = parseRouteArguments(...args);

    if (Route.canParse(routeArguments)) {
      const route = Route.parse(routeArguments);
      this.routes.push(route);
    }

    return this;
  };

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

  /**
   * HTTP request listener that processes incoming requests and sends responses.
   *
   * This method serves as a bridge between Node.js HTTP server and the fetch-based
   * request handling system. It converts the incoming Node.js request to a standard
   * Request object, processes it through the fetch method, and streams the response
   * back to the client.
   *
   * @param req - The incoming HTTP request from Node.js server
   * @param res - The HTTP response object used to send data back to the client
   * @returns Promise that resolves when the response has been fully sent
   *
   * @example
   * ```typescript
   * const server = http.createServer(router.requestListener);
   * server.listen(3000);
   * ```
   */
  requestListener = async (
    req: IncomingMessage,
    res: import("http").ServerResponse<import("http").IncomingMessage> & {
      req: import("http").IncomingMessage;
    },
  ) => {
    const request = requestFromIncomingMessage(req);

    const response = await this.fetch(request);

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
  };

  [customRouteSymbol] = {
    fetch: this.fetch,
  };
}
