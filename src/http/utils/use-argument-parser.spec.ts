import { describe, expect, test } from "bun:test";
import { useArgumentParser } from "./use-argument-parser";
import { URLPattern } from "urlpattern-polyfill/urlpattern";
import type { Route } from "../types/route";

describe("useArgumentParser", () => {
  test("should parse GET method with path", () => {
    const result = useArgumentParser("GET", "/api");

    expect(result).toEqual({
      method: "GET",
      urlPattern: expect.any(URLPattern),
    } satisfies Route<any>);

    // Verify URLPattern was created correctly
    expect(result.urlPattern.pathname).toBe("/api");
  });

  test("should parse POST method with path", () => {
    const result = useArgumentParser("POST", "/users");

    expect(result).toEqual({
      method: "POST",
      urlPattern: expect.any(URLPattern),
    } satisfies Route<any>);

    expect(result.urlPattern.pathname).toBe("/users");
  });

  test("should parse PUT method with path", () => {
    const result = useArgumentParser("PUT", "/users/:id");

    expect(result).toEqual({
      method: "PUT",
      urlPattern: expect.any(URLPattern),
    } satisfies Route<any>);

    expect(result.urlPattern.pathname).toBe("/users/:id");
  });

  test("should parse DELETE method with path", () => {
    const result = useArgumentParser("DELETE", "/users/:id");

    expect(result).toEqual({
      method: "DELETE",
      urlPattern: expect.any(URLPattern),
    } satisfies Route<any>);

    expect(result.urlPattern.pathname).toBe("/users/:id");
  });

  test("should handle complex paths", () => {
    const result = useArgumentParser("GET", "/api/v1/users/:id/posts");

    expect(result).toEqual({
      method: "GET",
      urlPattern: expect.any(URLPattern),
    } satisfies Route<any>);

    expect(result.urlPattern.pathname).toBe("/api/v1/users/:id/posts");
  });
});
