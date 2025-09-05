# Artur - Router()

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

Artur includes built-in support for JSON-RPC 2.0 protocol with the `JsonRpcDispatcher` class. This enables you to build real-time applications with remote procedure calls, session management, and Server-Sent Events (SSE) streaming.

### Basic JSON-RPC Setup

```ts
import { JsonRpcDispatcher, Router } from "artur";

const rpc = new JsonRpcDispatcher();

// Register RPC methods using the registerMethod API
rpc.registerMethod("add", (params: { a: number; b: number }) => {
  return params.a + params.b;
});

rpc.registerMethod("greet", (params: { name: string }) => {
  return `Hello, ${params.name}!`;
});

// Integrate with Router
const router = new Router();
router.use("POST", "/api/rpc", rpc);
```

#### Legacy API Support

The previous `use` method is still supported for backward compatibility but is deprecated:

```ts
// ⚠️ Deprecated: Use registerMethod() instead
rpc.use("methodName", handler);

// ✅ Recommended: New registerMethod() API
rpc.registerMethod("methodName", handler);
```

The `registerMethod` API provides better TypeScript support, validation capabilities, and clearer intent for method registration.

### Input and Output Validation

Artur's JSON-RPC dispatcher supports type-safe parameter validation using Zod schemas. This ensures that method parameters are validated at runtime and provides better type safety:

```ts
import { z } from "zod";

// Define validation schemas
const addParamsSchema = z.object({
  a: z.number(),
  b: z.number(),
});

const addResultSchema = z.number();

const greetParamsSchema = z.object({
  name: z.string().min(1),
  greeting: z.string().optional().default("Hello"),
});

const greetResultSchema = z.string();

// Register methods with validation
rpc.registerMethod(
  "add",
  (params, request, event) => {
    // params is automatically typed as { a: number; b: number }
    return params.a + params.b;
  },
  {
    inputValidation: addParamsSchema,
    outputValidation: addResultSchema,
  },
);

rpc.registerMethod(
  "greet",
  (params, request, event) => {
    // params is automatically typed as { name: string; greeting?: string }
    return `${params.greeting}, ${params.name}!`;
  },
  {
    inputValidation: greetParamsSchema,
    outputValidation: greetResultSchema,
  },
);
```

### Method Introspection

The JSON-RPC dispatcher provides built-in introspection capabilities through the `registerListMethods` method. This allows clients to discover available methods and their schemas:

```ts
import { z } from "zod";

// Register your business methods with validation
rpc.registerMethod(
  "user.create",
  (params) => createUser(params),
  {
    inputValidation: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    outputValidation: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  },
);

rpc.registerMethod(
  "user.getById",
  (params) => getUserById(params.id),
  {
    inputValidation: z.object({ id: z.string() }),
    outputValidation: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  },
);

// Register the introspection method
rpc.registerListMethods("system.listMethods");

// Optional: Hide specific methods from the list
rpc.registerListMethods("system.listMethods", [
  "system.listMethods", // Hide self-reference
  "internal.debug",     // Hide internal methods
]);
```

#### Using the List Methods Endpoint

Clients can now discover available methods and their schemas:

```ts
// Request available methods
const response = await fetch("/api/rpc", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "system.listMethods",
    params: {},
  }),
});

const result = await response.json();
console.log(result);

// Example response:
// {
//   "jsonrpc": "2.0",
//   "id": 1,
//   "result": {
//     "methods": [
//       {
//         "name": "user.create",
//         "params": {
//           "type": "object",
//           "properties": {
//             "name": { "type": "string" },
//             "email": { "type": "string", "format": "email" }
//           },
//           "required": ["name", "email"]
//         },
//         "result": {
//           "type": "object",
//           "properties": {
//             "id": { "type": "string" },
//             "name": { "type": "string" },
//             "email": { "type": "string" }
//           },
//           "required": ["id", "name", "email"]
//         }
//       },
//       {
//         "name": "user.getById",
//         "params": { /* JSON Schema for input */ },
//         "result": { /* JSON Schema for output */ }
//       }
//     ]
//   }
// }
```

#### Benefits of Method Introspection

