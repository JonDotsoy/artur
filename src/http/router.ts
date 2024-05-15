import { URLPathPattern, urlPathPattern } from "./utils/url-path-pattern.js";

export const params = <T extends string>(request: RequestWithParams<T>) => {
  const paramsFound = urlPathPattern.params(request);

  if (!paramsFound) throw new Error(`Missing params`);

  return paramsFound as Record<T, string>;
};

export type RequestWithParams<T> = Request & { ["[[[s]]]"]?: T };
export type LikePromise<T> = Promise<T> | T;
export type MiddlewareResponse = (
  response: Response,
) => void | LikePromise<Response>;
export type Middleware<T> = (
  request: RequestWithParams<T>,
) => void | ((response: Response) => void | LikePromise<Response>);

export type Route<T> = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  urlPathPattern: URLPathPattern<T>;
  options?: {
    middlewares?: Middleware<T>[];
    fetch?: (request: RequestWithParams<T>) => LikePromise<Response>;
  };
};

type RouterUseParams<T> =
  | [
      method: Route<T>["method"],
      route: Route<T>["urlPathPattern"] | string,
      options?: Route<T>["options"],
    ]
  | [
      options: {
        method: Route<T>["method"];
        route: Route<T>["urlPathPattern"] | string;
        options?: Route<T>["options"];
      },
    ];

export const defaultCatchin = (ex: unknown) => {
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

export class Router {
  routes: Route<any>[] = [];

  options: RouterOptions;

  constructor(options?: Partial<RouterOptions>) {
    this.options = {
      errorHandling: "default-catching",
      ...options,
    };
  }

  use<T>(...params: RouterUseParams<T>) {
    const descomposeParams = <T>(params: RouterUseParams<T>) => {
      if (typeof params[0] === "string") {
        const [method, route, options] = params;
        return {
          method,
          route,
          options,
        };
      }
      if (typeof params[0] === "object" && params[0] !== null) {
        const method = params[0].method;
        const route = params[0].route;
        const options = params[0].options;
        return {
          method,
          route,
          options,
        };
      }

      throw new Error("Invalid parmas format");
    };

    const { method, route, options } = descomposeParams(params);

    this.routes.push({
      method,
      urlPathPattern:
        typeof route === "string" ? URLPathPattern.of(route) : route,
      options,
    });

    return this;
  }

  async fetch(request: Request) {
    try {
      const middlewaresResponse: MiddlewareResponse[] = [];
      for (const route of this.routes) {
        if (
          route.method === request.method &&
          route.urlPathPattern.test(request)
        ) {
          for (const middleware of route.options?.middlewares ?? []) {
            const middlewareResponse = await Promise.resolve(
              middleware(request),
            );
            if (middlewareResponse) {
              middlewaresResponse.push(middlewareResponse);
            }
          }
          if (route.options?.fetch) {
            let res: Response = await route.options.fetch(request);
            for (const middlewareResponse of middlewaresResponse) {
              const remplace = await Promise.resolve(middlewareResponse(res));
              if (remplace) {
                res = remplace;
              }
            }
            return res;
          }
        }
      }

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
