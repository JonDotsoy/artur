export type ZodValidation<T> = {
  safeParse: (data: any) => { success: boolean; data?: T; error?: any };
};
