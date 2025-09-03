# SQLite Queue Store

A persistent, SQLite-based queue implementation using Bun's built-in `bun:sqlite` module. This queue provides FIFO (First In, First Out) operations with optional persistence to disk.

## Features

- **FIFO Operations**: Standard queue operations (enqueue, dequeue, peek)
- **Persistence**: Optional file-based storage using SQLite
- **Type Safety**: Full TypeScript support with generic types
- **Multiple Instances**: Support for multiple independent queues
- **Custom Table Names**: Configurable SQLite table names
- **Data Types**: Handles strings, numbers, objects, arrays, null, and undefined
- **Memory Efficiency**: In-memory or file-based storage options

## Installation

The SQLite queue store is included in the Artur framework:

```typescript
import { SqliteQueueStore } from "artur/utils/queue";
```

## Basic Usage

### In-Memory Queue

```typescript
import { SqliteQueueStore } from "artur/utils/queue";

// Create an in-memory queue
const queue = new SqliteQueueStore<string>();

// Add items to the queue
queue.enqueue("first");
queue.enqueue("second");
queue.enqueue("third");

console.log(queue.size()); // 3
console.log(queue.peek()); // "first" (doesn't remove)

// Remove items in FIFO order
console.log(queue.dequeue()); // "first"
console.log(queue.dequeue()); // "second"
console.log(queue.size());    // 1

// Clean up
queue.close();
```

### Persistent File-Based Queue

```typescript
import { SqliteQueueStore } from "artur/utils/queue";

// Create a file-based queue
const queue = new SqliteQueueStore<any>({
  path: "./my-queue.db",
  tableName: "tasks"
});

queue.enqueue({ id: 1, task: "Process data" });
queue.enqueue({ id: 2, task: "Send email" });

// Data persists even after closing
queue.close();

// Reopen the same queue later
const sameQueue = new SqliteQueueStore<any>({
  path: "./my-queue.db",
  tableName: "tasks"
});

console.log(sameQueue.size()); // 2 - data was persisted
console.log(sameQueue.dequeue()); // { id: 1, task: "Process data" }
```

## API Reference

### Constructor Options

```typescript
interface SqliteQueueStoreOptions {
  path?: string;     // Database file path (default: in-memory)
  tableName?: string; // Table name (default: "queue")
}
```

### Methods

#### `enqueue(item: T): void`
Add an item to the end of the queue.

#### `dequeue(): T | undefined`
Remove and return the first item from the queue. Returns `undefined` if queue is empty.

#### `peek(): T | undefined`
View the first item without removing it. Returns `undefined` if queue is empty.

#### `size(): number`
Get the number of items in the queue.

#### `isEmpty(): boolean`
Check if the queue is empty.

#### `clear(): void`
Remove all items from the queue.

#### `close(): void`
Close the database connection and free resources.

#### `getAll(): T[]`
Get all items in the queue without removing them (useful for debugging).

## Examples

### Working with Different Data Types

```typescript
const queue = new SqliteQueueStore<any>();

// Queue supports various data types
queue.enqueue("string");
queue.enqueue(42);
queue.enqueue({ nested: { value: true } });
queue.enqueue([1, 2, 3]);
queue.enqueue(null);
queue.enqueue(undefined);

// All types are properly serialized and deserialized
while (!queue.isEmpty()) {
  console.log(queue.dequeue());
}
```

### Task Queue Example

```typescript
interface Task {
  id: string;
  type: "email" | "process" | "cleanup";
  payload: any;
  priority?: number;
}

const taskQueue = new SqliteQueueStore<Task>({
  path: "./tasks.db"
});

// Add tasks
taskQueue.enqueue({
  id: "task-1",
  type: "email",
  payload: { to: "user@example.com", subject: "Welcome!" }
});

taskQueue.enqueue({
  id: "task-2", 
  type: "process",
  payload: { userId: 123, action: "updateProfile" }
});

// Process tasks
function processTasks() {
  while (!taskQueue.isEmpty()) {
    const task = taskQueue.dequeue();
    console.log(`Processing task: ${task.id}`);
    // Handle task based on type...
  }
}
```

### Multiple Queues

```typescript
// Different queues for different purposes
const emailQueue = new SqliteQueueStore<EmailTask>({
  path: "./email-queue.db"
});

const processingQueue = new SqliteQueueStore<ProcessingTask>({
  path: "./processing-queue.db"
});

// Each queue operates independently
emailQueue.enqueue({ to: "user@example.com", subject: "Hello" });
processingQueue.enqueue({ dataId: 123, operation: "transform" });
```

## Error Handling

The queue handles various error conditions gracefully:

- Empty queue operations return `undefined`
- Circular references in objects throw during enqueue
- Database errors are propagated to the caller
- Malformed data during deserialization throws with descriptive errors

## Performance Considerations

- Uses prepared SQL statements for efficient operations
- Indexes on the ID column for fast FIFO operations
- Automatic cleanup of processed items
- In-memory queues are faster but not persistent
- File-based queues provide durability at the cost of I/O operations

## Requirements

- Bun runtime with `bun:sqlite` support
- TypeScript 5.0+ for proper type inference