import { describe, test, expect, mock } from "bun:test";
import {
  EventSourceRequest,
  EventSource,
  EventsReadableStream,
} from "./event-source";
import { Router } from "../http";

describe("SentEvent", () => {
  test("should return 406 Not Acceptable when request doesn't accept text/event-stream", async () => {
    const stream = new EventSource();

    const response = await stream.fetch(
      new Request("http://localhost", {
        headers: {
          // "accept": "text/event-stream",
        },
      }),
    );

    expect(response.status).toBe(406);
  });

  test("should stream data successfully when accept header is text/event-stream", async () => {
    const stream = new EventSource({
      async start(request) {
        return new EventsReadableStream({
          start(controller) {
            controller.enqueue({ data: "hello world" });
          },
        });
      },
    });

    const response = await stream.fetch(
      new Request("http://localhost", {
        headers: {
          accept: "text/event-stream",
        },
      }),
    );

    expect(response.status).toBe(200);

    const reader = response.body?.getReader();
    const result = await reader?.read();
    const text = new TextDecoder().decode(result?.value);
    expect(text).toBe("data: hello world\n\n");
    await reader?.cancel();
  });

  test("should automatically close stream and return complete response text", async () => {
    const stream = new EventSource({
      async start(request) {
        return new EventsReadableStream({
          start(controller) {
            controller.enqueue({ data: "auto close" });
            controller.close();
          },
        });
      },
    });

    const response = await stream.fetch(
      new Request("http://localhost", {
        headers: {
          accept: "text/event-stream",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("data: auto close\n\n");
  });

  test("should work correctly when integrated with HTTP Router", async () => {
    const router = new Router();

    router.route(
      "/sse",
      new EventSource({
        async start(request) {
          return new EventsReadableStream({
            start(controller) {
              controller.enqueue({ data: "from router" });
              controller.close();
            },
          });
        },
      }),
    );

    const response = await router.fetch(
      new Request("http://localhost/sse", {
        headers: {
          accept: "text/event-stream",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("data: from router\n\n");
  });

  test("should properly handle stream cancellation and cleanup timeouts", async () => {
    const stream = new EventSource({
      async start(request) {
        let timeout: any;
        return new EventsReadableStream({
          start(controller) {
            timeout = setTimeout(() => {
              controller.enqueue({ data: "delayed message" });
              controller.close();
            }, 10);
          },
          cancel() {
            clearTimeout(timeout);
          },
        });
      },
    });

    const response = await stream.fetch(
      new Request("http://localhost", {
        headers: {
          accept: "text/event-stream",
        },
      }),
    );

    expect(response.status).toBe(200);

    const reader = response.body!.getReader();
    reader!.cancel();

    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 20);
    });
  });

  test("should return null when no create function is provided", async () => {
    const stream = new EventSource();

    const readable = await stream.create(
      new EventSourceRequest("last-event-id"),
    );

    expect(readable).not.toBeNull();

    const data = await readable.text();
    expect(data).toBe("");
  });

  test("should create readable stream when create function is provided", async () => {
    const stream = new EventSource({
      start: () =>
        new EventsReadableStream({
          start(controller) {
            controller.enqueue({ data: "from create" });
            controller.close();
          },
        }),
    });

    const readable = await stream.create(
      new EventSourceRequest("last-event-id"),
    );

    expect(readable).toBeInstanceOf(ReadableStream);

    const reader = readable!.getReader();
    const result = await reader.read();
    expect(result.value).toEqual({ data: "from create" });
    await reader.cancel();
  });

  test("should expose iterable method on readable stream", async () => {
    const stream = new EventSource({
      start: () => {},
    });

    const readable = await stream.create(
      new EventSourceRequest("last-event-id"),
    );

    expect(readable.iterable).toBeInstanceOf(Function);
  });

  test("should return empty array when iterating over stream with no events", async () => {
    const stream = new EventSource({
      start: () => {},
    });

    const readable = await stream.create(
      new EventSourceRequest("last-event-id"),
    );

    const items = await Array.fromAsync(readable.iterable());
    expect(items).toEqual([]);
  });

  test("should not call mock function when iterating empty stream", async () => {
    const push = mock();

    const stream = new EventSource({
      start: () => {},
    });

    const readable = await stream.create(
      new EventSourceRequest("last-event-id"),
    );

    for await (const evnet of readable.iterable()) {
      push(evnet);
    }

    expect(push).not.toHaveBeenCalled();
  });

  test("should iterate through multiple events and call mock for each event", async () => {
    const push = mock();

    const stream = new EventSource({
      start: () =>
        new EventsReadableStream({
          start(controller) {
            controller.enqueue({ id: 1, data: "from create" });
            controller.enqueue({ id: 2, data: "from create" });
            controller.close();
          },
        }),
    });

    const readable = await stream.create(
      new EventSourceRequest("last-event-id"),
    );

    for await (const event of readable.iterable()) {
      push(event);
    }

    expect(push).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenNthCalledWith(1, { id: 1, data: "from create" });
    expect(push).toHaveBeenNthCalledWith(2, { id: 2, data: "from create" });
  });

  test("should throw error when iterating over stream that emits error", async () => {
    const push = mock();

    const stream = new EventSource({
      start: () =>
        new EventsReadableStream({
          start(controller) {
            controller.error(new Error("test error"));
          },
        }),
    });

    const readable = await stream.create(
      new EventSourceRequest("last-event-id"),
    );

    expect(async () => {
      for await (const event of readable.iterable()) {
        push(event);
      }
    }).toThrow("test error");
  });

  test("should throw error when start function throws during stream creation", async () => {
    const push = mock();

    const stream = new EventSource({
      start: () => {
        throw new Error("test error");
      },
    });

    expect(async () => {
      await stream.create(new EventSourceRequest("last-event-id"));
    }).toThrow("test error");
  });

  test("should return 500 status when start function throws during fetch", async () => {
    const push = mock();

    const stream = new EventSource({
      start: () => {
        throw new Error("test error");
      },
    });

    const response = await stream.fetch(
      new Request("http://localhost", {
        headers: {
          accept: "text/event-stream",
        },
      }),
    );

    expect(response.status).toEqual(500);
  });

  test("should return 200 status but reject text promise when stream emits error", async () => {
    const push = mock();

    const stream = new EventSource({
      start: () => {
        return new EventsReadableStream({
          start(controller) {
            controller.error(new Error("test error"));
          },
        });
      },
    });

    const response = await stream.fetch(
      new Request("http://localhost", {
        headers: {
          accept: "text/event-stream",
        },
      }),
    );

    expect(response.status).toEqual(200);
    expect(response.text()).rejects.toThrow("test error");
  });
});
