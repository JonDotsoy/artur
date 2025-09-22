# Middleware

Middleware in Artur provides a powerful mechanism for intercepting and processing HTTP requests and responses. Built on the decorator pattern using `@jondotsoy/decorate`, middleware functions can perform pre-processing, post-processing, authentication, logging, error handling, and other cross-cutting concerns in your web application.

## Core Concepts

### What is Middleware?

Middleware functions are higher-order functions that wrap around your route handlers (fetch functions). They follow the decorator pattern and can:

- **Intercept requests** before they reach your handler
- **Modify responses** after your handler processes them
- **Short-circuit requests** by returning early
- **Add cross-cutting functionality** like authentication, logging, CORS, etc.
- **Handle errors** and transform them into appropriate responses

### Middleware Signature

```typescript
type Middleware<T = any> = (fetch: Fetch) => Fetch;

// Expanded form:
type Middleware<T = any> = (
  fetch: (request: Request) => Promise<Response>,
) => (request: Request) => Promise<Response>;
```

A middleware function:

1. Takes a `fetch` function as input
2. Returns a new `fetch` function
3. The returned function can call the original `fetch` or handle the request differently

## Basic Middleware Structure

### Simple Middleware Template

```typescript
const myMiddleware: Middleware = (fetch) => {
  return async (request) => {
    // Pre-processing: modify request, check auth, etc.
    console.log(`Processing ${request.method} ${request.url}`);

    // Call the next middleware/handler
    const response = await fetch(request);

    // Post-processing: modify response, add headers, etc.
    response?.headers.set("X-Processed-By", "MyMiddleware");

    return response;
  };
};
```

### Middleware that Short-circuits

```typescript
const authMiddleware: Middleware = (fetch) => {
  return async (request) => {
    const token = request.headers.get("Authorization");

    if (!token) {
      // Short-circuit: return without calling fetch
      return new Response("Unauthorized", { status: 401 });
    }

    // Proceed to next middleware/handler
    return await fetch(request);
  };
};
```

## Applying Middleware

### Route-Level Middleware

Apply middleware to specific routes:

```typescript
import { Router } from "artur";

const router = new Router();

// Single middleware
router.route("GET", "/protected", {
  middlewares: [authMiddleware],
  fetch: async (request) => {
    return Response.json({ message: "Protected data" });
  },
});

// Multiple middleware (executed in order)
router.route("POST", "/api/users", {
  middlewares: [
    corsMiddleware, // First: handle CORS
    authMiddleware, // Second: check authentication
    validationMiddleware, // Third: validate input
  ],
  fetch: createUserHandler,
});
```

### Global Middleware

Apply middleware to all routes in a router:

```typescript
const router = new Router({
  middlewares: [
    loggingMiddleware, // Applied to all routes
    corsMiddleware, // Applied to all routes
  ],
});

router.route("GET", "/api/users", userHandler);
router.route("POST", "/api/posts", postHandler);
// Both routes will have logging and CORS middleware
```

### Middleware Execution Order

Middleware executes in a specific order:

1. **Global middleware** (from router options)
2. **Route-specific middleware** (from route definition)
3. **Route handler** (the fetch function)

```typescript
const router = new Router({
  middlewares: [globalMiddleware1, globalMiddleware2],
});

router.route("GET", "/api/data", {
  middlewares: [routeMiddleware1, routeMiddleware2],
  fetch: handler,
});

// Execution order:
// globalMiddleware1 → globalMiddleware2 → routeMiddleware1 → routeMiddleware2 → handler
```

## Common Middleware Patterns

### 1. Logging Middleware

```typescript
const loggingMiddleware: Middleware = (fetch) => {
  return async (request) => {
    const start = Date.now();
    const { method, url } = request;

    console.log(`→ ${method} ${url}`);

    const response = await fetch(request);

    const duration = Date.now() - start;
    console.log(`← ${method} ${url} ${response?.status} (${duration}ms)`);

    return response;
  };
};
```

### 2. Authentication Middleware

