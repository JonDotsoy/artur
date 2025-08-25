/**
 * A utility class for storing and retrieving metadata associated with Request objects using WeakMap.
 *
 * This provides a clean way to attach additional data to Request objects without modifying the
 * original Request instance, which is particularly useful for storing URL parameters, user data,
 * or other request-scoped information.
 *
 * @example
 * ```typescript
 * const request = new Request("http://localhost/api/users/123");
 *
 * // Store URL parameters
 * RequestReflect.set(request, urlParamsSymbol, { id: "123" });
 *
 * // Retrieve URL parameters later
 * const params = RequestReflect.get(request, urlParamsSymbol);
 * console.log(params.id); // "123"
 * ```
 */
export class RequestReflect {
  private static requestMap = new WeakMap<Request, Map<string | symbol, any>>();
  private static getRequestMap(request: Request): Map<string | symbol, any> {
    let map = this.requestMap.get(request);
    if (!map) {
      map = new Map<string | symbol, any>();
      this.requestMap.set(request, map);
    }
    return map;
  }
  static has(requestTarget: Request, paramKey: string | symbol): boolean {
    const map = this.getRequestMap(requestTarget);
    return map.has(paramKey);
  }
  static set(requestTarget: Request, paramKey: string | symbol, value: any) {
    const map = this.getRequestMap(requestTarget);
    map.set(paramKey, value);
  }
  static get<T = any>(
    requestTarget: Request,
    paramKey: string | symbol,
  ): T | undefined {
    const map = this.getRequestMap(requestTarget);
    return map.get(paramKey) as T | undefined;
  }
}
