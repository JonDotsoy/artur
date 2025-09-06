import type { Validation } from "./validation";

export type ExtractValidationType<A> =
  A extends Validation<infer U> ? U : unknown;
