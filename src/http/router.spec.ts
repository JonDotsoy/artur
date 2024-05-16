import { test, expect, mock } from "bun:test";
import { Router, params } from "./router.js";

test("should make a router", async () => {
  new Router();
});

test("should map a route and execute their fetch function", async () => {
  const router = new Router();

  const fetch = mock(() => new Response("ok"));

  router.use("GET", `/a`, { fetch: fetch });

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

  router.use("GET", `/hello`, { fetch });

  const response = await router.fetch(new Request("http://localhost/hello"));

  expect(response).toBeInstanceOf(Response);
  expect(response).toMatchObject({ status: 500 });
});

test("should request a bad request and pass the error", async () => {
  const router = new Router({ errorHandling: "pass" });

  const fetch = mock(() => {
    throw new Error("bad fetch");
  });

  router.use("GET", `/hello`, { fetch });

  const response = router.fetch(new Request("http://localhost/hello"));

  expect(response).rejects.toThrowError("bad fetch");
});

test("should make a router with a url-path string", async () => {
  const router = new Router({ errorHandling: "pass" });

  const logParams = mock((_params) => {});
  const fetch = mock((request: Request) => {
    logParams(params(request));
    return new Response();
  });

  router.use("GET", `/hello/:name`, { fetch });

  await router.fetch(new Request("http://localhost/hello/mark"));

  expect(logParams).toBeCalledWith({ name: "mark" });
});

test("should validate case on REAMDE file", async () => {
  const router = new Router();

  router.use<"name">("GET", "/users/:name", {
    fetch: async (request) => {
      const { name } = params(request);
      return new Response(`hello ${name}`);
    },
  });

  const response = await router.fetch(
    new Request("http://localhost/users/mark"),
  );

  expect(await response.text()).toEqual("hello mark");
});
