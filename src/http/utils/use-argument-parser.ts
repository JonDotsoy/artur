import type { HTTPMethods } from "../types/http-methods-types.js";
import { URLPattern } from "urlpattern-polyfill/urlpattern";
import { urlPatternFrom } from "./url-pattern-from.js";
import type { Route } from "../types/route.js";

type Args = [method: HTTPMethods, urlPattern: string | URLPattern];

const useArgumentOrder = (args: Args) => {
  const [method, urlPattern] = args;
  return { method, urlPattern };
};

/**
 * Parses the arguments for a route.
 *
 * @param args
 * @returns
 */
export const useArgumentParser = (...args: Args): Route<any> => {
  const argsParts = useArgumentOrder(args);
  const method = argsParts.method;
  const urlPattern = urlPatternFrom(argsParts.urlPattern);

  return {
    method,
    urlPattern,
  };
};
