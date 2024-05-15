import { test, expect } from "bun:test";
import { URLPathPattern, urlPathPattern } from "./url-path-pattern.js";

test("should return true if match url", async () => {
  const url = new URL("http://localhost/hello");

  expect(urlPathPattern`/hello`.test(url)).toBeTrue();
});

test("should get params by url", async () => {
  const url = new URL("http://localhost/profile/user1");

  expect(
    urlPathPattern`/profile/${urlPathPattern.group("userid")}`.test(url),
  ).toBeTrue();

  expect(urlPathPattern.params(url)).toEqual({ userid: "user1" });
});

test("should make a url by the path", async () => {
  const regexp =
    urlPathPattern`/hello/${urlPathPattern.group("field")}`.toRegexp();

  expect(regexp).toBeInstanceOf(RegExp);
});

test("should test a url-path-patter with willcard", () => {
  expect(urlPathPattern`${urlPathPattern.wildcard()}`.toRegexp()).toEqual(
    /^(?<wildcard>.+)$/i,
  );
});

test("should make a url-path-pattern from a string", () => {
  const urlPathPattern = URLPathPattern.of("/hello/:name/*");

  expect(urlPathPattern).toBeInstanceOf(URLPathPattern);
  expect(urlPathPattern.toRegexp()).toEqual(
    /^\/hello\/(?<name>[^\/]+)\/(?<wildcard>.+)$/i,
  );
});
