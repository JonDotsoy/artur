import type { Decorator } from "@jondotsoy/decorate";
import type { Fetch } from "./fetch-type.js";

export type Middleware<T> = Decorator<Fetch>;
