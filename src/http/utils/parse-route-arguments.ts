import { URLPattern } from "urlpattern-polyfill";
import { urlPatternFrom } from "./url-pattern-from.js";
import type { Fetch } from "../types/fetch-type.js";
import { ArgumentsError } from "../errors/arguments-error.js";
import { z } from "zod";
import { Route } from "../route.js";
import type { Middleware } from "../types/middleware.js";
import { RequestReflect } from "./request-reflect.js";
import { urlParamsSymbol } from "../constants/url-params-symbol.js";
import type { URLParams } from "../types/url-params.js";
import type { TestRoute } from "../types/test-route-type.js";

const requestSchema = z.instanceof(Request);
const responseSchema = z.instanceof(Response);

const fetchSchema: z.ZodSchema<Fetch, Fetch> = z.function({
  input: [requestSchema],
  output: z.any(),
});

const urlPatternSchema: z.ZodSchema<URLPattern> = z.instanceof(URLPattern);
const HTTPMethodsSchema = z.enum([
  "ALL",
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
  "HEAD",
  "TRACE",
  "CONNECT",
]);

const testSchema: z.ZodType<TestRoute> = z.function({
  input: [requestSchema],
  output: z.union([z.boolean(), z.promise(z.boolean())]),
});

const middlewareSchema: z.ZodSchema<Middleware, Middleware> = z.function({
  input: [fetchSchema],
  output: z.union([fetchSchema, z.promise(fetchSchema)]),
});

class RouteExp {
  public test: z.output<typeof testSchema> | null;

  constructor(prop: { test?: z.output<typeof testSchema> }) {
    this.test = prop.test ?? null;
  }
}

class FunnyRouteExp extends RouteExp {
  constructor(prop: {
    method?: z.output<typeof HTTPMethodsSchema>;
    urlPattern?: z.output<typeof urlPatternSchema>;
  }) {
    super({
      test: (request) => {
        const { urlPattern, method } = prop;
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
      },
    });
  }
}

/** @deprecated */
class ParsedRouteArguments {
  public test: z.output<typeof testSchema> | null;
  public method: z.output<typeof HTTPMethodsSchema> | null;
  public urlPattern: z.output<typeof urlPatternSchema> | null;
  public fetch: z.output<typeof fetchSchema>;
  public middlewares: z.output<typeof middlewareSchema>[];

  constructor(prop: {
    test?: z.output<typeof testSchema>;
    method?: z.output<typeof HTTPMethodsSchema>;
    urlPattern?: z.output<typeof urlPatternSchema>;
    middlewares?: z.output<typeof middlewareSchema>[];
    fetch: z.output<typeof fetchSchema>;
  }) {
    this.test = prop.test ?? null;
    this.method = prop.method ?? null;
    this.urlPattern = prop.urlPattern ?? null;
    this.fetch = prop.fetch;
    this.middlewares = prop.middlewares ?? [];
  }
}

type HTTPMethod = z.infer<typeof HTTPMethodsSchema>;

/**
 * Patterns:
 * - [] => null
 * - [fetch] =>                                                                           Route { test: FunnyRouteExp { method: "GET",  urlPattern: "*" }, middlewares:[], fetch }
 * - [fetch, { method?: HTTPMethod, middlewares?: middleware[] }] =>                      Route { test: FunnyRouteExp { method,         urlPattern: "*" }, middlewares,    fetch }
 * - [string | URLPattern, fetch] =>                                                      Route { test: FunnyRouteExp { method: "GET",  urlPattern,     }, middlewares:[], fetch }
 * - [string | URLPattern, fetch, { method?: HTTPMethod, middlewares?: middleware[] }] => Route { test: FunnyRouteExp { method,         urlPattern,     }, middlewares,    fetch }
 * - [string | URLPattern, { fetch, method?: HTTPMethod, middlewares?: middleware[] }] => Route { test: FunnyRouteExp { method,         urlPattern,     }, middlewares,    fetch }
 * - [method, string | URLPattern, fetch] =>                                              Route { test: FunnyRouteExp { method,         urlPattern,     }, middlewares:[], fetch }
 * - [method, string | URLPattern, fetch, { middlewares?: middleware[] }] =>              Route { test: FunnyRouteExp { method,         urlPattern,     }, middlewares,    fetch }
 * - [method, string | URLPattern, { fetch, middlewares?: middleware[] }] =>              Route { test: FunnyRouteExp { method,         urlPattern,     }, middlewares,    fetch }
 * - [test, fetch] =>                                                                     Route { test: RouteExp { test }, middlewares:[], fetch }
 * - [test, fetch, { middlewares?: middleware[] }] =>                                     Route { test: RouteExp { test }, middlewares,    fetch }
 */
