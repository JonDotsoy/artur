import type { Validation } from "./validation.js";

export type ExtractValidationType<A> =
  A extends Validation<infer U> ? U : unknown;
