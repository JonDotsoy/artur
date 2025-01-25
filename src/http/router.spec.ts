import { test, expect, mock, afterEach } from "bun:test";
import { Router, params } from "./router.js";
import { disposeWithController } from "dispose-with-controller";
import { describeErrorResponse } from "../utils/describeErrorResponse.js";
import { CleanupTasks } from "@jondotsoy/utils-js/cleanuptasks";
import { URL } from "url";
import { expectTypeOf } from "expect-type";

const sanatizeHostname = (hostname: string) => {
  switch (hostname) {
    case "::":
    case "::1":
    case "::1:1":
    case "127.0.0.1":
    case "127.0.0.2":
    case "localhost":
      return "localhost";
  }
  return hostname;
};

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

  expect(await response!.text()).toEqual("hello mark");
});

test("should match the request with any method", async () => {
  const router = new Router();

  router.use("ALL", "/hello", {
    fetch: () => new Response("ok"),
  });

  const r = async (method: string) => {
    const response = await router.fetch(
      new Request("http://localhost/hello", { method }),
    );
    return response?.text() ?? null;
  };

  expect(await r("GET")).toEqual("ok");
  expect(await r("POST")).toEqual("ok");
  expect(await r("DELETE")).toEqual("ok");
  expect(await r("HEAD")).toEqual("ok");
  expect(await r("OPTIONS")).toEqual("ok");
});

test("should call the router with middleware", async () => {
  const router = new Router();

  router.use("GET", "/hello", {
    middlewares: [
      (fetch) => async (request) => {
        const res = await fetch(request);
        res?.headers.set("X-Injected", "True");
        return res;
      },
    ],
    fetch: () => new Response("ok"),
  });

  const response = await router.fetch(
    new Request("http://localhost/hello", { method: "GET" }),
  );

  const responseText = await response?.text();

  expect(responseText).toEqual("ok");
  expect(response?.headers.get("x-injected")).toEqual("True");
});

test("should transfer middleware when its match", async () => {
  const router = new Router();

  router.use("ALL", "/hello", {
    middlewares: [
      (fetch) => async (request) => {
        const res = await fetch(request);
        res?.headers.set("X-Injected", "True");
        return res;
      },
    ],
  });

  router.use("GET", "/hello", {
    fetch: () => new Response("ok"),
  });

  const response = await router.fetch(
    new Request("http://localhost/hello", { method: "GET" }),
  );

  const responseText = await response?.text();

  expect(responseText).toEqual("ok");
  expect(response?.headers.get("x-injected")).toEqual("True");
});

test("should use a route with extra test evaluation", async () => {
  const router = new Router();

  router.use("ALL", "/hello", {
    test: (request) => request.headers.get("x-able") === "True",
    middlewares: [
      (fetch) => async (request) => {
        const res = await fetch(request);
        res?.headers.set("X-Injected", "True");
        return res;
      },
    ],
    fetch: () => new Response("ok"),
  });

  const response1 = await router.fetch(
    new Request("http://localhost/hello", { method: "GET" }),
  );

  const response2 = await router.fetch(
    new Request("http://localhost/hello", {
      method: "GET",
      headers: { "X-Able": "True" },
    }),
  );

  expect(response1?.status).toEqual(404);
  expect(response2?.status).toEqual(200);
});

test("should declare global middleware", async () => {
  const router = new Router({
    middlewares: [
      (fetch) => async (request) => {
        const res = await fetch(request);
        res?.headers.set("X-Injected", "True");
        return res;
      },
    ],
  });

  router.use("ALL", "/hello", {
    fetch: () => new Response("ok"),
  });

  const response = await router.fetch(new Request("http://localhost/hello"));

  const responseText = await response?.text();

  expect(responseText).toEqual("ok");
  expect(response?.headers.get("x-injected")).toEqual("True");
});

