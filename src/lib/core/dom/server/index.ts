import { mapRouteProperties } from "$lib/core/components/index.js";
import type { RouteObject } from "$lib/core/context.js";
import {
  IDLE_BLOCKER,
  IDLE_FETCHER,
  IDLE_NAVIGATION,
  type FutureConfig,
  type RevalidationState,
  type StaticHandlerContext,
  type Router as DataRouter,
  ABSOLUTE_URL_REGEX,
} from "$lib/core/router/router.js";
import {
  convertRoutesToDataRoutes,
  isRouteErrorResponse,
  type RouteManifest,
} from "$lib/core/router/utils.js";
import { createPath, type Path, type To, Action as NavigationType } from "../../router/history.js";

export {
  default as StaticRouterProvider,
  type StaticRouterProviderProps,
} from "./static-router-provider.svelte";

export { default as StaticRouter, type StaticRouterProps } from "./static-router.svelte";

/**
 * Defines the discovery behavior of the link:
 *
 * - "render" - default, discover the route when the link renders
 * - "none" - don't eagerly discover, only discover if the link is clicked
 */
export type DiscoverBehavior = "render" | "none";

export function serializeErrors(
  errors: StaticHandlerContext["errors"]
): StaticHandlerContext["errors"] {
  if (!errors) return null;
  let entries = Object.entries(errors);
  let serialized: StaticHandlerContext["errors"] = {};
  for (let [key, val] of entries) {
    // Hey you!  If you change this, please change the corresponding logic in
    // deserializeErrors in react-router-dom/index.tsx :)
    if (isRouteErrorResponse(val)) {
      serialized[key] = { ...val, __type: "RouteErrorResponse" };
    } else if (val instanceof Error) {
      // Do not serialize stack traces from SSR for security reasons
      serialized[key] = {
        message: val.message,
        __type: "Error",
        // If this is a subclass (i.e., ReferenceError), send up the type so we
        // can re-create the same type during hydration.
        ...(val.name !== "Error"
          ? {
              __subType: val.name,
            }
          : {}),
      };
    } else {
      serialized[key] = val;
    }
  }
  return serialized;
}

export function getStatelessNavigator() {
  return {
    createHref,
    encodeLocation,
    push(to: To) {
      throw new Error(
        `You cannot use navigator.push() on the server because it is a stateless ` +
          `environment. This error was probably triggered when you did a ` +
          `\`navigate(${JSON.stringify(to)})\` somewhere in your app.`
      );
    },
    replace(to: To) {
      throw new Error(
        `You cannot use navigator.replace() on the server because it is a stateless ` +
          `environment. This error was probably triggered when you did a ` +
          `\`navigate(${JSON.stringify(to)}, { replace: true })\` somewhere ` +
          `in your app.`
      );
    },
    go(delta: number) {
      throw new Error(
        `You cannot use navigator.go() on the server because it is a stateless ` +
          `environment. This error was probably triggered when you did a ` +
          `\`navigate(${delta})\` somewhere in your app.`
      );
    },
    back() {
      throw new Error(
        `You cannot use navigator.back() on the server because it is a stateless ` + `environment.`
      );
    },
    forward() {
      throw new Error(
        `You cannot use navigator.forward() on the server because it is a stateless ` +
          `environment.`
      );
    },
  };
}

/**
 * @category Data Routers
 */
export function createStaticRouter(
  routes: RouteObject[],
  context: StaticHandlerContext,
  opts: {
    future?: Partial<FutureConfig>;
  } = {}
): DataRouter {
  let manifest: RouteManifest = {};
  let dataRoutes = convertRoutesToDataRoutes(routes, mapRouteProperties, undefined, manifest);

  // Because our context matches may be from a framework-agnostic set of
  // routes passed to createStaticHandler(), we update them here with our
  // newly created/enhanced data routes
  let matches = context.matches.map(match => {
    let route = manifest[match.route.id] || match.route;
    return {
      ...match,
      route,
    };
  });

  let msg = (method: string) =>
    `You cannot use router.${method}() on the server because it is a stateless environment`;

  return {
    get basename() {
      return context.basename;
    },
    get future() {
      return {
        unstable_middleware: false,
        ...opts?.future,
      };
    },
    get state() {
      return {
        historyAction: NavigationType.Pop,
        location: context.location,
        matches,
        loaderData: context.loaderData,
        actionData: context.actionData,
        errors: context.errors,
        initialized: true,
        navigation: IDLE_NAVIGATION,
        restoreScrollPosition: null,
        preventScrollReset: false,
        revalidation: "idle" as RevalidationState,
        fetchers: new Map(),
        blockers: new Map(),
      };
    },
    get routes() {
      return dataRoutes;
    },
    get window() {
      return undefined;
    },
    initialize() {
      throw msg("initialize");
    },
    subscribe() {
      throw msg("subscribe");
    },
    enableScrollRestoration() {
      throw msg("enableScrollRestoration");
    },
    navigate() {
      throw msg("navigate");
    },
    fetch() {
      throw msg("fetch");
    },
    revalidate() {
      throw msg("revalidate");
    },
    createHref,
    encodeLocation,
    getFetcher() {
      return IDLE_FETCHER;
    },
    deleteFetcher() {
      throw msg("deleteFetcher");
    },
    dispose() {
      throw msg("dispose");
    },
    getBlocker() {
      return IDLE_BLOCKER;
    },
    deleteBlocker() {
      throw msg("deleteBlocker");
    },
    patchRoutes() {
      throw msg("patchRoutes");
    },
    _internalFetchControllers: new Map(),
    _internalSetRoutes() {
      throw msg("_internalSetRoutes");
    },
  };
}

function createHref(to: To) {
  return typeof to === "string" ? to : createPath(to);
}

function encodeLocation(to: To): Path {
  let href = typeof to === "string" ? to : createPath(to);
  // Treating this as a full URL will strip any trailing spaces so we need to
  // pre-encode them since they might be part of a matching splat param from
  // an ancestor route
  href = href.replace(/ $/, "%20");
  let encoded = ABSOLUTE_URL_REGEX.test(href) ? new URL(href) : new URL(href, "http://localhost");
  return {
    pathname: encoded.pathname,
    search: encoded.search,
    hash: encoded.hash,
  };
}

// This utility is based on https://github.com/zertosh/htmlescape
// License: https://github.com/zertosh/htmlescape/blob/0527ca7156a524d256101bb310a9f970f63078ad/LICENSE
const ESCAPE_LOOKUP: { [match: string]: string } = {
  "&": "\\u0026",
  ">": "\\u003e",
  "<": "\\u003c",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const ESCAPE_REGEX = /[&><\u2028\u2029]/g;

export function htmlEscape(str: string): string {
  return str.replace(ESCAPE_REGEX, match => ESCAPE_LOOKUP[match]);
}