- **API Discovery**: Clients can automatically discover available methods without external documentation
- **Schema Documentation**: Each method exposes its input/output schemas as JSON Schema format
- **Dynamic Client Generation**: Tools can generate type-safe client code from the introspection data
- **Development Tools**: Enable better IDE support and API exploration tools
- **Version Compatibility**: Clients can check method availability and schema changes at runtime

#### Benefits of Validation

- **Runtime Safety**: Invalid parameters are automatically rejected with JSON-RPC error responses
- **Type Safety**: TypeScript automatically infers parameter types from validation schemas
- **Documentation**: Schemas serve as living documentation of method interfaces
- **Error Handling**: Validation errors return standard JSON-RPC error responses with helpful messages
- **Output Validation**: When output validation fails, the method returns a JSON-RPC internal error (-32603) to prevent invalid responses from being sent to clients
- **API Introspection**: Methods with validation schemas are automatically documented in the `system.listMethods` response

### Configuration Options

The `JsonRpcDispatcher` accepts configuration options to customize its behavior:

```ts
const rpc = new JsonRpcDispatcher({
  sseEnabled: true, // Enable Server-Sent Events support for real-time streaming
  sessionIdFactory: (event) => {
    // Custom session ID extraction logic
    return event.httpRequest?.headers.get("x-session-id") || null;
  },
});
```

#### Available Options

- **`sseEnabled`** (`boolean`, default: `false`): Enables Server-Sent Events (SSE) support for GET requests and session-based communication. When enabled, the dispatcher supports real-time streaming and session management. ⚠️ **This is an experimental feature.**

- **`sessionIdFactory`** (`function`): Custom function to extract session IDs from JSON-RPC events. The default factory checks for:
  - URL parameter `json_rpc_token`
  - HTTP header `x-json-rpc-token`
  - URL parameter `token`

### Method Registration API

The `registerMethod()` function is the primary way to register JSON-RPC method handlers. It supports optional validation and provides better TypeScript integration than the legacy `use()` method.

#### Basic Method Registration

```ts
// Simple method without validation
rpc.registerMethod("ping", async () => "pong");

// Method with typed parameters
rpc.registerMethod("calculateSum", async (params: { numbers: number[] }) => {
  return params.numbers.reduce((sum, num) => sum + num, 0);
});

// Method with access to request context
rpc.registerMethod("getUserInfo", async (params, request, event) => {
  const userId = params.userId;
  const httpRequest = event.httpRequest; // Access HTTP context if needed
  return await fetchUserData(userId);
});
```

#### Method Registration with Validation

```ts
import { z } from "zod";

rpc.registerMethod(
  "user.create",
  async (params) => {
    // params is automatically typed based on inputValidation schema
    const user = await createUser(params);
    return user;
  },
  {
    inputValidation: z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email format"),
      age: z.number().min(18, "Must be at least 18"),
    }),
    outputValidation: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      age: z.number(),
      createdAt: z.date(),
    }),
  }
);
```

#### Method Registration Options

When registering methods with `registerMethod()`, you can provide these options:

- **`inputValidation`** (optional): Zod schema to validate input parameters
  - Automatically validates parameters before calling the handler
  - Returns JSON-RPC error (-32602 Invalid params) if validation fails
  - Provides automatic TypeScript typing for the params argument

- **`outputValidation`** (optional): Zod schema to validate return values
  - Validates the handler's return value before sending the response
  - Returns JSON-RPC error (-32603 Internal error) if validation fails
  - Helps catch bugs and ensures consistent API responses

Both validation options are optional but recommended for production applications to ensure data integrity and provide better developer experience.

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

#### PUT - Session-based requests (requires SSE enabled) ⚠️ Experimental

```ts
// First, enable SSE support when creating the dispatcher
const rpc = new JsonRpcDispatcher({
  sseEnabled: true,
});

// Send requests to a session queue (responses available via GET/SSE)
fetch("/api/rpc?json_rpc_token=session123", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "processData",
    params: { data: "example" },
  }),
});
```

#### GET - Server-Sent Events streaming (requires SSE enabled) ⚠️ Experimental

```ts
// Connect to the session stream to receive responses
const eventSource = new EventSource("/api/rpc?json_rpc_token=session123");
eventSource.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log("RPC Response:", response);
};

// Clean up when done
eventSource.close();
```

### Session Management ⚠️ Experimental

