import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { EventEncoder, type Event } from "./event-encoder.js";
import { serve, type Server } from "bun";
import { EventSourcePolyfill } from "event-source-polyfill";

type EventSource = EventSourcePolyfill;
const EventSource = EventSourcePolyfill;

describe("DataEventSourceEncoder", () => {
  test("should create basic data event with only data field", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      data: "Hello World",
    });

    expect(new TextDecoder().decode(result)).toBe("data: Hello World\n\n");
  });

  test("should create event with all fields", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      id: 123,
      event: "message",
      data: "Test data",
      retry: 5000,
    });

    expect(new TextDecoder().decode(result)).toBe(
      "event: message\nid: 123\nretry: 5000\ndata: Test data\n\n",
    );
  });

  test("should handle multiline data", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      data: "Line 1\nLine 2\nLine 3",
    });

    expect(new TextDecoder().decode(result)).toBe(
      "data: Line 1\ndata: Line 2\ndata: Line 3\n\n",
    );
  });

  test("should normalize numeric values to strings", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      id: 42,
      event: "message",
      data: "test",
      retry: 1000,
    });

    expect(new TextDecoder().decode(result)).toBe(
      "event: message\nid: 42\nretry: 1000\ndata: test\n\n",
    );
  });

  test("should JSON stringify values with newlines", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      event: "test\nwith\nnewlines",
      data: "simple data",
    });

    expect(new TextDecoder().decode(result)).toBe(
      'event: "test\\nwith\\nnewlines"\ndata: simple data\n\n',
    );
  });

  test("should handle empty data", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      data: "",
    });

    expect(new TextDecoder().decode(result)).toBe("data: \n\n");
  });

  test("should handle string ID", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      id: "unique-id-123",
      data: "test",
    });

    expect(new TextDecoder().decode(result)).toBe(
      "id: unique-id-123\ndata: test\n\n",
    );
  });

  test("should omit optional fields when not provided", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      data: "only data field",
    });

    const decodedResult = new TextDecoder().decode(result);
    expect(decodedResult).not.toContain("event:");
    expect(decodedResult).not.toContain("id:");
    expect(decodedResult).not.toContain("retry:");
    expect(decodedResult).toBe("data: only data field\n\n");
  });

  test("should handle zero as retry value", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      data: "test",
      retry: 0,
    });

    // Zero is falsy, so retry field will be omitted
    expect(new TextDecoder().decode(result)).toBe("data: test\n\n");
  });

  test("should handle zero as ID", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      id: 0,
      data: "test",
    });

    // Zero is falsy, so id field will be omitted
    expect(new TextDecoder().decode(result)).toBe("data: test\n\n");
  });

  test("should handle non-string data by serializing to JSON", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      data: { message: "hello", count: 42 },
    });

    expect(new TextDecoder().decode(result)).toBe(
      'data: {"message":"hello","count":42}\n\n',
    );
  });

  test("should handle numeric data", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      data: 12345,
    });

    expect(new TextDecoder().decode(result)).toBe("data: 12345\n\n");
  });

  test("should handle array data", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      data: [1, 2, 3],
    });

    expect(new TextDecoder().decode(result)).toBe("data: [1,2,3]\n\n");
  });

  test("should handle boolean data", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      data: true,
    });

    expect(new TextDecoder().decode(result)).toBe("data: true\n\n");
  });

  test("should handle null data", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      data: null,
    });

    expect(new TextDecoder().decode(result)).toBe("data: null\n\n");
  });

  test("should create encoder instance", () => {
    const encoder = new EventEncoder();
    expect(encoder).toBeDefined();
    expect(typeof encoder.encode).toBe("function");
  });

  test("should handle empty string ID", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      id: "",
      data: "test",
    });

    // Empty string is falsy, so id field will be omitted
    expect(new TextDecoder().decode(result)).toBe("data: test\n\n");
  });

  test("should handle empty string event", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      event: "",
      data: "test",
    });

    // Empty string is falsy, so event field will be omitted
    expect(new TextDecoder().decode(result)).toBe("data: test\n\n");
  });

  test("should handle undefined data", () => {
    const encoder = new EventEncoder();
    // undefined data will cause an error in the current implementation
    // since JSON.stringify(undefined) returns undefined, not a string
    expect(() => {
      encoder.encode({
        data: undefined,
      });
    }).toThrow();
  });

  test("should handle complex object data", () => {
    const encoder = new EventEncoder();
    const complexObject = {
      nested: {
        array: [1, 2, { deep: "value" }],
        boolean: false,
        null_value: null,
      },
    };
    const result = encoder.encode({
      data: complexObject,
    });

    expect(new TextDecoder().decode(result)).toBe(
      'data: {"nested":{"array":[1,2,{"deep":"value"}],"boolean":false,"null_value":null}}\n\n',
    );
  });

  test("should handle data with special characters", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      data: "Special chars: àáâãäåæçèéêë ñóôõö ♠♣♥♦",
    });

    expect(new TextDecoder().decode(result)).toBe(
      "data: Special chars: àáâãäåæçèéêë ñóôõö ♠♣♥♦\n\n",
    );
  });

  test("should handle event field with special characters", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      event: "event-with-émojis-🎉",
      data: "test",
    });

    expect(new TextDecoder().decode(result)).toBe(
      "event: event-with-émojis-🎉\ndata: test\n\n",
    );
  });

  test("should handle very long ID", () => {
    const encoder = new EventEncoder();
    const longId = "a".repeat(1000);
    const result = encoder.encode({
      id: longId,
      data: "test",
    });

    expect(new TextDecoder().decode(result)).toBe(
      `id: ${longId}\ndata: test\n\n`,
    );
  });

  test("should handle negative numeric ID", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      id: -123,
      data: "test",
    });

    expect(new TextDecoder().decode(result)).toBe("id: -123\ndata: test\n\n");
  });

  test("should handle floating point retry value", () => {
    const encoder = new EventEncoder();
    const result = encoder.encode({
      retry: 1500.5,
      data: "test",
    });

    expect(new TextDecoder().decode(result)).toBe(
      "retry: 1500.5\ndata: test\n\n",
    );
  });
});

