# Route

The Route component in Artur represents a single route definition that combines HTTP method, URL pattern, and request handling logic. Routes are the fundamental building blocks of the HTTP router, allowing you to define specific endpoints and their corresponding behavior in your web application.

## Syntax

Routes are created using the `router.route()` method, which provides multiple syntax variations to accommodate different use cases and development preferences.

### Basic Syntax Forms

#### 1. Method + URL Pattern + Handler

```typescript
router.route(method, urlPattern, fetchHandler);
router.route(method, urlPattern, fetchHandler, options);
router.route(method, urlPattern, { fetch: fetchHandler, ...options });
```

#### 2. URL Pattern + Handler (defaults to GET)

```typescript
router.route(urlPattern, fetchHandler);
router.route(urlPattern, fetchHandler, options);
router.route(urlPattern, { fetch: fetchHandler, ...options });
```

#### 3. Custom Test + Handler

```typescript
router.route(testFunction, fetchHandler);
router.route(testFunction, fetchHandler, options);
```

#### 4. Configuration Object

```typescript
router.route({
  method?: HTTPMethod,
  urlPattern?: string | URLPattern,
  test?: TestRoute,
  fetch: Fetch,
  middlewares?: Middleware[]
})
```

## Route Generation Examples

### Simple GET Route

```typescript
import { Router } from "artur";

const router = new Router();

// Basic GET route
router.route("/hello", async (request) => {
  return new Response("Hello, World!");
});

// Explicit GET method
router.route("GET", "/hello", async (request) => {
  return new Response("Hello, World!");
});
```

### POST Route with JSON Response

```typescript
router.route("POST", "/api/users", async (request) => {
  const body = await request.json();

  return Response.json({
    success: true,
    user: body,
  });
});
```

### Route with URL Parameters

```typescript
router.route("GET", "/users/:id", async (request) => {
  const { id } = params(request);

  return Response.json({
    userId: id,
    message: `User ${id} details`,
  });
});
```

### Route with Multiple Parameters

```typescript
router.route("GET", "/users/:userId/posts/:postId", async (request) => {
  const { userId, postId } = params(request);

  return Response.json({
    userId,
    postId,
    content: `Post ${postId} by user ${userId}`,
  });
});
```

### Route with Wildcards

```typescript
router.route("GET", "/files/*", async (request) => {
  const url = new URL(request.url);
  const filePath = url.pathname.replace("/files/", "");

  return new Response(`Serving file: ${filePath}`);
});
```

### Route with URLPattern Object

```typescript
import { URLPattern } from "urlpattern-polyfill";

router.route(
  "GET",
  new URLPattern({
    pathname: "/api/v:version(\\d+)/users/:id(\\d+)",
  }),
  async (request) => {
    const { version, id } = params(request);

    return Response.json({
      apiVersion: version,
      userId: id,
    });
  },
);
```

### Route with Custom Test Function

```typescript
router.route(
  (request) => {
    return (
      request.headers.get("content-type")?.includes("application/json") ?? false
    );
  },
  async (request) => {
    const data = await request.json();
    return Response.json({ received: data });
  },
);
```

### Route with Configuration Object

```typescript
router.route({
  method: "PUT",
  urlPattern: "/api/users/:id",
  fetch: async (request) => {
    const { id } = params(request);
    const body = await request.json();

    return Response.json({
      updated: true,
      userId: id,
      data: body,
    });
  },
  middlewares: [authMiddleware, validationMiddleware],
});
```

## HTTP Methods

Artur supports all standard HTTP methods and provides a special `"ALL"` method for universal route matching:

- `"GET"` - Retrieve data
- `"POST"` - Create new resources
- `"PUT"` - Update existing resources
- `"PATCH"` - Partial updates
- `"DELETE"` - Remove resources
- `"OPTIONS"` - CORS preflight requests
- `"HEAD"` - Headers-only requests
- `"TRACE"` - Request tracing
- `"CONNECT"` - Tunnel connections
- `"ALL"` - Matches any HTTP method

### Examples with Different Methods

```typescript
// Handle all methods for an endpoint
router.route("ALL", "/api/health", async (request) => {
  return Response.json({
    status: "ok",
    method: request.method,
  });
});

// Method-specific handlers
router.route("GET", "/api/users", getUsersHandler);
router.route("POST", "/api/users", createUserHandler);
router.route("PUT", "/api/users/:id", updateUserHandler);
router.route("DELETE", "/api/users/:id", deleteUserHandler);
```

## URL Patterns

URL patterns in Artur support parameter extraction and flexible matching using the URLPattern API.

