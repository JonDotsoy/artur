# artur

Framework to build a modern apps.

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
