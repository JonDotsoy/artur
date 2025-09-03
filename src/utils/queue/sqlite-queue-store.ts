import { Database } from "bun:sqlite";
import type { QueueStore } from "./queue-store.js";

export interface SqliteQueueStoreOptions {
  /**
   * Path to SQLite database file. If not provided, creates an in-memory database.
   */
  path?: string;
  
  /**
   * Table name for the queue. Defaults to 'queue'.
   */
  tableName?: string;
}

/**
 * SQLite-based queue store implementation using Bun's sqlite module
 */
export class SqliteQueueStore<T = any> implements QueueStore<T> {
  private db: Database;
  private tableName: string;
  private enqueueStmt: any;
  private dequeueStmt: any;
  private peekStmt: any;
  private sizeStmt: any;
  private clearStmt: any;

  constructor(options: SqliteQueueStoreOptions = {}) {
    this.tableName = options.tableName || 'queue';
    this.db = new Database(options.path || ':memory:');
    
    this.initializeDatabase();
    this.prepareStatements();
  }

  private initializeDatabase(): void {
    // Create queue table with auto-increment id and timestamp
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )
    `;
    
    this.db.exec(createTableSQL);
    
    // Create index for efficient FIFO operations
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_id ON ${this.tableName}(id)`);
  }

  private prepareStatements(): void {
    this.enqueueStmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (data) VALUES (?)
    `);
    
    this.dequeueStmt = this.db.prepare(`
      DELETE FROM ${this.tableName} 
      WHERE id = (SELECT MIN(id) FROM ${this.tableName})
      RETURNING data
    `);
    
    this.peekStmt = this.db.prepare(`
      SELECT data FROM ${this.tableName}
      ORDER BY id LIMIT 1
    `);
    
    this.sizeStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM ${this.tableName}
    `);
    
    this.clearStmt = this.db.prepare(`
      DELETE FROM ${this.tableName}
    `);
  }

  enqueue(item: T): void {
    const serialized = JSON.stringify(item);
    // Handle undefined values which JSON.stringify returns as undefined (not a string)
    const dataToStore = serialized === undefined ? 'undefined' : serialized;
    this.enqueueStmt.run(dataToStore);
  }

  dequeue(): T | undefined {
    const result = this.dequeueStmt.get();
    if (!result) {
      return undefined;
    }
    
    try {
      // Handle the special case of undefined values
      if (result.data === 'undefined') {
        return undefined;
      }
      return JSON.parse(result.data);
    } catch (error) {
      throw new Error(`Failed to deserialize queue item: ${error}`);
    }
  }

  peek(): T | undefined {
    const result = this.peekStmt.get();
    if (!result) {
      return undefined;
    }
    
    try {
      // Handle the special case of undefined values
      if (result.data === 'undefined') {
        return undefined;
      }
      return JSON.parse(result.data);
    } catch (error) {
      throw new Error(`Failed to deserialize queue item: ${error}`);
    }
  }

  size(): number {
    const result = this.sizeStmt.get();
    return result?.count || 0;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  clear(): void {
    this.clearStmt.run();
  }

  close(): void {
    this.db.close();
  }

  /**
   * Get all items in the queue without removing them (for debugging/testing)
   */
  getAll(): T[] {
    const stmt = this.db.prepare(`
      SELECT data FROM ${this.tableName} ORDER BY id
    `);
    
    const results = stmt.all();
    return results.map((row: any) => {
      try {
        // Handle the special case of undefined values
        if (row.data === 'undefined') {
          return undefined;
        }
        return JSON.parse(row.data);
      } catch (error) {
        throw new Error(`Failed to deserialize queue item: ${error}`);
      }
    });
  }
}