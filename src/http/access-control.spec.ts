import { test, expect, mock } from "bun:test";
import { responseWithCors, cors } from "./access-control.js";
import { Router } from "./router.js";

test("should fill a response object to a OPTIONS request", () => {
  const request = new Request("http://localhost", { method: "OPTIONS" });
  const response = new Response();
  const nextResponse = responseWithCors(
    {
      credentials: true,
      maxAge: 600,
    },
    request,
    response,
  );

  expect(nextResponse.headers.get("access-control-allow-origin")).toEqual("*");
  expect(nextResponse.headers.get("access-control-allow-methods")).toEqual(
    "GET,HEAD,PUT,PATCH,POST,DELETE",
  );
  expect(nextResponse.headers.get("access-control-allow-credentials")).toEqual(
    "true",
  );
  expect(nextResponse.headers.get("access-control-max-age")).toEqual("600");
});

test("should fill a response object to a GET request", () => {
  const request = new Request("http://localhost", { method: "GET" });
  const response = new Response();
  const nextResponse = responseWithCors(
    {
      credentials: true,
      maxAge: 600,
    },
    request,
    response,
  );

  expect(nextResponse.headers.get("access-control-allow-origin")).toEqual("*");
  expect(nextResponse.headers.get("access-control-allow-credentials")).toEqual(
    "true",
  );
});

test("should calling to cors middleware", async () => {
  const router = new Router({ middlewares: [cors()] });

  router.use("OPTIONS", "*", {
    fetch: () => new Response(null, { status: 204 }),
  });

  const response = await router.fetch(
    new Request("http://localhost", { method: "OPTIONS" }),
  );

  expect(response?.headers.get("access-control-allow-origin")).toEqual("*");
  expect(response?.headers.get("access-control-allow-methods")).toEqual(
    "GET,HEAD,PUT,PATCH,POST,DELETE",
  );
});
