import { Workspace, shell } from "@jondotsoy/utils-js/workspace";
import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "bun:test";
import fs from "fs";

const TEST_VERBOSE = !!process.env.TEST_VERBOSE;

const rootRun = async (
  command: string,
  options?: Parameters<typeof shell>[1],
) => {
  const childProcess = await shell(command, {
    cwd: new URL("../", import.meta.url).pathname,
    ...options,
  });
  if (TEST_VERBOSE) {
    childProcess.verbose();
  }
  const exitCode = await childProcess.exitCode;
  if (exitCode !== 0) {
    const error = new Error(
      `Command failed with exit code ${exitCode}: ${command}\n${(await childProcess.stderr.text()).toString()}`,
    );
    Error.captureStackTrace(error, rootRun);
    throw error;
  }
  return childProcess;
};

beforeAll(async () => {
  await rootRun(`
    packageVersion=$(node -p "require('./package.json').version")
    tarball="artur-\${packageVersion}.tgz"

    if [ ! -f "\$tarball" ]; then
      make build
      npm pack
      cp "\$tarball" "artur.tgz"
    fi
  `);
});

describe("Package Compatibility Tests", () => {
  describe("ES Module compatibility", () => {
    let workspace: Workspace;
    const envs: Record<string, string> = {};

    let run = async (command: string, options?: Parameters<typeof shell>[1]) =>
      rootRun(command, {
        cwd: workspace.default.workingDirectory.pathname,
        env: { ...(process.env as any), ...envs },
        ...options,
      });

    let node18 = (command: string, options?: Parameters<typeof shell>[1]) =>
      run(
        `
          asdf set nodejs 18.20.8
          ${command}
        `,
        options,
      );

    let nodeLts = (command: string, options?: Parameters<typeof shell>[1]) =>
      run(
        `
          asdf set nodejs 22.19.0
          ${command}
        `,
        options,
      );

    let nodeCurrent = (
      command: string,
      options?: Parameters<typeof shell>[1],
    ) =>
      run(
        `
          asdf set nodejs 24.8.0
          ${command}
        `,
        options,
      );

    beforeAll(async () => {
      workspace = Workspace.mktmp();

      await rootRun(`
        cp "artur.tgz" "${workspace.default.workingDirectory.pathname}/artur.tgz"
      `);

      await run(`jq -n '{private:true,type:"module"}' > package.json`);
      await node18(`npm install ./artur.tgz`);

      const addScript = async (name: string, content: string) => {
        envs.APP_SCRIPT = btoa(content);

        await run(`echo $APP_SCRIPT | base64 -d > "${name}"`);
      };

      await addScript("app_1.js", `import "artur";`);
      await addScript("app_2.js", `import "artur/http";`);
      await addScript("app_3.js", `import "artur/json-rpc";`);
      await addScript("app_4.js", `import "artur/event-source";`);
    });

    afterAll(async () => {
      fs.rmSync(workspace.default.workingDirectory, {
        recursive: true,
        force: true,
      });
    });

    const matrixNodejs = [
      { name: "Node.js 18.20.8", fn: node18 },
      { name: "Node.js LTS (22.19.0)", fn: nodeLts },
      { name: "Node.js Current (24.8.0)", fn: nodeCurrent },
    ];

    const matrixApps = [
      { name: "main entry point", file: "app_1.js", module: "artur" },
      { name: "HTTP submodule", file: "app_2.js", module: "artur/http" },
      {
        name: "JSON-RPC submodule",
        file: "app_3.js",
        module: "artur/json-rpc",
      },
      {
        name: "Event Source submodule",
        file: "app_4.js",
        module: "artur/event-source",
      },
    ];

    for (const nodejs of matrixNodejs) {
      for (const app of matrixApps) {
        test(`should successfully import ${app.name} (${app.module}) using ES modules on ${nodejs.name}`, async () => {
          await nodejs.fn(`node ${app.file}`);
        });
      }
    }
  });

  describe("CommonJS compatibility", () => {
    let workspace: Workspace;
    const envs: Record<string, string> = {};

    let run = async (command: string, options?: Parameters<typeof shell>[1]) =>
      rootRun(command, {
        cwd: workspace.default.workingDirectory.pathname,
        env: { ...(process.env as any), ...envs },
        ...options,
      });

    let node18 = (command: string, options?: Parameters<typeof shell>[1]) =>
      run(
        `
          asdf set nodejs 18.20.8
          ${command}
        `,
        options,
      );

    let nodeLts = (command: string, options?: Parameters<typeof shell>[1]) =>
      run(
        `
          asdf set nodejs 22.19.0
          ${command}
        `,
        options,
      );

    let nodeCurrent = (
      command: string,
      options?: Parameters<typeof shell>[1],
    ) =>
      run(
        `
          asdf set nodejs 24.8.0
          ${command}
        `,
        options,
      );

    beforeAll(async () => {
      workspace = Workspace.mktmp();

      await rootRun(`
        cp "artur.tgz" "${workspace.default.workingDirectory.pathname}/artur.tgz"
      `);

      await run(`jq -n '{private:true}' > package.json`);
      await node18(`npm install ./artur.tgz`);

      const addScript = async (name: string, content: string) => {
        envs.APP_SCRIPT = btoa(content);

        await run(`echo $APP_SCRIPT | base64 -d > "${name}"`);
      };

      await addScript("app_1.js", `require("artur");`);
      await addScript("app_2.js", `require("artur/http");`);
      await addScript("app_3.js", `require("artur/json-rpc");`);
      await addScript("app_4.js", `require("artur/event-source");`);
    });

    afterAll(async () => {
      fs.rmSync(workspace.default.workingDirectory, {
        recursive: true,
        force: true,
      });
    });

    const matrixNodejs = [
      { name: "Node.js LTS (22.19.0)", fn: nodeLts },
      {
        name: "Node.js Current (24.8.0)",
        fn: nodeCurrent,
      },
    ];

    const matrixApps = [
      { name: "main entry point", file: "app_1.js", module: "artur" },
      { name: "HTTP submodule", file: "app_2.js", module: "artur/http" },
      {
        name: "JSON-RPC submodule",
        file: "app_3.js",
        module: "artur/json-rpc",
      },
      {
        name: "Event Source submodule",
        file: "app_4.js",
        module: "artur/event-source",
      },
    ];

    for (const nodejs of matrixNodejs) {
      for (const app of matrixApps) {
        test(`should successfully import ${app.name} (${app.module}) using CommonJS on ${nodejs.name}`, async () => {
          await nodejs.fn(`node ${app.file}`);
        });
      }
    }
  });

  describe("bun", () => {
    let workspace: Workspace;
    const envs: Record<string, string> = {};

    let run = async (command: string, options?: Parameters<typeof shell>[1]) =>
      rootRun(
        `
          asdf set bun 1.2.21
          ${command}
        `,
        {
          cwd: workspace.default.workingDirectory.pathname,
          env: { ...(process.env as any), ...envs },
          ...options,
        },
      );

    beforeAll(async () => {
      workspace = Workspace.mktmp();

      await rootRun(`
        cp "artur.tgz" "${workspace.default.workingDirectory.pathname}/artur.tgz"
      `);

      await run(`jq -n '{private:true}' > package.json`);
      await run(`bun install ./artur.tgz`);

      const addScript = async (name: string, content: string) => {
        envs.APP_SCRIPT = btoa(content);

        await run(`echo $APP_SCRIPT | base64 -d > "${name}"`);
      };

      await addScript("app_1.js", `import "artur";`);
      await addScript("app_2.js", `import "artur/http";`);
      await addScript("app_3.js", `import "artur/json-rpc";`);
      await addScript("app_4.js", `import "artur/event-source";`);
      await addScript("app_5.js", `require("artur");`);
      await addScript("app_6.js", `require("artur/http");`);
      await addScript("app_7.js", `require("artur/json-rpc");`);
      await addScript("app_8.js", `require("artur/event-source");`);
    });

    afterAll(async () => {
      fs.rmSync(workspace.default.workingDirectory, {
        recursive: true,
        force: true,
      });
    });

    const matrixBun = [{ name: "Bun 1.2.21", fn: run }];

    const matrixApps = [
      { name: "main entry point", file: "app_1.js", module: "artur" },
      { name: "HTTP submodule", file: "app_2.js", module: "artur/http" },
      {
        name: "JSON-RPC submodule",
        file: "app_3.js",
        module: "artur/json-rpc",
      },
      {
        name: "Event Source submodule",
        file: "app_4.js",
        module: "artur/event-source",
      },
      { name: "main entry point (CJS)", file: "app_5.js", module: "artur" },
      { name: "HTTP submodule (CJS)", file: "app_6.js", module: "artur/http" },
      {
        name: "JSON-RPC submodule (CJS)",
        file: "app_7.js",
        module: "artur/json-rpc",
      },
      {
        name: "Event Source submodule (CJS)",
        file: "app_8.js",
        module: "artur/event-source",
      },
    ];

    for (const bun of matrixBun) {
      for (const app of matrixApps) {
        test(`should successfully import ${app.name} (${app.module}) using CommonJS on ${bun.name}`, async () => {
          await bun.fn(`bun run ${app.file}`);
        });
      }
    }
  });
});
