import { Workspace, shell } from "@jondotsoy/utils-js/workspace";
import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from "bun:test";
import fs from "fs";

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

  test("test1", async () => {
    await shell(
      `
        make clean build
      `,
      { cwd: new URL("../", import.meta.url).pathname },
    ).verbose().exitCode;
  });
});
