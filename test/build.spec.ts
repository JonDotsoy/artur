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
import fs, { readFileSync } from "fs";

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

  test("should execute clean and build commands and verify all exported files exist", async () => {
    const workspacePath = new URL("../", import.meta.url);
    const packageJsonPath = new URL("./package.json", workspacePath);

    await shell(
      `
        make clean build
      `,
      { cwd: workspacePath.pathname },
    );

    const filesOnExports: any[] = [];

    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    filesOnExports.push(new URL(packageJson.module, workspacePath));
    filesOnExports.push(new URL(packageJson.types, workspacePath));

    if (
      typeof packageJson.exports === "object" &&
      packageJson.exports !== null
    ) {
      for (const exportEntry of Object.values(packageJson.exports)) {
        if (typeof exportEntry === "object" && exportEntry !== null) {
          for (const exportPath of Object.values(exportEntry)) {
            filesOnExports.push(new URL(exportPath, workspacePath));
          }
        }
      }
    }

    for (const filePath of filesOnExports) {
      expect(fs.existsSync(filePath.pathname)).toBe(true);
    }
  });
});
