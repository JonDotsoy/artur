import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { SqliteQueueStore } from "./sqlite-queue-store.js";
import { unlink } from "node:fs/promises";
import { existsSync } from "node:fs";

describe("SqliteQueueStore", () => {
  describe("In-memory database", () => {
    let queue: SqliteQueueStore<any>;

    beforeEach(() => {
      queue = new SqliteQueueStore();
    });

    afterEach(() => {
      queue?.close();
    });

    test("should create a new empty queue", () => {
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });

    test("should enqueue and dequeue a single item", () => {
      const item = "test-item";
      
      queue.enqueue(item);
      expect(queue.size()).toBe(1);
      expect(queue.isEmpty()).toBe(false);
      
      const result = queue.dequeue();
      expect(result).toBe(item);
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });

    test("should maintain FIFO order", () => {
      const items = ["first", "second", "third"];
      
      // Enqueue all items
      items.forEach(item => queue.enqueue(item));
      expect(queue.size()).toBe(3);
      
      // Dequeue should return items in FIFO order
      expect(queue.dequeue()).toBe("first");
      expect(queue.dequeue()).toBe("second"); 
      expect(queue.dequeue()).toBe("third");
      expect(queue.isEmpty()).toBe(true);
    });

    test("should peek at first item without removing it", () => {
      queue.enqueue("first");
      queue.enqueue("second");
      
      expect(queue.peek()).toBe("first");
      expect(queue.size()).toBe(2); // Should not change size
      
      expect(queue.dequeue()).toBe("first");
      expect(queue.peek()).toBe("second");
    });

    test("should return undefined when dequeuing from empty queue", () => {
      expect(queue.dequeue()).toBeUndefined();
    });

    test("should return undefined when peeking at empty queue", () => {
      expect(queue.peek()).toBeUndefined();
    });

    test("should clear all items from queue", () => {
      queue.enqueue("item1");
      queue.enqueue("item2");
      queue.enqueue("item3");
      
      expect(queue.size()).toBe(3);
      
      queue.clear();
      
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
      expect(queue.peek()).toBeUndefined();
    });

    test("should handle different data types", () => {
      const items = [
        "string",
        123,
        { key: "value", nested: { array: [1, 2, 3] } },
        [1, 2, 3],
        true,
        null
      ];
      
      items.forEach(item => queue.enqueue(item));
      
      items.forEach(expectedItem => {
        const result = queue.dequeue();
        expect(result).toEqual(expectedItem);
      });
    });

    test("should handle complex objects correctly", () => {
      const complexObject = {
        id: 1,
        name: "Test Object",
        metadata: {
          tags: ["tag1", "tag2"],
          active: true,
          score: 95.5
        },
        items: [
          { id: 1, value: "first" },
          { id: 2, value: "second" }
        ]
      };
      
      queue.enqueue(complexObject);
      const result = queue.dequeue();
      
      expect(result).toEqual(complexObject);
    });

    test("should handle empty queue operations gracefully", () => {
      expect(() => queue.clear()).not.toThrow();
      expect(() => queue.size()).not.toThrow();
      expect(() => queue.isEmpty()).not.toThrow();
      expect(() => queue.peek()).not.toThrow();
      expect(() => queue.dequeue()).not.toThrow();
    });

    test("should provide accurate size tracking", () => {
      expect(queue.size()).toBe(0);
      
      queue.enqueue("item1");
      expect(queue.size()).toBe(1);
      
      queue.enqueue("item2");
      expect(queue.size()).toBe(2);
      
      queue.dequeue();
      expect(queue.size()).toBe(1);
      
      queue.clear();
      expect(queue.size()).toBe(0);
    });

    test("should support getAll method for debugging", () => {
      const items = ["a", "b", "c"];
      items.forEach(item => queue.enqueue(item));
      
      const allItems = queue.getAll();
      expect(allItems).toEqual(items);
      
      // getAll should not affect the queue
      expect(queue.size()).toBe(3);
      expect(queue.dequeue()).toBe("a");
    });
  });

  describe("File-based database", () => {
    const testDbPath = "/tmp/test-queue.db";
    let queue: SqliteQueueStore<any>;

    afterEach(async () => {
      queue?.close();
      if (existsSync(testDbPath)) {
        await unlink(testDbPath);
      }
    });

    test("should persist data to file database", () => {
      queue = new SqliteQueueStore({ path: testDbPath });
      
      queue.enqueue("persistent-item");
      expect(queue.size()).toBe(1);
      
      queue.close();
      
      // Reopen the same database
      queue = new SqliteQueueStore({ path: testDbPath });
      expect(queue.size()).toBe(1);
      expect(queue.dequeue()).toBe("persistent-item");
    });

    test("should support custom table names", () => {
      const customTableName = "my_custom_queue";
      queue = new SqliteQueueStore({ 
        path: testDbPath, 
        tableName: customTableName 
      });
      
      queue.enqueue("test-item");
      expect(queue.size()).toBe(1);
      expect(queue.dequeue()).toBe("test-item");
    });
  });

  describe("Multiple instances", () => {
    test("should support multiple independent queues", () => {
      const queue1 = new SqliteQueueStore<string>();
      const queue2 = new SqliteQueueStore<number>();
      
      queue1.enqueue("string-item");
      queue2.enqueue(42);
      
      expect(queue1.size()).toBe(1);
      expect(queue2.size()).toBe(1);
      
      expect(queue1.dequeue()).toBe("string-item");
      expect(queue2.dequeue()).toBe(42);
      
      queue1.close();
      queue2.close();
    });
  });

  describe("Error handling", () => {
    let queue: SqliteQueueStore<any>;

    beforeEach(() => {
      queue = new SqliteQueueStore();
    });

    afterEach(() => {
      queue?.close();
    });

    test("should handle undefined and null values", () => {
      queue.enqueue(undefined);
      queue.enqueue(null);
      
      expect(queue.dequeue()).toBeUndefined();
      expect(queue.dequeue()).toBeNull();
    });

    test("should handle circular references by throwing on enqueue", () => {
      const circular: any = { name: "test" };
      circular.self = circular;
      
      expect(() => queue.enqueue(circular)).toThrow();
    });
  });
});