import type { URLPattern } from "urlpattern-polyfill/urlpattern";
import type { RouterOptionsDef } from "./router-options-def.js";
import type { HTTPMethods } from "./http-methods-types.js";

export type Route<T> = {
  method?: "ALL" | HTTPMethods;
  /** @deprecated */
  urlPattern?: URLPattern;
  test?: (request: Request) => Promise<boolean> | boolean;
  options?: RouterOptionsDef<T>;
};
