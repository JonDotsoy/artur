# Artur - Router()

Artur is a lightweight web framework for building HTTP services with minimal setup. It features a URLPattern based router, a simple middleware layer and runs on both **Node.js** and **Bun**.

## Features

- Declarative router built on top of the URLPattern API
- Middleware support for request and response processing
- **JSON-RPC 2.0 protocol support** with request dispatching
- **Server-Sent Events (SSE) support** for real-time data streaming
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
import { Router } from "artur";
import { serve } from "bun";

const router = new Router();

router.route("GET", "/hello", {
  fetch: async () => new Response("Hello world"),
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

router.route("GET", "/hello", {
  fetch: async () => new Response("Hello world"),
});

const server = createServer((req, res) => {
  router.requestListener(req, res);
});

server.listen(3000, "127.0.0.1", () => {
  console.log("Listening on 127.0.0.1:3000");
});
```

## Router API

Register a new route using the flexible `router.route()` method. This method supports multiple patterns for maximum flexibility:

### Basic Route Registration

```ts
// Traditional method, path, and options object
router.route("GET", "/hello", {
  fetch: () => new Response("ok"),
});

// Method, path, and inline fetch handler
router.route("POST", "/api/users", async (request) => {
  return new Response("User created", { status: 201 });
});

// Path and fetch handler (defaults to GET)
router.route("/hello", async () => new Response("Hello world"));

// Using options object only
router.route({
  method: "PUT",
  urlPattern: "/api/users/:id",
  fetch: async (request) => new Response("User updated"),
  middlewares: [authMiddleware],
});
```

### Advanced Route Patterns

```ts
// Custom test function for complex routing logic
router.route(
  (request) => request.headers.get("content-type") === "application/json",
  async (request) => new Response("JSON handler"),
  { middlewares: [jsonMiddleware] },
);

// URLPattern instance for advanced pattern matching
router.route("GET", new URLPattern({ pathname: "/users/:id(\\d+)" }), {
  fetch: async (request) => new Response("User by ID"),
});
```

### Router.customRoute Integration

For advanced integrations, you can use `Router.customRoute` to create objects that work seamlessly with the router:

```ts
// Custom objects implementing Router.customRoute
const customHandler = {
  [Router.customRoute]: {
    fetch: async (request) => new Response("Custom handler"),
    method: "POST",
    middlewares: [authMiddleware],
  },
};

// Register the custom handler directly
router.route("/api/custom", customHandler);
```

The path accepts a string or a `URLPattern` instance and supports optional `test` functions for extra conditions.

## Middleware

Middleware wraps a fetch handler so you can modify the request or response. The router supports multiple ways to specify middleware:

### Using Route Options Object

```ts
router.route("GET", "/hello", {
  middlewares: [
    (fetch) => async (request) => {
      const response = await fetch(request);
      return response;
    },
  ],
  fetch: () => new Response("ok"),
});
```

### Using Inline Parameters

```ts
router.route(
  "POST",
  "/api/users",
  async (request) => {
    return new Response("User created");
  },
  {
    middlewares: [authMiddleware, validationMiddleware],
  },
);
```

### Global Middleware

```ts
const router = new Router({
  middlewares: [corsMiddleware, loggingMiddleware],
});

// All routes will use the global middleware
router.route("GET", "/hello", async () => new Response("Hello"));
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

Use the `cors()` middleware to enable CORS. You can apply it globally or per route:

### Global CORS

```ts
import { cors, Router } from "artur";

const router = new Router({ middlewares: [cors()] });

// CORS will be applied to all routes
router.route("GET", "/api/data", async () => Response.json({ data: "value" }));
router.route("OPTIONS", "/api/data", () => new Response(null, { status: 204 }));
```

### Per-Route CORS

```ts
router.route(
  "GET",
  "/api/public",
  async () => Response.json({ public: true }),
  {
    middlewares: [cors()],
  },
);

// Alternative using options object
router.route({
  method: "POST",
  urlPattern: "/api/upload",
  fetch: async (request) => Response.json({ uploaded: true }),
  middlewares: [cors({ origin: "https://example.com" })],
});
```

### CORS with Specific Origins

```ts
const router = new Router({
  middlewares: [cors({ origin: "https://example.com" })],
});

router.route("OPTIONS", "/hello", () => new Response(null, { status: 204 }));
router.route("GET", "/hello", async () => new Response("Hello with CORS"));
```

## Server-Sent Events (SSE) Support

Artur provides built-in support for Server-Sent Events (SSE) to enable real-time data streaming from server to client. The `EventSource` class implements the EventSource protocol and integrates seamlessly with the router.

### Features

- ✅ **EventSource Protocol Compliance**: Full implementation of the Server-Sent Events specification
- ✅ **HTTP Router Integration**: Seamless integration using `Router.customRoute` symbol
- ✅ **Stream Resumption**: Support for `Last-Event-ID` header for reliable event delivery
- ✅ **Async Iteration**: Built-in async iterable support for processing events
- ✅ **Error Handling**: Comprehensive error handling with proper HTTP status codes
- ✅ **Stream Cancellation**: Proper resource cleanup and cancellation support
- ✅ **Empty Stream Handling**: Graceful handling of empty streams
- ✅ **Type Safety**: Full TypeScript support with proper event typing
- ✅ **Automatic Encoding**: Built-in event encoding following SSE specification

### Basic SSE Setup

```ts
import { EventSource, EventsReadableStream, Router } from "artur";

const eventStream = new EventSource({
  start: async (request) => {
    return new EventsReadableStream({
      start(controller) {
        // Send initial connection event
        controller.enqueue({
          data: "Connection established",
          event: "connected",
        });

        // Send periodic updates
        const interval = setInterval(() => {
          controller.enqueue({
            id: Date.now().toString(),
            data: JSON.stringify({
              timestamp: new Date().toISOString(),
              message: "Periodic update",
            }),
            event: "update",
          });
        }, 1000);

        // Important: Cleanup resources when stream is cancelled
      },
      cancel() {
        // Proper cleanup when stream is cancelled
        clearInterval(interval);
        console.log("Stream cancelled and cleaned up");
      },
    });
  },
});

// Integrate with Router
const router = new Router();
router.route("GET", "/events", eventStream);

// Alternative: Using the flexible route patterns
router.route("/events", eventStream); // Automatically handles GET requests for SSE
```

### Client-Side Usage

```javascript
// Connect to the event stream
const eventSource = new EventSource("/events");

// Handle different event types
eventSource.addEventListener("connected", (event) => {
  console.log("Connected:", event.data);
});

eventSource.addEventListener("update", (event) => {
  const data = JSON.parse(event.data);
  console.log("Update received:", data);
});

// Handle all messages
eventSource.onmessage = (event) => {
  console.log("Message:", event.data);
};

// Handle errors
eventSource.onerror = (event) => {
  console.error("SSE error:", event);
};

// Close connection when done
eventSource.close();
```

### Stream Resumption with Last-Event-ID

SSE supports automatic stream resumption using the `Last-Event-ID` header:

```ts
const eventStream = new EventSource({
  start: async (request) => {
    // Get the last event ID from client for resumption
    const lastEventId = request.lastEventID;
    const startId = lastEventId ? parseInt(lastEventId) + 1 : 1;

    return new EventsReadableStream({
      start(controller) {
        let eventId = startId;

        const sendEvent = () => {
          controller.enqueue({
            id: eventId.toString(),
            data: `Event number ${eventId}`,
            event: "numbered-event",
          });
          eventId++;
        };

        // Send events every 2 seconds
        const interval = setInterval(sendEvent, 2000);

        // Send initial event
        sendEvent();
      },
      cancel() {
        clearInterval(interval);
      },
    });
  },
});
```

### Async Iteration Support

The `EventsReadableStream` provides built-in async iteration capabilities:

```ts
const eventStream = new EventSource({
  start: () =>
    new EventsReadableStream({
      start(controller) {
        controller.enqueue({ id: "1", data: "First event" });
        controller.enqueue({ id: "2", data: "Second event" });
        controller.close();
      },
    }),
});

// Create the stream
const readable = await eventStream.create(new EventSourceRequest(null));

// Process events using async iteration
for await (const event of readable.iterable()) {
  console.log(`Event ${event.id}: ${event.data}`);
}
// Output:
// Event 1: First event
// Event 2: Second event

// Or collect all events into an array
const events = await readable.toArray();
console.log(events); // [{ id: "1", data: "First event" }, ...]
```

### Empty Stream Handling

EventSource gracefully handles empty streams and missing start functions:

```ts
// EventSource without start function
const emptyStream = new EventSource();
const readable = await emptyStream.create(new EventSourceRequest(null));
const events = await readable.toArray();
console.log(events); // [] (empty array)

// EventSource with start function that returns nothing
const voidStream = new EventSource({
  start: () => {}, // Returns undefined
});
const readable2 = await voidStream.create(new EventSourceRequest(null));
const events2 = await readable2.toArray();
console.log(events2); // [] (empty array)
```

### Real-time Notifications Example

```ts
import { EventSource, Router } from "artur";

// Simple notification system
const notifications = new EventSource({
  start: async (request) => {
    return new EventsReadableStream({
      start(controller) {
        // Send welcome message
        controller.enqueue({
          id: "welcome",
          event: "notification",
          data: JSON.stringify({
            type: "info",
            message: "Welcome to the notification system!",
          }),
        });

        // Simulate notifications
        const notifications = [
          { type: "success", message: "Task completed successfully" },
          { type: "warning", message: "System maintenance scheduled" },
          { type: "error", message: "Connection issue detected" },
        ];

        let index = 0;
        const interval = setInterval(() => {
          if (index < notifications.length) {
            controller.enqueue({
              id: `notification-${index}`,
              event: "notification",
              data: JSON.stringify(notifications[index]),
              retry: 3000, // Retry connection after 3 seconds if dropped
            });
            index++;
          } else {
            controller.close();
          }
        }, 5000);

        // Note: Cleanup should be handled when the stream is closed or cancelled
      },
    });
  },
});

const router = new Router();
router.route("/notifications", notifications);
```

### Proper Resource Management

```ts
const eventStream = new EventSource({
  start: async (request) => {
    return new EventsReadableStream({
      start(controller) {
        let interval: NodeJS.Timeout;
        let isActive = true;

        const sendUpdate = () => {
          if (!isActive) return;

          controller.enqueue({
            id: Date.now().toString(),
            data: JSON.stringify({
              timestamp: new Date().toISOString(),
              message: "Periodic update",
            }),
            event: "update",
          });
        };

        // Start sending updates
        interval = setInterval(sendUpdate, 1000);
      },
      cancel() {
        // Cleanup is handled in the cancel method
        isActive = false;
        if (interval) {
          clearInterval(interval);
        }
        console.log("Stream cleanup completed");
      },
    });
  },
});

// Test stream cancellation
const response = await eventStream.fetch(request);
const reader = response.body!.getReader();

// This will trigger the cancel method for cleanup
reader.cancel();
```

### Error Handling in SSE

EventSource provides comprehensive error handling for different failure scenarios:

```ts
// Start function errors during HTTP requests return 500 status
const errorStream = new EventSource({
  start: () => {
    throw new Error("Configuration error");
  },
});

const response = await errorStream.fetch(
  new Request("http://localhost/events", {
    headers: { accept: "text/event-stream" },
  }),
);
console.log(response.status); // 500

// Stream runtime errors
const runtimeErrorStream = new EventSource({
  start: () =>
    new EventsReadableStream({
      start(controller) {
        // HTTP response will be 200, but stream will emit error
        controller.error(new Error("Stream runtime error"));
      },
    }),
});

const response2 = await runtimeErrorStream.fetch(request);
console.log(response2.status); // 200
try {
  await response2.text(); // This will throw
} catch (error) {
  console.error("Stream error:", error.message);
}

// Graceful error handling in start function
const gracefulStream = new EventSource({
  start: async (request) => {
    try {
      const data = await fetchExternalData();
      return new EventsReadableStream({
        start(controller) {
          controller.enqueue({ event: "data", data: JSON.stringify(data) });
          controller.close();
        },
      });
    } catch (error) {
      return new EventsReadableStream({
        start(controller) {
          controller.enqueue({
            event: "error",
            data: JSON.stringify({
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          });
          controller.close();
        },
      });
    }
  },
});
```

### SSE Features

- **EventSource Protocol Compliance**: Full implementation of the Server-Sent Events specification
- **Automatic Header Management**: Sets proper `Content-Type`, `Cache-Control`, and `Connection` headers
- **Stream Resumption**: Supports `Last-Event-ID` for reliable event delivery
- **Router Integration**: Uses `Router.customRoute` for seamless integration
- **Type Safety**: Full TypeScript support with proper event typing
- **Error Handling**: Built-in error handling with proper HTTP status codes (406, 500)
- **Custom Event Types**: Support for named events and structured data
- **Async Iteration**: Built-in `iterable()` and `toArray()` methods for stream processing
- **Stream Cancellation**: Proper resource cleanup through cancel methods
- **Empty Stream Support**: Graceful handling of empty streams and undefined start functions
- **Accept Header Validation**: Automatic validation of `text/event-stream` accept header

### Event Structure

SSE events support the following properties based on the W3C specification:

```ts
interface Event {
  /** The event ID for stream resumption */
  id?: number | string;
  /** The event type name */
  event?: string;
  /** The event data (automatically JSON stringified if object) */
  data: any;
  /** Reconnection delay in milliseconds */
  retry?: number;
}
```

### EventsReadableStream API

The `EventsReadableStream` extends the standard `ReadableStream` with additional methods:

```ts
class EventsReadableStream extends ReadableStream<Event> {
  // Async iteration support
  iterable(): AsyncIterable<Event>;

  // Collect all events into an array
  toArray(): Promise<Event[]>;
}
```

### HTTP Status Codes

- **200 OK**: Successful SSE stream response
- **406 Not Acceptable**: Client doesn't accept `text/event-stream`
- **500 Internal Server Error**: Start function throws an error

### Testing Support

EventSource includes comprehensive test coverage for:

- ✅ Basic SSE streaming functionality
- ✅ HTTP router integration
- ✅ Stream iteration and async processing
- ✅ Error handling at different levels (start function, stream runtime)
- ✅ Stream cancellation and cleanup
- ✅ Empty stream scenarios
- ✅ Accept header validation
- ✅ Proper HTTP status code responses

### Best Practices

- **Use event IDs**: Always provide event IDs for reliable stream resumption
- **Handle connection cleanup**: Implement proper cleanup through the ReadableStream's cancel method
- **Implement heartbeats**: Send periodic keepalive events for long-lived connections
- **Error recovery**: Use the `retry` field to control client reconnection behavior
- **Structured data**: Use JSON for complex data structures in the `data` field
- **Resource management**: Clear intervals and cleanup resources in the cancel method
- **Test thoroughly**: Ensure your implementation handles empty streams, errors, and cancellation
- **Accept header validation**: Let EventSource automatically handle Accept header validation
- **Graceful error handling**: Handle start function errors to avoid 500 responses
- **Async iteration**: Use `iterable()` method for processing events with async loops

## Router.customRoute Integration

The `Router.customRoute` symbol enables seamless integration between custom objects and the router system. This is particularly useful for building reusable components that can be registered as routes.

### Basic Usage

```ts
import { Router } from "artur";

// Create a custom object with Router.customRoute
const apiHandler = {
  [Router.customRoute]: {
    fetch: async (request) => {
      return new Response("API response");
    },
    method: "POST",
    middlewares: [authMiddleware],
  },
};

// Register it directly with the router
const router = new Router();
router.route("/api/endpoint", apiHandler);
```

### Advanced Custom Route Objects

```ts
class CustomService {
  constructor(private config: any) {}

  [Router.customRoute] = {
    fetch: async (request: Request) => {
      // Access instance methods and properties
      return this.handleRequest(request);
    },
    middlewares: [this.authMiddleware.bind(this)],
  };

  private async handleRequest(request: Request) {
    // Custom logic here
    return new Response("Service response");
  }

  private authMiddleware = (fetch: Fetch) => async (request: Request) => {
    // Custom authentication logic
    return fetch(request);
  };
}

// Use the custom service
const service = new CustomService({ apiKey: "secret" });
router.route("*", "/api/service", service);
```

This pattern is used internally by Artur's `JsonRpcRouter` and other built-in components to provide seamless integration with the routing system.

## JSON-RPC 2.0 Support

Artur includes built-in support for JSON-RPC 2.0 protocol with the `JsonRpcRouter` class. This enables you to build real-time applications with remote procedure calls, session management, and Server-Sent Events (SSE) streaming.

### Basic JSON-RPC Setup

```ts
import { JsonRpcRouter, Router } from "artur";

const rpc = new JsonRpcRouter();

// Register RPC methods using the method API
rpc.method("add", (params: { a: number; b: number }) => {
  return params.a + params.b;
});

rpc.method("greet", (params: { name: string }) => {
  return `Hello, ${params.name}!`;
});

// Integrate with Router
const router = new Router();
router.route("POST", "/api/rpc", rpc);

// Alternative: Use the flexible route patterns
router.route("/api/rpc", rpc); // Supports all HTTP methods by default

// The JsonRpcRouter uses Router.customRoute internally for seamless integration
// You can access the underlying fetch handler if needed:
// const fetchHandler = rpc[Router.customRoute].fetch;
```

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
rpc.method(
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

rpc.method(
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

The JSON-RPC dispatcher provides built-in introspection capabilities through the `enableMethodListing` method. This allows clients to discover available methods and their schemas:

```ts
import { z } from "zod";

// Register your business methods with validation
rpc.method("user.create", (params) => createUser(params), {
  inputValidation: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  outputValidation: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

rpc.method("user.getById", (params) => getUserById(params.id), {
  inputValidation: z.object({ id: z.string() }),
  outputValidation: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

// Register the introspection method
rpc.enableMethodListing("system.listMethods");

// Optional: Hide specific methods from the list
rpc.enableMethodListing("system.listMethods", [
  "system.listMethods", // Hide self-reference
  "internal.debug", // Hide internal methods
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

The `JsonRpcRouter` accepts configuration options to customize its behavior:

```ts
const rpc = new JsonRpcRouter({
  sseEnabled: true, // Enable Server-Sent Events support for real-time streaming
  extractSessionId: (event) => {
    // Custom session ID extraction logic
    return event.httpRequest?.headers.get("x-session-id") || null;
  },
});
```

#### Available Options

- **`sseEnabled`** (`boolean`, default: `false`): Enables Server-Sent Events (SSE) support for GET requests and session-based communication. When enabled, the dispatcher supports real-time streaming and session management. ⚠️ **This is an experimental feature.**

- **`extractSessionId`** (`function`): Custom function to extract session IDs from JSON-RPC events. The default factory checks for:
  - URL parameter `json_rpc_token`
  - HTTP header `x-json-rpc-token`
  - URL parameter `token`

### Method Registration API

The `method()` function is the primary way to register JSON-RPC method handlers with optional validation and excellent TypeScript integration.

#### Basic Method Registration

```ts
// Simple method without validation
rpc.method("ping", async () => "pong");

// Method with typed parameters
rpc.method("calculateSum", async (params: { numbers: number[] }) => {
  return params.numbers.reduce((sum, num) => sum + num, 0);
});

// Method with access to request context
rpc.method("getUserInfo", async (params, request, event) => {
  const userId = params.userId;
  const httpRequest = event.httpRequest; // Access HTTP context if needed
  return await fetchUserData(userId);
});
```

#### Method Registration with Validation

```ts
import { z } from "zod";

rpc.method(
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
  },
);
```

#### Method Registration Options

When registering methods with `method()`, you can provide these options:

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
const rpc = new JsonRpcRouter({
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
const rpc = new JsonRpcRouter({
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

You can provide a custom session ID extractor:

```ts
const rpc = new JsonRpcRouter({
  sseEnabled: true,
  extractSessionId: (event) => {
    // Extract from custom header
    return event.httpRequest?.headers.get("x-custom-session") || null;
  },
});
```

### Direct Usage (without Router)

```ts
const rpc = new JsonRpcRouter();

rpc.method("calculate", (params: { operation: string; values: number[] }) => {
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
}).response;

console.log(result); // { jsonrpc: "2.0", id: 1, result: 15 }
```

### Error Handling

JSON-RPC provides comprehensive error handling with built-in error codes and custom error support:

```ts
import { JsonRpcError } from "artur";

rpc.method("divide", (params: { a: number; b: number }) => {
  if (params.b === 0) {
    throw new JsonRpcError(-32603, "Division by zero", {
      code: "DIVISION_BY_ZERO",
      hint: "The divisor cannot be zero",
    });
  }
  return params.a / params.b;
});

// Built-in error codes
rpc.method("validateUser", (params: { userId: string }) => {
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

rpc.method(
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
import { JsonRpcRouter, Router } from "artur";
import { z } from "zod";

const rpc = new JsonRpcRouter({
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
rpc.method(
  "chat.join",
  (params, request, event) => {
    const sessionId = rpc.options.extractSessionId(event);
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
rpc.method(
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
rpc.enableMethodListing("system.listMethods");

// Set up the router
const router = new Router();
router.route("*", "/api/chat", rpc);

// Alternative: Using the flexible route() method
router.route("/api/chat", rpc); // Automatically handles all HTTP methods

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
import { JsonRpcRouter } from "artur";

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

### EventSource Exports

For Server-Sent Events functionality, Artur exports the following classes and types:

```ts
// Main EventSource class available from "artur"
import { EventSource } from "artur";

// For additional SSE types and utilities, import directly from event-source module
import {
  EventSourceRequest,
  EventsReadableStream,
  type Event,
  type Start,
  type Options,
} from "artur/event-source";
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