The JSON-RPC dispatcher supports session-based communication for building real-time applications. Sessions allow you to queue requests and consume responses asynchronously.

```ts
const rpc = new JsonRpcDispatcher({
  sseEnabled: true, // Required for session support
});

// Open a session
const session = rpc.openSession("user_session_123");

// Make requests within the session context
await session.request({
  jsonrpc: "2.0",
  id: 1,
  method: "startProcess",
  params: { processId: "abc123" },
});

// Consume responses from the session queue
for await (const { message, ack } of session.consume()) {
  console.log("Response:", message);
  ack(); // Acknowledge the message as processed
}
```

#### Session ID Extraction

Sessions require a unique identifier extracted from the HTTP request. The default extraction logic supports:

- **URL Parameter**: `?json_rpc_token=session123`
- **HTTP Header**: `X-JSON-RPC-Token: session123`
- **URL Parameter**: `?token=session123`

You can provide a custom session ID factory:

```ts
const rpc = new JsonRpcDispatcher({
  sseEnabled: true,
  sessionIdFactory: (event) => {
    // Extract from custom header
    return event.httpRequest?.headers.get("x-custom-session") || null;
  },
});
```

### Direct Usage (without Router)

```ts
const rpc = new JsonRpcDispatcher();

rpc.registerMethod(
  "calculate",
  (params: { operation: string; values: number[] }) => {
    switch (params.operation) {
      case "sum":
        return params.values.reduce((a, b) => a + b, 0);
      case "multiply":
        return params.values.reduce((a, b) => a * b, 1);
      default:
        throw new JsonRpcError(-32602, "Invalid operation");
    }
  },
);

// Direct request handling
const result = await rpc.request({
  jsonrpc: "2.0",
  id: 1,
  method: "calculate",
  params: { operation: "sum", values: [1, 2, 3, 4, 5] },
}).response;

console.log(result); // { jsonrpc: "2.0", id: 1, result: 15 }
```

### Error Handling

JSON-RPC provides comprehensive error handling with built-in error codes and custom error support:

```ts
import { JsonRpcError } from "artur";

rpc.registerMethod("divide", (params: { a: number; b: number }) => {
  if (params.b === 0) {
    throw new JsonRpcError(-32603, "Division by zero", {
      code: "DIVISION_BY_ZERO",
      hint: "The divisor cannot be zero",
    });
  }
  return params.a / params.b;
});

// Built-in error codes
rpc.registerMethod("validateUser", (params: { userId: string }) => {
  if (!params.userId) {
    // Invalid parameters
    throw new JsonRpcError(-32602, "Invalid params: userId is required");
  }

  // Method-specific errors
  throw new JsonRpcError(1001, "User not found", { userId: params.userId });
});
```

#### Validation Error Handling

When using input/output validation, validation errors are automatically converted to JSON-RPC errors:

```ts
import { z } from "zod";

const userSchema = z.object({
  email: z.string().email("Invalid email format"),
  age: z.number().min(18, "Must be at least 18 years old"),
});

rpc.registerMethod(
  "createUser",
  (params) => {
    // This method will only execute if validation passes
    return { id: "user123", ...params };
  },
  {
    inputValidation: userSchema,
  },
);

// Invalid request will automatically return:
// {
//   "jsonrpc": "2.0",
//   "id": 1,
//   "error": {
//     "code": -32602,
//     "message": "Invalid params",
//     "data": { /* Zod validation errors */ }
//   }
// }
```

#### Standard JSON-RPC Error Codes

- **-32700**: Parse error (invalid JSON)
- **-32600**: Invalid request (missing required fields)
- **-32601**: Method not found
- **-32602**: Invalid params
- **-32603**: Internal error

### Real-time Example: Chat Application

Here's a complete example showing how to build a real-time chat application with validation:

