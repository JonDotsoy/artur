import { RouterError } from "./router-error.js";

export class ArgumentsError extends RouterError {
  constructor(message?: string) {
    const defaultMessage =
      "Invalid arguments provided. Expected one of:\n" +
      "  • use(fetch)\n" +
      "  • use(test, fetch)\n" +
      "  • use(urlPattern, fetch)\n" +
      "  • use(method, urlPattern, fetch)\n\n" +
      "Parameters:\n" +
      "  • fetch: Function that handles the request\n" +
      "  • test: Function that tests if request matches (returns boolean)\n" +
      "  • urlPattern: String pattern or URLPattern instance\n" +
      "  • method: HTTP method (ALL, GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD, TRACE, CONNECT)";

    super(message || defaultMessage);
    this.name = "ArgumentsError";
  }
}
