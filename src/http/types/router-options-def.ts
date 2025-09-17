import type { customRouteSymbol } from "../constants/custom-options-symbol.js";
import type { Middleware } from "./middleware.js";
import type { Fetch } from "./fetch-type.js";

/** @deprecated */
export type RouterOptionsDef<T> = {
  /** The test function */
  test?: (request: Request) => Promise<boolean> | boolean;
  middlewares?: Middleware<T>[];
  fetch?: Fetch;
  [customRouteSymbol]?: Partial<RouterOptionsDef<T>>;
};
