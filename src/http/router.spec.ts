import { test, expect, mock } from "bun:test";
import { Router } from "./router.js";
import { urlPathPattern } from "./utils/url-path-pattern.js";

test("should make a router", async () => {
  new Router();
});

test("should map a route and execute their fetch function", async () => {
  const router = new Router();

  const fetch = mock(() => new Response("ok"));

  router.use("GET", urlPathPattern`/a`, { fetch: fetch });

  const res = await router.fetch(new Request("http://localhost/a"));

  expect(res).toBeInstanceOf(Response);
  expect(res).toMatchObject({ status: 200 });
  expect(fetch).toBeCalled();
});

test("should request a empty router and expect a 404 response", async () => {
  const router = new Router();

  const res = await router.fetch(new Request("http://localhost/a"));

  expect(res).toBeInstanceOf(Response);
  expect(res).toMatchObject({ status: 404 });
});

test("should request a bad request and expect a 500 response", async () => {
  const router = new Router();

  const fetch = mock(() => {
    throw new Error("bad fetch");
  });

  router.use("GET", urlPathPattern`/hello`, { fetch });

  const response = await router.fetch(new Request("http://localhost/hello"));

  expect(response).toBeInstanceOf(Response);
  expect(response).toMatchObject({ status: 500 });
});

test("should request a bad request and pass the error", async () => {
  const router = new Router({ errorHandling: "pass" });

  const fetch = mock(() => {
    throw new Error("bad fetch");
  });

  router.use("GET", urlPathPattern`/hello`, { fetch });

  const response = router.fetch(new Request("http://localhost/hello"));

  expect(response).rejects.toThrowError("bad fetch");
});
