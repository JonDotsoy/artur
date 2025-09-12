import { beforeEach, describe, expect, mock, test } from "bun:test";
import { parseRouteArguments } from "./parse-route-arguments";
import { URLPattern } from "urlpattern-polyfill";
import type { Fetch } from "../types/fetch-type";
import { customRouteSymbol } from "../constants/custom-options-symbol";

describe("parseRouteArguments - flexible HTTP route argument parsing", () => {
  const testRequest = mock((request: Request) => true);
  const method = "GET";
  const urlPattern = "/";
  const urlPatternB = new URLPattern({ pathname: "/" });
  const fetch = mock(async (request: Request) => Response.json());
  const middleware = mock(
    async (fetch: Fetch) => async (request: Request) => fetch(request),
  );
  const middlewares = [middleware];

  beforeEach(() => {
    testRequest.mockClear();
    fetch.mockClear();
    middleware.mockClear();
  });

  test("should parse method, urlPattern string, and fetch function", async () => {
    const result = parseRouteArguments(method, urlPattern, fetch);

    expect(result).toBeObject();
    expect(result.method).toEqual(method);
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
  });

  test("should parse method, urlPattern string, fetch function, and middlewares option", async () => {
    const result = parseRouteArguments(method, urlPattern, fetch, {
      middlewares,
    });

    expect(result).toBeObject();
    expect(result.method).toEqual(method);
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toEqual(middlewares);
  });

  test("should parse method, URLPattern instance, and fetch function", async () => {
    const result = parseRouteArguments(method, urlPatternB, fetch);

    expect(result).toBeObject();
    expect(result.method).toEqual(method);
    expect(result.urlPattern).toEqual(urlPatternB);
    expect(result.fetch).toEqual(fetch);
  });

  test("should parse method, URLPattern instance, fetch function, and middlewares option", async () => {
    const result = parseRouteArguments(method, urlPatternB, fetch, {
      middlewares,
    });

    expect(result).toBeObject();
    expect(result.method).toEqual(method);
    expect(result.urlPattern).toEqual(urlPatternB);
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toEqual(middlewares);
  });

  test("should parse urlPattern string and fetch function (method defaults to GET)", async () => {
    const result = parseRouteArguments(urlPattern, fetch);

    expect(result).toBeObject();
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
  });

  test("should parse urlPattern string, fetch function, and options with method and middlewares", async () => {
    const result = parseRouteArguments(urlPattern, fetch, {
      method,
      middlewares,
    });

    expect(result).toBeObject();
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
    expect(result.method).toEqual(method);
    expect(result.middlewares).toEqual(middlewares);
  });

  test("should parse urlPattern string, fetch function, and options with method only", async () => {
    const result = parseRouteArguments(urlPattern, fetch, { method });

    expect(result).toBeObject();
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
    expect(result.method).toEqual(method);
  });

  test("should parse urlPattern string, fetch function, and options with middlewares only", async () => {
    const result = parseRouteArguments(urlPattern, fetch, { middlewares });

    expect(result).toBeObject();
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toEqual(middlewares);
  });

  test("should parse urlPattern string and options object with fetch property", async () => {
    const result = parseRouteArguments(urlPattern, { fetch });

    expect(result).toBeObject();
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
  });

  test("should parse urlPattern string and options object with fetch property using custom options symbol", async () => {
    const result = parseRouteArguments(urlPattern, {
      [customRouteSymbol]: { fetch },
    });

    expect(result).toBeObject();
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
  });

  test("should parse method, urlPattern string, and options object with fetch property", async () => {
    const result = parseRouteArguments(method, urlPattern, { fetch });

    expect(result).toBeObject();
    expect(result.method).toEqual(method);
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
  });

  test("should parse method, urlPattern string, and options object with fetch property using custom options symbol", async () => {
    const result = parseRouteArguments(method, urlPattern, {
      [customRouteSymbol]: { fetch },
    });

    expect(result).toBeObject();
    expect(result.method).toEqual(method);
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
  });

  test("should parse urlPattern string and options object with fetch, method, and middlewares", async () => {
    const result = parseRouteArguments(urlPattern, {
      fetch,
      method,
      middlewares,
    });

    expect(result).toBeObject();
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
    expect(result.method).toEqual(method);
    expect(result.middlewares).toEqual(middlewares);
  });

  test("should parse urlPattern string and options object with fetch, method, and middlewares using custom options symbol", async () => {
    const result = parseRouteArguments(urlPattern, {
      [customRouteSymbol]: {
        fetch,
        method,
        middlewares,
      },
    });

    expect(result).toBeObject();
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
    expect(result.method).toEqual(method);
    expect(result.middlewares).toEqual(middlewares);
  });

  test("should parse urlPattern string and options object with fetch and method", async () => {
    const result = parseRouteArguments(urlPattern, { fetch, method });

    expect(result).toBeObject();
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
    expect(result.method).toEqual(method);
  });

  test("should parse urlPattern string and options object with fetch and method using custom options symbol", async () => {
    const result = parseRouteArguments(urlPattern, {
      [customRouteSymbol]: { fetch, method },
    });

    expect(result).toBeObject();
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
    expect(result.method).toEqual(method);
  });

  test("should parse urlPattern string and options object with fetch and middlewares (no method, no test)", async () => {
    const result = parseRouteArguments(urlPattern, { fetch, middlewares });

    expect(result).toBeObject();
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toEqual(middlewares);
    expect(result.method).toBeUndefined();
    expect(result.test).toBeUndefined();
  });

  test("should parse urlPattern string and options object with fetch and middlewares using custom options symbol (no method, no test)", async () => {
    const result = parseRouteArguments(urlPattern, {
      [customRouteSymbol]: { fetch, middlewares },
    });

    expect(result).toBeObject();
    expect(result.urlPattern).toEqual(urlPattern);
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toEqual(middlewares);
    expect(result.method).toBeUndefined();
    expect(result.test).toBeUndefined();
  });

  test("should parse empty arguments and return empty object", async () => {
    const result = parseRouteArguments();

    expect(result).toBeObject();
    expect(result.method).toBeUndefined();
    expect(result.urlPattern).toBeUndefined();
    expect(result.fetch).toBeUndefined();
    expect(result.middlewares).toBeUndefined();
    expect(result.test).toBeUndefined();
  });

  test("should parse options object with fetch property only", async () => {
    const result = parseRouteArguments({ fetch });

    expect(result).toBeObject();
    expect(result.method).toBeUndefined();
    expect(result.urlPattern).toBeUndefined();
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toBeUndefined();
    expect(result.test).toBeUndefined();
  });

  test("should parse options object with fetch property nested under custom options symbol", async () => {
    const result = parseRouteArguments({ [customRouteSymbol]: { fetch } });

    expect(result).toBeObject();
    expect(result.method).toBeUndefined();
    expect(result.urlPattern).toBeUndefined();
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toBeUndefined();
    expect(result.test).toBeUndefined();
  });

  test("should parse options object with fetch, method, and middlewares properties", async () => {
    const result = parseRouteArguments({ fetch, method, middlewares });

    expect(result).toBeObject();
    expect(result.method).toEqual(method);
    expect(result.urlPattern).toBeUndefined();
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toBeInstanceOf(Array);
    expect(result.middlewares).toEqual(middlewares);
    expect(result.test).toBeUndefined();
  });

  test("should parse options object with fetch, method, and middlewares properties using custom options symbol", async () => {
    const result = parseRouteArguments({
      [customRouteSymbol]: { fetch, method, middlewares },
    });

    expect(result).toBeObject();
    expect(result.method).toEqual(method);
    expect(result.urlPattern).toBeUndefined();
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toBeInstanceOf(Array);
    expect(result.middlewares).toEqual(middlewares);
    expect(result.test).toBeUndefined();
  });

  test("should parse options object with fetch and method properties", async () => {
    const result = parseRouteArguments({ fetch, method });

    expect(result).toBeObject();
    expect(result.method).toEqual(method);
    expect(result.urlPattern).toBeUndefined();
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toBeUndefined();
    expect(result.test).toBeUndefined();
  });

  test("should parse options object with fetch and method properties using custom options symbol", async () => {
    const result = parseRouteArguments({
      [customRouteSymbol]: { fetch, method },
    });

    expect(result).toBeObject();
    expect(result.method).toEqual(method);
    expect(result.urlPattern).toBeUndefined();
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toBeUndefined();
    expect(result.test).toBeUndefined();
  });

  test("should parse options object with fetch and middlewares properties (no method, no test)", async () => {
    const result = parseRouteArguments({ fetch, middlewares });

    expect(result).toBeObject();
    expect(result.method).toBeUndefined();
    expect(result.urlPattern).toBeUndefined();
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toBeInstanceOf(Array);
    expect(result.middlewares).toEqual(middlewares);
    expect(result.test).toBeUndefined();
  });

  test("should parse options object with fetch and middlewares properties using custom options symbol (no method, no test)", async () => {
    const result = parseRouteArguments({
      [customRouteSymbol]: { fetch, middlewares },
    });

    expect(result).toBeObject();
    expect(result.method).toBeUndefined();
    expect(result.urlPattern).toBeUndefined();
    expect(result.fetch).toEqual(fetch);
    expect(result.middlewares).toBeInstanceOf(Array);
    expect(result.middlewares).toEqual(middlewares);
    expect(result.test).toBeUndefined();
  });

  test("should parse test function and fetch function", async () => {
    const result = parseRouteArguments(testRequest, fetch);

    expect(result).toBeObject();
    expect(result.test).toEqual(testRequest);
    expect(result.fetch).toEqual(fetch);
    expect(result.method).toBeUndefined();
    expect(result.urlPattern).toBeUndefined();
    expect(result.middlewares).toBeUndefined();
  });

  test("should parse test function, fetch function, and options with middlewares", async () => {
    const result = parseRouteArguments(testRequest, fetch, { middlewares });

    expect(result).toBeObject();
    expect(result.test).toEqual(testRequest);
    expect(result.fetch).toEqual(fetch);
    expect(result.method).toBeUndefined();
    expect(result.middlewares).toEqual(middlewares);
    expect(result.urlPattern).toBeUndefined();
  });
});