```typescript
const authMiddleware: Middleware = (fetch) => {
  return async (request) => {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return Response.json(
        { error: "Missing authorization token" },
        { status: 401 },
      );
    }

    try {
      const user = await validateToken(token);

      // Add user to request context (using a custom header)
      const modifiedRequest = new Request(request, {
        headers: {
          ...Object.fromEntries(request.headers),
          "X-User-ID": user.id,
        },
      });

      return await fetch(modifiedRequest);
    } catch (error) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }
  };
};
```

### 3. CORS Middleware

Artur provides a built-in CORS middleware:

```typescript
import { cors } from "artur";

const corsMiddleware = cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  headers: ["Content-Type", "Authorization"],
  credentials: false,
});

// Usage
const router = new Router({
  middlewares: [corsMiddleware],
});
```

Custom CORS implementation:

```typescript
const customCorsMiddleware: Middleware = (fetch) => {
  return async (request) => {
    const response = await fetch(request);

    if (response) {
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization",
      );
    }

    return response;
  };
};
```

### 4. Validation Middleware

```typescript
const jsonValidationMiddleware: Middleware = (fetch) => {
  return async (request) => {
    const contentType = request.headers.get("Content-Type");

    if (
      request.method !== "GET" &&
      !contentType?.includes("application/json")
    ) {
      return Response.json(
        { error: "Content-Type must be application/json" },
        { status: 400 },
      );
    }

    // Validate JSON structure for POST/PUT requests
    if (["POST", "PUT"].includes(request.method)) {
      try {
        const body = await request.clone().json();
        // Add validation logic here
        if (!body || typeof body !== "object") {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
      } catch (error) {
        return Response.json({ error: "Invalid JSON syntax" }, { status: 400 });
      }
    }

    return await fetch(request);
  };
};
```

### 5. Error Handling Middleware

```typescript
const errorHandlingMiddleware: Middleware = (fetch) => {
  return async (request) => {
    try {
      return await fetch(request);
    } catch (error) {
      console.error("Route error:", error);

      // Return a standardized error response
      return Response.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  };
};
```

### 6. Rate Limiting Middleware

```typescript
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const rateLimitMiddleware = (
  maxRequests: number,
  windowMs: number,
): Middleware => {
  return (fetch) => {
    return async (request) => {
      const clientIP =
        request.headers.get("X-Forwarded-For") ||
        request.headers.get("X-Real-IP") ||
        "unknown";

      const now = Date.now();
      const windowStart = now - windowMs;

      const clientData = rateLimitStore.get(clientIP) || {
        count: 0,
        resetTime: now + windowMs,
      };

      // Reset if window expired
      if (now > clientData.resetTime) {
        clientData.count = 0;
        clientData.resetTime = now + windowMs;
      }

      if (clientData.count >= maxRequests) {
        return Response.json(
          { error: "Rate limit exceeded" },
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(
                (clientData.resetTime - now) / 1000,
              ).toString(),
            },
          },
        );
      }

      clientData.count++;
      rateLimitStore.set(clientIP, clientData);

      const response = await fetch(request);

      // Add rate limit headers
      if (response) {
        response.headers.set("X-RateLimit-Limit", maxRequests.toString());
        response.headers.set(
          "X-RateLimit-Remaining",
          (maxRequests - clientData.count).toString(),
        );
        response.headers.set(
          "X-RateLimit-Reset",
          new Date(clientData.resetTime).toISOString(),
        );
      }

      return response;
    };
  };
};

// Usage
const rateLimiter = rateLimitMiddleware(100, 60000); // 100 requests per minute
```

## Advanced Middleware Concepts

### Conditional Middleware

```typescript
const conditionalMiddleware = (
  condition: (request: Request) => boolean,
  middleware: Middleware,
): Middleware => {
  return (fetch) => {
    return async (request) => {
      if (condition(request)) {
        return await middleware(fetch)(request);
      }
      return await fetch(request);
    };
  };
};

// Usage
const apiOnlyAuth = conditionalMiddleware(
  (req) => req.url.includes("/api/"),
  authMiddleware,
);
```

### Middleware Composition

```typescript
const composeMiddleware = (...middlewares: Middleware[]): Middleware => {
  return (fetch) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), fetch);
  };
};

// Usage
const apiMiddleware = composeMiddleware(
  loggingMiddleware,
  corsMiddleware,
  authMiddleware,
  validationMiddleware,
);
```

