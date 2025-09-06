import { SessionMemoryStore } from "./session-memory-store.js";

/**
 * Factory function to create a session memory store.
 * @param sessionId - The session ID for the store
 * @returns A new SessionMemoryStore instance
 */
export const sessionMemoryStore = (sessionId: string) =>
  new SessionMemoryStore(sessionId);
