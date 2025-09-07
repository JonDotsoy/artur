import { Store, Message, MemoryStore } from "@jondotsoy/utils-js/queue";
import { shareMemory } from "./constants/share-memory.js";

/**
 * Session-specific memory store implementation.
 * Provides isolated message storage per session using a shared memory backend.
 */
export class SessionMemoryStore extends Store {
  #sessionId: string;

  /**
   * Creates a new session memory store.
   * @param sessionId - Unique identifier for the session
   */
  constructor(sessionId: string) {
    super();
    this.#sessionId = sessionId;
  }

  /**
   * Adds a message to the session's message store.
   * @param message - The message to add
   */
  async addMessage(message: Message): Promise<void> {
    let messages = shareMemory.get(this.#sessionId);
    if (!messages) {
      messages = new MemoryStore();
      shareMemory.set(this.#sessionId, messages);
    }
    messages.addMessage(message);
  }

  /**
   * Retrieves a message by its ID from the session store.
   * @param messageId - The ID of the message to retrieve
   * @returns The message if found, null otherwise
   */
  async getMessage(messageId: string): Promise<Message | null> {
    return (
      (await shareMemory.get(this.#sessionId)?.getMessage(messageId)) ?? null
    );
  }

  /**
   * Acknowledges a message as processed.
   * @param messageId - The ID of the message to acknowledge
   */
  async acknowledgeMessage(messageId: string): Promise<void> {
    await shareMemory.get(this.#sessionId)?.acknowledgeMessage(messageId);
  }

  /**
   * Deletes a message from the session store.
   * Automatically cleans up empty session stores.
   * @param messageId - The ID of the message to delete
   */
  async deleteMessage(messageId: string): Promise<void> {
    const sessionMemory = shareMemory.get(this.#sessionId);
    if (sessionMemory) {
      await sessionMemory.deleteMessage(messageId);
      if ((await sessionMemory.getSize()) === 0) {
        await sessionMemory.close();
        shareMemory.delete(this.#sessionId);
      }
    }
  }

  /**
   * Claims the next available message for processing.
   * @param acknowledgeTimeoutMs - Timeout in milliseconds for acknowledgment
   * @param now - Current timestamp
   * @param abort - Optional abort signal for cancellation
   * @returns The claimed message if available, null otherwise
   */
  async claimMessage(
    acknowledgeTimeoutMs: number,
    now: number,
    abort?: AbortSignal,
  ): Promise<Message | null> {
    return (
      (await shareMemory
        .get(this.#sessionId)
        ?.claimMessage(acknowledgeTimeoutMs, now, abort)) ?? null
    );
  }

  /**
   * Gets the current number of messages in the session store.
   * @returns The count of messages
   */
  async getSize(): Promise<number> {
    return (await shareMemory.get(this.#sessionId)?.getSize()) ?? 0;
  }

  /**
   * Closes the session store and cleans up resources.
   */
  async close(): Promise<void> {
    await shareMemory.get(this.#sessionId)?.close();
  }
}
