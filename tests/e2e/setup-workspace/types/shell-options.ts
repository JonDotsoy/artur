export type ShellOptions = {
  command: string;
  args?: string[];
  cwd?: string;
  stdout?: "inherit" | "pipe" | "ignore";
  stderr?: "inherit" | "pipe" | "ignore";
  timeout?: number;
  env?: Record<string, string>;
  disableProcessEnv?: boolean;
};
