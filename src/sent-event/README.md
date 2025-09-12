# Server-Sent Events (SSE) Module

This module provides a complete implementation of Server-Sent Events (SSE) for real-time data streaming over HTTP. It implements the EventSource protocol and can be integrated with HTTP routers.

## Table of Contents

- [Overview](#overview)
- [Classes](#classes)
  - [SentEventStream](#senteventstream)
  - [SentEventRequest](#senteventrequest)
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

## Classes

### SentEventStream

The main class that handles Server-Sent Events streaming. It implements the EventSource protocol and provides real-time data streaming capabilities over HTTP.

```typescript
export class SentEventStream {
  constructor(options?: Options);
  create(request: SentEventRequest): Promise<ReadableStream<DataEventSource>>;
  fetch(request: Request): Promise<Response>;
  get [customRouteSymbol](): {
    test: () => boolean;
    fetch: (request: Request) => Promise<Response>;
  };
}
```

#### Constructor

Creates a new `SentEventStream` instance with optional configuration.

**Parameters:**

- `options` (Optional): Configuration options for the stream
  - `start`: Function to create the event stream

**Example:**

```typescript
const stream = new SentEventStream({
  start: async (request) => {
    return new ReadableStream({
      start(controller) {
        controller.enqueue({ data: "Hello World" });
        controller.close();
      },
    });
  },
});
```

#### Methods

##### `create(request: SentEventRequest)`

Creates a readable stream for the given request.

**Parameters:**

- `request`: The sent event request containing client information

**Returns:**

- `Promise<ReadableStream<DataEventSource>>`: A promise that resolves to a ReadableStream. If no start function is provided, returns an empty stream that immediately closes.

**Example:**

```typescript
const request = new SentEventRequest("last-event-123");
const stream = await sentEventStream.create(request);
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
- Sets appropriate SSE headers in the response

**Example:**

```typescript
const request = new Request("http://localhost/events", {
  headers: { accept: "text/event-stream" },
});
const response = await sentEventStream.fetch(request);
```

##### `[customRouteSymbol]` (Getter)

Custom route symbol implementation for HTTP router integration. Allows this stream to be used as a route handler in the HTTP router. The implementation defaults to handling GET requests and accepts all routes.

**Returns:**

- Object with `test` and `fetch` methods for router compatibility

### SentEventRequest

Represents a Server-Sent Events request with client information. Contains the last event ID received by the client for event stream resumption.

```typescript
export class SentEventRequest {
  constructor(lastEventID: string | null);
  get lastEventID(): string | null;
}
```

#### Constructor

Creates a new `SentEventRequest` instance.

**Parameters:**

- `lastEventID`: The last event ID received by the client, used for resuming streams

#### Properties

##### `lastEventID` (Getter)

Gets the last event ID received by the client.

**Returns:**

- `string | null`: The last event ID or null if none was provided

## Types

### Start

Function type for creating a readable stream of Server-Sent Events.

```typescript
type Start = (
  request: SentEventRequest,
) =>
  | Promise<ReadableStream<DataEventSource> | void>
  | ReadableStream<DataEventSource>
  | void;
```

### Options

Configuration options for `SentEventStream`.

```typescript
type Options = {
  start?: Start;
};
```

### DataEventSource

Represents an event source data structure (imported from `./event-source/data-event-source`).

### DataEventSourceEncoder

A utility class for encoding DataEventSource objects into the standard Server-Sent Events format. This encoder is used internally by the SentEventStream to transform event data into the proper SSE format.

```typescript
export class DataEventSourceEncoder {
  encode(payload: DataEventSource): Uint8Array;
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
import { SentEventStream } from "./sent-event";

const stream = new SentEventStream({
  start: async (request) => {
    return new ReadableStream({
      start(controller) {
        // Send initial data
        controller.enqueue({ data: "Connection established" });

        // Send periodic updates
        const interval = setInterval(() => {
          controller.enqueue({
            data: `Current time: ${new Date().toISOString()}`,
          });
        }, 1000);

        // Cleanup on close
        return () => clearInterval(interval);
      },
    });
  },
});

// Handle requests
const response = await stream.fetch(request);
```

### Integration with HTTP Router

```typescript
import { Router } from "../http";
import { SentEventStream } from "./sent-event";

const router = new Router();

router.route(
  "/events",
  new SentEventStream({
    start: async (request) => {
      console.log(`Client last event ID: ${request.lastEventID}`);

      return new ReadableStream({
        start(controller) {
          controller.enqueue({
            id: "event-1",
            data: "Hello from router!",
          });
          controller.close();
        },
      });
    },
  }),
);
```

### Stream with Event IDs and Resumption

```typescript
const stream = new SentEventStream({
  start: async (request) => {
    const startId = request.lastEventID ? parseInt(request.lastEventID) + 1 : 1;

    return new ReadableStream({
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
        const interval = setInterval(sendEvent, 1000);

        return () => clearInterval(interval);
      },
    });
  },
});
```

### Error Handling

```typescript
const stream = new SentEventStream({
  start: async (request) => {
    try {
      // Some async operation that might fail
      const data = await fetchData();

      return new ReadableStream({
        start(controller) {
          controller.enqueue({ data: JSON.stringify(data) });
          controller.close();
        },
      });
    } catch (error) {
      return new ReadableStream({
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

- **406 Not Acceptable**: Returned when the client doesn't send `Accept: text/event-stream` header
- **Stream errors**: Handled by the custom create function implementation

### Best Practices

1. **Always validate Accept header**: The module automatically returns 406 for non-SSE requests
2. **Handle stream cleanup**: Use the `cancel` method in ReadableStream for proper resource cleanup
3. **Implement resumption**: Use `lastEventID` for reliable event delivery
4. **Use structured data**: Leverage the `DataEventSource` type for consistent event formatting
5. **Error handling**: Implement proper error handling in your start function
6. **Connection management**: Consider implementing heartbeat mechanisms for long-lived connections

### Dependencies

- `../http/constants/custom-options-symbol`: For router integration
- `./event-source/data-event-source`: For event data encoding and types

This module provides a robust foundation for implementing real-time features using Server-Sent Events in web applications.
