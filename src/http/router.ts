import { URLPattern } from "urlpattern-polyfill";
import { type Decorator, type Descriptor, decorate } from "@jondotsoy/decorate";
import { errorToResponse } from "../utils/describeErrorResponse";

type HTTPMethods =
  | "GET"
  | "POST"
  | "PUT"
  | "HEAD"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "CONNECT"
  | "TRACE";

const mapRequestParamas = new WeakMap<
  Request,
  Record<string, string | undefined>
>();

type P<T> = T extends string
  ? Record<T, string>
  : Record<string, undefined | string>;

export const params = <T>(request: RequestWithParams<T>): P<T> => {
  const paramsFound = mapRequestParamas.get(request);

  if (!paramsFound) throw new Error(`Missing params`);

  return paramsFound as P<T>;
};

export type RequestWithParams<T> = Request & { ["[[[s]]]"]?: T };
export type LikePromise<T> = Promise<T> | T;

export type FetcherResponse = LikePromise<Response | null>;

export type MiddlewareWrapResponse = (
  response: Response,
) => LikePromise<Response>;

export type FetchDescriptor<T> = Descriptor<
  [request: RequestWithParams<T>],
  FetcherResponse
>;

export type Middleware<T> = Decorator<FetchDescriptor<T>>;

export type Route<T> = {
  method: "ALL" | HTTPMethods;
  urlPattern: URLPattern;
  options?: {
    /** The test function */
    test?: (request: Request) => Promise<boolean> | boolean;
    middlewares?: Middleware<T>[];
    fetch?: (request: RequestWithParams<T>) => FetcherResponse;
  };
};

export const defaultCatching = (ex: unknown) => {
  const { response, options } = errorToResponse(ex);

  const expose = options.expose ?? response.status >= 500;

  if (expose) {
    console.error(ex);
  }

  return response;
};

export type RouterOptions = {
  middlewares?: Middleware<any>[];
  errorHandling:
    | "pass"
    | "default-catching"
    | ((ex: unknown) => Promise<Response>);
};

const groupURLPatternComponentResult = (object: URLPatternComponentResult) => {
  const { 0: _, ...variables } = object.groups;
  return variables;
};

const urlPatternFrom = (value: unknown): URLPattern => {
  if (typeof value === "string") return new URLPattern({ pathname: value });
  if (value instanceof URLPattern) return value;
  throw new Error(`Cannot parse URL Pattern to ${value}`);
};

export class Router {
  routes: Route<any>[] = [];

  options: RouterOptions;

  constructor(options?: Partial<RouterOptions>) {
    this.options = {
      errorHandling: "default-catching",
      ...options,
    };
  }

  use<T>(
    method: Route<T>["method"],
    urlPatternOrPathPattern: Route<T>["urlPattern"] | string,
    options?: Route<T>["options"],
  ) {
    this.routes.push({
      method,
      urlPattern: urlPatternFrom(urlPatternOrPathPattern),
      options,
    });

    return this;
  }

  fetch = async (request: Request) => {
    const middlewareDecorators: Middleware<any>[] = [
      ...(this.options.middlewares ?? []),
    ];

    try {
      for (const route of this.routes) {
        let urlPatternResult: URLPatternResult | null;
        const matchMethod =
          route.method === "ALL" || route.method === request.method;

        const extraTestValidation =
          (await route.options?.test?.(request)) ?? true;
        if (
          matchMethod &&
          (urlPatternResult = route.urlPattern.exec(request.url)) &&
          extraTestValidation
        ) {
          mapRequestParamas.set(request, {
            ...groupURLPatternComponentResult(urlPatternResult.protocol),
            ...groupURLPatternComponentResult(urlPatternResult.username),
            ...groupURLPatternComponentResult(urlPatternResult.password),
            ...groupURLPatternComponentResult(urlPatternResult.hostname),
            ...groupURLPatternComponentResult(urlPatternResult.hash),
            ...groupURLPatternComponentResult(urlPatternResult.pathname),
          });

          if (route.options?.middlewares) {
            middlewareDecorators.push(...route.options.middlewares);
          }

          if (route.options?.fetch) {
            const f: FetchDescriptor<any> = route.options.fetch;
            const fetchDecorate = decorate(f, ...middlewareDecorators);
            return await fetchDecorate(request);
          }
        }
      }

      if (this.options.errorHandling === "pass") return null;

      return new Response(null, { status: 404 });
    } catch (ex) {
      if (typeof this.options.errorHandling === "function")
        return await this.options.errorHandling(ex);

      if (this.options.errorHandling === "pass") {
        throw ex;
      }

      return await defaultCatching(ex);
    }
  };
}
