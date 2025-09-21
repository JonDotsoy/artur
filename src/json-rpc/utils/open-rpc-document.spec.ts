import { describe, test, expect } from "bun:test";
import { JsonRpcRouter } from "../json-rpc-router";
import { z } from "zod";
import { fromJsonRpcRouter } from "./open-rpc-document";

describe("open-rpc-document", () => {
  test("should generate OpenRPC document for method with object parameters", () => {
    const router = new JsonRpcRouter();

    router.method("sum", (params) => params.a + params.b, {
      inputValidation: z.object({
        a: z.number(),
        b: z.number(),
      }),
      outputValidation: z.number(),
    });

    expect(fromJsonRpcRouter(router)).toMatchSnapshot();
  });

  test("should generate OpenRPC document for method with tuple parameters", () => {
    const router = new JsonRpcRouter();

    router.method("sum", ([a, b]) => a + b, {
      inputValidation: z.tuple([z.number(), z.number()]),
      outputValidation: z.number(),
    });

    expect(fromJsonRpcRouter(router)).toMatchSnapshot();
  });

  test("should generate OpenRPC document for method with object response", () => {
    const router = new JsonRpcRouter();

    router.method("sum", ([a, b]) => ({ result: a + b }), {
      inputValidation: z.tuple([z.number(), z.number()]),
      outputValidation: z.object({
        result: z.number(),
      }),
    });

    expect(fromJsonRpcRouter(router)).toMatchSnapshot();
  });

  test("should generate OpenRPC document for method with schema descriptions", () => {
    const router = new JsonRpcRouter();

    router.method("sum", ([a, b]) => ({ result: a + b }), {
      inputValidation: z.tuple([
        z.number().describe("The first number"),
        z.number().describe("The second number"),
      ]),
      outputValidation: z
        .object({
          result: z.number(),
        })
        .describe("The result of the sum"),
    });

    expect(fromJsonRpcRouter(router)).toMatchSnapshot();
  });
});
