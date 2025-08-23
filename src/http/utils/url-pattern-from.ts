import { URLPattern } from "urlpattern-polyfill/urlpattern";

/**
 * Converts a given value to a `URLPattern` instance.
 *
 * - If the value is a string, it creates a new `URLPattern` using the string as the pathname.
 * - If the value is already a `URLPattern` instance, it returns the value as is.
 * - Otherwise, it throws an error indicating the value cannot be parsed as a `URLPattern`.
 *
 * @param value - The value to convert to a `URLPattern`. Can be a string or a `URLPattern` instance.
 * @returns A `URLPattern` instance corresponding to the input value.
 * @throws {Error} If the value cannot be converted to a `URLPattern`.
 */
export const urlPatternFrom = (value: unknown): URLPattern => {
  if (typeof value === "string") return new URLPattern({ pathname: value });
  if (value instanceof URLPattern) return value;
  throw new Error(`Cannot parse URL Pattern to ${value}`);
};
