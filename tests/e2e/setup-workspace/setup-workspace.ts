import { workspacesUrl } from "./constants/workspaces-url.js";
import fs from "fs";
import { shell } from "./shell.js";
import { rootUrl } from "./constants/root-url.js";
import { URL } from "url";

const id = () => {
  const now = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${now.toString(32)}${random.toString(32)}`;
};

export class SetupWorkspace {
  constructor(
    readonly workflowId: string,
    readonly cwd: URL,
  ) {}

  run(cmd: string) {
    try {
      return shell({
        command: "bash",
        args: ["-c", cmd],
        cwd: this.cwd.pathname,
        env: {
          CHECKOUT: rootUrl.pathname.substring(0, rootUrl.pathname.length - 1),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        Error.captureStackTrace(error, this.run);
      }
      throw error;
    }
  }

  file(name: string, content: string) {
    const to = new URL(`./${name}`, this.cwd);
    fs.mkdirSync(new URL("./", to), { recursive: true });
    fs.writeFileSync(to, content);
  }

  close() {
    fs.rmSync(this.cwd, { recursive: true, force: true });
  }

  async [Symbol.asyncDispose]() {
    this.close();
  }

  static async init(): Promise<SetupWorkspace> {
    const workflowId = id();
    const cwd = new URL(`./workspace-${workflowId}/`, workspacesUrl);
    fs.mkdirSync(cwd, { recursive: true });
    return new SetupWorkspace(workflowId, cwd);
  }
}