### Parameter Patterns

```typescript
// Named parameters
"/users/:id"; // Matches /users/123
"/users/:userId/posts/:postId"; // Matches /users/123/posts/456

// Optional parameters (URLPattern syntax)
"/users/:id?"; // Matches /users and /users/123

// Regex patterns (URLPattern syntax)
"/users/:id(\\d+)"; // Matches /users/123 but not /users/abc
```

### Wildcard Patterns

```typescript
// Single wildcard
"/files/*"; // Matches /files/anything

// Multiple wildcards
"/api/*/users/*"; // Matches /api/v1/users/123
```

### Complex URLPattern Objects

```typescript
router.route(
  "GET",
  new URLPattern({
    protocol: "https",
    hostname: "api.example.com",
    pathname: "/v:version(\\d+)/users/:id(\\d+)",
    search: "format=:format(json|xml)",
  }),
  handler,
);
```

## Request Handler

The request handler (fetch function) is the core function that processes incoming requests and generates responses.

### Handler Signature

```typescript
type Fetch = (request: Request) => Promise<Response>;
```

### Request Object

The `Request` object is a standard Web API Request with additional context:

```typescript
async function handler(request: Request) {
  // Standard Request properties
  const method = request.method; // HTTP method
  const url = request.url; // Full URL
  const headers = request.headers; // Request headers

  // Body methods
  const text = await request.text(); // Raw text
  const json = await request.json(); // Parsed JSON
  const formData = await request.formData(); // Form data
  const blob = await request.blob(); // Binary data

  // URL parameters (Artur-specific)
  const urlParams = params(request); // Extracted URL parameters

  return new Response("OK");
}
```

## The `params()` Method

The `params()` method is a core utility function in Artur that extracts URL parameters from matched route patterns. It provides access to all dynamic segments captured by URLPattern matching during route resolution.

### Function Signature

```typescript
import { params } from "artur";

type URLParams = Record<string, string | undefined>;

const params = (request: Request): URLParams => {
  // Returns URL parameters extracted from the matched pattern
};
```

### How It Works

When a route matches a request, Artur's URLPattern engine captures named groups and parameter segments from the URL. The `params()` function retrieves these captured values that are internally stored using a WeakMap keyed by the Request object.

The parameter extraction process:

1. **Route Matching**: URLPattern executes against the request URL
2. **Parameter Capture**: Named groups and segments are captured from all URL components
3. **Storage**: Parameters are stored internally using `RequestReflect.set(request, urlParamsSymbol, groupParams)`
4. **Retrieval**: `params(request)` retrieves the stored parameters using `RequestReflect.get()`

### Parameter Sources

The `params()` method aggregates parameters from all URLPattern components:

- **Protocol groups**: `https://`, `http://`
- **Username groups**: Authentication username
- **Password groups**: Authentication password
- **Hostname groups**: Domain and subdomain captures
- **Pathname groups**: Path segments (most common)
- **Hash groups**: Fragment identifier captures

### Basic Usage Examples

#### Simple Path Parameters

```typescript
// Route: /users/:id
router.route("GET", "/users/:id", async (request) => {
  const { id } = params(request);
  // id = "123" for URL /users/123

  return Response.json({ userId: id });
});
```

#### Multiple Path Parameters

```typescript
// Route: /users/:userId/posts/:postId
router.route("GET", "/users/:userId/posts/:postId", async (request) => {
  const { userId, postId } = params(request);
  // userId = "456", postId = "789" for URL /users/456/posts/789

  return Response.json({
    user: userId,
    post: postId,
  });
});
```

#### Nested Resource Parameters

```typescript
// Route: /api/v:version/users/:userId/posts/:postId/comments/:commentId
router.route(
  "GET",
  "/api/v:version/users/:userId/posts/:postId/comments/:commentId",
  async (request) => {
    const { version, userId, postId, commentId } = params(request);
    // For URL: /api/v2/users/123/posts/456/comments/789
    // version = "2", userId = "123", postId = "456", commentId = "789"

    return Response.json({
      apiVersion: version,
      userId,
      postId,
      commentId,
    });
  },
);
```

### Advanced Parameter Patterns

#### Optional Parameters

```typescript
// Using URLPattern for optional parameters
router.route(
  "GET",
  new URLPattern({
    pathname: "/users/:id/:action?",
  }),
  async (request) => {
    const { id, action } = params(request);
    // /users/123 → id = "123", action = undefined
    // /users/123/edit → id = "123", action = "edit"

    return Response.json({
      userId: id,
      action: action || "view",
    });
  },
);
```

