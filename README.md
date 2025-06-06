# Artur

Artur is a lightweight web framework for building HTTP services with minimal setup. It features a URLPattern based router, a simple middleware layer and runs on both **Node.js** and **Bun**.

## Features

- Declarative router built on top of the URLPattern API
- Middleware support for request and response processing
- Works with Node.js and Bun
- Helpers for error handling and CORS
- Fully typed when used with TypeScript

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

## License

Artur is licensed under the MIT license. See [LICENSE](./LICENSE) for details.
