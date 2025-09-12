import { describe, test, expect } from "bun:test";
import { SentEventRequest, SentEventStream } from "./sent-event";
import { Router } from "../http";

describe("SentEvent", () => {
  test("should return 406 Not Acceptable when request doesn't accept text/event-stream", async () => {
    const stream = new SentEventStream();

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
    const stream = new SentEventStream({
      async create(request) {
        return new ReadableStream({
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
    const stream = new SentEventStream({
      async create(request) {
        return new ReadableStream({
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
      new SentEventStream({
        async create(request) {
          return new ReadableStream({
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
    const stream = new SentEventStream({
      async create(request) {
        let timeout: any;
        return new ReadableStream({
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
    const stream = new SentEventStream();

    const readable = await stream.create(new SentEventRequest("last-event-id"));

    expect(readable).toBeNull();
  });

  test("should create readable stream when create function is provided", async () => {
    const stream = new SentEventStream({
      create: () =>
        new ReadableStream({
          start(controller) {
            controller.enqueue({ data: "from create" });
            controller.close();
          },
        }),
    });

    const readable = await stream.create(new SentEventRequest("last-event-id"));

    expect(readable).toBeInstanceOf(ReadableStream);

    const reader = readable!.getReader();
    const result = await reader.read();
    expect(result.value).toEqual({ data: "from create" });
    await reader.cancel();
  });
});
