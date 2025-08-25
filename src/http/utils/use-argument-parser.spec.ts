// @ts-nocheck
import { describe, expect, test } from "bun:test";
import { useArgumentParser, parseUseArguments } from "./use-argument-parser";
import { URLPattern } from "urlpattern-polyfill/urlpattern";
import type { Route } from "../types/route";
import { urlPatternFrom } from "./url-pattern-from";
import { ArgumentsError } from "../errors/arguments-error";

describe("parseUseArguments", () => {
  test("should return null for empty arguments", () => {
    expect(parseUseArguments([])).toBeNull();
  });

  test("should parse single fetch function", () => {
    const fetch = async () => Response.json();
    expect(parseUseArguments([fetch]))
      .toBeObject()
      .toMatchObject({
        fetch: expect.any(Function),
      });
  });

  test("should parse string URL pattern and fetch function", () => {
    const fetch = async () => Response.json();
    expect(parseUseArguments(["/api", fetch]))
      .toBeObject()
      .toMatchObject({
        urlPattern: expect.any(URLPattern),
        fetch: expect.any(Function),
      });
  });

  test("should parse URLPattern instance and fetch function", () => {
    const urlPattern = new URLPattern({ pathname: "/api" });
    const fetch = async () => Response.json();
    expect(parseUseArguments([urlPattern, fetch]))
      .toBeObject()
      .toMatchObject({
        urlPattern: expect.any(URLPattern),
        fetch: expect.any(Function),
      });
  });

  test("should parse method, string URL pattern and fetch function", () => {
    const fetch = async () => Response.json();
    expect(parseUseArguments(["GET", "/api", fetch]))
      .toBeObject()
      .toMatchObject({
        method: "GET",
        urlPattern: expect.any(URLPattern),
        fetch: expect.any(Function),
      });
  });

  test("should parse POST method, string URL pattern and fetch function", () => {
    const fetch = async () => Response.json();
    expect(parseUseArguments(["POST", "/users/:id", fetch]))
      .toBeObject()
      .toMatchObject({
        method: "POST",
        urlPattern: expect.any(URLPattern),
        fetch: expect.any(Function),
      });
  });

  test("should parse test function and fetch function", () => {
    const testFn = (request: Request) => true;
    const fetch = async () => Response.json();
    expect(parseUseArguments([testFn, fetch]))
      .toBeObject()
      .toMatchObject({
        test: expect.any(Function),
        fetch: expect.any(Function),
      });
  });

  test("should throw ArgumentsError for invalid arguments", () => {
    expect(() => parseUseArguments([123])).toThrow(ArgumentsError);
  });

  test("should throw ArgumentsError for invalid method", () => {
    const fetch = async () => Response.json();
    expect(() => parseUseArguments(["INVALID_METHOD", "/api", fetch])).toThrow(
      ArgumentsError,
    );
  });

  test("should throw ArgumentsError for missing fetch function", () => {
    expect(() => parseUseArguments(["/api"])).toThrow(ArgumentsError);
  });

  test("should throw ArgumentsError for too many arguments", () => {
    const fetch = async () => Response.json();
    expect(() => parseUseArguments(["GET", "/api", fetch, "extra"])).toThrow(
      ArgumentsError,
    );
  });

  test("should throw ArgumentsError for invalid fetch function", () => {
    expect(() => parseUseArguments(["not a function"])).toThrow(ArgumentsError);
  });

  test("ArgumentsError should have proper message format", () => {
    try {
      parseUseArguments([123]);
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
    const { test } = useArgumentParser("GET", "/api", fetch)!;
    expect(await test(new Request("http://localhost/api"))).toBe(true);
  });
  test("should return true for matching request with path only", async () => {
    const { test } = useArgumentParser("/api", fetch)!;
    expect(await test(new Request("http://localhost/api"))).toBe(true);
  });
  test("should return false for non-matching path", async () => {
    const { test } = useArgumentParser("/api", fetch)!;
    expect(await test(new Request("http://localhost/foo"))).toBe(false);
  });
  test("should return false for wrong HTTP method on matching path", async () => {
    const { test } = useArgumentParser("/api", fetch)!;
    expect(
      await test(new Request("http://localhost/api", { method: "POST" })),
    ).toBe(false);
  });
  test("should return true for GET request when only fetch function provided", async () => {
    const { test } = useArgumentParser(fetch)!;
    expect(await test(new Request("http://localhost/api"))).toBe(true);
  });
  test("should return false for POST request when only fetch function provided", async () => {
    const { test } = useArgumentParser(fetch)!;
    expect(
      await test(new Request("http://localhost/api", { method: "POST" })),
    ).toBe(false);
  });
  test("should return false for POST request with wildcard path pattern", async () => {
    const { test } = useArgumentParser("*", fetch)!;
    expect(
      await test(new Request("http://localhost/api", { method: "POST" })),
    ).toBe(false);
  });
  test("should return true for any request with ALL method and wildcard path", async () => {
    const { test } = useArgumentParser("ALL", "*", fetch)!;
    expect(
      await test(new Request("http://localhost/api", { method: "POST" })),
    ).toBe(true);
  });
  test("should return true for POST request with POST method and wildcard path", async () => {
    const { test } = useArgumentParser("POST", "*", fetch)!;
    expect(
      await test(new Request("http://localhost/api", { method: "POST" })),
    ).toBe(true);
  });
});
