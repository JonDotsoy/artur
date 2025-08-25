import { URLPattern } from "urlpattern-polyfill/urlpattern";
import { urlPatternFrom } from "./url-pattern-from.js";
import type { Fetch } from "../types/fetch-type.js";
import { ArgumentsError } from "../errors/arguments-error.js";
import { symbol, z } from "zod";
import { Route } from "../route.js";
import type { Middleware } from "../types/middleware.js";
import { RequestReflect } from "./request-reflect.js";
import { urlParamsSymbol } from "../constants/url-params-symbol.js";
import type { URLParams } from "../types/url-params.js";

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
const testSchema = z.function({
  input: [requestSchema],
  output: z.union([z.boolean(), z.promise(z.boolean())]),
});
const middlewareSchema: z.ZodSchema<Middleware, Middleware> = z.function({
  input: [fetchSchema],
  output: z.union([fetchSchema, z.promise(fetchSchema)]),
});

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

const useArgumentsSchema = z.union([
  // []
  z.tuple([]).transform(() => null),
  // [fetch]
  z.tuple([fetchSchema]).transform(
    ([fetch]) =>
      new ParsedRouteArguments({
        urlPattern: urlPatternFrom("*"),
        fetch,
      }),
  ),
  // [URLPattern, fetch]
  z.tuple([urlPatternSchema, fetchSchema]).transform(
    ([urlPattern, fetch]) =>
      new ParsedRouteArguments({
        urlPattern,
        fetch,
      }),
  ),
  // [test, fetch]
  z.tuple([testSchema, fetchSchema]).transform(
    ([test, fetch]) =>
      new ParsedRouteArguments({
        test,
        fetch,
      }),
  ),
  // [urlPattern: string, fetch]
  z.tuple([z.string(), fetchSchema]).transform(
    ([urlPattern, fetch]) =>
      new ParsedRouteArguments({
        urlPattern: urlPatternFrom(urlPattern),
        fetch,
      }),
  ),
  // [HTTPMethod, urlPattern: string, fetch]
  z.tuple([HTTPMethodsSchema, z.string(), fetchSchema]).transform(
    ([method, urlPattern, fetch]) =>
      new ParsedRouteArguments({
        method,
        urlPattern: urlPatternFrom(urlPattern),
        fetch,
      }),
  ),
  // [HTTPMethod, urlPattern: string, { middlewares?: middleware[], fetch: fetch }]
  z
    .tuple([
      HTTPMethodsSchema,
      z.string(),
      z.object({
        middlewares: z.array(middlewareSchema).optional(),
        fetch: fetchSchema,
      }),
    ])
    .transform(
      ([method, urlPattern, { middlewares, fetch }]) =>
        new ParsedRouteArguments({
          method,
          urlPattern: urlPatternFrom(urlPattern),
          fetch,
          middlewares,
        }),
    ),
  // [HTTPMethod, URLPattern: string, { middlewares?: middleware[], fetch: fetch }]
  z
    .tuple([
      HTTPMethodsSchema,
      z.string(),
      z.object({
        middlewares: z.array(middlewareSchema).optional(),
        fetch: fetchSchema,
      }),
    ])
    .transform(
      ([method, urlPattern, { middlewares, fetch }]) =>
        new ParsedRouteArguments({
          method,
          urlPattern: urlPatternFrom(urlPattern),
          fetch,
          middlewares,
        }),
    ),
  // [HTTPMethod, URLPattern, fetch]
  z.tuple([HTTPMethodsSchema, urlPatternSchema, fetchSchema]).transform(
    ([method, urlPattern, fetch]) =>
      new ParsedRouteArguments({
        method,
        urlPattern,
        fetch,
      }),
  ),
  // [{ test: test, middlewares?: middleware[], fetch: fetch }]
  z
    .tuple([
      z.object({
        test: testSchema,
        middlewares: z.array(middlewareSchema).optional(),
        fetch: fetchSchema,
      }),
    ])
    .transform(
      ([{ test, middlewares, fetch }]) =>
        new ParsedRouteArguments({
          test,
          middlewares,
          fetch,
        }),
    ),
  // [{ method?: method, urlPattern: urlPattern, middlewares?: middleware[], fetch: fetch }]
  z
    .tuple([
      z.object({
        method: HTTPMethodsSchema.optional(),
        urlPattern: urlPatternSchema,
        middlewares: z.array(middlewareSchema).optional(),
        fetch: fetchSchema,
      }),
    ])
    .transform(
      ([{ method = null, urlPattern, middlewares, fetch }]) =>
        new ParsedRouteArguments({
          urlPattern,
          fetch,
          middlewares,
        }),
    ),
]);

export type UseArguments = z.input<typeof useArgumentsSchema>;

export const parseUseArguments = (useArguments: UseArguments) => {
  const { success, data } = useArgumentsSchema.safeParse(useArguments);
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
 */
export const useArgumentParser = (...args: UseArguments): Route | null => {
  const argsParts = parseUseArguments(args);

  if (argsParts === null) return null;

  const { test, fetch, urlPattern, method } = argsParts;

  return new Route(
    async (request) => {
      if (test) return test(request);
      const methodExpected = method?.toUpperCase() ?? "GET";
      const isHttpMethodValid = (method: string, methodExpected: string) => {
        if (methodExpected === "ALL") return true;
        return method.toUpperCase() === methodExpected;
      };
      if (!isHttpMethodValid(request.method, methodExpected)) return false;
      if (urlPattern === null) return false;
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
    argsParts.middlewares,
    fetch,
  );
};
