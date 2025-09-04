import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcResultResponse,
  JsonRpcErrorResponse,
  JsonRpcHandler,
  JsonRpcEvent,
} from "./types.js";
import { JsonRpcError } from "./types.js";
import { z } from "zod";
import { Router } from "../http/router.js";
import { type RouterOptionsDef } from "../http/types/router-options-def.js";
import { DataEventSourceEncoder } from "./utils/event-source/data-event-source.js";

const jsonRpcRequestSchema = z.object({
  id: z.union([z.string(), z.number()]),
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.any(),
});

const bodyRequest = z.union([
  jsonRpcRequestSchema,
  z.array(jsonRpcRequestSchema),
]);

type Options = {
  sseEnabled: boolean;
};

export class JsonRpcDispatcher {
  private static sseWarningDisplayed = true;
  private handlers = new Map<string, JsonRpcHandler>();
  private subscribers = new Set<(response: JsonRpcResponse) => void>();
  private requests = new Set<Promise<JsonRpcResponse>>();

  private options: Options;

  constructor(options?: Partial<Options>) {
    this.options = {
      sseEnabled: false,
      ...options,
    };

    if (this.options.sseEnabled && JsonRpcDispatcher.sseWarningDisplayed) {
      console.warn(
        "Warning: SSE support is experimental and should be used with caution.",
      );
      JsonRpcDispatcher.sseWarningDisplayed = false;
    }
  }

  async stop() {
    await Promise.allSettled(this.requests);
  }

  private propagate(response: JsonRpcResponse) {
    for (const subscriber of this.subscribers) {
      subscriber(response);
    }
  }

  registerMethod<P = any, R = any>(
    method: string,
    handler: JsonRpcHandler<P, R>,
  ): void {
    this.handlers.set(method, handler);
  }

  /**
   * @deprecated Use registerMethod() instead. This method is kept for backward compatibility.
   */
  use<P = any, R = any>(method: string, handler: JsonRpcHandler<P, R>): void {
    this.registerMethod(method, handler);
  }

  subscribe(callback: (response: JsonRpcResponse) => void) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  request<P = any>(request: JsonRpcRequest<P>) {
    const handler = this.handlers.get(request.method);

    const process = Promise.withResolvers<JsonRpcResponse>();

    this.requests.add(process.promise);

    const params = request.params;
    Promise.resolve(handler)
      .then(async (handler): Promise<JsonRpcResultResponse> => {
        if (!handler)
          throw new JsonRpcError(-32601, `Method not found: ${request.method}`);
        return {
          id: request.id,
          jsonrpc: "2.0",
          result: await handler(params, request, event ?? {}),
        };
      })
      .catch((error): JsonRpcErrorResponse => {
        return {
          id: request.id,
          jsonrpc: "2.0",
          error: JsonRpcError.isJsonRpcError(error)
            ? {
                code: error.code,
                message: error.message,
                data: error.data,
              }
            : {
                code: -32603,
                message: "Internal error",
                data: error,
              },
        };
      })
      .then((response) => {
        process.resolve(response);
        this.propagate(response);
      })
      .finally(() => {
        this.requests.delete(process.promise);
      });

    return {
      response: process.promise,
    };
  }

  fetch = async (request: Request): Promise<Response> => {
    const event: JsonRpcEvent = {
      httpRequest: request,
    };

    try {
      const method = request.method;
      const contentType = request.headers.get("Content-Type");

      if (method === "POST" || (this.options.sseEnabled && method === "PUT")) {
        const body =
          contentType === "application/json" ? await request.json() : null;
        const bodyParsed = bodyRequest.safeParse(body);
        if (!bodyParsed.success) {
          return new Response("Bad Request", { status: 400 });
        }

        const getResponseForPostMethod = (e: {
          response: Promise<JsonRpcResponse>;
        }) => (method === "POST" ? e.response : null);

        const response = Array.isArray(bodyParsed.data)
          ? await Promise.all(
              bodyParsed.data.map((req) =>
                getResponseForPostMethod(this.request(req, event)),
              ),
            )
          : await getResponseForPostMethod(
              this.request(bodyParsed.data, event),
            );

        return new Response(
          method === "POST" ? JSON.stringify(response) : null,
          {
            status: 200,
          },
        );
      }

      if (this.options.sseEnabled && method === "GET") {
        let unsub: () => void;
        const readable = new ReadableStream<Uint8Array>({
          start: (controller) => {
            unsub = this.subscribe((response) => {
              controller.enqueue(
                new DataEventSourceEncoder().encode({
                  data: JSON.stringify(response),
                }),
              );
            });
          },
          cancel: () => {
            unsub();
          },
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      return new Response("Method not allowed", { status: 405 });
    } catch (error) {
      console.error("Error processing JSON-RPC request:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  };

  // @ts-ignore
  [Router.customOptions]: RouterOptionsDef<any> = {
    fetch: this.fetch,
  };
}