```ts
import { JsonRpcDispatcher, Router } from "artur";
import { z } from "zod";

const rpc = new JsonRpcDispatcher({
  sseEnabled: true,
});

// Validation schemas
const joinRoomSchema = z.object({
  room: z.string().min(1, "Room name is required"),
  user: z.string().min(1, "Username is required"),
});

const sendMessageSchema = z.object({
  room: z.string().min(1, "Room name is required"),
  message: z.string().min(1, "Message cannot be empty"),
  user: z.string().min(1, "Username is required"),
});

// Store active chat sessions
const chatSessions = new Map<string, Set<string>>();

// Join a chat room
rpc.registerMethod(
  "chat.join",
  (params, request, event) => {
    const sessionId = rpc.options.sessionIdFactory(event);
    if (!sessionId) throw new JsonRpcError(-32602, "Session ID required");

    if (!chatSessions.has(params.room)) {
      chatSessions.set(params.room, new Set());
    }

    chatSessions.get(params.room)?.add(sessionId);
    return { joined: params.room, user: params.user };
  },
  {
    inputValidation: joinRoomSchema,
  },
);

// Send a message to all room participants
rpc.registerMethod(
  "chat.send",
  async (params) => {
    const roomSessions = chatSessions.get(params.room);
    if (!roomSessions) throw new JsonRpcError(1001, "Room not found");

    // Broadcast to all sessions in the room
    for (const sessionId of roomSessions) {
      const session = rpc.openSession(sessionId);
      await session.request({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "chat.message",
        params: {
          room: params.room,
          user: params.user,
          message: params.message,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return { sent: true };
  },
  {
    inputValidation: sendMessageSchema,
  },
);

// Register method introspection for API discovery
rpc.registerListMethods("system.listMethods");

// Set up the router
const router = new Router();
router.use("*", "/api/chat", rpc);

// Client usage:
// 1. Connect: GET /api/chat?json_rpc_token=user123
// 2. Join room: PUT /api/chat?json_rpc_token=user123 with { method: "chat.join", ... }
// 3. Send messages: PUT /api/chat?json_rpc_token=user123 with { method: "chat.send", ... }
// 4. Receive messages via Server-Sent Events from step 1
```

### Advanced: Server-Sent Events Integration

The JSON-RPC dispatcher includes built-in Server-Sent Events support via the `DataEventSourceEncoder` utility:

```ts
import { DataEventSourceEncoder } from "artur";

// Manual SSE streaming (advanced usage)
const encoder = new DataEventSourceEncoder();

const readable = new ReadableStream({
  start(controller) {
    // Send JSON-RPC responses as SSE events
    controller.enqueue(
      encoder.encode({
        id: "msg-1",
        event: "response",
        data: { jsonrpc: "2.0", id: 1, result: "Hello!" },
        retry: 3000,
      }),
    );
  },
});

return new Response(readable, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});
```

### Exported Types and Utilities

For TypeScript projects, Artur exports the following JSON-RPC classes and types:

```ts
// Main JSON-RPC class available from "artur"
import { JsonRpcDispatcher } from "artur";

// For additional types and utilities, import directly from JSON-RPC module
import {
  JsonRpcError,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type JsonRpcResultResponse,
  type JsonRpcErrorResponse,
  type JsonRpcHandler,
  type JsonRpcEvent,
  type Validation,
  type ExtractValidationType,
} from "artur/json-rpc";
```

#### Type Definitions

- **`JsonRpcRequest<T>`**: Represents a JSON-RPC 2.0 request with typed parameters
- **`JsonRpcResponse<T, R>`**: Union type for success and error responses
- **`JsonRpcHandler<P, R>`**: Function signature for method handlers
- **`JsonRpcEvent`**: Context object containing HTTP request information
- **`Validation<T>`**: Generic validation interface (compatible with Zod)
- **`ExtractValidationType<A>`**: Utility type to extract TypeScript types from validation schemas

#### Advanced Type Usage

```ts
import { z } from "zod";
import type { ExtractValidationType } from "artur/json-rpc";

// Define schemas
const userParamsSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const userResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.date(),
});

// Extract types
type UserParams = ExtractValidationType<typeof userParamsSchema>;
type UserResult = ExtractValidationType<typeof userResultSchema>;

// Type-safe method handler
const createUserHandler: JsonRpcHandler<UserParams, UserResult> = (params) => {
  // params is fully typed as { name: string; email: string }
  return {
    id: crypto.randomUUID(),
    name: params.name,
    email: params.email,
    createdAt: new Date(),
  };
};
```

> **Note**: The types can be imported from the main package in future versions. Currently, they're available from the JSON-RPC submodule.

## License

Artur is licensed under the MIT license. See [LICENSE](./LICENSE) for details.
