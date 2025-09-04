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
import { Queue, MemoryStore, Store, Message } from "@jondotsoy/utils-js/queue";

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
  sessionIdFactory: (event: JsonRpcEvent) => string | null;
};

const sessionIdFactory = (event: JsonRpcEvent) => {
  if (event.httpRequest) {
    const request = event.httpRequest;
    const url = new URL(request.url);
    const jsonRpcToken = url.searchParams.get("json_rpc_token");
    if (jsonRpcToken) {
      return jsonRpcToken;
    }
    const headerJsonRpcToken = request.headers.get("x-json-rpc-token")?.trim();
    if (headerJsonRpcToken) {
      return headerJsonRpcToken;
    }
    const token = url.searchParams.get("token");
    if (token) {
      return token;
    }
  }
  return null;
};

const shareMemory = new Map<string, MemoryStore>();

class SessionMemoryStore extends Store {
  #sessionId: string;
  constructor(sessionId: string) {
    super();
    this.#sessionId = sessionId;
  }
  async addMessage(message: Message): Promise<void> {
    let messages = shareMemory.get(this.#sessionId);
    if (!messages) {
      messages = new MemoryStore();
      shareMemory.set(this.#sessionId, messages);
    }
    messages.addMessage(message);
  }
  async getMessage(messageId: string): Promise<Message | null> {
    return (
      (await shareMemory.get(this.#sessionId)?.getMessage(messageId)) ?? null
    );
  }
  async acknowledgeMessage(messageId: string): Promise<void> {
    await shareMemory.get(this.#sessionId)?.acknowledgeMessage(messageId);
  }
  async deleteMessage(messageId: string): Promise<void> {
    const sessionMemory = shareMemory.get(this.#sessionId);
    if (sessionMemory) {
      await sessionMemory.deleteMessage(messageId);
      if ((await sessionMemory.getSize()) === 0) {
        await sessionMemory.close();
        shareMemory.delete(this.#sessionId);
      }
    }
  }
  async claimMessage(
    acknowledgeTimeoutMs: number,
    now: number,
    abort?: AbortSignal,
  ): Promise<Message | null> {
    return (
      (await shareMemory
        .get(this.#sessionId)
        ?.claimMessage(acknowledgeTimeoutMs, now, abort)) ?? null
    );
  }
  async getSize(): Promise<number> {
    return (await shareMemory.get(this.#sessionId)?.getSize()) ?? 0;
  }
  async close(): Promise<void> {
    await shareMemory.get(this.#sessionId)?.close();
  }
}

const sessionMemoryStore = (sessionId: string) =>
  new SessionMemoryStore(sessionId);

export class Session {
  #id: string;
  #jsonRpcDispatcher: JsonRpcDispatcher;
  #queue: Queue;

  constructor(id: string, jsonRpcDispatcher: JsonRpcDispatcher, queue: Queue) {
    this.#id = id;
    this.#jsonRpcDispatcher = jsonRpcDispatcher;
    this.#queue = queue;
  }

  async request<P = any>(request: JsonRpcRequest<P>, event?: JsonRpcEvent) {
    const response = await this.#jsonRpcDispatcher.request(request, event)
      .response;
    await this.#queue.add(response);
  }

  async *consume(signal?: AbortSignal) {
    for await (const message of this.#queue.consume(signal)) {
      yield {
        message,
        ack: () => this.#queue.ack(message.id),
      };
    }
  }
}

export class JsonRpcDispatcher {
  private static sseWarningDisplayed = true;
  private handlers = new Map<string, JsonRpcHandler>();
  private requests = new Set<Promise<JsonRpcResponse>>();

  private options: Options;

  constructor(options?: Partial<Options>) {
    this.options = {
      sseEnabled: false,
      sessionIdFactory: sessionIdFactory,
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

  openSession(sessionId: string) {
    const session = new Session(
      sessionId,
      this,
      new Queue({ store: sessionMemoryStore(sessionId) }),
    );

    return session;
  }

  request<P = any>(request: JsonRpcRequest<P>, event?: JsonRpcEvent) {
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

      if (method === "POST") {
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

      if (this.options.sseEnabled && method === "PUT") {
        const sessionId = this.options.sessionIdFactory(event);

        if (!sessionId) {
          return new Response("Bad Request", { status: 400 });
        }

        const body =
          contentType === "application/json" ? await request.json() : null;

        const bodyParsed = bodyRequest.safeParse(body);

        if (!bodyParsed.success) {
          return new Response("Bad Request", { status: 400 });
        }

        const session = this.openSession(sessionId);

        const parsedDataArray = Array.isArray(bodyParsed.data)
          ? bodyParsed.data
          : [bodyParsed.data];

        for (const jsonRpcRequest of parsedDataArray) {
          await session.request(jsonRpcRequest, event);
        }

        return new Response(null, {
          status: 200,
        });
      }

      if (this.options.sseEnabled && method === "GET") {
        const sessionId = this.options.sessionIdFactory(event);

        if (!sessionId) {
          return new Response("Bad Request", { status: 400 });
        }

        const abortController = new AbortController();

        const readable = new ReadableStream<Uint8Array>({
          start: async (controller) => {
            const session = this.openSession(sessionId);

            for await (const ctl of session.consume(abortController.signal)) {
              const { message, ack } = ctl;
              controller.enqueue(
                new DataEventSourceEncoder().encode({
                  data: JSON.stringify(message),
                }),
              );
              ack();
            }
          },
          cancel: () => {
            abortController.abort();
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
