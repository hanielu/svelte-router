import type { Snippet } from "svelte";
import {
  ENABLE_DEV_WARNINGS,
  NavigationContext,
  RouteContext,
  type RouteMatch,
  type RouteObject,
  type DataRouteObject,
} from "../context.js";
import type { Location } from "../router/history.js";
import { invariant, parsePath, warning } from "../router/history.js";
import type { Router as DataRouter, RouterState } from "../router/router.js";
import { joinPaths, matchRoutes } from "../router/utils.js";
import { extract, type MaybeGetter } from "$lib/utils/index.js";
import {
  useInRouterContext,
  useLocation,
  warningOnce,
} from "../hooks.svelte.js";
import RouteRenderer from "./route-renderer.svelte";

export function useDataRoutes(
  children: Snippet | undefined,
  routes: DataRouteObject[],
  future: DataRouter["future"],
  state: MaybeGetter<RouterState>
) {
  return useRoutesImpl(children, routes, undefined, state, future);
}

export function useRoutes(
  children: Snippet | undefined,
  routes: RouteObject[],
  locationArg?: MaybeGetter<Partial<Location> | string | undefined>
): Snippet {
  return useRoutesImpl(children, routes, locationArg);
}

/** Match once per reactive location/state update; Svelte owns the keyed branch lifetime. */
export function useRoutesImpl(
  children: Snippet | undefined,
  routes: MaybeGetter<RouteObject[]> = [],
  locationArg?: MaybeGetter<Partial<Location> | string | undefined>,
  stateArg?: MaybeGetter<RouterState>,
  _future?: DataRouter["future"]
): Snippet {
  invariant(
    useInRouterContext(),
    "useRoutes() may be used only in the context of a <Router> component."
  );
  const navigation = NavigationContext.get();
  const parent = RouteContext.get();
  const locationFromContext = useLocation();
  let registered = $state(children === undefined);
  const state = $derived(extract(stateArg));
  const parentMatches = $derived(parent.current.matches);
  const parentMatch = $derived(parentMatches.at(-1));
  const parentBase = $derived(parentMatch?.pathnameBase ?? "/");
  const override = $derived(extract(locationArg));
  const location = $derived.by((): Location => {
    if (!override) return locationFromContext.current;
    const parsed =
      typeof override === "string" ? parsePath(override) : override;
    invariant(
      parentBase === "/" || parsed.pathname?.startsWith(parentBase),
      `When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, ` +
        `the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. ` +
        `The current pathname base is "${parentBase}" but pathname "${parsed.pathname}" was given in the \`location\` prop.`
    );
    return {
      pathname: "/",
      search: "",
      hash: "",
      state: null,
      key: "default",
      ...parsed,
    };
  });

  const matches = $derived.by((): RouteMatch[] | null => {
    if (!registered) return null;
    // Engine matches include shimmed 404/error routes, partial hydration and lazy
    // property replacements. Declarative descendants only match their own table.
    if (state) return state.matches as RouteMatch[];
    const segments = location.pathname.split("/");
    const remaining =
      parentBase === "/"
        ? location.pathname
        : "/" +
          segments
            .slice(parentBase.replace(/^\//, "").split("/").length + 1)
            .join("/");
    const navigator = navigation.current.navigator;
    return (
      matchRoutes(extract(routes), { pathname: remaining })?.map(match => ({
        ...match,
        params: { ...parentMatch?.params, ...match.params },
        pathname: joinPaths([
          parentBase,
          navigator.encodeLocation?.(match.pathname).pathname ?? match.pathname,
        ]),
        pathnameBase:
          match.pathnameBase === "/"
            ? parentBase
            : joinPaths([
                parentBase,
                navigator.encodeLocation?.(match.pathnameBase).pathname ??
                  match.pathnameBase,
              ]),
      })) ?? null
    );
  });

  // React Router _renderMatches: truncate at the error owner, or at the deepest
  // available hydration fallback preceding a lazy route/missing loader result.
  const selection = $derived.by(() => {
    let selected = matches ?? [];
    if (state?.errors) {
      const index = selected.findIndex(
        match =>
          match.route.id != null && state.errors?.[match.route.id] !== undefined
      );
      invariant(
        index >= 0,
        `Could not find a matching route for errors on route IDs: ${Object.keys(state.errors).join(",")}`
      );
      selected = selected.slice(0, index + 1);
    }
    let fallbackIndex: number | undefined;
    if (state) {
      let deepest = -1;
      for (let index = 0; index < selected.length; index++) {
        const route = selected[index].route;
        if (route.HydrateFallback || route.hydrateFallbackElement)
          deepest = index;
        const missingData =
          route.loader &&
          route.id != null &&
          !Object.hasOwn(state.loaderData, route.id) &&
          state.errors?.[route.id] === undefined;
        if (route.lazy || missingData) {
          fallbackIndex = Math.max(0, deepest);
          selected = selected.slice(0, fallbackIndex + 1);
          warningOnce(
            "route-fallback",
            deepest >= 0,
            "No `HydrateFallback` element provided to render during initial hydration"
          );
          break;
        }
      }
    }
    return { matches: selected, fallbackIndex };
  });

  $effect(() => {
    if (!registered || !ENABLE_DEV_WARNINGS) return;
    warning(
      parentMatch || matches != null,
      `No routes matched location "${location.pathname}${location.search}${location.hash}" `
    );
    const leaf = matches?.at(-1)?.route;
    warning(
      !leaf ||
        leaf.element !== undefined ||
        leaf.Component !== undefined ||
        leaf.lazy !== undefined,
      `Matched leaf route at location "${location.pathname}${location.search}${location.hash}" does not have an element or Component. ` +
        `This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`
    );
  });

  // The existing hook returns a Snippet. Keep its single adapter bridge, but never
  // mount an independent Svelte root: that severs ancestor error boundaries and
  // forces manual context/teardown bookkeeping. All branch rendering below this
  // bridge uses ordinary compiled components/snippets and keyed blocks.
  return ((anchor: unknown) =>
    RouteRenderer(anchor as never, {
      children,
      registered: () => {
        registered = true;
      },
      get matches() {
        return selection.matches;
      },
      get fallbackIndex() {
        return selection.fallbackIndex;
      },
      get parentMatches() {
        return parentMatches;
      },
      get state() {
        return state;
      },
      get scopedLocation() {
        return override ? location : undefined;
      },
    })) as unknown as Snippet;
}
