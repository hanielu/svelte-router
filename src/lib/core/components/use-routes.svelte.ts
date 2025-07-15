import type { Snippet } from "svelte";
import {
  ENABLE_DEV_WARNINGS,
  LocationContext,
  NavigationContext,
  RouteContext,
  type DataRouteMatch,
  type DataRouteObject,
  type RouteContextObject,
  type RouteMatch,
  type RouteObject,
} from "../context.js";
import DefaultErrorComponent from "./default-error-component.svelte";
import RenderErrorBoundary from "./render-error-boundary.svelte";
import RenderedRoute from "./rendered-route.svelte";
import type { Location } from "../router/history.js";
import type { Router as DataRouter, RouterState } from "../router/router.js";
import { box, extract, type MaybeGetter } from "$lib/utils/index.js";
import { getAllContexts, mount, unmount, untrack } from "svelte";
import { invariant, parsePath, warning, Action as NavigationType } from "../router/history.js";
import { matchRoutes, joinPaths } from "../router/utils.js";
import { useInRouterContext, useLocation, warningOnce } from "../hooks.svelte.js";

function snippet(fn: (anchor: Text) => void) {
  return ((anchor: Text) => fn(anchor)) as Snippet;
}

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
  locationArg?: Partial<Location> | string
) {
  return useRoutesImpl(children, routes, locationArg);
}

/**
 * Internal implementation with accept optional param for RouterProvider usage
 *
 * @private
 * @category Hooks
 */
