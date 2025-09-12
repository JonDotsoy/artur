export interface Event {
  /**
   * The event ID to set the {@link https://developer.mozilla.org/en-US/docs/Web/API/EventSource} object's last event ID value.
   */
  id?: number | string;
  /**
   * A string identifying the type of event described. If this is specified, an event will be dispatched on the browser to the listener for the specified event name; the website source code should use addEventListener() to listen for named events. The onmessage handler is called if no event name is specified for a message.
   */
  event?: string;
  /**
   * The data field for the message. When the EventSource receives multiple consecutive lines that begin with data:, it concatenates them {@link https://html.spec.whatwg.org/multipage/#dispatchMessage}, inserting a newline character between each one. Trailing newlines are removed.
   */
  data: any;
  /**
   * The reconnection time. If the connection to the server is lost, the browser will wait for the specified time before attempting to reconnect. This must be an integer, specifying the reconnection time in milliseconds. If a non-integer value is specified, the field is ignored.
   */
  retry?: number;
}

const normalizeValue = (value: string | number) => {
  if (typeof value === "number") return value.toString();
  if (value.includes("\n")) return JSON.stringify(value);
  return value;
};

const serializeData = (value: any): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  return JSON.stringify(value);
};

/**
 * Encoder for Server-Sent Events (SSE) data format.
 *
 * This class provides functionality to encode DataEventSource objects into the
 * standard Server-Sent Events format as specified by the W3C EventSource specification.
 * The encoded output follows the text/event-stream media type format.
 *
 * @see {@link https://html.spec.whatwg.org/multipage/server-sent-events.html Server-Sent Events specification}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/EventSource EventSource API}
 */
export class EventEncoder {
  /**
   * Encodes a DataEventSource payload into a Uint8Array following the SSE format.
   *
   * The encoding process follows the Server-Sent Events specification:
   * - Each field (event, id, retry, data) is encoded as "field: value\n"
   * - Data can span multiple lines, with each line prefixed by "data: "
   * - The message ends with an additional newline character
   * - Values containing newlines are JSON-stringified for proper escaping
   *
   * @param payload - The data event source object to encode
   * @returns A Uint8Array containing the encoded SSE message in UTF-8 format
   *
   * @example
   * ```typescript
   * const encoder = new DataEventSourceEncoder();
   * const payload = {
   *   event: 'message',
   *   id: '123',
   *   data: { hello: 'world' },
   *   retry: 5000
   * };
   * const encoded = encoder.encode(payload);
   * // Results in:
   * // event: message\n
   * // id: 123\n
   * // retry: 5000\n
   * // data: {"hello":"world"}\n
   * // \n
   * ```
   */
  encode(payload: Event): Uint8Array {
    let str = "";
    if (payload.event) {
      str += `event: ${normalizeValue(payload.event)}\n`;
    }
    if (payload.id) {
      str += `id: ${normalizeValue(payload.id)}\n`;
    }
    if (payload.retry) {
      str += `retry: ${normalizeValue(payload.retry)}\n`;
    }
    const data = serializeData(payload.data);
    for (const line of data.split("\n")) {
      str += `data: ${normalizeValue(line)}\n`;
    }
    str += "\n";

    return new TextEncoder().encode(str);
  }
}
