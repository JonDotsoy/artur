import { test, expect, mock, beforeEach, afterEach, describe } from "bun:test";
import { JsonRpcDispatcher } from "./json-rpc-dispatcher.js";
import {
  JsonRpcError,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "./types.js";
import { Router } from "../http/router.js";

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

describe("JsonRpcDispatcher", () => {
  let dispatcher: JsonRpcDispatcher;

  beforeEach(() => {
    dispatcher = new JsonRpcDispatcher();
  });

  afterEach(async () => {
    await dispatcher.stop();
  });

  test("should register method handler and receive request object when called", async () => {
    const p = Promise.withResolvers<JsonRpcRequest>();
    await dispatcher.use("testMethod", (params, request) => {
      p.resolve(request);
    });
    dispatcher.request({
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
    const p = Promise.withResolvers<JsonRpcRequest>();
    await dispatcher.registerMethod("testMethod", (params, request) => {
      p.resolve(request);
    });
    dispatcher.request({
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
  test("should handle method execution and emit response through subscription", async () => {
    const p = Promise.withResolvers<JsonRpcResponse>();
    dispatcher.use("testMethod", (params, request) => {
      return {
        ok: true,
      };
    });
    dispatcher.subscribe((response) => {
      p.resolve(response);
    });
    dispatcher.request({
      id: 1,
      jsonrpc: "2.0",
      method: "testMethod",
      params: {},
    });
    const response = await p.promise;
    expect(response).toMatchObject({
      id: 1,
      jsonrpc: "2.0",
      result: {
        ok: true,
      },
    });
  });
  test("should return response promise directly from request method", async () => {
    dispatcher.use("testMethod", (params, request) => {
      return {
        ok: true,
      };
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
      result: {
        ok: true,
      },
    });
  });
  test("should handle single JSON-RPC request via HTTP POST and return JSON response", async () => {
    dispatcher.use("testMethod", (params, request) => {
      return {
        ok: true,
      };
    });

    const response = await dispatcher.fetch(
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
    dispatcher.use("testMethod", (params, request) => {
      return {
        ok: true,
      };
    });

    const response = await dispatcher.fetch(
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
    dispatcher = new JsonRpcDispatcher({
      sseEnabled: true,
    });
    const pushChunk = mock((chunk: any) => {});
    const pending = Promise.withResolvers<void>();

    dispatcher.use("testMethod", (params, request) => {
      return {
        ok: true,
      };
    });

    const response = await dispatcher.fetch(
      new Request("http://localhost", {
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

    await dispatcher.fetch(
      new Request("http://localhost", {
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
});

describe("Router integration", () => {
  let dispatcher: JsonRpcDispatcher;

  beforeEach(() => {
    dispatcher = new JsonRpcDispatcher();
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

    router.use("POST", "/json-rpc", dispatcher);

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
