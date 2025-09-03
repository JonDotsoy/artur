import { SqliteQueueStore } from "./sqlite-queue-store.js";

/**
 * Example demonstrating basic usage of SQLiteQueueStore
 */
async function basicQueueExample() {
  console.log("=== Basic Queue Example ===");
  
  // Create an in-memory queue
  const queue = new SqliteQueueStore<string>();
  
  console.log("Initial queue size:", queue.size()); // 0
  console.log("Is empty:", queue.isEmpty()); // true
  
  // Add some items
  queue.enqueue("first");
  queue.enqueue("second");
  queue.enqueue("third");
  
  console.log("After enqueuing 3 items:", queue.size()); // 3
  
  // Peek at first item
  console.log("First item (peek):", queue.peek()); // "first"
  console.log("Size after peek:", queue.size()); // Still 3
  
  // Dequeue items in FIFO order
  console.log("Dequeue:", queue.dequeue()); // "first"
  console.log("Dequeue:", queue.dequeue()); // "second"
  console.log("Remaining size:", queue.size()); // 1
  
  // Clear the queue
  queue.clear();
  console.log("After clear:", queue.isEmpty()); // true
  
  // Always close the queue when done
  queue.close();
}

/**
 * Example demonstrating persistent file-based queue
 */
async function persistentQueueExample() {
  console.log("\n=== Persistent Queue Example ===");
  
  const dbPath = "/tmp/example-queue.db";
  
  // Create a file-based queue with custom table name
  let queue = new SqliteQueueStore<{ id: number; message: string }>({
    path: dbPath,
    tableName: "my_queue"
  });
  
  // Add some complex objects
  queue.enqueue({ id: 1, message: "Hello" });
  queue.enqueue({ id: 2, message: "World" });
  
  console.log("Queue size before closing:", queue.size()); // 2
  
  // Close the queue
  queue.close();
  
  // Reopen the same queue - data should persist
  queue = new SqliteQueueStore<{ id: number; message: string }>({
    path: dbPath,
    tableName: "my_queue"
  });
  
  console.log("Queue size after reopening:", queue.size()); // 2
  console.log("Dequeue:", queue.dequeue()); // { id: 1, message: "Hello" }
  console.log("Dequeue:", queue.dequeue()); // { id: 2, message: "World" }
  
  queue.close();
}

/**
 * Example demonstrating different data types
 */
async function dataTypesExample() {
  console.log("\n=== Data Types Example ===");
  
  const queue = new SqliteQueueStore<any>();
  
  // Queue different data types
  queue.enqueue("string");
  queue.enqueue(42);
  queue.enqueue({ nested: { value: true } });
  queue.enqueue([1, 2, 3]);
  queue.enqueue(null);
  queue.enqueue(undefined);
  
  console.log("All items:", queue.getAll());
  
  // Dequeue all items
  while (!queue.isEmpty()) {
    const item = queue.dequeue();
    console.log("Dequeued:", item, "| Type:", typeof item);
  }
  
  queue.close();
}

// Run examples if this file is executed directly
if (import.meta.main) {
  await basicQueueExample();
  await persistentQueueExample();
  await dataTypesExample();
  
  console.log("\nAll examples completed!");
}