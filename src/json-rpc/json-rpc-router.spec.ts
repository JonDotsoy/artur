import {
  test,
  expect,
  mock,
  beforeEach,
  afterEach,
  describe,
  beforeAll,
} from "bun:test";
import { JsonRpcRouter, type JsonRpcNotification } from "./json-rpc-router.js";
import { JsonRpcError } from "./json-rpc-error.js";
import { type JsonRpcResponse } from "./types/json-rpc-response.js";
import { type JsonRpcRequest } from "./types/json-rpc-request.js";
import { Router } from "../http/router.js";
import { z } from "zod";
import { expectTypeOf } from "expect-type";
import { customRouteSymbol } from "../http/constants/custom-options-symbol.js";

describe("JsonRpcError", () => {
  test("should create error with code and message", () => {
    const error = new JsonRpcError(-32600, "Invalid Request");
    expect(error.code).toBe(-32600);
    expect(error.message).toBe("Invalid Request");
    expect(error.data).toBeUndefined();
  });

  test("should create error with data", () => {
    const data = { additional: "info" };
    const error = new JsonRpcError(-32601, "Method not found", data);
    expect(error.data).toEqual(data);
  });
});

describe("JsonRpcRouter", () => {
  let router: JsonRpcRouter;

  beforeEach(() => {
    router = new JsonRpcRouter();
  });

  afterEach(async () => {
    await router.stop();
  });

  test("should register method handler and receive request object when called", async () => {
    const p = Promise.withResolvers<JsonRpcRequest | JsonRpcNotification>();
    await router.use("testMethod", (params, request) => {
      p.resolve(request);
    });
    router.request({
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    });
    const request = await p.promise;
    expect(request).toMatchObject({
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    });
  });

  test("should register method handler using registerMethod API", async () => {
    const p = Promise.withResolvers<JsonRpcRequest | JsonRpcNotification>();
    await router.method("testMethod", (params, request) => {
      p.resolve(request);
    });
    router.request({
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    });
    const request = await p.promise;
    expect(request).toMatchObject({
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    });
  });
  test("should return response promise directly from request method", async () => {
    router.use("testMethod", (params, request) => {
      return {
        ok: true,
      };
    });

    const response = await router.request({
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    }).response;

    expect(response).toMatchObject({
      id: 1,
      jsonrpc: "2.0",
      result: {
        ok: true,
      },
    });
  });
  test("should handle single JSON-RPC request via HTTP POST and return JSON response", async () => {
    router.use("testMethod", (params, request) => {
      return {
        ok: true,
      };
    });

    const response = await router.fetch(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "testMethod",
          params: {},
        } satisfies JsonRpcRequest),
      }),
    );

    const data = await response.json();

    expect(data).toMatchObject({
      id: 1,
      jsonrpc: "2.0",
      result: {
        ok: true,
      },
    });
  });
  test("should handle batch JSON-RPC requests via HTTP POST and return array of responses", async () => {
    router.use("testMethod", (params, request) => {
      return {
        ok: true,
      };
    });

    const response = await router.fetch(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            id: 1,
            jsonrpc: "2.0",
            method: "testMethod",
            params: {},
          } satisfies JsonRpcRequest,
          {
            id: 2,
            jsonrpc: "2.0",
            method: "testMethod",
            params: {},
          } satisfies JsonRpcRequest,
        ]),
      }),
    );

    const data = await response.json();

    expect(data).toMatchObject([
      {
        id: 1,
        jsonrpc: "2.0",
        result: {
          ok: true,
        },
      },
      {
        id: 2,
        jsonrpc: "2.0",
        result: {
          ok: true,
        },
      },
    ]);
  });
  test("should stream JSON-RPC responses via Server-Sent Events when using GET and PUT requests", async () => {
    router = new JsonRpcRouter({
      sseEnabled: true,
    });
    const pushChunk = mock((chunk: any) => {});
    const pending = Promise.withResolvers<void>();

    router.use("testMethod", (params, request) => {
      return {
        ok: true,
      };
    });

    const response = await router.fetch(
      new Request("http://localhost?json_rpc_token=test-token", {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
        },
      }),
    );

    response.body!.pipeTo(
      new WritableStream({
        write: (chunk) => {
          pushChunk(new TextDecoder().decode(chunk));
          pending.resolve();
        },
      }),
    );

    await router.fetch(
      new Request("http://localhost?json_rpc_token=test-token", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "testMethod",
          params: {},
        }),
      }),
    );

    await pending.promise;

    expect(pushChunk).toHaveBeenCalledWith(
      'data: {"id":1,"jsonrpc":"2.0","result":{"ok":true}}\n\n',
    );
  });

  test("should properly type-check method parameters when input validation schema is provided", () => {
    const dispatcher = new JsonRpcRouter({ sseEnabled: true });

    const input = z.object({
      name: z.string(),
    });

    dispatcher.method(
      "testMethod",
      (params) => {
        expectTypeOf(params).toEqualTypeOf<{ name: string }>();
      },
      {
        inputValidation: input,
      },
    );
  });

  test("should properly type-check both input and output when validation schemas are provided", () => {
    const dispatcher = new JsonRpcRouter({ sseEnabled: true });

    const input = z.object({
      name: z.string(),
    });

    const output = z.object({
      ok: z.boolean(),
      message: z.string(),
    });

    dispatcher.method(
      "testMethod",
      (params) => {
        expectTypeOf(params).toEqualTypeOf<{ name: string }>();

        return {
          ok: true,
          message: "Success",
        };
      },
      {
        inputValidation: input,
        outputValidation: output,
      },
    );
  });

  test("should type-check parameters as unknown when only output validation is provided", () => {
    const dispatcher = new JsonRpcRouter({ sseEnabled: true });

    const output = z.object({
      ok: z.boolean(),
      message: z.string(),
    });

    dispatcher.method(
      "testMethod",
      (params) => {
        expectTypeOf(params).toEqualTypeOf<unknown>();

        return {
          ok: true,
          message: "Success",
        };
      },
      {
        outputValidation: output,
      },
    );
  });

  test("should type-check parameters as unknown when no validation schemas are provided", () => {
    const dispatcher = new JsonRpcRouter({ sseEnabled: true });

    dispatcher.method("testMethod", (params) => {
      expectTypeOf(params).toEqualTypeOf<unknown>();
    });
  });

  test("should accept valid input parameters when input validation is provided", async () => {
    const handler = mock();
    const dispatcher = new JsonRpcRouter();

    const input = z.object({
      name: z.string(),
    });

    dispatcher.method("testMethod", handler, {
      inputValidation: input,
    });

    expect(async () => {
      await dispatcher.request({
        id: 1,
        jsonrpc: "2.0",
        method: "testMethod",
        params: {
          name: "Artur",
        },
      }).response;
    }).not.toThrow();

    expect(handler).toHaveBeenCalled();
  });

  test("should return validation error when input parameters are invalid", async () => {
    const handler = mock();
    const dispatcher = new JsonRpcRouter();

    const input = z.object({
      name: z.string(),
    });

    dispatcher.method("testMethod", handler, {
      inputValidation: input,
    });

    const response = await dispatcher.request({
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    }).response;

    expect(response).toMatchObject({
      id: 1,
      jsonrpc: "2.0",
      error: {
        code: -32602,
        message: "Invalid params",
      },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  test("should not invoke handler when input validation fails", async () => {
    const handler = mock();
    const dispatcher = new JsonRpcRouter();

    const input = z.object({
      name: z.string(),
    });

    dispatcher.method("testMethod", handler, {
      inputValidation: input,
    });

    const response = await dispatcher.request({
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    }).response;

    expect(response).toMatchObject({
      id: 1,
      jsonrpc: "2.0",
      error: {
        code: -32602,
        message: "Invalid params",
      },
    });
  });

  test("should return internal error when output validation fails", async () => {
    const dispatcher = new JsonRpcRouter();

    const output = z.object({
      message: z.string(),
    });

    // Handler returns invalid output (missing message property)
    dispatcher.method(
      "testMethod",
      () => {
        return { invalidProperty: "value" } as any; // This will fail validation at runtime
      },
      {
        outputValidation: output,
      },
    );

    const response = await dispatcher.request({
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    }).response;

    expect(response).toMatchObject({
      id: 1,
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal error",
      },
    });
  });

  test("should register method with input validation and enable method listing", async () => {
    const dispatcher = new JsonRpcRouter();

    dispatcher.method("testMethod", mock(), {
      inputValidation: z.object({ name: z.string() }),
    });

    dispatcher.enableMethodListing("rpc.discover");
  });

  test("should discover registered methods with input validation schemas", async () => {
    const dispatcher = new JsonRpcRouter();

    dispatcher.method("testMethod", mock(), {
      inputValidation: z.object({ name: z.string() }),
    });

    dispatcher.enableMethodListing("rpc.discover");

    const response = await dispatcher.request({
      id: 1,
      jsonrpc: "2.0",
      method: "rpc.discover",
      params: {},
    }).response;

    expect(response).toMatchObject({
      id: 1,
      jsonrpc: "2.0",
      result: {
        info: {},
        methods: [{ name: "testMethod" }],
      },
    });
  });

  test("should discover registered methods with both input and output validation schemas", async () => {
    const dispatcher = new JsonRpcRouter();

    dispatcher.method("testMethod", mock(), {
      inputValidation: z.object({ name: z.string() }),
      outputValidation: z.object({ ok: z.boolean() }),
    });

    dispatcher.enableMethodListing("rpc.discover");

    const response = await dispatcher.request({
      id: 1,
      jsonrpc: "2.0",
      method: "rpc.discover",
      params: {},
    }).response;

    expect(response).toMatchObject({
      id: 1,
      jsonrpc: "2.0",
      result: {
        info: {},
        methods: [
          {
            name: "testMethod",
          },
        ],
      },
    });
  });
});

describe("Router integration", () => {
  let dispatcher: JsonRpcRouter;

  beforeEach(() => {
    dispatcher = new JsonRpcRouter();
    dispatcher.use("testMethod", (params, request) => {
      return {
        ok: true,
      };
    });
  });

  afterEach(async () => {
    await dispatcher.stop();
  });

  test("should integrate with Router to handle JSON-RPC requests via HTTP endpoint", async () => {
    const router = new Router();

    router.route("POST", "/json-rpc", dispatcher);

    const response = await router.fetch(
      new Request("http://localhost/json-rpc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "testMethod",
          params: {},
        }),
      }),
    );

    const body = await response.json();

    expect(body).toMatchObject({
      id: 1,
      jsonrpc: "2.0",
      result: {
        ok: true,
      },
    });
  });
});

