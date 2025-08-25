import type { URLPattern } from "urlpattern-polyfill";
import type { RouterOptionsDef } from "./router-options-def.js";
import type { HTTPMethods } from "./http-methods-types.js";
import type { Fetch } from "./fetch-type.js";
import { Route as NewRoute } from "../route.js";

/**
 * Represents a route in the application.
 *
 * @deprecated Use {@link NewRoute} instead. This type is retained for backward compatibility and will be removed in future versions.
 * Represents a route definition in the application.
 */
export type Route<T = any> = {
  method?: "ALL" | HTTPMethods;
  /** @deprecated */
  urlPattern?: URLPattern;
  test?: (request: Request) => Promise<boolean> | boolean;
  /** @deprecated */
  options?: RouterOptionsDef<T>;
  fetch?: Fetch;
};
