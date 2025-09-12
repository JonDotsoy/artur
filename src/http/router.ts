import { decorate } from "@jondotsoy/decorate";
import { errorToResponse } from "../utils/describeErrorResponse.js";
import type { IncomingMessage } from "http";
import { customOptionsSymbol } from "./constants/custom-options-symbol.js";
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