const useArgumentsSchema = z.union([
  // [] => null
  z.tuple([]).transform(() => null),
  // [fetch] =>                                                                           Route { test: FunnyRouteExp { method: "GET",  urlPattern: "*" }, middlewares:[], fetch }
  z
    .tuple([fetchSchema])
    .transform(
      ([fetch]) =>
        new Route(
          new FunnyRouteExp({ method: "GET", urlPattern: urlPatternFrom("*") })
            .test ?? (() => false),
          [],
          fetch,
        ),
    ),
  // [fetch, { method?: HTTPMethod, middlewares?: middleware[] }] =>                      Route { test: FunnyRouteExp { method,         urlPattern: "*" }, middlewares,    fetch }
  z
    .tuple([
      fetchSchema,
      z.object({
        method: HTTPMethodsSchema.optional(),
        middlewares: z.array(middlewareSchema).optional(),
      }),
    ])
    .transform(
      ([fetch, { method, middlewares }]) =>
        new Route(
          new FunnyRouteExp({
            method: method ?? "GET",
            urlPattern: urlPatternFrom("*"),
          }).test ?? (() => false),
          middlewares ?? [],
          fetch,
        ),
    ),
  // [string | URLPattern, fetch] =>                                                      Route { test: FunnyRouteExp { method: "GET",  urlPattern,     }, middlewares:[], fetch }
  z.tuple([z.string().or(z.instanceof(URLPattern)), fetchSchema]).transform(
    ([urlPattern, fetch]) =>
      new Route(
        new FunnyRouteExp({
          method: "GET",
          urlPattern: urlPatternFrom(urlPattern),
        }).test ?? (() => false),
        [],
        fetch,
      ),
  ),
  // [string | URLPattern, { fetch, method?: HTTPMethod, middlewares?: middleware[] }] => Route { test: FunnyRouteExp { method,         urlPattern,     }, middlewares,    fetch }
  z
    .tuple([
      z.string().or(z.instanceof(URLPattern)),
      z.object({
        fetch: fetchSchema,
        method: HTTPMethodsSchema.optional(),
        middlewares: z.array(middlewareSchema).optional(),
      }),
    ])
    .transform(
      ([urlPattern, { fetch, method, middlewares }]) =>
        new Route(
          new FunnyRouteExp({
            method: method ?? "GET",
            urlPattern: urlPatternFrom(urlPattern),
          }).test ?? (() => false),
          middlewares ?? [],
          fetch,
        ),
    ),
  // [string | URLPattern, fetch, { method?: HTTPMethod, middlewares?: middleware[] }] => Route { test: FunnyRouteExp { method,         urlPattern,     }, middlewares,    fetch }
  z
    .tuple([
      z.string().or(z.instanceof(URLPattern)),
      fetchSchema,
      z.object({
        method: HTTPMethodsSchema.optional(),
        middlewares: z.array(middlewareSchema).optional(),
      }),
    ])
    .transform(
      ([urlPattern, fetch, { method, middlewares }]) =>
        new Route(
          new FunnyRouteExp({
            method: method ?? "GET",
            urlPattern: urlPatternFrom(urlPattern),
          }).test ?? (() => false),
          middlewares ?? [],
          fetch,
        ),
    ),
  // [method, string | URLPattern, fetch] =>                                              Route { test: FunnyRouteExp { method,         urlPattern,     }, middlewares:[], fetch }
  z
    .tuple([
      HTTPMethodsSchema,
      z.string().or(z.instanceof(URLPattern)),
      fetchSchema,
    ])
    .transform(
      ([method, urlPattern, fetch]) =>
        new Route(
          new FunnyRouteExp({ method, urlPattern: urlPatternFrom(urlPattern) })
            .test ?? (() => false),
          [],
          fetch,
        ),
    ),
  // [method, string | URLPattern, fetch, { middlewares?: middleware[] }] =>              Route { test: FunnyRouteExp { method,         urlPattern,     }, middlewares,    fetch }
  z
    .tuple([
      HTTPMethodsSchema,
      z.string().or(z.instanceof(URLPattern)),
      fetchSchema,
      z.object({ middlewares: z.array(middlewareSchema).optional() }),
    ])
    .transform(
      ([method, urlPattern, fetch, { middlewares }]) =>
        new Route(
          new FunnyRouteExp({
            method: method ?? "GET",
            urlPattern: urlPatternFrom(urlPattern),
          }).test ?? (() => false),
          middlewares ?? [],
          fetch,
        ),
    ),
  // [method, string | URLPattern, { fetch, middlewares?: middleware[] }] =>              Route { test: FunnyRouteExp { method,         urlPattern,     }, middlewares,    fetch }
  z
    .tuple([
      HTTPMethodsSchema,
      z.string().or(z.instanceof(URLPattern)),
      z.object({
        fetch: fetchSchema,
        middlewares: z.array(middlewareSchema).optional(),
      }),
    ])
    .transform(
      ([method, urlPattern, { fetch, middlewares }]) =>
        new Route(
          new FunnyRouteExp({
            method,
            urlPattern: urlPatternFrom(urlPattern),
          }).test ?? (() => false),
          middlewares ?? [],
          fetch,
        ),
    ),
  // [test, fetch] =>                                                                     Route { test: RouteExp { test }, middlewares:[], fetch }
  z
    .tuple([testSchema, fetchSchema])
    .transform(
      ([test, fetch]) =>
        new Route(new RouteExp({ test }).test ?? (() => false), [], fetch),
    ),
  // [test, fetch, { middlewares?: middleware[] }] =>                                     Route { test: RouteExp { test }, middlewares,    fetch }
  z
    .tuple([
      testSchema,
      fetchSchema,
      z.object({ middlewares: z.array(middlewareSchema).optional() }),
    ])
    .transform(
      ([test, fetch, { middlewares }]) =>
        new Route(
          new RouteExp({ test }).test ?? (() => false),
          middlewares ?? [],
          fetch,
        ),
    ),
]);

export type RouteArguments = z.input<typeof useArgumentsSchema>;

export const parseRouteArguments = (routeArguments: RouteArguments) => {
  const { success, data } = useArgumentsSchema.safeParse(routeArguments);
  if (!success) {
    throw new ArgumentsError();
  }
  return data;
};

/**
 * Parses the arguments for a route.
 *
 * @param args
 * @returns
 * @deprecated
 */
export const useRouteArguments = (...args: RouteArguments): Route | null => {
  const route = parseRouteArguments(args);

  if (route === null) return null;

  return route;
};