#### Regex-Constrained Parameters

```typescript
// Numeric-only parameters
router.route(
  "GET",
  new URLPattern({
    pathname: "/users/:id(\\d+)",
  }),
  async (request) => {
    const { id } = params(request);
    // Only matches numeric IDs: /users/123 ✓, /users/abc ✗

    return Response.json({ userId: parseInt(id) });
  },
);
```

#### Wildcard and Catch-All Parameters

```typescript
// Wildcard parameters
router.route("GET", "/files/*", async (request) => {
  const allParams = params(request);
  // URLPattern creates numbered groups for wildcards
  // Access via allParams['0'], allParams['1'], etc.

  const url = new URL(request.url);
  const filePath = url.pathname.replace("/files/", "");

  return Response.json({
    filePath,
    params: allParams,
  });
});
```

#### Complex URLPattern Parameters

```typescript
router.route(
  "GET",
  new URLPattern({
    protocol: "https",
    hostname: ":subdomain.example.com",
    pathname: "/api/v:version(\\d+)/:resource/:id(\\d+)",
    search: "format=:format(json|xml)",
  }),
  async (request) => {
    const { subdomain, version, resource, id, format } = params(request);
    // For URL: https://api.example.com/api/v2/users/123?format=json
    // subdomain = "api", version = "2", resource = "users", id = "123", format = "json"

    return Response.json({
      subdomain,
      apiVersion: parseInt(version),
      resourceType: resource,
      resourceId: parseInt(id),
      responseFormat: format,
    });
  },
);
```

### Parameter Validation and Type Conversion

#### Basic Validation

```typescript
router.route("GET", "/users/:id", async (request) => {
  const { id } = params(request);

  // Validate parameter exists and is numeric
  if (!id || !/^\d+$/.test(id)) {
    return Response.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const userId = parseInt(id);
  return Response.json({ userId });
});
```

#### Type-Safe Parameter Handling

```typescript
// Helper function for safe parameter extraction
const getNumericParam = (params: URLParams, key: string): number | null => {
  const value = params[key];
  if (!value || !/^\d+$/.test(value)) return null;
  return parseInt(value);
};

router.route("GET", "/users/:userId/posts/:postId", async (request) => {
  const urlParams = params(request);

  const userId = getNumericParam(urlParams, "userId");
  const postId = getNumericParam(urlParams, "postId");

  if (!userId || !postId) {
    return Response.json(
      { error: "Invalid numeric parameters" },
      { status: 400 },
    );
  }

  return Response.json({ userId, postId });
});
```

#### Enum Parameter Validation

```typescript
const validActions = ["create", "edit", "delete", "view"] as const;
type Action = (typeof validActions)[number];

router.route("GET", "/posts/:id/:action", async (request) => {
  const { id, action } = params(request);

  if (!validActions.includes(action as Action)) {
    return Response.json(
      { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
      { status: 400 },
    );
  }

  return Response.json({
    postId: id,
    action: action as Action,
  });
});
```

### Error Handling

#### Handling Missing Parameters

```typescript
router.route("GET", "/users/:id/posts/:postId", async (request) => {
  const { id, postId } = params(request);

  // Check for required parameters
  const missing = [];
  if (!id) missing.push("id");
  if (!postId) missing.push("postId");

  if (missing.length > 0) {
    return Response.json(
      {
        error: "Missing required parameters",
        missing,
      },
      { status: 400 },
    );
  }

  return Response.json({ userId: id, postId });
});
```

#### Parameter Sanitization

```typescript
const sanitizeParam = (param: string | undefined): string => {
  if (!param) return "";
  // Remove potentially dangerous characters
  return param.replace(/[<>\"'&]/g, "");
};

router.route("GET", "/search/:query", async (request) => {
  const { query } = params(request);
  const sanitizedQuery = sanitizeParam(query);

  return Response.json({
    originalQuery: query,
    sanitizedQuery,
    results: [],
  });
});
```

### Best Practices

#### 1. Always Validate Parameters

```typescript
// Good: Validate before use
const { id } = params(request);
if (!id || !/^\d+$/.test(id)) {
  return Response.json({ error: "Invalid ID" }, { status: 400 });
}

// Avoid: Using parameters without validation
const { id } = params(request);
return Response.json({ user: await getUserById(id) }); // Potential error
```

#### 2. Use Destructuring for Clean Code

```typescript
// Good: Clean destructuring
const { userId, postId, action } = params(request);

// Avoid: Accessing params object repeatedly
const urlParams = params(request);
const userId = urlParams.userId;
const postId = urlParams.postId;
const action = urlParams.action;
```

