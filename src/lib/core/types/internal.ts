export type { GetAnnotations } from "./route-module-annotations.js";

import type { Params } from "./params.js";
import type { RouteFiles } from "./register.js";
import type { GetLoaderData, GetActionData } from "./route-data.js";
import type { RouteModule } from "./route-module.js";

export type GetInfo<T extends { file: keyof RouteFiles; module: RouteModule }> = {
  params: Params<T["file"]>;
  loaderData: GetLoaderData<T["module"]>;
  actionData: GetActionData<T["module"]>;
};
