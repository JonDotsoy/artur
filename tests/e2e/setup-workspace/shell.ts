import { result as r } from "@jondotsoy/utils-js";
import { spawnSync } from "child_process";
import { rootUrl } from "./constants/root-url";
import type { ShellOptions } from "./types/shell-options";

export const shell = (options: ShellOptions) => {
  const command = options.command;
  const args = options.args ?? [];
  const cwd = options.cwd ?? rootUrl.pathname;
  const stdout = options.stdout ?? "inherit";
  const stderr = options.stderr ?? "inherit";
  const timeout = options.timeout ?? 5000; // 5 seconds default;

  // const disableProcessEnv = options.disableProcessEnv ?? false;
  const baseEnv = process.env;
  const env = options.env ?? {};

  const result = spawnSync(command, args, {
    cwd,
    stdio: ["ignore", stdout, stderr],
    signal: AbortSignal.timeout(timeout),
    env: { ...baseEnv, ...env },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const error = new Error(
      `Command "${command} ${args.join(" ")}" failed with exit code ${result.status}`,
    );
    Error.captureStackTrace(error, shell);
    throw error;
  }

  const createBufferTypes = (buf: Buffer | null) => ({
    buffer: buf,
    text: () => (buf ? buf.toString() : ""),
    json: () => {
      const [, data] = r(() => JSON.parse(buf?.toString() ?? ""));
      return data;
    },
  });

  return {
    stdout: createBufferTypes(result.stdout),
    stderr: createBufferTypes(result.stderr),
    status: result.status,
    pid: result.pid,
    signal: result.signal,
  };
};
