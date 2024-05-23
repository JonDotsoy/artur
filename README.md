# artur

Framework to build a modern app.

## Install

```shell
npm i @jondotsoy/artur
```

## Fetch Router

The `@jondotsoy/artur/http/router` module provide a router manager to Request/Response patterns.

```ts
import { Router, params } from "@jondotsoy/artur/http/router";

const router = new Router();

router.use("GET", "/users/:name", {
  fetch: async (request: Request) => {
    const { name } = params(request);
    return new Response(`hello ${name}`);
  },
});

const response = await router.fetch(new Request("http://localhost/users/mark"));

expect(await response.text()).toEqual("hello mark");
```

## Middleware

The middleware wrap the fetch function modify the input and output of this function.

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

The route describe how to match a request object. To describe a route is using the api `Router.prototype.use(method: string, path_pattern: string)`.

```ts
router.use("GET", "/hello", {
  fetch: (request) => new Response("ok"),
});
```

Methods allows is `GET`, `POST`, `DELETE`, `OPTIONS`, `HEAD`, `PUT`, `PATCH`. Also you can use `ALL` to match any method.

The path pattern use the [URLPattern API](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API) to match the request object. If the path pattern is a string only evaluate the pathname to evaluate the url use a URLPattern object.

```ts
router.use("GET", new URLPattern({ protocol: "https", pathname: "/hello" }), {
  fetch: (request) => new Response("ok"),
});
```

## Catch Errors

By default the router catch any error, return a response with status 500 and log this error on console.

Is posible customize the response related with a error to this use the `describeErrorResponse` function. The next sample catch a jwt message and response a response with status 401.

```ts
try {
  verifyHeaderAuthorization(request.heageders.get('authorization'));
} catch (ex) {
  if (ex instaceof JWTError) {
    describeErrorResponse(ex, new Response(ex.message, {status: 401}));
  }
  throw ex;
}
```
