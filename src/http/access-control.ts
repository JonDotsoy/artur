import type { Middleware } from "./router.js";

type methods =
  | "CONNECT"
  | "DELETE"
  | "GET"
  | "HEAD"
  | "OPTIONS"
  | "PATCH"
  | "POST"
  | "PUT"
  | "TRACE";

type accessControlOptions = {
  credentials: boolean;
  headers: "*" | string[];
  methods: methods[];
  origin: null | "*" | string;
  exposeHeaders: "*" | string[];
  maxAge: number;
  requestHeaders: string[];
  requestMethod: methods;
};

const translateKeyAccessControl: Record<keyof accessControlOptions, string> = {
  credentials: "Access-Control-Allow-Credentials",
  headers: "Access-Control-Allow-Headers",
  methods: "Access-Control-Allow-Methods",
  origin: "Access-Control-Allow-Origin",
  exposeHeaders: "Access-Control-Expose-Headers",
  maxAge: "Access-Control-Max-Age",
  requestHeaders: "Access-Control-Request-Headers",
  requestMethod: "Access-Control-Request-Method",
};

const defaultOptions: Partial<accessControlOptions> = {
  origin: "*",
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
};

const keyAbailableOptionsByMethod: Partial<
  Record<methods | "all", (keyof accessControlOptions)[]>
> = {
  OPTIONS: [
    "origin",
    "credentials",
    "methods",
    "headers",
    "maxAge",
    "exposeHeaders",
  ],
  all: ["origin", "credentials", "exposeHeaders"],
};

const toHeaderValue = (value: null | string | string[] | number | boolean) => {
  if (value === true) return `true`;
  if (typeof value === "number") return `${value}`;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(",");
  return null;
};

export const responseWithCors = (
  options: Partial<accessControlOptions>,
  request: Request,
  response: Response,
) => {
  const mergeOptions = {
    ...defaultOptions,
    ...options,
  };

  const keyAbailableOptions: string[] =
    Reflect.get(keyAbailableOptionsByMethod, request.method) ??
    keyAbailableOptionsByMethod.all ??
    [];

  Object.entries(mergeOptions).forEach(([keyOption, value]) => {
    if (keyAbailableOptions.includes(keyOption)) {
      const keyHeader: string | undefined = Reflect.get(
        translateKeyAccessControl,
        keyOption,
      );
      if (keyHeader !== undefined) {
        const headerValue = toHeaderValue(value);
        if (headerValue) response.headers.append(keyHeader, headerValue);
      }
    }
  });

  return response;
};

export const cors =
  (options?: Partial<accessControlOptions>): Middleware<any> =>
  (fetch) => {
    return async (request: Request) => {
      return responseWithCors(
        options ?? {},
        request,
        (await fetch(request)) ?? new Response(null, { status: 204 }),
      );
    };
  };
