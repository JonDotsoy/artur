# Artur

Artur is a lightweight web framework for building HTTP services with minimal setup. It features a URLPattern based router, a simple middleware layer and runs on both **Node.js** and **Bun**.

## Features

- Declarative router built on top of the URLPattern API
- Middleware support for request and response processing
- **JSON-RPC 2.0 protocol support** with request dispatching
- Works with Node.js and Bun
- Helpers for error handling and CORS
- Fully typed when used with TypeScript

## Why this exists

Artur was designed to be a truly **infrastructure-agnostic** router that works seamlessly across different JavaScript runtimes and frameworks without being tied to any specific server implementation. Unlike traditional frameworks that lock you into their ecosystem, Artur provides a lightweight, flexible routing solution that can be integrated anywhere you need it.

### Framework Independence

- **Runtime Agnostic**: Works natively with Node.js, Bun, Deno, and any JavaScript runtime that supports the Web API standards
- **Framework Flexible**: Can be integrated into existing Express.js, NestJS applications, or used standalone without any framework overhead
- **Standard-Based**: Built on Web APIs like `URLPattern`, `Request`, and `Response` - no proprietary abstractions

### Key Advantages

- **Minimal Dependencies**: No heavy framework baggage - just the routing logic you need
- **Easy Integration**: Drop it into any existing project without architectural changes
- **Performance First**: Lightweight design with minimal overhead and fast request handling
- **Future-Proof**: Built on web standards that will remain stable across platforms and runtimes

Whether you're building a microservice, adding routing to an existing application, or creating a new web service, Artur provides the routing capabilities without dictating your infrastructure choices.

## Installation

Install Artur using npm:

```bash
npm install artur
```

## Quick Start

### Using Bun

```ts
import { Router, serve } from "artur";

const router = new Router();

router.use("GET", "/hello", {
  fetch: () => new Response("Hello world"),
});

serve({
  port: 3000,
  fetch: (request) => router.fetch(request),
});
```

### Using Node.js

```ts
import { createServer } from "node:http";
import { Router } from "artur";

const router = new Router();

router.use("GET", "/hello", {
  fetch: () => new Response("Hello world"),
});

const server = createServer((req, res) => {
  router.requestListener(req, res);
});

server.listen(3000, "127.0.0.1", () => {
  console.log("Listening on 127.0.0.1:3000");
});
```

## Router API

Register a new route using `router.use(method, path, options)`.

```ts
router.use("GET", "/hello", {
  fetch: () => new Response("ok"),
});
```

The path accepts a string or a `URLPattern` instance and an optional `test` function for extra conditions.

## Middleware

Middleware wraps a fetch handler so you can modify the request or response.

```ts
router.use("GET", "/hello", {
  middleware: [
    (fetch) => async (request) => {
      const response = await fetch(request);
      return response;
    },
  ],
  fetch: () => new Response("ok"),
});
```

## Error Handling

The router automatically catches errors and returns a `500` response. You can customize error handling with `describeErrorResponse` or by providing your own handler.

```ts
try {
  verifyHeaderAuthorization(request.headers.get("authorization"));
} catch (ex) {
  if (ex instanceof JWTError) {
    describeErrorResponse(ex, new Response(ex.message, { status: 401 }));
  }
  throw ex;
}
```

## Cross-Origin Resource Sharing (CORS)

Use the `cors()` middleware to enable CORS.

```ts
import { cors, Router } from "artur";

const router = new Router({ middlewares: [cors()] });

router.use("OPTIONS", "/hello", {
  fetch: () => new Response(null, { status: 204 }),
});
```

Specify an origin if needed:

```ts
const router = new Router({
  middlewares: [cors({ origin: "https://example.com" })],
});

router.use("OPTIONS", "/hello", {
  fetch: () => new Response(null, { status: 204 }),
});
```

## JSON-RPC 2.0 Support

Artur includes built-in support for JSON-RPC 2.0 protocol with the `JsonRpcDispatcher` class. This enables you to build real-time applications with remote procedure calls.

### Basic JSON-RPC Setup

```ts
import { JsonRpcDispatcher, Router } from "artur";

const rpc = new JsonRpcDispatcher();

// Register RPC methods
rpc.use("add", (params: { a: number; b: number }) => {
  return params.a + params.b;
});

rpc.use("greet", (params: { name: string }) => {
  return `Hello, ${params.name}!`;
});

// Integrate with Router
const router = new Router();
router.use("POST", "/api/rpc", rpc);
```

### Configuration Options

The `JsonRpcDispatcher` accepts configuration options to customize its behavior:

```ts
const rpc = new JsonRpcDispatcher({
  sseEnabled: true, // Enable Server-Sent Events support for GET requests
});
```

#### Available Options

- **`sseEnabled`** (`boolean`, default: `false`): Enables Server-Sent Events (SSE) support for GET requests. When enabled, GET requests to the JSON-RPC endpoint will return a streaming response that can receive real-time updates. ⚠️ **This is an experimental feature.**

### Multiple Transport Methods

JSON-RPC supports different HTTP methods for various use cases:

#### POST - Standard JSON-RPC (Single & Batch)

```ts
// Single request
const response = await fetch("/api/rpc", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "add",
    params: { a: 5, b: 3 },
  }),
});

// Batch requests
const response = await fetch("/api/rpc", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify([
    { jsonrpc: "2.0", id: 1, method: "add", params: { a: 5, b: 3 } },
    { jsonrpc: "2.0", id: 2, method: "greet", params: { name: "Alice" } },
  ]),
});
```

#### GET - Server-Sent Events (Real-time streaming) ⚠️ Experimental

```ts
// First, enable SSE support when creating the dispatcher
const rpc = new JsonRpcDispatcher({
  sseEnabled: true,
});

// Then connect to the stream
const eventSource = new EventSource("/api/rpc");
eventSource.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log("RPC Response:", response);
};
```

#### PUT - Fire-and-forget requests

```ts
// Send request without waiting for response
fetch("/api/rpc", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "logEvent",
    params: { event: "user_login" },
  }),
});
```

### Direct Usage (without Router)

```ts
const rpc = new JsonRpcDispatcher();

rpc.use("calculate", (params: { operation: string; values: number[] }) => {
  switch (params.operation) {
    case "sum":
      return params.values.reduce((a, b) => a + b, 0);
    case "multiply":
      return params.values.reduce((a, b) => a * b, 1);
    default:
      throw new JsonRpcError(-32602, "Invalid operation");
  }
});

// Direct request handling
const result = await rpc.request({
  jsonrpc: "2.0",
  id: 1,
  method: "calculate",
  params: { operation: "sum", values: [1, 2, 3, 4, 5] },
});
```

### Error Handling

```ts
import { JsonRpcError } from "artur";

rpc.use("divide", (params: { a: number; b: number }) => {
  if (params.b === 0) {
    throw new JsonRpcError(-32603, "Division by zero", {
      code: "DIVISION_BY_ZERO",
    });
  }
  return params.a / params.b;
});
```

### Real-time Subscriptions

```ts
// Subscribe to responses
const unsubscribe = rpc.subscribe((response) => {
  console.log("New response:", response);
});

// Clean up when done
unsubscribe();
```

## License

Artur is licensed under the MIT license. See [LICENSE](./LICENSE) for details.
