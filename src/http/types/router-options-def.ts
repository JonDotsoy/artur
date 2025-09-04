import type { customOptionsSymbol } from "../constants/custom-options-symbol.js";
import type { Middleware } from "./middleware.js";
import type { Fetch } from "./fetch-type.js";

export type RouterOptionsDef<T> = {
  /** The test function */
  test?: (request: Request) => Promise<boolean> | boolean;
  middlewares?: Middleware<T>[];
  fetch?: Fetch;
  [customOptionsSymbol]?: Partial<RouterOptionsDef<T>>;
};
