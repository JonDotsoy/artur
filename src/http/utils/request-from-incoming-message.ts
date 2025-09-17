import type * as http from "http";

const readableFromIncomingMessage = (req: http.IncomingMessage) => {
  if (!req.method || ["GET", "HEAD"].includes(req.method)) return null;

  let listenerData: (chunk: number[]) => void;
  let listenerClose: () => void;
  let listenerError: (err: Error) => void;

  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      listenerData = (chunk: number[]) => {
        controller.enqueue(new Uint8Array(chunk));
      };
      listenerClose = () => {
        controller.close();
      };
      listenerError = (err: Error) => {
        controller.error(err);
      };

      req.addListener("data", listenerData);
      req.addListener("close", listenerClose);
      req.addListener("error", listenerError);
    },
    cancel: (reason) => {
      req.removeListener("data", listenerData);
      req.removeListener("close", listenerClose);
      req.removeListener("error", listenerError);
    },
  });
};

export function requestFromIncomingMessage(req: http.IncomingMessage): Request {
  const url = new URL(
    req.url ?? "/",
    new URL(`http://${req.headers.host ?? "localhost"}/`),
  ).toString();
  const method = req.method;
  const headers = new Headers();

  for (const [headerName, headerValue] of Object.entries(req.headers)) {
    if (typeof headerValue === "string") headers.set(headerName, headerValue);
    if (Array.isArray(headerValue))
      headerValue.forEach((headerValue) =>
        headers.append(headerName, headerValue),
      );
  }

  return new Request(url, {
    method,
    headers,
    body: readableFromIncomingMessage(req),
    duplex: "half",
  });
}
