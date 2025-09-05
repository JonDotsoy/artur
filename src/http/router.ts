import { type Descriptor, decorate } from "@jondotsoy/decorate";
import { errorToResponse } from "../utils/describeErrorResponse.js";
import type { IncomingMessage } from "http";
import { customOptionsSymbol } from "./constants/custom-options-symbol.js";
import type { Fetch } from "./types/fetch-type.js";
import type { Middleware } from "./types/middleware.js";
import { Route } from "./route.js";
import {
  useArgumentParser,
  type UseArguments,
} from "./utils/use-argument-parser.js";
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

  use<T>(...args: UseArguments) {
    const route = useArgumentParser(...args);

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