### Context Passing Between Middleware

```typescript
// Using request headers for simple context
const contextMiddleware: Middleware = (fetch) => {
  return async (request) => {
    const modifiedRequest = new Request(request, {
      headers: {
        ...Object.fromEntries(request.headers),
        "X-Request-ID": crypto.randomUUID(),
        "X-Request-Time": Date.now().toString(),
      },
    });

    return await fetch(modifiedRequest);
  };
};

// Accessing context in handler
router.route("GET", "/api/data", {
  middlewares: [contextMiddleware],
  fetch: async (request) => {
    const requestId = request.headers.get("X-Request-ID");
    const requestTime = request.headers.get("X-Request-Time");

    return Response.json({
      data: "example",
      meta: { requestId, requestTime },
    });
  },
});
```

## Built-in Middleware

### CORS Middleware

```typescript
import { cors } from "artur";

// Basic CORS
const basicCors = cors();

// Configured CORS
const configuredCors = cors({
  origin: "https://example.com",
  methods: ["GET", "POST"],
  headers: ["Content-Type"],
  credentials: true,
  maxAge: 86400,
});
```

## Testing Middleware

```typescript
import { test, expect, mock } from "bun:test";

test("logging middleware should log requests", async () => {
  const consoleMock = mock(() => {});
  console.log = consoleMock;

  const mockFetch = mock(async () => new Response("OK"));
  const wrappedFetch = loggingMiddleware(mockFetch);

  const request = new Request("http://localhost/test");
  await wrappedFetch(request);

  expect(consoleMock).toHaveBeenCalled();
  expect(mockFetch).toHaveBeenCalledWith(request);
});
```

## Best Practices

### 1. Keep Middleware Focused

Each middleware should have a single responsibility:

```typescript
// Good: Single responsibility
const authMiddleware = (fetch) => {
  /* only authentication */
};
const loggingMiddleware = (fetch) => {
  /* only logging */
};

// Avoid: Multiple responsibilities
const everythingMiddleware = (fetch) => {
  /* auth + logging + validation + ... */
};
```

### 2. Handle Errors Gracefully

```typescript
const safeMiddleware: Middleware = (fetch) => {
  return async (request) => {
    try {
      return await fetch(request);
    } catch (error) {
      console.error("Middleware error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  };
};
```

### 3. Use Early Returns for Performance

```typescript
const efficientMiddleware: Middleware = (fetch) => {
  return async (request) => {
    // Quick checks first
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    return await fetch(request);
  };
};
```

### 4. Document Middleware Dependencies

```typescript
/**
 * Authentication middleware
 *
 * Requires:
 * - Authorization header with Bearer token
 *
 * Adds:
 * - X-User-ID header with authenticated user ID
 *
 * Returns 401 if authentication fails
 */
const authMiddleware: Middleware = (fetch) => {
  // implementation
};
```

## Complete Example

```typescript
import { Router, cors } from "artur";

// Define middleware
const loggingMiddleware: Middleware = (fetch) => {
  return async (request) => {
    console.log(`→ ${request.method} ${request.url}`);
    const response = await fetch(request);
    console.log(`← ${response?.status}`);
    return response;
  };
};

const authMiddleware: Middleware = (fetch) => {
  return async (request) => {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return await fetch(request);
  };
};

// Create router with global middleware
const router = new Router({
  middlewares: [loggingMiddleware, cors({ origin: "*" })],
});

// Public routes (no additional middleware)
router.route("GET", "/health", {
  fetch: async () => Response.json({ status: "ok" }),
});

// Protected routes (with authentication)
router.route("GET", "/api/users", {
  middlewares: [authMiddleware],
  fetch: async () => Response.json({ users: [] }),
});

router.route("POST", "/api/users", {
  middlewares: [authMiddleware, jsonValidationMiddleware],
  fetch: async (request) => {
    const userData = await request.json();
    return Response.json({ created: userData }, { status: 201 });
  },
});
```

---

## See Also

- [Route](./route.md) - Learn how to create and configure routes
- [Object with Custom Route](./object-with-custom-route.md) - Advanced route configuration options
