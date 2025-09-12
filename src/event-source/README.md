# Server-Sent Events (SSE) Module

This module provides a complete implementation of Server-Sent Events (SSE) for real-time data streaming over HTTP. It implements the EventSource protocol and can be integrated with HTTP routers.

## Table of Contents

- [Overview](#overview)
- [Classes](#classes)
  - [EventSource](#eventsource)
  - [EventSourceRequest](#eventsourcerequest)
  - [EventsReadableStream](#eventsreadablestream)
- [Types](#types)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)

## Overview

The SSE module enables real-time communication between server and client using the `text/event-stream` content type. It supports:

- ✅ EventSource protocol compliance
- ✅ HTTP router integration
- ✅ Stream resumption with Last-Event-ID
- ✅ Custom stream creation logic
- ✅ Automatic data encoding
- ✅ Proper HTTP headers handling
- ✅ Stream iteration with async iterables
- ✅ Error handling and 500 status responses
- ✅ Stream cancellation and cleanup
- ✅ Empty stream handling

## Classes

### EventSource

The main class that handles Server-Sent Events streaming. It implements the EventSource protocol and provides real-time data streaming capabilities over HTTP.

```typescript
export class EventSource {
  constructor(options?: Options);
  create(
    request: EventSourceRequest,
  ): Promise<EventsReadableStream | ReadableStream<Event>>;
  fetch(request: Request): Promise<Response>;
  get [customRouteSymbol](): {
    test: () => boolean;
    fetch: (request: Request) => Promise<Response>;
  };
}
```

#### Constructor

Creates a new `EventSource` instance with optional configuration.

**Parameters:**

- `options` (Optional): Configuration options for the stream
  - `start`: Function to create the event stream

**Example:**

```typescript
const stream = new EventSource({
  start: async (request) => {
    return new EventsReadableStream({
      start(controller) {
        controller.enqueue({ data: "Hello World" });
        controller.close();
      },
    });
  },
});
```

#### Methods

##### `create(request: EventSourceRequest)`

Creates a readable stream for the given request.

**Parameters:**

- `request`: The event source request containing client information

**Returns:**

- `Promise<EventsReadableStream>`: A promise that resolves to an EventsReadableStream. If no start function is provided, returns an empty stream that immediately closes.

**Example:**

```typescript
const request = new EventSourceRequest("last-event-123");
const stream = await eventSource.create(request);
```

##### `fetch(request: Request)`

Handles HTTP requests and returns Server-Sent Events responses. This is the main entry point for processing SSE requests.

**Parameters:**

- `request`: The HTTP request to handle

**Returns:**

- `Promise<Response>`: A Response object with SSE stream or error status

**Behavior:**

- Validates the `Accept` header for `text/event-stream`
- Extracts the `Last-Event-ID` header for stream resumption
- Returns 406 (Not Acceptable) if the client doesn't accept SSE
- Returns 500 (Internal Server Error) if the start function throws an error
- Sets appropriate SSE headers in the response
- Handles stream errors gracefully by returning valid responses that may reject during reading

**Example:**

```typescript
const request = new Request("http://localhost/events", {
  headers: { accept: "text/event-stream" },
});
const response = await eventSource.fetch(request);
```

##### `[customRouteSymbol]` (Getter)

Custom route symbol implementation for HTTP router integration. Allows this stream to be used as a route handler in the HTTP router. The implementation defaults to handling GET requests and accepts all routes.

**Returns:**

- Object with `test` and `fetch` methods for router compatibility

### EventSourceRequest

Represents a Server-Sent Events request with client information. Contains the last event ID received by the client for event stream resumption.

```typescript
export class EventSourceRequest {
  constructor(lastEventID: string | null);
  get lastEventID(): string | null;
}
```

#### Constructor

Creates a new `EventSourceRequest` instance.

**Parameters:**

- `lastEventID`: The last event ID received by the client, used for resuming streams

#### Properties

##### `lastEventID` (Getter)

Gets the last event ID received by the client.

**Returns:**

- `string | null`: The last event ID or null if none was provided

### EventsReadableStream

A specialized ReadableStream for Server-Sent Events that extends the standard ReadableStream interface. Provides additional methods for working with event streams.

```typescript
export class EventsReadableStream extends ReadableStream<Event> {
  iterable(): AsyncIterable<Event>;
  toArray(): Promise<Event[]>;
}
```

#### Methods

##### `iterable()`

Returns an async iterable for iterating through events in the stream. This allows you to use `for await...of` loops to process events.

**Returns:**

- `AsyncIterable<Event>`: An async iterable that yields each event in the stream

**Example:**

```typescript
const stream = new EventsReadableStream({
  start(controller) {
    controller.enqueue({ data: "event 1" });
    controller.enqueue({ data: "event 2" });
    controller.close();
  },
});

// Iterate through events
for await (const event of stream.iterable()) {
  console.log(event.data); // "event 1", then "event 2"
}
```

##### `toArray()`

Collects all events from the stream into an array. The stream must be closed for this method to complete.

**Returns:**

- `Promise<Event[]>`: A promise that resolves to an array containing all events from the stream

**Example:**

```typescript
const events = await stream.toArray();
console.log(events); // [{ data: "event 1" }, { data: "event 2" }]
```

This class provides type safety and better integration with the SSE system by ensuring the stream only handles `Event` objects.

## Types

### Start

Function type for creating a readable stream of Server-Sent Events.

```typescript
type Start = (
  request: EventSourceRequest,
) =>
  | Promise<EventsReadableStream | ReadableStream<Event> | void>
  | EventsReadableStream
  | ReadableStream<Event>
  | void;
```

### Options

Configuration options for `EventSource`.

```typescript
type Options = {
  start?: Start;
};
```

### Event

Represents an event source data structure with the following properties:

```typescript
export interface Event {
  /** The event ID to set the EventSource object's last event ID value */
  id?: number | string;
  /** A string identifying the type of event described */
  event?: string;
  /** The data field for the message */
  data: any;
  /** The reconnection time in milliseconds */
  retry?: number;
}
```

### EventEncoder

A utility class for encoding Event objects into the standard Server-Sent Events format. This encoder is used internally by the EventSource to transform event data into the proper SSE format.

```typescript
export class EventEncoder {
  encode(payload: Event): Uint8Array;
}
```

The encoder handles:

- Event type and ID serialization
- Multi-line data encoding
- Retry value formatting
- Proper SSE protocol formatting

## Usage Examples

### Basic SSE Stream

```typescript
import { EventSource, EventsReadableStream } from "./event-source";

const stream = new EventSource({
  start: async (request) => {
    return new EventsReadableStream({
      start(controller) {
        // Send initial data
        controller.enqueue({ data: "hello world" });

        // Optionally close the stream immediately
        // controller.close();
      },
    });
  },
});

// Handle HTTP requests
const request = new Request("http://localhost", {
  headers: {
    accept: "text/event-stream",
  },
});

const response = await stream.fetch(request);
console.log(response.status); // 200

// Read the stream data
const reader = response.body?.getReader();
const result = await reader?.read();
const text = new TextDecoder().decode(result?.value);
console.log(text); // "data: hello world\n\n"
```

### Auto-Closing Stream

```typescript
const stream = new EventSource({
  start: async (request) => {
    return new EventsReadableStream({
      start(controller) {
        controller.enqueue({ data: "auto close" });
        controller.close(); // Automatically close the stream
      },
    });
  },
});

const response = await stream.fetch(request);
const fullText = await response.text();
console.log(fullText); // "data: auto close\n\n"
```

### Integration with HTTP Router

```typescript
import { Router } from "../http";
import { EventSource, EventsReadableStream } from "./event-source";

const router = new Router();

router.route(
  "/sse",
  new EventSource({
    start: async (request) => {
      console.log(`Client last event ID: ${request.lastEventID}`);

      return new EventsReadableStream({
        start(controller) {
          controller.enqueue({ data: "from router" });
          controller.close();
        },
      });
    },
  }),
);

// Test the router
const response = await router.fetch(
  new Request("http://localhost/sse", {
    headers: {
      accept: "text/event-stream",
    },
  }),
);

console.log(response.status); // 200
console.log(await response.text()); // "data: from router\n\n"
```

### Stream with Cleanup and Cancellation

```typescript
const stream = new EventSource({
  start: async (request) => {
    let timeout: any;

    return new EventsReadableStream({
      start(controller) {
        // Set up a delayed message
        timeout = setTimeout(() => {
          controller.enqueue({ data: "delayed message" });
          controller.close();
        }, 1000);
      },
      cancel() {
        // Clean up resources when stream is cancelled
        clearTimeout(timeout);
        console.log("Stream cancelled and cleaned up");
      },
    });
  },
});

const response = await stream.fetch(request);
const reader = response.body!.getReader();

// Cancel the stream (triggers cleanup)
reader.cancel();
```

### Using EventSource without Start Function

```typescript
// EventSource with no start function returns an empty stream
const stream = new EventSource();

const readable = await stream.create(new EventSourceRequest("last-event-id"));

const data = await readable.text();
console.log(data); // "" (empty string)
```

### Async Iteration Over Event Streams

The `EventsReadableStream` supports async iteration, allowing you to process events one by one:

```typescript
const stream = new EventSource({
  start: () =>
    new EventsReadableStream({
      start(controller) {
        controller.enqueue({ id: "1", data: "First event" });
        controller.enqueue({ id: "2", data: "Second event" });
        controller.close();
      },
    }),
});

const readable = await stream.create(new EventSourceRequest(null));

// Process events using async iteration
for await (const event of readable.iterable()) {
  console.log(`Event ${event.id}: ${event.data}`);
}
// Output:
// Event 1: First event
// Event 2: Second event
```

### Converting Stream to Array

You can collect all events from a stream into an array:

```typescript
const readable = await stream.create(new EventSourceRequest(null));
const events = await readable.toArray();
console.log(events);
// [{ id: "1", data: "First event" }, { id: "2", data: "Second event" }]
```

### Empty Stream Handling

When no start function is provided or when a start function returns undefined, the EventSource creates an empty stream:

```typescript
const stream = new EventSource({
  start: () => {}, // Returns undefined
});

const readable = await stream.create(new EventSourceRequest(null));
const events = await readable.toArray();
console.log(events); // [] (empty array)
```

### Direct Stream Creation

```typescript
const stream = new EventSource({
  start: () =>
    new EventsReadableStream({
      start(controller) {
        controller.enqueue({ data: "from create" });
        controller.close();
      },
    }),
});

const readable = await stream.create(new EventSourceRequest("last-event-id"));

const reader = readable.getReader();
const result = await reader.read();
console.log(result.value); // { data: "from create" }
```

### Handling Non-SSE Requests

```typescript
const stream = new EventSource({
  start: async (request) => {
    return new EventsReadableStream({
      start(controller) {
        controller.enqueue({ data: "SSE data" });
        controller.close();
      },
    });
  },
});

// Request without proper Accept header
const response = await stream.fetch(
  new Request("http://localhost", {
    headers: {
      // Missing: accept: "text/event-stream"
    },
  }),
);

console.log(response.status); // 406 Not Acceptable
```

### Error Handling

The EventSource provides comprehensive error handling for different failure scenarios:

#### Start Function Errors

When the start function throws an error during stream creation:

```typescript
const stream = new EventSource({
  start: async (request) => {
    throw new Error("Configuration error");
  },
});

// This will throw the error
try {
  const readable = await stream.create(new EventSourceRequest(null));
} catch (error) {
  console.error("Stream creation failed:", error.message);
}
```

#### HTTP Fetch Error Responses

When the start function throws during an HTTP request, a 500 status is returned:

```typescript
const stream = new EventSource({
  start: () => {
    throw new Error("Server error");
  },
});

const response = await stream.fetch(
  new Request("http://localhost", {
    headers: { accept: "text/event-stream" },
  }),
);

console.log(response.status); // 500
```

#### Stream Runtime Errors

When a stream emits an error during operation:

```typescript
const stream = new EventSource({
  start: () =>
    new EventsReadableStream({
      start(controller) {
        controller.error(new Error("Stream runtime error"));
      },
    }),
});

// HTTP response is 200, but reading will fail
const response = await stream.fetch(request);
console.log(response.status); // 200

try {
  await response.text(); // This will throw
} catch (error) {
  console.error("Stream error:", error.message);
}

// Async iteration will also throw
const readable = await stream.create(new EventSourceRequest(null));
try {
  for await (const event of readable.iterable()) {
    // This loop will throw on the first iteration
  }
} catch (error) {
  console.error("Iteration error:", error.message);
}
```

#### Graceful Error Handling

For production use, implement graceful error handling:

```typescript
const stream = new EventSource({
  start: async (request) => {
    try {
      // Some async operation that might fail
      const data = await fetchData();

      return new EventsReadableStream({
        start(controller) {
          controller.enqueue({ data: JSON.stringify(data) });
          controller.close();
        },
      });
    } catch (error) {
      return new EventsReadableStream({
        start(controller) {
          controller.enqueue({
            event: "error",
            data: JSON.stringify({ error: error.message }),
          });
          controller.close();
        },
      });
    }
  },
});
```

### Advanced: Periodic Updates with Cleanup

```typescript
const stream = new EventSource({
  start: async (request) => {
    let interval;
    return new EventsReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue({ data: "Connection established" });

        // Send periodic updates
        interval = setInterval(() => {
          controller.enqueue({
            data: `Current time: ${new Date().toISOString()}`,
          });
        }, 1000);
      },
      cancel() {
        // Cleanup is handled in the cancel method, not as a return value
        clearInterval(interval);
        console.log("Interval cleanup completed");
      },
    });
  },
});
```

### Stream with Event IDs and Resumption

```typescript
const stream = new EventSource({
  start: async (request) => {
    const startId = request.lastEventID ? parseInt(request.lastEventID) + 1 : 1;
    let interval: any;

    return new EventsReadableStream({
      start(controller) {
        let eventId = startId;

        const sendEvent = () => {
          controller.enqueue({
            id: eventId.toString(),
            data: `Event number ${eventId}`,
            event: "update",
          });
          eventId++;
        };

        // Send events every second
        interval = setInterval(sendEvent, 1000);
      },
      cancel() {
        // Cleanup interval when stream is cancelled
        clearInterval(interval);
      },
    });
  },
});
```

## API Reference

### HTTP Headers

The module automatically sets the following headers for SSE responses:

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`
- `Transfer-Encoding: chunked`

### Client-Side Usage

```javascript
// Client-side EventSource usage
const eventSource = new EventSource("/events");

eventSource.onmessage = function (event) {
  console.log("Received:", event.data);
};

eventSource.onerror = function (event) {
  console.error("SSE error:", event);
};

// Close the connection
eventSource.close();
```

### Error Responses

The EventSource handles different error scenarios with appropriate HTTP status codes:

- **406 Not Acceptable**: Returned when the client doesn't send `Accept: text/event-stream` header
- **500 Internal Server Error**: Returned when the start function throws an error during HTTP fetch
- **200 OK with stream errors**: When the start function succeeds but the stream itself emits errors, the HTTP response is 200 but reading the response body will fail

### Testing and Validation

The module includes comprehensive test coverage for:

- ✅ Basic SSE streaming functionality
- ✅ HTTP router integration
- ✅ Stream iteration and async processing
- ✅ Error handling at different levels (start function, stream runtime)
- ✅ Stream cancellation and cleanup
- ✅ Empty stream scenarios
- ✅ Accept header validation
- ✅ Proper HTTP status code responses

### Best Practices

1. **Always validate Accept header**: The module automatically returns 406 for non-SSE requests
2. **Handle stream cleanup**: Use the `cancel` method in ReadableStream for proper resource cleanup
3. **Implement resumption**: Use `lastEventID` for reliable event delivery
4. **Use structured data**: Leverage the `Event` type for consistent event formatting
5. **Error handling**: Implement proper error handling in your start function to avoid 500 responses
6. **Connection management**: Consider implementing heartbeat mechanisms for long-lived connections
7. **Stream iteration**: Use the `iterable()` method for processing events with async iteration
8. **Test thoroughly**: Ensure your implementation handles empty streams, errors, and cancellation properly
9. **Resource management**: Always clean up timeouts and intervals in the stream's `cancel` method
10. **Graceful degradation**: Handle scenarios where the start function returns undefined or null

### Dependencies

- `../http/constants/custom-options-symbol`: For router integration
- `./event-encoder/event-encoder`: For event data encoding and types

This module provides a robust foundation for implementing real-time features using Server-Sent Events in web applications.
