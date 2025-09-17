import z from "zod";

/**
 * Zod schema for validating JSON-RPC request structure.
 * Ensures the request conforms to JSON-RPC 2.0 specification.
 */
export const jsonRpcRequestSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.any(),
});