test("should customize the error", async () => {
  const guardCanAccess = (_request: Request) => {
    try {
      throw new Error("bad");
    } catch (ex) {
      describeErrorResponse(ex, new Response(null, { status: 403 }));
      throw ex;
    }
  };

  const router = new Router();

  router.use("ALL", "/hello", {
    fetch: (request) => {
      guardCanAccess(request);
      return new Response("ok");
    },
  });

  const response = await router.fetch(new Request("http://localhost/hello"));

  expect(response?.status).toEqual(403);
});

test("should attach a http server to Node", async () => {
  const describeHTTPServer = async (server: import("node:http").Server) => {
    if (!server.listening) {
      await new Promise((resolve, reject) => {
        server.addListener("error", reject);
        server.addListener("listening", resolve);
      });
    }

    const address = server.address();
    const url =
      typeof address === "object" && address !== null
        ? new URL(`http://localhost:${address.port}`)
        : null;

    if (!url) throw new Error("Cannot get the address");

    return { url };
  };

  await using disposes = disposeWithController();
  disposes.add(() => {
    server.close();
  });

  const http = await import("node:http");

  const router = new Router();

  router.use("POST", "/", {
    fetch: () => new Response("ok", { headers: { a: "b" } }),
  });

  const server = http
    .createServer(async (req, res) => {
      await router.requestListener(req, res);
    })
    .listen();

  const { url } = await describeHTTPServer(server);

  const response = await fetch(`${new URL("/", url)}`, {
    method: "POST",
    body: "ok",
  });

  expect(response.headers.get("a")).toEqual("b");
  expect(await response.text()).toEqual("ok");
});

test("should attach a http server to Node pass direct request listener", async () => {
  await using cleanupTasks = new CleanupTasks();
  cleanupTasks.add(() => server.close());

  const describeHTTPServer = async (server: import("node:http").Server) => {
    if (!server.listening) {
      await new Promise((resolve, reject) => {
        server.addListener("error", reject);
        server.addListener("listening", resolve);
      });
    }

    const address = server.address();
    const url =
      typeof address === "object" && address !== null
        ? new URL(`http://localhost:${address.port}`)
        : null;

    if (!url) throw new Error("Cannot get the address");

    return { url };
  };

  await using disposes = disposeWithController();
  disposes.add(() => {
    server.close();
  });

  const http = await import("node:http");

  const router = new Router();

  router.use("POST", "/", {
    fetch: () => new Response("ok", { headers: { a: "b" } }),
  });

  const server = http.createServer(router.requestListener).listen();

  const { url } = await describeHTTPServer(server);

  const response = await fetch(`${new URL("/", url)}`, {
    method: "POST",
    body: "ok",
  });

  expect(response.headers.get("a")).toEqual("b");
  expect(await response.text()).toEqual("ok");
});

test("should attach a http server to Node and get the response", async () => {
  await using cleanupTasks = new CleanupTasks();
  cleanupTasks.add(() => server.close());

  const { createServer } = await import("node:http");

  const router = new Router();
  router.use("GET", "/hi", {
    fetch: () => Response.json({ ok: true }),
  });

  const server = createServer(router.requestListener);
  server.listen();

  const url = await new Promise<URL>((resolve, reject) => {
    server.addListener("listening", () => {
      const a = server.address();
      if (typeof a === "string")
        return resolve(new URL(sanatizeHostname(a), "http://localhost") as any);
      if (typeof a === "object" && a !== null)
        return resolve(
          new URL(`http://${sanatizeHostname(a.address)}:${a.port}`) as any,
        );
      return reject(new Error("Cannot get the address"));
    });
  });

  const res = await fetch(new URL("/hi", url) as any);

  expect(res.status).toEqual(200);
  expect(await res.json()).toEqual({ ok: true });
});