export function useRoutesImpl(
  children: Snippet | undefined,
  routes: RouteObject[],
  locationArg?: Partial<Location> | string,
  _dataRouterState?: MaybeGetter<DataRouter["state"]>,
  future?: DataRouter["future"]
) {
  /* --------------------------------------------------------------
   * Compute reactive match list (largely identical logic to useRoutes)
   * ------------------------------------------------------------*/

  invariant(
    useInRouterContext(),
    `useRoutes() may be used only in the context of a <Router> component.`
  );

  const dataRouterState = $derived(extract(_dataRouterState));

  const navigator = $derived(NavigationContext.current.navigator);
  const parentMatches = $derived(RouteContext.current.matches);
  const routeMatch = $derived(parentMatches[parentMatches.length - 1]);
  const parentParams = $derived(routeMatch ? routeMatch.params : {});
  const parentPathname = $derived(routeMatch ? routeMatch.pathname : "/");
  const parentPathnameBase = $derived(routeMatch ? routeMatch.pathnameBase : "/");
  const parentRoute = $derived(routeMatch && routeMatch.route);

  const locationFromContext = $derived(useLocation());

  const location = $derived.by(() => {
    if (locationArg) {
      let parsedLocationArg =
        typeof locationArg === "string" ? parsePath(locationArg) : locationArg;

      invariant(
        parentPathnameBase === "/" || parsedLocationArg.pathname?.startsWith(parentPathnameBase),
        `When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, ` +
          `the location pathname must begin with the portion of the URL pathname that was ` +
          `matched by all parent routes. The current pathname base is "${parentPathnameBase}" ` +
          `but pathname "${parsedLocationArg.pathname}" was given in the \`location\` prop.`
      );

      return parsedLocationArg;
    } else {
      return locationFromContext;
    }
  });

  const pathname = $derived(location.pathname || "/");

  const remainingPathname = $derived.by(() => {
    if (parentPathnameBase !== "/") {
      let parentSegments = parentPathnameBase.replace(/^\//, "").split("/");
      let segments = pathname.replace(/^\//, "").split("/");
      return "/" + segments.slice(parentSegments.length).join("/");
    } else {
      return pathname;
    }
  });

  const matches = $derived(matchRoutes(routes, { pathname: remainingPathname }) || []);

  /* --------------------------------------------------------------
   * State kept across navigations - MUST be outside the snippet!
   * ------------------------------------------------------------*/

  interface MountedComponent {
    match: RouteMatch;
    unmountRef?: any;
    level: number; // depth in the route hierarchy
    routeContext: { current: RouteContextObject };
  }

  const mountedComponents: MountedComponent[] = [];
  const contexts = getAllContexts();

  /* --------------------------------------------------------------
   * Snippet responsible for mounting and diffing RenderedRoute chain
   * ------------------------------------------------------------*/

  return snippet(anchor => {
    /* ----------------- helpers for diffing and patching route changes -----------------------*/

    const isSameMatch = (a: RouteMatch, b: RouteMatch) => {
      return (
        a.route.id === b.route.id &&
        a.pathname === b.pathname &&
        JSON.stringify(a.params) === JSON.stringify(b.params)
      );
    };

    /**
     * Find the first level where mounted components differ from new matches.
     * This helps optimize re-rendering by only updating components that actually changed.
     */
    function findFirstDifferentLevel(newMatches: RouteMatch[]): number {
      let level = 0;
      while (
        level < mountedComponents.length &&
        level < newMatches.length &&
        isSameMatch(mountedComponents[level].match, newMatches[level])
      ) {
        level++;
      }
      return level;
    }

    /**
     * Unmount all components from a given level downwards.
     * This is used when route structure changes to clean up old components.
     */
    function unmountComponentsFromLevel(level: number) {
      for (let i = mountedComponents.length - 1; i >= level; i--) {
        if (mountedComponents[i].unmountRef) {
          // Only works for components mounted with Svelte's `mount` function
          unmount(mountedComponents[i].unmountRef, { outro: true });
        }
      }
      mountedComponents.splice(level);
    }

    function createRenderedSnippet(
      match: RouteMatch,
      outlet: Snippet | null,
      matchesSlice: RouteMatch[],
      index: number,
      routeContext: { current: RouteContextObject }
    ): {
      component: typeof RenderedRoute | typeof RenderErrorBoundary;
      props: any;
    } {
      // Determine error/hydrate state similar to _renderMatches
      let error: any;
      let errorElement: Snippet | null = null;
      if (dataRouterState && match.route.id) {
        error = dataRouterState.errors?.[match.route.id];
      }

      if (dataRouterState) {
        errorElement = match.route.errorElement || (DefaultErrorComponent as Snippet);
      }

      let childrenSnippet: Snippet | null;
      if (error) {
        childrenSnippet = errorElement;
      } else if (match.route.Component) {
        childrenSnippet = match.route.Component as Snippet;
      } else if (match.route.element) {
        childrenSnippet = match.route.element;
      } else {
        childrenSnippet = outlet;
      }

      // Wrap in RenderErrorBoundary if needed
      const shouldWrap =
        dataRouterState && (match.route.ErrorBoundary || match.route.errorElement || index === 0);

      routeContext.current = {
        outlet,
        matches: matchesSlice,
        isDataRoute: dataRouterState != null,
      };

      // return object include routeContext
      const commonReturn = {
        component: RenderedRoute,
        props: {
          match,
          get routeContext() {
            return routeContext.current;
          },
          children: childrenSnippet,
        },
      };

      if (!shouldWrap) {
        return commonReturn;
      }

      const renderedRouteSnippet = snippet(anchor => {
        RenderedRoute(anchor as any, {
          match,
          routeContext: {
            outlet,
            matches: matchesSlice,
            isDataRoute: dataRouterState != null,
          },
          children: childrenSnippet,
        });
      });

      return {
        component: RenderErrorBoundary,
        props: {
          location: dataRouterState!.location,
          revalidation: dataRouterState!.revalidation,
          error,
          component: errorElement!,
          get routeContext() {
            return routeContext.current;
          },
          children: renderedRouteSnippet,
        },
      };
    }

    function mountMatchAtLevel(
      index: number,
      targetAnchor: Text | HTMLElement,
      level: number,
      matches: RouteMatch[]
    ) {
      const match = matches[index];
      if (!match) return;

      const hasChild = index + 1 < matches.length;
      // If there's a child in the match chain, this route is acting as a layout

      let outletSnippet: Snippet | null = null;
      if (hasChild) {
        outletSnippet = snippet(anchor => mountMatchAtLevel(index + 1, anchor, level + 1, matches));
      }

      const routeContext = $state<{ current: RouteContextObject }>({ current: null! });

      const { component, props } = createRenderedSnippet(
        match,
        outletSnippet,
        matches.slice(0, index + 1),
        index,
        routeContext
      );

      // no need to keep a reference to the component, it's not used for unmounting
      // only a root component mounted with `mount` can be unmounted with `unmount`
      component(targetAnchor as any, props);
      mountedComponents[level] = { match, level, routeContext };
    }

    function mountRoot(matches: RouteMatch[]) {
      if (matches.length === 0) return;

      const hasChild = matches.length > 1;
      // If there are child matches, the root is acting as a layout

      let outletSnippet: Snippet | null = null;
      if (hasChild) {
        outletSnippet = snippet(anchor => mountMatchAtLevel(1, anchor, 1, matches));
      }

      const routeContext = $state<{ current: RouteContextObject }>({ current: null! });
      const { component, props } = createRenderedSnippet(
        matches[0],
        outletSnippet,
        matches.slice(0, 1),
        0,
        routeContext
      );

      // When a user passes in a `locationArg`, the associated routes need to
      // be wrapped in a new `LocationContext.Provider` in order for `useLocation`
      // to use the scoped location instead of the global location.
      if (locationArg) {
        LocationContext.setWith(() => ({
          location: {
            pathname: "/",
            search: "",
            hash: "",
            state: null,
            key: "default",
            ...location,
          },
          navigationType: NavigationType.Pop,
        }));
      }

      const unmountRef = mount(component as any, {
        target: anchor.parentNode as HTMLDivElement,
        anchor,
        props,
        context: contexts,
      });

      mountedComponents[0] = {
        match: matches[0],
        unmountRef,
        level: 0,
        routeContext,
      };
    }

    /**
     * Main function to handle route changes by mounting/unmounting components efficiently.
     * Uses diffing to only update components that actually changed.
     */
    function loadAndMountComponents(currentMatches: RouteMatch[]) {
      // If no matches (e.g., 404), just unmount everything
      if (!currentMatches || currentMatches.length === 0) {
        unmountComponentsFromLevel(0);
        return;
      }

      const firstDifferentLevel = findFirstDifferentLevel(currentMatches);
      unmountComponentsFromLevel(firstDifferentLevel);

      if (mountedComponents.length === 0) {
        // First time mounting or complete remount
        mountRoot(currentMatches);
      } else {
        // Partial update - refresh parent's outlet to show new child routes
        const parentComponent = mountedComponents[firstDifferentLevel - 1];

        if (parentComponent.match.route.children?.length) {
          // Update parent's outlet with new route matches
          parentComponent.routeContext.current.outlet = snippet(anchor =>
            mountMatchAtLevel(firstDifferentLevel, anchor, firstDifferentLevel, currentMatches)
          );
        }
      }
    }

    // @ts-expect-error this is how a snippet is called without
    // a render tag in the svelte template
    children?.(anchor);

    $effect(() => {
      void matches; // trigger effect
      untrack(() => loadAndMountComponents(matches));
    });

    // runs onDestroy
    $effect(() => () => unmountComponentsFromLevel(0));
  });
}

// this uses the react approach, problem is that ALL components are re-rendered when the location changes
export function _useRoutes(
  routes: RouteObject[],
  locationArg?: Partial<Location> | string,
  dataRouterState?: DataRouter["state"],
  future?: DataRouter["future"]
) {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useRoutes() may be used only in the context of a <Router> component.`
  );

  const navigator = $derived(NavigationContext.current.navigator);
  const parentMatches = $derived(RouteContext.current.matches);
  const routeMatch = $derived(parentMatches[parentMatches.length - 1]);
  const parentParams = $derived(routeMatch ? routeMatch.params : {});
  const parentPathname = $derived(routeMatch ? routeMatch.pathname : "/");
  const parentPathnameBase = $derived(routeMatch ? routeMatch.pathnameBase : "/");
  const parentRoute = $derived(routeMatch && routeMatch.route);

  if (ENABLE_DEV_WARNINGS) {
    // You won't get a warning about 2 different <Routes> under a <Route>
    // without a trailing *, but this is a best-effort warning anyway since we
    // cannot even give the warning unless they land at the parent route.
    //
    // Example:
    //
    // <Routes>
    //   {/* This route path MUST end with /* because otherwise
    //       it will never match /blog/post/123 */}
    //   <Route path="blog" element={<Blog />} />
    //   <Route path="blog/feed" element={<BlogFeed />} />
    // </Routes>
    //
    // function Blog() {
    //   return (
    //     <Routes>
    //       <Route path="post/:id" element={<Post />} />
    //     </Routes>
    //   );
    // }
    let parentPath = (parentRoute && parentRoute.path) || "";
    warningOnce(
      parentPathname,
      !parentRoute || parentPath.endsWith("*") || parentPath.endsWith("*?"),
      `You rendered descendant <Routes> (or called \`useRoutes()\`) at ` +
        `"${parentPathname}" (under <Route path="${parentPath}">) but the ` +
        `parent route path has no trailing "*". This means if you navigate ` +
        `deeper, the parent won't match anymore and therefore the child ` +
        `routes will never render.\n\n` +
        `Please change the parent <Route path="${parentPath}"> to <Route ` +
        `path="${parentPath === "/" ? "*" : `${parentPath}/*`}">.`
    );
  }

  const locationFromContext = $derived(useLocation());

  const location = $derived.by(() => {
    if (locationArg) {
      let parsedLocationArg =
        typeof locationArg === "string" ? parsePath(locationArg) : locationArg;

      invariant(
        parentPathnameBase === "/" || parsedLocationArg.pathname?.startsWith(parentPathnameBase),
        `When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, ` +
          `the location pathname must begin with the portion of the URL pathname that was ` +
          `matched by all parent routes. The current pathname base is "${parentPathnameBase}" ` +
          `but pathname "${parsedLocationArg.pathname}" was given in the \`location\` prop.`
      );

      return parsedLocationArg;
    } else {
      return locationFromContext;
    }
  });

  const pathname = $derived(location.pathname || "/");

  const remainingPathname = $derived.by(() => {
    if (parentPathnameBase !== "/") {
      // Determine the remaining pathname by removing the # of URL segments the
      // parentPathnameBase has, instead of removing based on character count.
      // This is because we can't guarantee that incoming/outgoing encodings/
      // decodings will match exactly.
      // We decode paths before matching on a per-segment basis with
      // decodeURIComponent(), but we re-encode pathnames via `new URL()` so they
      // match what `window.location.pathname` would reflect.  Those don't 100%
      // align when it comes to encoded URI characters such as % and &.
      //
      // So we may end up with:
      //   pathname:           "/descendant/a%25b/match"
      //   parentPathnameBase: "/descendant/a%b"
      //
      // And the direct substring removal approach won't work :/
      let parentSegments = parentPathnameBase.replace(/^\//, "").split("/");
      let segments = pathname.replace(/^\//, "").split("/");
      return "/" + segments.slice(parentSegments.length).join("/");
    } else {
      return pathname;
    }
  });

  const matches = $derived(matchRoutes(routes, { pathname: remainingPathname }));

  $effect(() => {
    if (ENABLE_DEV_WARNINGS) {
      warning(
        parentRoute || matches != null,
        `No routes matched location "${location.pathname}${location.search}${location.hash}" `
      );

      warning(
        matches == null ||
          matches[matches.length - 1].route.element !== undefined ||
          matches[matches.length - 1].route.Component !== undefined ||
          matches[matches.length - 1].route.lazy !== undefined,
        `Matched leaf route at location "${location.pathname}${location.search}${location.hash}" ` +
          `does not have an element or Component. This means it will render an <Outlet /> with a ` +
          `null value by default resulting in an "empty" page.`
      );
    }
  });

  let renderedMatches = $derived(
    _renderMatches(
      matches &&
        matches.map(match =>
          Object.assign({}, match, {
            params: Object.assign({}, parentParams, match.params),
            pathname: joinPaths([
              parentPathnameBase,
              // Re-encode pathnames that were decoded inside matchRoutes
              navigator.encodeLocation
                ? navigator.encodeLocation(match.pathname).pathname
                : match.pathname,
            ]),
            pathnameBase:
              match.pathnameBase === "/"
                ? parentPathnameBase
                : joinPaths([
                    parentPathnameBase,
                    // Re-encode pathnames that were decoded inside matchRoutes
                    navigator.encodeLocation
                      ? navigator.encodeLocation(match.pathnameBase).pathname
                      : match.pathnameBase,
                  ]),
          })
        ),
      parentMatches,
      dataRouterState,
      future
    )
  );

  // When a user passes in a `locationArg`, the associated routes need to
  // be wrapped in a new `LocationContext.Provider` in order for `useLocation`
  // to use the scoped location instead of the global location.
  if (locationArg && renderedMatches) {
    return box.with(
      () =>
        ((anchor: any) => {
          LocationContext.setWith(() => ({
            location: {
              pathname: "/",
              search: "",
              hash: "",
              state: null,
              key: "default",
              ...location,
            },
            navigationType: NavigationType.Pop,
          }));
          // @ts-expect-error this is how a snippet is called without
          // a render tag in the svelte template
          renderedMatches(anchor);
        }) as Snippet
    );
  }

  return box.with(() => renderedMatches);
}

function _renderMatches(
  matches: RouteMatch[] | null,
  parentMatches: RouteMatch[] = [],
  dataRouterState: DataRouter["state"] | null = null,
  future: DataRouter["future"] | null = null
): Snippet | null {
  if (matches == null) {
    if (!dataRouterState) {
      return null;
    }

    if (dataRouterState.errors) {
      // Don't bail if we have data router errors so we can render them in the
      // boundary.  Use the pre-matched (or shimmed) matches
      matches = dataRouterState.matches as DataRouteMatch[];
    } else if (
      parentMatches.length === 0 &&
      !dataRouterState.initialized &&
      dataRouterState.matches.length > 0
    ) {
      // Don't bail if we're initializing with partial hydration and we have
      // router matches.  That means we're actively running `patchRoutesOnNavigation`
      // so we should render down the partial matches to the appropriate
      // `HydrateFallback`.  We only do this if `parentMatches` is empty so it
      // only impacts the root matches for `RouterProvider` and no descendant
      // `<Routes>`
      matches = dataRouterState.matches as DataRouteMatch[];
    } else {
      return null;
    }
  }

  let renderedMatches = matches;

  // If we have data errors, trim matches to the highest error boundary
  let errors = dataRouterState?.errors;
  if (errors != null) {
    let errorIndex = renderedMatches.findIndex(
      m => m.route.id && errors?.[m.route.id] !== undefined
    );
    invariant(
      errorIndex >= 0,
      `Could not find a matching route for errors on route IDs: ${Object.keys(errors).join(",")}`
    );
    renderedMatches = renderedMatches.slice(0, Math.min(renderedMatches.length, errorIndex + 1));
  }

  // If we're in a partial hydration mode, detect if we need to render down to
  // a given HydrateFallback while we load the rest of the hydration data
  let renderFallback = false;
  let fallbackIndex = -1;
  if (dataRouterState) {
    for (let i = 0; i < renderedMatches.length; i++) {
      let match = renderedMatches[i];
      // Track the deepest fallback up until the first route without data
      if (match.route.HydrateFallback || match.route.hydrateFallbackElement) {
        fallbackIndex = i;
      }

      if (match.route.id) {
        let { loaderData, errors } = dataRouterState;
        let needsToRunLoader =
          match.route.loader &&
          !loaderData.hasOwnProperty(match.route.id) &&
          (!errors || errors[match.route.id] === undefined);
        if (match.route.lazy || needsToRunLoader) {
          // We found the first route that's not ready to render (waiting on
          // lazy, or has a loader that hasn't run yet).  Flag that we need to
          // render a fallback and render up until the appropriate fallback
          renderFallback = true;
          if (fallbackIndex >= 0) {
            renderedMatches = renderedMatches.slice(0, fallbackIndex + 1);
          } else {
            renderedMatches = [renderedMatches[0]];
          }
          break;
        }
      }
    }
  }

  return renderedMatches.reduceRight((outlet, match, index) => {
    // Only data routers handle errors/fallbacks
    let error: any;
    let shouldRenderHydrateFallback = false;
    let errorElement: Snippet | null = null;
    let hydrateFallbackElement: Snippet | null = null;
    if (dataRouterState) {
      error = errors && match.route.id ? errors[match.route.id] : undefined;
      errorElement =
        match.route.errorElement ||
        (((anchor: any) => {
          DefaultErrorComponent(anchor, {});
        }) as Snippet);

      if (renderFallback) {
        if (fallbackIndex < 0 && index === 0) {
          warningOnce(
            "route-fallback",
            false,
            "No `HydrateFallback` element provided to render during initial hydration"
          );
          shouldRenderHydrateFallback = true;
          hydrateFallbackElement = null;
        } else if (fallbackIndex === index) {
          shouldRenderHydrateFallback = true;
          hydrateFallbackElement = match.route.hydrateFallbackElement || null;
        }
      }
    }

    let matches = parentMatches.concat(renderedMatches.slice(0, index + 1));
    let getChildren = () => {
      let children: Snippet | null;
      if (error) {
        children = errorElement;
      } else if (shouldRenderHydrateFallback) {
        children = hydrateFallbackElement;
      } else if (match.route.Component) {
        // Note: This is a de-optimized path since React won't re-use the
        // ReactElement since it's identity changes with each new
        // React.createElement call.  We keep this so folks can use
        // `<Route Component={...}>` in `<Routes>` but generally `Component`
        // usage is only advised in `RouterProvider` when we can convert it to
        // `element` ahead of time.

        // TODO: (haniel) come back to refine the comment for this.
        // basically, in the react version, using `<Route element={Component />} />`
        // is the recommended way to pass a component to a route for some react-specific quirk I don't know about.
        // In svelte though, there's not really such a limitation, so we can just use the component directly.
        children = match.route.Component as Snippet;
      } else if (match.route.element) {
        children = match.route.element;
      } else {
        children = outlet;
      }

      return ((anchor: any) => {
        RenderedRoute(anchor, {
          match,
          routeContext: {
            outlet,
            matches,
            isDataRoute: dataRouterState != null,
          },
          children,
        });
      }) as Snippet;
    };

    // Only wrap in an error boundary within data router usages when we have an
    // ErrorBoundary/errorElement on this route.  Otherwise let it bubble up to
    // an ancestor ErrorBoundary/errorElement

    return dataRouterState && (match.route.ErrorBoundary || match.route.errorElement || index === 0)
      ? (((anchor: any) => {
          RenderErrorBoundary(anchor, {
            location: dataRouterState.location,
            revalidation: dataRouterState.revalidation,
            error,
            component: errorElement as Snippet,
            routeContext: { outlet: null, matches, isDataRoute: true },
            children: getChildren(),
          });
        }) as Snippet)
      : getChildren();
  }, null as Snippet | null);
}
