import type { DataWithResponseInit } from "../router/utils.js";
import type { Equal, IsAny } from "./utils.js";

// Library-mode loaders/actions run in the client. Match upstream's ClientData
// inference: unwrap data(), exclude untyped Responses, and preserve payloads.
// There is no framework serverLoader, generated route module, or turbo-stream
// serialization boundary in this package.
type ClientData<T> = T extends Response
  ? never
  : T extends DataWithResponseInit<infer U>
    ? U
    : Equal<T, void> extends true
      ? undefined
      : T;

/** Infer a loader/action's client result, or use an explicitly supplied data type. */
export type SerializeFrom<T> =
  IsAny<T> extends true
    ? unknown
    : T extends (...args: any[]) => unknown
      ? ClientData<Awaited<ReturnType<T>>>
      : T;