#### 3. Provide Meaningful Error Messages

```typescript
const { id } = params(request);

if (!id) {
  return Response.json({ error: "User ID is required" }, { status: 400 });
}

if (!/^\d+$/.test(id)) {
  return Response.json(
    { error: "User ID must be a positive integer" },
    { status: 400 },
  );
}
```

#### 4. Consider Parameter Defaults

```typescript
const { page, limit, sort } = params(request);

const pageNum = page ? parseInt(page) : 1;
const limitNum = limit ? parseInt(limit) : 10;
const sortBy = sort || "createdAt";

return Response.json({
  page: pageNum,
  limit: limitNum,
  sort: sortBy,
  data: [],
});
```

### Integration with TypeScript

#### Typed Parameter Interface

```typescript
interface UserPostParams {
  userId: string;
  postId: string;
}

router.route("GET", "/users/:userId/posts/:postId", async (request) => {
  const { userId, postId } = params(request) as UserPostParams;

  return Response.json({ userId, postId });
});
```

#### Generic Parameter Helper

```typescript
const getTypedParams = <T extends Record<string, string>>(
  request: Request,
): T => {
  return params(request) as T;
};

interface ApiParams {
  version: string;
  resource: string;
  id: string;
}

router.route("GET", "/api/v:version/:resource/:id", async (request) => {
  const { version, resource, id } = getTypedParams<ApiParams>(request);

  return Response.json({ version, resource, id });
});
```

### URL Parameters Access

```typescript
import { params } from "artur";

router.route("GET", "/users/:id/posts/:postId", async (request) => {
  const { id, postId } = params(request);

  // id and postId are automatically extracted from the URL
  console.log("User ID:", id);
  console.log("Post ID:", postId);

  return Response.json({ userId: id, postId });
});
```

### Query Parameters

```typescript
router.route("GET", "/search", async (request) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const page = url.searchParams.get("page") || "1";

  return Response.json({
    query,
    page: parseInt(page),
    results: [],
  });
});
```

### Request Body Handling

```typescript
// JSON body
router.route("POST", "/api/data", async (request) => {
  const data = await request.json();
  return Response.json({ received: data });
});

// Form data
router.route("POST", "/submit", async (request) => {
  const formData = await request.formData();
  const name = formData.get("name");

  return new Response(`Hello, ${name}!`);
});

// Raw text
router.route("POST", "/text", async (request) => {
  const text = await request.text();
  return new Response(`Received: ${text}`);
});
```

## Response Object

Handlers must return a standard Web API Response object.

### Response Creation

```typescript
// Plain text response
return new Response("Hello, World!");

// JSON response
return Response.json({ message: "Hello" });

// Custom headers and status
return new Response("Not Found", {
  status: 404,
  headers: {
    "Content-Type": "text/plain",
    "X-Custom-Header": "value",
  },
});

// Stream response
return new Response(readableStream, {
  headers: { "Content-Type": "application/octet-stream" },
});
```

### Common Response Patterns

```typescript
// Success responses
return Response.json({ success: true, data: result });
return new Response("OK", { status: 200 });

// Error responses
return Response.json({ error: "Not found" }, { status: 404 });
return new Response("Unauthorized", { status: 401 });

// Redirect responses
return Response.redirect("https://example.com", 302);

// File download
return new Response(fileBlob, {
  headers: {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": 'attachment; filename="file.pdf"',
  },
});
```

## Complete Examples

### REST API Endpoint

```typescript
import { Router, params } from "artur";

const router = new Router();

// Users collection
router
  .route("GET", "/api/users", async (request) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    return Response.json({
      users: [],
      pagination: { page, limit },
    });
  })
  .route("POST", "/api/users", async (request) => {
    const userData = await request.json();

    // Validate and create user
    const newUser = { id: Date.now(), ...userData };

    return Response.json(newUser, { status: 201 });
  })
  .route("GET", "/api/users/:id", async (request) => {
    const { id } = params(request);

    // Fetch user by ID
    const user = { id, name: "John Doe" };

    return Response.json(user);
  })
  .route("PUT", "/api/users/:id", async (request) => {
    const { id } = params(request);
    const userData = await request.json();

    // Update user
    const updatedUser = { id, ...userData };

    return Response.json(updatedUser);
  })
  .route("DELETE", "/api/users/:id", async (request) => {
    const { id } = params(request);

    // Delete user
    return new Response(null, { status: 204 });
  });
```

---

## See Also

- [Middleware](./middleware.md) - Learn how to add middleware to your routes for cross-cutting concerns like authentication, logging, and validation.