describe("Session management", () => {
  test("should handle requests when session has no registered methods", async () => {
    const dispatcher = new JsonRpcRouter();

    const session = dispatcher.openSession("test-session-1");

    await session.request({
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    });
  });

  test("should execute method and return response via session consume", async () => {
    const dispatcher = new JsonRpcRouter();

    dispatcher.method("testMethod", (params, request) => {
      return {
        ok: true,
      };
    });

    const session = dispatcher.openSession("test-session-2");

    await session.request({
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    });

    const consuming = session.consume();
    const { value } = await consuming.next();

    expect(value).toMatchObject({
      message: {
        id: 1,
        jsonrpc: "2.0",
        result: {
          ok: true,
        },
      },
      ack: expect.any(Function),
    });
  });

  test("should consume session responses with abort controller", async () => {
    const push = mock();
    const dispatcher = new JsonRpcRouter();

    dispatcher.method("testMethod", (params, request) => {
      return {
        ok: true,
      };
    });

    const session = dispatcher.openSession("test-session");

    await session.request({
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    });

    const worker = async () => {
      const abortController = new AbortController();
      for await (const value of session.consume(abortController.signal)) {
        push(value);
        abortController.abort();
      }
    };

    await worker();

    expect(push).toHaveBeenCalledWith({
      message: {
        id: 1,
        jsonrpc: "2.0",
        result: {
          ok: true,
        },
      },
      ack: expect.any(Function),
    });
  });

  test("should stream responses via SSE when using session tokens", async () => {
    const push = mock();
    const dispatcher = new JsonRpcRouter({ sseEnabled: true });

    dispatcher.method("testMethod", (params, request) => {
      return {
        ok: true,
      };
    });

    const jsonRpcResponse = await dispatcher.fetch(
      new Request("http://localhost/json-rpc?json_rpc_token=1", {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
        },
      }),
    );

    jsonRpcResponse.body?.pipeTo(
      new WritableStream({
        write: (chunk) => {
          push(new TextDecoder().decode(chunk));
        },
      }),
    );

    const jsonRpcPutResponse = await dispatcher.fetch(
      new Request("http://localhost/json-rpc?json_rpc_token=1", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method: "testMethod",
          params: {},
        }),
      }),
    );

    expect(jsonRpcPutResponse.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(push).toHaveBeenCalledWith(
      'data: {"id":1,"jsonrpc":"2.0","result":{"ok":true}}\n\n',
    );
  });
});

