/**
 * Interface for queue store implementations
 */
export interface QueueStore<T = any> {
  /**
   * Add an item to the end of the queue
   */
  enqueue(item: T): void;

  /**
   * Remove and return the first item from the queue
   * @returns The first item in the queue, or undefined if queue is empty
   */
  dequeue(): T | undefined;

  /**
   * View the first item in the queue without removing it
   * @returns The first item in the queue, or undefined if queue is empty
   */
  peek(): T | undefined;

  /**
   * Get the number of items in the queue
   */
  size(): number;

  /**
   * Check if the queue is empty
   */
  isEmpty(): boolean;

  /**
   * Remove all items from the queue
   */
  clear(): void;

  /**
   * Close the queue store and cleanup resources
   */
  close?(): void;
}