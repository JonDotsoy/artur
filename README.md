# Artur

Artur is a modern web framework for building web applications with ease. It provides a powerful router system, middleware support, and an easy-to-use API.

## Example Usage

On [Bun](https://bun.sh)

```ts
const router = new Router();

router.use("GET", "/hello", {
  fetch: (request) => new Response("Hello world"),
});

serve({
  port: 3000,
  fetch(request) {
    return router.fetch(request);
  },
});
```

On [NodeJS](https://nodejs.org)

```ts
import { createServer } from "node:http";

const router = new Router();

router.use("GET", "/hello", {
  fetch: (request) => new Response("Hello world"),
});

const server = createServer((req, res) => {
  router.requestListener(req, res);
});

// starts a simple http server locally on port 3000
server.listen(3000, "127.0.0.1", () => {
  console.log("Listening on 127.0.0.1:3000");
});
```

## Installation

To install Artur, simply run the following command in your terminal:

```shell
npm i @jondotsoy/artur
```

## Fetch Router

The `@jondotsoy/artur/http/router` module provides a router manager to handle Request/Response patterns.

```ts
import { Router, params } from "@jondotsoy/artur/http/router";

const router = new Router();

router.use("GET", "/users/:name", {
  fetch: async (request) => {
    const { name } = params(request);
    return new Response(`hello ${name}`);
  },
});

const response = await router.fetch(new Request("http://localhost/users/mark"));

expect(await response.text()).toEqual("hello mark");
```

## Middleware

Middleware wrap the fetch function and modify the input and output of this function.

```ts
router.use("GET", "/hello", {
  middleware: [
    (fetch) => async (request) => {
      const response = await fetch(request);
      return response;
    },
  ],
  fetch: (request) => new Response("ok"),
});
```

## Router

The route describes how to match a request object. To describe a route, use the API `Router.prototype.use(method: string, path_pattern: string)`.

```ts
router.use("GET", "/hello", {
  fetch: (request) => new Response("ok"),
});
```

Methods allow are `GET`, `POST`, `DELETE`, `OPTIONS`, `HEAD`, `PUT`, `PATCH`. Also you can use `ALL` to match any method.

The path pattern use the [URLPattern API](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API) to match the request object. If the path pattern is a string only evaluate the pathname to evaluate the url use a URLPattern object.

```ts
router.use("GET", new URLPattern({ protocol: "https", pathname: "/hello" }), {
  fetch: (request) => new Response("ok"),
});
```

## Catch Errors

By default, the router catch any error and return a response with status 500. You can also customize the response related with a error using the `describeErrorResponse` function. The next sample catch a jwt message and response a response with status 401.

```ts
try {
  verifyHeaderAuthorization(request.headers.get('authorization'));
} catch (ex) {
  if (ex instaceof JWTError) {
    describeErrorResponse(ex, new Response(ex.message, {status: 401}));
  }
  throw ex;
}
```

## CORS

```ts
const router = new Router({ middlewares: [cors()] });

router.use("OPTIONS", "/hello", {
  fetch: () => new Response(null, { status: 204 }),
});
```
