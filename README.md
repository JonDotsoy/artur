# artur

Framework to build a modern apps.

## Install

```shell
npm i artur
```

## Fetch Router

The `artur/http/router` module provide a router manager to Request/Response patterns.

```ts
import { Router } from "artur/http/router";

const router = new Router();

router.use("GET", "/users/:name", {
  fetch: async (request: Request) => {
    return new Response("ok");
  },
});

const response = await router.fetch(request);
```