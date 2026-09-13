/** A stable read-only handle. Read `current` in markup, effects, or event handlers. */
export type RouterValue<T> = {
  readonly current: T;
};

/** Pass a getter when an input can change while the consuming component is mounted. */
export type RouterInput<T> = T | (() => T);

export { extract as readRouterInput } from "../utils/extract.js";
