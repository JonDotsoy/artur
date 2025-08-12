# AI Agent Guidelines for Artur

## Project Overview

Artur is a lightweight web framework for Node.js and Bun, featuring URLPattern-based routing and middleware support. The codebase follows a dual-bundle architecture targeting both CommonJS and ESM with full TypeScript support.

## Architecture

### Core Components

- **Router** (`src/http/router.ts`): The main framework component using URLPattern for routing with decorator-based middleware
- **Access Control** (`src/http/access-control.ts`): CORS middleware implementation
- **Error Handling** (`src/utils/describeErrorResponse.ts`): WeakMap-based error response mapping system

### Key Design Patterns

1. **URLPattern-based Routing**: Uses Web API URLPattern for flexible route matching, not Express-style string patterns
2. **Decorator Middleware**: Leverages `@jondotsoy/decorate` for functional middleware composition
3. **WeakMap Parameter Storage**: Route parameters stored in WeakMap keyed by Request objects
4. **Dual Runtime Support**: Designed for both Node.js (using `requestListener`) and Bun (using `fetch`)

## Development Workflow

### Build System

```bash
make build          # Build all targets (CJS, ESM, types)
bun fmt             # Format code with Prettier
bun run cli --help  # Show CLI help
bun run cli mcp     # Start MCP server via CLI
```

The build creates three separate outputs:

- `lib/cjs/` - CommonJS with package.json type="commonjs"
- `lib/esm/` - ES modules with package.json type="module"
- `lib/types/` - TypeScript declarations

### Testing

Tests use Bun's built-in test runner (`bun:test`). Run tests with:

```bash
bun test
```

## Code Conventions

### Route Registration Pattern

```typescript
router.use("GET", "/users/:id", {
  middleware: [...], // Optional middleware array
  test: (req) => ..., // Optional additional validation
  fetch: (req) => ... // Handler function
});
```

### Parameter Access

Always use the `params()` helper function with typed requests:

```typescript
const userParams = params(request); // Extracts URLPattern groups
```

### Error Handling

Use `describeErrorResponse()` to map errors to specific HTTP responses:

```typescript
describeErrorResponse(error, new Response("Unauthorized", { status: 401 }));
throw error; // Router will use the mapped response
```

### Middleware Pattern

Middleware functions wrap fetch handlers using decorators:

```typescript
const middleware: Middleware<any> = (fetch) => async (request) => {
  // Pre-processing
  const response = await fetch(request);
  // Post-processing
  return response;
};
```

## File Structure Conventions

- Keep tests adjacent to source files (`.spec.ts`)
- Use `.js` extensions in imports for proper ESM compatibility
- Export patterns match the dual-bundle structure in `package.json` exports

## Critical Dependencies

- `urlpattern-polyfill`: Provides URLPattern API for routing
- `@jondotsoy/decorate`: Functional middleware composition
- `@modelcontextprotocol/sdk`: Model Context Protocol support for AI integrations
- TypeScript 5.0+ required for proper type inference

## Integration Points

- **Node.js Integration**: Use `router.requestListener()` with http.createServer
- **Bun Integration**: Use `router.fetch()` directly with Bun.serve
- **CORS**: Apply via router-level middleware: `new Router({ middlewares: [cors()] })`
- **MCP Integration**: Use `bun run mcp:stdio` to start the MCP server for AI assistant integration

## MCP (Model Context Protocol) Support

The project includes MCP server support for AI assistant integration:

```bash
# Using the CLI (recommended)
bun run cli mcp         # Start MCP server via CLI interface
bun src/bin/bin.ts mcp  # Direct execution

# Legacy method
bun run mcp:stdio       # Start MCP server directly
```

The MCP server exposes Artur framework capabilities to AI assistants, currently featuring:

- `hello` prompt: Simple greeting for testing MCP integration
- CLI interface with help and version commands

## Common Pitfalls

1. Don't use Express-style route patterns - URLPattern syntax is different
2. Always handle async middleware properly - responses can be null
3. Parameter extraction requires the `params()` helper, not direct request properties
4. Error responses must be pre-registered with `describeErrorResponse()` to be effective
