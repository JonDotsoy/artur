import { describe, test, expect } from "bun:test";
import { Route } from "./route";
import { params } from "./router";

describe("Route", () => {
  test("should match GET request to exact URL pattern", async () => {
    const route = Route.parse({
      method: "GET",
      urlPattern: "/health",
      fetch: async () => new Response("ok"),
    });

    expect(
      await route.test(
        new Request("http://localhost/health", { method: "GET" }),
      ),
    ).toBe(true);
  });

  test("should not match GET request when method is POST", async () => {
    const route = Route.parse({
      method: "POST",
      urlPattern: "/health",
      fetch: async () => new Response("ok"),
    });

    expect(
      await route.test(
        new Request("http://localhost/health", { method: "GET" }),
      ),
    ).toBe(false);
  });

  test("should match any HTTP method when method is ALL", async () => {
    const route = Route.parse({
      method: "ALL",
      urlPattern: "/health",
      fetch: async () => new Response("ok"),
    });

    expect(
      await route.test(
        new Request("http://localhost/health", { method: "GET" }),
      ),
    ).toBe(true);
    expect(
      await route.test(
        new Request("http://localhost/health", { method: "POST" }),
      ),
    ).toBe(true);
  });

  test("should extract URL parameters from pattern", async () => {
    const route = Route.parse({
      method: "GET",
      urlPattern: "/users/:id",
      fetch: async () => new Response("ok"),
    });

    const request = new Request("http://localhost/users/123");

    expect(await route.test(request)).toBe(true);
    expect(params(request).id).toBe("123");
  });

  test("should return undefined for parameters when no pattern matches", async () => {
    const route = Route.parse({
      method: "GET",
      urlPattern: "/users",
      fetch: async () => new Response("ok"),
    });

    const request = new Request("http://localhost/users");

    expect(await route.test(request)).toBe(true);
    expect(params(request).id).toBeUndefined();
  });

  test("should match any URL when only urlPattern is specified", async () => {
    const route = Route.parse({
      urlPattern: "/users",
      fetch: async () => new Response("ok"),
    });

    const request = new Request("http://localhost/users");

    expect(await route.test(request)).toBe(true);
  });

  test("should match any request when no method or pattern specified", async () => {
    const route = Route.parse({
      fetch: async () => new Response("ok"),
    });

    const request = new Request("http://localhost/users");

    expect(await route.test(request)).toBe(true);
  });

  test("should use custom test function when provided", async () => {
    const route = Route.parse({
      test: () => true,
      fetch: async () => new Response("ok"),
    });

    const request = new Request("http://localhost/users");

    expect(await route.test(request)).toBe(true);
  });

  test("should fail when method doesn't match despite custom test returning true", async () => {
    const route = Route.parse({
      method: "PUT",
      test: () => true,
      fetch: async () => new Response("ok"),
    });

    const request = new Request("http://localhost/users");

    expect(await route.test(request)).toBe(false);
  });

  test("should pass when both method and custom test match", async () => {
    const route = Route.parse({
      method: "PUT",
      test: () => true,
      fetch: async () => new Response("ok"),
    });

    const request = new Request("http://localhost/users", { method: "PUT" });

    expect(await route.test(request)).toBe(true);
  });

  test("should fail when URL pattern doesn't match despite method and custom test", async () => {
    const route = Route.parse({
      method: "ALL",
      urlPattern: "/profiles",
      test: () => true,
      fetch: async () => new Response("ok"),
    });

    const request = new Request("http://localhost/users", { method: "PUT" });

    expect(await route.test(request)).toBe(false);
  });

  test("should match any request when only fetch handler is provided", async () => {
    const route = Route.parse({
      fetch: async () => new Response("ok"),
    });

    const request = new Request("http://localhost/users", { method: "PUT" });

    expect(await route.test(request)).toBe(true);
  });

  test("should match when method and custom test both return true", async () => {
    const route = Route.parse({
      method: "PUT",
      test: () => true,
      fetch: async () => new Response("ok"),
    });

    const request = new Request("http://localhost/users", { method: "PUT" });

    expect(await route.test(request)).toBe(true);
  });
});
