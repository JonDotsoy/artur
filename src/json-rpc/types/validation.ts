import type { ParamsZodValidation, ZodValidation } from "./zod-validation.js";

export type Validation<T> = ZodValidation<T>;

export type ParamsValidation<T> = ParamsZodValidation<T>;