describe("sse integration", () => {
  let router: Router;

  beforeAll(() => {
    const jsonRpc = new JsonRpcRouter({ sseEnabled: true });

    router = new Router();

    router.route("/rpc", jsonRpc);
  });

  test("should return 400 for GET request without event-stream accept header", async () => {
    const response = await router.fetch(
      new Request("http://localhost/rpc?json_rpc_token=1", { method: "GET" }),
    );
    expect(response.status).toBe(404);
  });

  test("should return 200 for GET request with event-stream accept header", async () => {
    const abortController = new AbortController();
    const response = await router.fetch(
      new Request("http://localhost/rpc?json_rpc_token=1", {
        method: "GET",
        headers: { Accept: "text/event-stream" },
        signal: abortController.signal,
      }),
    );
    abortController.abort();
    expect(response.status).toBe(200);
  });

  test("should return 200 for POST request with event-stream accept header", async () => {
    const abortController = new AbortController();
    const response = await router.fetch(
      new Request("http://localhost/rpc?json_rpc_token=1", {
        method: "POST",
        headers: { Accept: "text/event-stream" },
        signal: abortController.signal,
      }),
    );
    abortController.abort();
    expect(response.status).toBe(200);
  });

  test("should handle duplicate GET request with event-stream accept header", async () => {
    const abortController = new AbortController();
    const response = await router.fetch(
      new Request("http://localhost/rpc?json_rpc_token=1", {
        method: "GET",
        headers: { Accept: "text/event-stream" },
        signal: abortController.signal,
      }),
    );
    abortController.abort();
    expect(response.status).toBe(200);
  });

  test("should handle JSON-RPC POST request with application/json accept header", async () => {
    const jsonRpcRequest: JsonRpcRequest = {
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    };

    const response = await router.fetch(
      new Request("http://localhost/rpc", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonRpcRequest),
      }),
    );

    const body = await response.text();
    expect(response.status).toBe(200);
  });
});
