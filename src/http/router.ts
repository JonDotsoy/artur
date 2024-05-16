import { URLPattern } from "urlpattern-polyfill";

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
/** @deprecated */
export type deprecated_MiddlewareResponse = (
  response: Response,
) => void | LikePromise<Response>;
/** @deprecated */
export type deprecated_Middleware<T> = (
  request: RequestWithParams<T>,
) => void | ((response: Response) => void | LikePromise<Response>);

export type FetcherResponse = LikePromise<Response | null>;

export type MiddlewareWrapResponse = (
  response: Response,
) => LikePromise<Response>;
export type Middleware<T> = (
  request: RequestWithParams<T>,
) => LikePromise<MiddlewareWrapResponse>;

export type Route<T> = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  urlPattern: URLPattern;
  options?: {
    /** @deprecated */
    deprecated_middlewares?: deprecated_Middleware<T>[];
    middlewares?: Middleware<T>[];
    fetch?: (request: RequestWithParams<T>) => FetcherResponse;
  };
};

export const defaultCatchin = (ex: unknown) => {
  console.error(ex);
  if (ex instanceof Error) {
    return new Response(null, {
      status: 500,
      headers: {
        "X-System-Error": ex.message,
      },
    });
  }
  return new Response(null, { status: 500 });
};

export type RouterOptions = {
  errorHandling:
    | "pass"
    | "default-catching"
    | ((ex: unknown) => Promise<Response>);
};

const groupURLPatternComponentResult = (object: URLPatternComponentResult) => {
  const { 0: _, ...variables } = object.groups;
  return variables;
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
    route: Route<T>["urlPattern"] | string,
    options?: Route<T>["options"],
  ) {
    this.routes.push({
      method,
      urlPattern:
        typeof route === "string" ? new URLPattern({ pathname: route }) : route,
      options,
    });

    return this;
  }

  async fetch(request: Request) {
    const responseWraps: MiddlewareWrapResponse[] = [];

    try {
      // const middlewaresResponse: MiddlewareResponse[] = [];

      for (const route of this.routes) {
        let urlPatternResult: URLPatternResult | null;
        if (
          route.method === request.method &&
          (urlPatternResult = route.urlPattern.exec(request.url))
        ) {
          mapRequestParamas.set(request, {
            ...groupURLPatternComponentResult(urlPatternResult.protocol),
            ...groupURLPatternComponentResult(urlPatternResult.username),
            ...groupURLPatternComponentResult(urlPatternResult.password),
            ...groupURLPatternComponentResult(urlPatternResult.hostname),
            ...groupURLPatternComponentResult(urlPatternResult.hash),
            ...groupURLPatternComponentResult(urlPatternResult.pathname),
          });

          // for (const middleware of route.options?.middlewares ?? []) {
          //   const middlewareResponse = await Promise.resolve(
          //     middleware(request),
          //   );
          //   if (middlewareResponse) {
          //     middlewaresResponse.push(middlewareResponse);
          //   }
          // }
          for (const m of route.options?.middlewares ?? []) {
            responseWraps.unshift(await m(request));
          }
          if (route.options?.fetch) {
            let res = await route.options.fetch(request);
            // for (const middlewareResponse of middlewaresResponse) {
            //   const remplace = await Promise.resolve(middlewareResponse(res));
            //   if (remplace) {
            //     res = remplace;
            //   }
            // }
            if (res) {
              for (const m of responseWraps) {
                res = await m(res);
              }
              return res;
            }
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
      return await defaultCatchin(ex);
    }
  }
}
