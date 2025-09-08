import {
  describe as conditionalDescribe,
  test,
  beforeEach,
  afterEach,
  expect,
} from "bun:test";
import { SetupWorkspace as SetupWorkspace } from "./setup-workspace/setup-workspace";

const ENABLE_BUN_TESTS = !!process.env.ENABLE_BUN_TESTS;
const ENABLE_NODE_TESTS = !!process.env.ENABLE_NODE_TESTS;

const describeWithBun = conditionalDescribe.if(ENABLE_BUN_TESTS);
const describeWithNode = conditionalDescribe.if(ENABLE_NODE_TESTS);

describeWithBun("test0", () => {
  test(
    "test1",
    async () => {
      await using workspace = await SetupWorkspace.init();

      workspace.file(`.tool-versions`, `bun 1.1.42`);

      workspace.run(
        `
        INFO_PATH="$PWD/info.json"
        cd ../../../../.. && make pack && make info > "$INFO_PATH"
      `,
      );

      workspace.run(
        `
        INFO_PATH="$PWD/info.json"
        bun init -y
        cp "$CHECKOUT/\$(cat "$INFO_PATH" | jq -r '.pkg')" "pack.tgz"
        ls -lha
        bun add "./pack.tgz"
      `,
      );

      workspace.file(
        "app.ts",
        `
      import { Router } from "artur";
      import { serve } from "bun";

      const router = new Router();

      router.route("GET", "/hello", {
        fetch: async () => new Response("Hello world"),
      });

      const server = serve({
        port: 3000,
        fetch: (request) => router.fetch(request),
      });

      server.stop();
    `,
      );

      const { status } = workspace.run(`
      bun run ./app.ts
    `);

      expect(status).toBe(0);
    },
    {
      timeout: 60_000,
    },
  );
});

describeWithNode("test2", () => {
  test(
    "test3",
    async () => {
      await using workspace = await SetupWorkspace.init();

      workspace.file(`.tool-versions`, `nodejs 20.16.0`);

      workspace.run(
        `
        INFO_PATH="$PWD/info.json"
        cd ../../../../.. && make pack && make info > "$INFO_PATH"
      `,
      );

      workspace.file(
        "package.json",
        JSON.stringify({
          type: "module",
          private: true,
        }),
      );

      workspace.run(
        `
        INFO_PATH="$PWD/info.json"
        npm install "$CHECKOUT/\$(cat "$INFO_PATH" | jq -r '.pkg')"
      `,
      );

      workspace.file(
        "app.js",
        `
      import { Router } from "artur";
      import { createServer } from "http";

      const router = new Router();

      router.route("GET", "/hello", {
        fetch: async () => new Response("Hello world"),
      });

      const server = createServer((req, res) => {
        router.requestListener(req, res);
      });

      server.listen(3000, () =>{
        server.close();
      });
    `,
      );

      const { status } = workspace.run(`
      node ./app.js
    `);

      expect(status).toBe(0);
    },
    {
      timeout: 60_000,
    },
  );
});