describe("DataEventSource integration tests", () => {
  let server: Server;
  let subscribers: Set<(data: Event) => void>;
  const publish = (data: Event) => {
    for (const sub of subscribers) {
      sub(data);
    }
  };
  let eventSource: EventSource;

  beforeEach(async () => {
    const opened = Promise.withResolvers<void>();
    subscribers = new Set();
    server = Bun.serve({
      port: 54987,
      fetch: () => {
        const reader = new ReadableStream({
          start(controller) {
            controller.enqueue(
              new EventEncoder().encode({
                event: "keep-alive",
                data: new Date(),
              }),
            );
            subscribers.add((data) => {
              controller.enqueue(new EventEncoder().encode(data));
            });
          },
        });
        return new Response(reader, {
          headers: {
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      },
    });

    eventSource = new EventSource(server.url.toString());

    eventSource.addEventListener("open", () => opened.resolve());

    await opened.promise;
  });

  afterEach(async () => {
    eventSource.close();
    await server.stop();
  });

  test("should receive basic message data through event source", async () => {
    const { promise, resolve } = Promise.withResolvers();

    eventSource.addEventListener("message", (message) => resolve(message.data));

    publish({
      data: "hello",
    });

    expect(await promise).toBe("hello");
  });

  test("should handle multiline message data correctly", async () => {
    const { promise, resolve } = Promise.withResolvers();

    eventSource.addEventListener("message", (message) => resolve(message.data));

    publish({
      data: "hello\nworld!\n\n\n",
    });

    expect(await promise).toBe("hello\nworld!\n\n\n");
  });

  test("should receive custom event type messages", async () => {
    const { promise, resolve } = Promise.withResolvers();

    eventSource.addEventListener("hello", (message: any) =>
      resolve(message.data),
    );

    publish({
      event: "hello",
      data: "world",
    });

    expect(await promise).toBe("world");
  });

  test("should preserve event ID in lastEventId property", async () => {
    const { promise, resolve } = Promise.withResolvers();

    eventSource.addEventListener("hello", (message: any) =>
      resolve(message.lastEventId),
    );

    publish({
      event: "hello",
      id: "123",
      data: "world",
    });

    expect(await promise).toBe("123");
  });

  test("should handle retry field without affecting message delivery", async () => {
    const { promise, resolve } = Promise.withResolvers();

    eventSource.addEventListener("message", (message) => resolve(message.data));

    publish({
      retry: 3,
      data: "world",
    });

    expect(await promise).toBe("world");
  });
});
