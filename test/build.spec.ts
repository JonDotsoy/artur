import {
  Workspace,
  shell as originalShell,
  ShellRequest,
} from "@jondotsoy/utils-js/workspace";
import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from "bun:test";
import fs from "fs";

const shell = async (...args: ConstructorParameters<typeof ShellRequest>) => {
  const shellRequest = new ShellRequest(...args);
  await originalShell(shellRequest).verbose().exitCode;
};

describe("Build", () => {
  let workspace: Workspace;

  beforeEach(async () => {
    workspace = Workspace.mktmp();
  });

  afterEach(async () => {
    fs.rmSync(workspace.default.workingDirectory, {
      recursive: true,
      force: true,
    });
  });

  test("should successfully execute clean and build commands", async () => {
    await shell(
      `
        make clean build
      `,
      { cwd: new URL("../", import.meta.url).pathname },
    );

    const libPath = new URL("../lib/", import.meta.url);
    const esmPath = new URL("./esm/", libPath);
    const typesPath = new URL("./types/", libPath);
    const indexEsmPath = new URL("./index.js", esmPath);
    const indexDtsPath = new URL("./index.d.ts", typesPath);

    expect(fs.existsSync(esmPath.pathname)).toBe(true);
    expect(fs.existsSync(typesPath.pathname)).toBe(true);
    expect(fs.existsSync(indexEsmPath.pathname)).toBe(true);
    expect(fs.existsSync(indexDtsPath.pathname)).toBe(true);
  });
});
