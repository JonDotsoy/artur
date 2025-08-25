import { describe, expect, test } from "bun:test";
import { RequestReflect } from "./request-reflect.js";

describe("RequestReflect", () => {
  test("set method", () => {
    const request = new Request("http://localhost");
    RequestReflect.set(request, "userId", 123);
    const userId = RequestReflect.get(request, "userId");
    expect(userId).toBe(123);
    // @ts-ignore
    expect(request.userId).toBe(undefined);
  });
  test("set multiple methods", () => {
    const request = new Request("http://localhost");
    RequestReflect.set(request, "userId", 123);
    RequestReflect.set(request, "postId", 456);
    const userId = RequestReflect.get(request, "userId");
    const postId = RequestReflect.get(request, "postId");
    expect(userId).toBe(123);
    expect(postId).toBe(456);
    // @ts-ignore
    expect(request.userId).toBe(undefined);
    // @ts-ignore
    expect(request.postId).toBe(undefined);
  });
  test("replace param", () => {
    const request = new Request("http://localhost");
    RequestReflect.set(request, "userId", 123);
    RequestReflect.set(request, "userId", 456);
    const userId = RequestReflect.get(request, "userId");
    expect(userId).toBe(456);
    // @ts-ignore
    expect(request.userId).toBe(undefined);
  });
});
