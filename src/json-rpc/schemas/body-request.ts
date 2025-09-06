import { z } from "zod";
import { jsonRpcRequestSchema } from "./json-rpc-request-schema.js";

/**
 * Zod schema for validating request body.
 * Accepts either a single JSON-RPC request or an array of requests for batch processing.
 */
export const bodyRequest = z.union([
  jsonRpcRequestSchema,
  z.array(jsonRpcRequestSchema),
]);
