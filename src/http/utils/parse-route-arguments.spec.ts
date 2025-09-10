// @ts-nocheck
import { describe, expect, test } from "bun:test";
import {
  useRouteArguments,
  parseRouteArguments as parseRouteArguments,
} from "./parse-route-arguments";
import { URLPattern } from "urlpattern-polyfill";
import type { Route } from "../types/route";
import { urlPatternFrom } from "./url-pattern-from";
import { ArgumentsError } from "../errors/arguments-error";
import { Route } from "../route";

describe("parseUseArguments", () => {
  test("should return null for empty arguments", () => {
    expect(parseRouteArguments([])).toBeNull();
  });

  test("should parse single fetch function", () => {
    const fetch = async () => Response.json();
    expect(parseRouteArguments([fetch]))
      .toBeObject()
      .toMatchObject({
        fetch: expect.any(Function),
      });
  });

  test("should parse string URL pattern and fetch function", () => {
    const fetch = async () => Response.json();
    const result = parseRouteArguments(["/api", fetch]);

    expect(result).toBeObject();
    expect(result).toBeInstanceOf(Route);
  });

  test("should parse URLPattern instance and fetch function", () => {
    const urlPattern = new URLPattern({ pathname: "/api" });
    const fetch = async () => Response.json();
    const result = parseRouteArguments([urlPattern, fetch]);
    expect(result).toBeObject();
    expect(result).toBeInstanceOf(Route);
  });

  test("should parse method, string URL pattern and fetch function", () => {
    const fetch = async () => Response.json();
    const result = parseRouteArguments(["GET", "/api", fetch]);
    expect(result).toBeInstanceOf(Route);
  });

  test("should parse POST method, string URL pattern and fetch function", () => {
    const fetch = async () => Response.json();
    const result = parseRouteArguments(["POST", "/users/:id", fetch]);

    expect(result).toBeInstanceOf(Route);
  });

  test("should parse test function and fetch function", () => {
    const testFn = (request: Request) => true;
    const fetch = async () => Response.json();
    expect(parseRouteArguments([testFn, fetch]))
      .toBeObject()
      .toMatchObject({
        test: expect.any(Function),
        fetch: expect.any(Function),
      });
  });

  test("should throw ArgumentsError for invalid arguments", () => {
    expect(() => parseRouteArguments([123])).toThrow(ArgumentsError);
  });

  test("should throw ArgumentsError for invalid method", () => {
    const fetch = async () => Response.json();
    expect(() =>
      parseRouteArguments(["INVALID_METHOD", "/api", fetch]),
    ).toThrow(ArgumentsError);
  });

  test("should throw ArgumentsError for missing fetch function", () => {
    expect(() => parseRouteArguments(["/api"])).toThrow(ArgumentsError);
  });

  test("should throw ArgumentsError for too many arguments", () => {
    const fetch = async () => Response.json();
    expect(() => parseRouteArguments(["GET", "/api", fetch, "extra"])).toThrow(
      ArgumentsError,
    );
  });

  test("should throw ArgumentsError for invalid fetch function", () => {
    expect(() => parseRouteArguments(["not a function"])).toThrow(
      ArgumentsError,
    );
  });

  test("ArgumentsError should have proper message format", () => {
    try {
      parseRouteArguments([123]);
    } catch (error) {
      expect(error).toBeInstanceOf(ArgumentsError);
      expect(error.message).toContain("Invalid arguments provided");
      expect(error.message).toContain("use(fetch)");
      expect(error.message).toContain("use(test, fetch)");
      expect(error.message).toContain("use(urlPattern, fetch)");
      expect(error.message).toContain("use(method, urlPattern, fetch)");
    }
  });
});

describe("useArgumentParser", () => {
  const fetch = async (request: Request) => Response.json({ ok: true });

  test("should return true for matching GET request with method and path", async () => {
    const { test } = useRouteArguments("GET", "/api", fetch)!;
    expect(await test(new Request("http://localhost/api"))).toBe(true);
  });
  test("should return true for matching request with path only", async () => {
    const { test } = useRouteArguments("/api", fetch)!;
    expect(await test(new Request("http://localhost/api"))).toBe(true);
  });
  test("should return false for non-matching path", async () => {
    const { test } = useRouteArguments("/api", fetch)!;
    expect(await test(new Request("http://localhost/foo"))).toBe(false);
  });
  test("should return false for wrong HTTP method on matching path", async () => {
    const { test } = useRouteArguments("/api", fetch)!;
    expect(
      await test(new Request("http://localhost/api", { method: "POST" })),
    ).toBe(false);
  });
  test("should return true for GET request when only fetch function provided", async () => {
    const { test } = useRouteArguments(fetch)!;
    expect(await test(new Request("http://localhost/api"))).toBe(true);
  });
  test("should return false for POST request when only fetch function provided", async () => {
    const { test } = useRouteArguments(fetch)!;
    expect(
      await test(new Request("http://localhost/api", { method: "POST" })),
    ).toBe(false);
  });
  test("should return false for POST request with wildcard path pattern", async () => {
    const { test } = useRouteArguments("*", fetch)!;
    expect(
      await test(new Request("http://localhost/api", { method: "POST" })),
    ).toBe(false);
  });
  test("should return true for any request with ALL method and wildcard path", async () => {
    const { test } = useRouteArguments("ALL", "*", fetch)!;
    expect(
      await test(new Request("http://localhost/api", { method: "POST" })),
    ).toBe(true);
  });
  test("should return true for POST request with POST method and wildcard path", async () => {
    const { test } = useRouteArguments("POST", "*", fetch)!;
    expect(
      await test(new Request("http://localhost/api", { method: "POST" })),
    ).toBe(true);
  });
});
