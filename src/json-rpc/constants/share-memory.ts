import type { MemoryStore } from "@jondotsoy/utils-js/queue";

/**
 * Shared memory store for managing session-based message storage.
 * Maps session IDs to their corresponding memory stores.
 */
export const shareMemory = new Map<string, MemoryStore>();
