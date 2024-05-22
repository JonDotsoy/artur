type Options = {
  expose?: boolean;
};
const errorResponses = new WeakMap<
  Error,
  { response: Response; options: Options }
>();

export const describeErrorResponse = <T = unknown>(
  error: T,
  response: Response,
  options: Options = {},
): T => {
  if (error instanceof Error) errorResponses.set(error, { response, options });
  return error;
};

export const errorToResponse = (error: unknown) => {
  if (error instanceof Error) {
    const resStored = errorResponses.get(error);
    if (resStored) return resStored;
  }
  return {
    response: new Response(null, { status: 500 }),
    options: {},
  };
};