test("should attach a http server to Node and get the response with POST method", async () => {
  await using cleanupTasks = new CleanupTasks();
  cleanupTasks.add(() => server.close());

  const { createServer } = await import("node:http");

  const router = new Router();
  router.use("POST", "/hi", {
    fetch: async (req) => Response.json({ data: await req.text() }),
  });

  const server = createServer(router.requestListener);
  server.listen();

  const url = await new Promise<URL>((resolve, reject) => {
    server.addListener("listening", () => {
      const a = server.address();
      if (typeof a === "string")
        return resolve(new URL(sanatizeHostname(a), "http://localhost") as any);
      if (typeof a === "object" && a !== null)
        return resolve(
          new URL(`http://${sanatizeHostname(a.address)}:${a.port}`) as any,
        );
      return reject(new Error("Cannot get the address"));
    });
  });

  const res = await fetch(new URL("/hi", url) as any, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "ok",
  });

  expect(res.status).toEqual(200);
  expect(await res.json()).toEqual({ data: "ok" });
});

test("Streaming POST request body handling", async () => {
  const http = await import("node:http");

  const router = new Router();

  router.use("POST", "/", {
    fetch: async (req) => Response.json({ body: await req.text() }),
  });

  const server = http.createServer(router.requestListener).listen();

  const serverUrl = await new Promise<URL>((resolve, reject) => {
    server.addListener("error", reject);
    server.addListener("listening", () =>
      resolve(new URL(`http://localhost:${(server.address() as any).port}`)),
    );
  });

  const body = new ReadableStream({
    async start(controller) {
      controller.enqueue(new TextEncoder().encode("tick 1|"));
      await new Promise((r) => setTimeout(r, 200));
      controller.enqueue(new TextEncoder().encode("tick 2|"));
      await new Promise((r) => setTimeout(r, 200));
      controller.close();
    },
  });

  const res = await fetch(new URL("/", serverUrl).toString(), {
    method: "POST",
    body,
  });

  expect(res.status).toEqual(200);
  expect(await res.json()).toEqual({
    body: "tick 1|tick 2|",
  });
});

test("Partial streaming POST request body handling with cancellation", async () => {
  const http = await import("node:http");

  const router = new Router();

  router.use("POST", "/", {
    fetch: async (req) => {
      const bodyReadable = req.body!.getReader();
      const e = await bodyReadable.read();
      await bodyReadable.cancel();
      const text = new TextDecoder().decode(new Uint8Array(e.value));
      return Response.json({ body: text });
    },
  });

  const server = http.createServer(router.requestListener).listen();

  const serverUrl = await new Promise<URL>((resolve, reject) => {
    server.addListener("error", reject);
    server.addListener("listening", () =>
      resolve(new URL(`http://localhost:${(server.address() as any).port}`)),
    );
  });

  const body = new ReadableStream({
    async start(controller) {
      controller.enqueue(new TextEncoder().encode("tick 1|"));
      await new Promise((r) => setTimeout(r, 200));
      controller.enqueue(new TextEncoder().encode("tick 2|"));
      await new Promise((r) => setTimeout(r, 200));
      controller.close();
    },
  });

  const res = await fetch(new URL("/", serverUrl).toString(), {
    method: "POST",
    body,
  });

  expect(res.status).toEqual(200);
  expect(await res.json()).toEqual({
    body: "tick 1|",
  });
});

test("should return a Response when errorHandling is default", async () => {
  const router = new Router();

  const e = await router.fetch(new Request("http://localhost"));

  expectTypeOf(e).toMatchTypeOf<Response>();
});

test("should return a Response or null when errorHandling is 'pass'", async () => {
  const router = new Router({ errorHandling: "pass" });

  const e = await router.fetch(new Request("http://localhost"));

  expectTypeOf(e).toMatchTypeOf<null | Response>();
});

test("should return a Response or null when errorHandling returns a Response", async () => {
  const router = new Router({ errorHandling: (ex: any) => Response.json({}) });

  const e = await router.fetch(new Request("http://localhost"));

  expectTypeOf(e).toMatchTypeOf<null | Response>();
});

test("should return a Response or a number when errorHandling returns a number", async () => {
  const router = new Router({ errorHandling: (ex: any) => 1 });

  const e = await router.fetch(new Request("http://localhost"));

  expectTypeOf(e).toMatchTypeOf<number | Response>();
});
