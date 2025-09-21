import type { z } from "zod";

export type ZodValidation<T> = z.ZodType<T>;
// {
//   safeParse: (data: any) => { success: boolean; data?: T; error?: any };
// };

export type ParamsZodValidation<T> =
  T extends Record<string, any>
    ? z.ZodObject<T>
    : T extends any[]
      ? z.ZodArray<z.ZodType<T[number]>>
      : never;
// z.ZodObject | z.ZodArray;
// {
//   safeParse: (data: any) => { success: boolean; data?: T; error?: any };
// };
