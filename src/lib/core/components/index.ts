import { type DataStrategyFunction } from "$lib/core/router/utils.js";
import {
  ENABLE_DEV_WARNINGS,
  type PatchRoutesOnNavigationFunction,
  type RouteObject,
} from "$lib/core/context.js";
import { createMemoryHistory, warning, type InitialEntry } from "$lib/core/router/history.js";
import {
  type RouterInit,
  type FutureConfig,
  type HydrationState,
  createRouter,
  type Router as DataRouter,
} from "$lib/core/router/router.js";

/**
 * Defines the prefetching behavior of the link:
 *
 * - "none": Never fetched
 * - "intent": Fetched when the user focuses or hovers the link
 * - "render": Fetched when the link is rendered
 * - "viewport": Fetched when the link is in the viewport
 */
export type PrefetchBehavior = "intent" | "render" | "none" | "viewport";

/**
 * @private
 */
export function mapRouteProperties(route: RouteObject) {
  let updates: Partial<RouteObject> & { hasErrorBoundary: boolean } = {
    // Note: this check also occurs in <route.svelte> so update
    // there if you change this -- please and thank you!
    hasErrorBoundary:
      route.hasErrorBoundary || route.ErrorBoundary != null || route.errorElement != null,
  };

  if (route.Component) {
    if (ENABLE_DEV_WARNINGS) {
      if (route.element) {
        warning(
          false,
          "You should not include both `Component` and `element` on your route - " +
            "`Component` will be used."
        );
      }
    }
    Object.assign(updates, {
      element: undefined,
      Component: route.Component,
    });
  }

  if (route.HydrateFallback) {
    if (ENABLE_DEV_WARNINGS) {
      if (route.hydrateFallbackElement) {
        warning(
          false,
          "You should not include both `HydrateFallback` and `hydrateFallbackElement` on your route - " +
            "`HydrateFallback` will be used."
        );
      }
    }
    Object.assign(updates, {
      hydrateFallbackElement: undefined,
      HydrateFallback: route.HydrateFallback,
    });
  }

  if (route.ErrorBoundary) {
    if (ENABLE_DEV_WARNINGS) {
      if (route.errorElement) {
        warning(
          false,
          "You should not include both `ErrorBoundary` and `errorElement` on your route - " +
            "`ErrorBoundary` will be used."
        );
      }
    }
    Object.assign(updates, {
      errorElement: undefined,
      ErrorBoundary: route.ErrorBoundary,
    });
  }

  return updates;
}
export const hydrationRouteProperties: (keyof RouteObject)[] = [
  "HydrateFallback",
  "hydrateFallbackElement",
];

export interface MemoryRouterOpts {
  /**
   * Basename path for the application.
   */
  basename?: string;
  /**
   * Function to provide the initial context values for all client side navigations/fetches
   */
  unstable_getContext?: RouterInit["unstable_getContext"];
  /**
   * Future flags to enable for the router.
   */
  future?: Partial<FutureConfig>;
  /**
   * Hydration data to initialize the router with if you have already performed
   * data loading on the server.
   */
  hydrationData?: HydrationState;
  /**
   * Initial entires in the in-memory history stack
   */
  initialEntries?: InitialEntry[];
  /**
   * Index of `initialEntries` the application should initialize to
   */
  initialIndex?: number;
  /**
   * Override the default data strategy of loading in parallel.
   * Only intended for advanced usage.
   */
  dataStrategy?: DataStrategyFunction;
  /**
   * Lazily define portions of the route tree on navigations.
   */
  patchRoutesOnNavigation?: PatchRoutesOnNavigationFunction;
}

/**
 * Create a new data router that manages the application path using an in-memory
 * history stack.  Useful for non-browser environments without a DOM API.
 *
 * @category Data Routers
 */
export function createMemoryRouter(
  /**
   * Application routes
   */
  routes: RouteObject[],
  /**
   * Router options
   */
  opts?: MemoryRouterOpts
): DataRouter {
  return createRouter({
    basename: opts?.basename,
    unstable_getContext: opts?.unstable_getContext,
    future: opts?.future,
    history: createMemoryHistory({
      initialEntries: opts?.initialEntries,
      initialIndex: opts?.initialIndex,
    }),
    hydrationData: opts?.hydrationData,
    routes,
    hydrationRouteProperties,
    mapRouteProperties,
    dataStrategy: opts?.dataStrategy,
    patchRoutesOnNavigation: opts?.patchRoutesOnNavigation,
  }).initialize();
}

export { default as Outlet, useOutletContext } from "./outlet.svelte";
export { default as Route } from "./route.svelte";
export { default as Routes } from "./routes.svelte";
export { default as RouterProvider } from "./router-provider.svelte";

export type { RouteProps } from "./route.svelte";
export type { RoutesProps } from "./routes.svelte";
export { useRoutes } from "./use-routes.svelte";
