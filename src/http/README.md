# HTTP Module Documentation

## Route Class

The `Route` class is a core component of the Artur framework that represents an HTTP route with associated test logic, middleware, and fetch handler.

### Overview

A Route encapsulates:

- **Test Function**: Determines if a request matches this route
- **Middlewares**: Array of middleware functions to process requests/responses
- **Fetch Handler**: Function that handles the request and generates a response

### Class Constructor

```typescript
constructor(
  public test: TestRoute,
  public middlewares: Middleware[],
  public fetch: Fetch,
)
```

### Static Methods

#### `Route.true(fetch: Fetch)`

Creates a route that always matches any request.

```typescript
const catchAllRoute = Route.true(async (request) =>
  Response.json({ message: "Catch all route" }),
);
```

#### `Route.canParse(routeParameters: RouteArguments): boolean`

Validates if route parameters can be parsed into a valid Route instance. Returns `true` if the parameters contain the minimum required information (a fetch function).

```typescript
const validParams = {
  method: "GET",
  urlPattern: "/api/users",
  fetch: async (req) => Response.json({ users: [] }),
};
console.log(Route.canParse(validParams)); // true

const invalidParams = {
  method: "POST",
  urlPattern: "/api/users",
  // Missing fetch function
};
console.log(Route.canParse(invalidParams)); // false
```

#### `Route.parse(routeParameters: RouteArguments): Route`

Parses route parameters and creates a new Route instance. This method:

1. Validates the parameters using `canParse()`
2. Builds assertion functions for HTTP method validation
3. Creates URL pattern matching logic
4. Combines custom test functions
5. Returns a configured Route instance

```typescript
const route = Route.parse({
  method: "GET",
  urlPattern: "/api/users/:id",
  fetch: async (request) => {
    const params = params(request);
    return Response.json({ userId: params.id });
  },
});
```

### Route Parameter Options

When using `Route.parse()`, you can specify:

#### `method` (optional)

- HTTP method to match (`GET`, `POST`, `PUT`, `DELETE`, etc.)
- Use `"ALL"` to match any HTTP method
- If omitted, any method will match

#### `urlPattern` (optional)

- URL pattern using URLPattern syntax
- Supports parameters like `/users/:id`
- If omitted, any URL will match

#### `test` (optional)

- Custom test function for additional validation
- Receives the Request object and returns boolean or Promise\<boolean\>
- Applied in addition to method and URL pattern checks

#### `fetch` (required)

- The handler function that processes the request
- Must return a Response object or Promise\<Response\>

#### `middlewares` (optional)

- Array of middleware functions to process the request/response
- Applied in order before the fetch handler

### Assertion Logic

The Route parsing creates a series of assertions that are evaluated in order:

1. **HTTP Method Check**: If `method` is specified, verifies the request method matches
2. **URL Pattern Match**: If `urlPattern` is specified, tests against URLPattern and extracts parameters
3. **Custom Test**: If `test` function is provided, executes additional validation

All assertions must pass for the route to match. If any assertion fails, the route does not match.

### URL Parameter Extraction

When a route matches with a URL pattern containing parameters, the extracted values are stored in a WeakMap keyed by the Request object. Use the `params()` function from the router to access them:

```typescript
const route = Route.parse({
  method: "GET",
  urlPattern: "/users/:id/posts/:postId",
  fetch: async (request) => {
    const { id, postId } = params(request);
    return Response.json({ userId: id, postId });
  },
});
```

### Examples

#### Basic Route

```typescript
const healthRoute = Route.parse({
  method: "GET",
  urlPattern: "/health",
  fetch: async () => new Response("OK"),
});
```

#### Route with Parameters

```typescript
const userRoute = Route.parse({
  method: "GET",
  urlPattern: "/api/users/:id",
  fetch: async (request) => {
    const { id } = params(request);
    return Response.json({ user: { id } });
  },
});
```

#### Route with Custom Test

```typescript
const adminRoute = Route.parse({
  method: "POST",
  urlPattern: "/admin/*",
  test: (request) => {
    const authHeader = request.headers.get("authorization");
    return authHeader?.startsWith("Bearer admin-");
  },
  fetch: async (request) => {
    return Response.json({ message: "Admin action performed" });
  },
});
```

#### Route with Middleware

```typescript
const protectedRoute = Route.parse({
  method: "GET",
  urlPattern: "/protected",
  middlewares: [authMiddleware, loggingMiddleware],
  fetch: async (request) => {
    return Response.json({ data: "Protected content" });
  },
});
```

#### Catch-All Route

```typescript
const notFoundRoute = Route.parse({
  fetch: async (request) => {
    return new Response("Not Found", { status: 404 });
  },
});
```

### Internal Implementation Details

#### URL Pattern Matching

The `urlPatternMatch` function:

- Uses the Web API URLPattern for flexible route matching
- Extracts parameters from all URLPattern components (pathname, search, hash, etc.)
- Stores parameters in a WeakMap using the `urlParamsSymbol`
- Returns boolean indicating match success

#### HTTP Method Assertion

The `assetHTTPMethod` function:

- Handles the special "ALL" method to match any HTTP method
- Performs case-insensitive comparison for specific methods
- Returns boolean indicating method match

#### Request Reflection

Uses the `RequestReflect` utility to store URL parameters in a WeakMap, allowing parameter access without modifying the Request object directly.

### Best Practices

1. **Always provide a fetch function** - This is the only required parameter
2. **Use specific methods when possible** - Prefer `GET`, `POST` etc. over `"ALL"`
3. **Combine URL patterns with custom tests** - For complex routing logic
4. **Order routes from specific to general** - More specific routes should be registered first
5. **Use middleware for cross-cutting concerns** - Authentication, logging, etc.

### Error Handling

The `Route.parse()` method throws an error if:

- The route parameters cannot be parsed (checked via `canParse()`)
- The fetch function is missing or not a function

Always ensure your route parameters are valid before parsing, or wrap in try-catch blocks.
