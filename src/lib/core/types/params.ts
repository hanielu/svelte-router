import type { Pages, RouteFiles } from "./register.js";
import type { Normalize } from "./utils.js";

export type Params<RouteFile extends keyof RouteFiles> = Normalize<
  Pages[RouteFiles[RouteFile]["page"]]["params"]
>;
