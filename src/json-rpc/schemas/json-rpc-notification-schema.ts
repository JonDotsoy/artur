import z from "zod";

/**
 * Zod schema for validating JSON-RPC notification structure.
 * Ensures the notification conforms to JSON-RPC 2.0 specification.
 */
export const jsonRpcNotificationSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.any(),
});
