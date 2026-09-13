import { box } from "../utils/box.svelte.js";
import {
  readRouterInput,
  type RouterInput,
  type RouterValue,
} from "./reactivity.svelte.js";
import {
  DataRouterContext,
  DataRouterStateContext,
  LocationContext,
  NavigationContext,
  RouteContext,
  RouteErrorContext,
  type NavigateOptions,
  type RouteObject,
} from "./context.js";
import {
  Action as NavigationType,
  invariant,
  parsePath,
  warning,
  type Path,
  type Location,
  type To,
} from "./router/history.js";
import {
  convertRouteMatchToUiMatch,
  decodePath,
  matchRoutes,
  matchPath,
  joinPaths,
  getResolveToMatches,
  resolveTo,
  stripBasename,
  type ParamParseKey,
  type Params,
  type PathMatch,
  type PathPattern,
  type UIMatch,
} from "./router/utils.js";
import type { SerializeFrom } from "./types/route-data.js";
import {
  IDLE_BLOCKER,
  type Blocker,
  type BlockerFunction,
  type RelativeRoutingType,
  type Navigation,
} from "./router/router.js";

/**
  Resolves a URL against the current location.

  ```svelte
  <script>
    import { useHref } from "@hvniel/svelte-router"
    const href = useHref("some/where");
  </script>
  <a href={href.current}>Go</a>
  ```

  @category Hooks
 */
export function useHref(
  to: RouterInput<To>,
  options: RouterInput<{ relative?: RelativeRoutingType }> = {}
): RouterValue<string> {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useHref() may be used only in the context of a <Router> component.`
  );

  const navigation = NavigationContext.get();
  const path = useResolvedPath(to, options);
  return box.with(() => {
    const { basename, navigator } = navigation.current;
    const { hash, pathname, search } = path.current;
    const joinedPathname = basename === "/"
      ? pathname
      : pathname === "/" ? basename : joinPaths([basename, pathname]);
    return navigator.createHref({ pathname: joinedPathname, search, hash });
  });
}

enum DataRouterHook {
  UseBlocker = "useBlocker",
  UseRevalidator = "useRevalidator",
  UseNavigateStable = "useNavigate",
}

enum DataRouterStateHook {
  UseBlocker = "useBlocker",
  UseLoaderData = "useLoaderData",
  UseActionData = "useActionData",
  UseRouteError = "useRouteError",
  UseNavigation = "useNavigation",
  UseRouteLoaderData = "useRouteLoaderData",
  UseMatches = "useMatches",
  UseRevalidator = "useRevalidator",
  UseNavigateStable = "useNavigate",
  UseRouteId = "useRouteId",
}

function getDataRouterConsoleError(hookName: DataRouterHook | DataRouterStateHook) {
  return `${hookName} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}

function useDataRouterContext(hookName: DataRouterHook) {
  let ctx = DataRouterContext.get();
  invariant(ctx.current, getDataRouterConsoleError(hookName));
  return ctx;
}

function useDataRouterState(hookName: DataRouterStateHook) {
  let state = DataRouterStateContext.get();
  invariant(state.current, getDataRouterConsoleError(hookName));
  return state;
}

function useRouteContext(hookName: DataRouterStateHook) {
  let route = RouteContext.get();
  invariant(route.current, getDataRouterConsoleError(hookName));
  return route;
}

// Internal version with hookName-aware debugging
function useCurrentRouteId(hookName: DataRouterStateHook) {
  const route = useRouteContext(hookName);
  const read = () => {
    const id = route.current.matches.at(-1)?.route.id;
    invariant(id != null, `${hookName} can only be used on routes that contain a unique "id"`);
    return id;
  };
  read(); // Report a missing route during initialization, not a later event.
  return box.with(read);
}

/**
 * Returns the ID for the nearest contextual route
 */
export function useRouteId(): RouterValue<string> {
  return useCurrentRouteId(DataRouterStateHook.UseRouteId);
}

/**
  Accesses the error thrown during an {@link ActionFunction | action}, {@link LoaderFunction | loader}, or component render to be used in a route module Error Boundary.

  ```svelte
  <script>
    import { useRouteError } from "@hvniel/svelte-router";
    const error = useRouteError();
  </script>
  <div>{error.current instanceof Error ? error.current.message : "Route failed"}</div>
  ```

  @category Hooks
 */
export function useRouteError(): RouterValue<unknown> {
  const error = RouteErrorContext.getOr({ current: undefined });
  const state = useDataRouterState(DataRouterStateHook.UseRouteError);
  const routeId = useCurrentRouteId(DataRouterStateHook.UseRouteError);
  return box.with(() => error.current !== undefined
    ? error.current
    : state.current?.errors?.[routeId.current]);
}

/**
 * Returns true if this component is a descendant of a Router, useful to ensure
 * a component is used within a Router.
 *
 * @category Hooks
 */
export function useInRouterContext(): boolean {
  return LocationContext.exists();
}

/**
  Returns an object of key/value pairs of the dynamic params from the current URL that were matched by the routes. Child routes inherit all params from their parent routes.

  ```svelte
  <script>
    import { useParams } from '@hvniel/svelte-router'
    const params = useParams()
  </script>

  <p>{params.current.postId}</p>
  ```

  Assuming a route pattern like `/posts/:postId` is matched by `/posts/123` then `params.current.postId` will be `"123"`.

  @category Hooks
 */
export function useParams<
  ParamsOrKey extends string | Record<string, string | undefined> = string
>(): RouterValue<Readonly<[ParamsOrKey] extends [string] ? Params<ParamsOrKey> : Partial<ParamsOrKey>>> {
  invariant(
    useInRouterContext(),
    "useParams() may be used only in the context of a <Router> component."
  );
  const route = RouteContext.get();
  const emptyParams = {};
  return box.with(() => (route.current.matches.at(-1)?.params ?? emptyParams) as
    Readonly<[ParamsOrKey] extends [string] ? Params<ParamsOrKey> : Partial<ParamsOrKey>>);
}

/**
  Resolves the pathname of the given `to` value against the current location. Similar to {@link useHref}, but returns a {@link Path} instead of a string.

  ```svelte
  <script>
    import { useResolvedPath } from "@hvniel/svelte-router"
    // if the user is at /dashboard/profile
    const path = useResolvedPath("../accounts")
    $effect(() => console.log(path.current.pathname)) // "/dashboard/accounts"
  </script>
  ```

  @category Hooks
 */
export function useResolvedPath(
  to: RouterInput<To>,
  options: RouterInput<{ relative?: RelativeRoutingType }> = {}
): RouterValue<Path> {
  const route = RouteContext.get();
  const location = useLocation();
  return box.with(() => resolveTo(
    readRouterInput(to),
    getResolveToMatches(route.current.matches),
    location.current.pathname,
    readRouterInput(options).relative === "path"
  ));
}

/**
  Returns the current {@link Location}. This can be useful if you'd like to perform some side effect whenever it changes.

  ```svelte
  <script>
    import { useLocation } from '@hvniel/svelte-router'

    const location = useLocation()

    $effect(() => {
      console.log(location.current)
    })
  </script>
  ```

  @category Hooks
 */
export function useLocation(): RouterValue<Location> {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useLocation() may be used only in the context of a <Router> component.`
  );

  const context = LocationContext.get();
  return box.with(() => context.current.location);
}

/**
 * Returns the action that produced the current location: POP, PUSH, or REPLACE.
 *
 * Initialize once and read `.current` across navigations in a retained component.
 *
 * @category Hooks
 */
export function useNavigationType(): RouterValue<NavigationType> {
  invariant(
    useInRouterContext(),
    "useNavigationType() may be used only in the context of a <Router> component."
  );
  const context = LocationContext.get();
  return box.with(() => context.current.navigationType);
}

/**
 * Returns a match when `pattern` matches the current decoded pathname.
 *
 * @category Hooks
 */
export function useMatch<
  ParamKey extends ParamParseKey<Path>,
  Path extends string,
>(pattern: RouterInput<PathPattern<Path> | Path>): RouterValue<PathMatch<ParamKey> | null> {
  invariant(
    useInRouterContext(),
    `useMatch() may be used only in the context of a <Router> component.`
  );

  const location = useLocation();
  return box.with(() => matchPath<ParamKey, Path>(
    readRouterInput(pattern),
    decodePath(location.current.pathname)
  ));
}

/**
 * Returns the current data-router navigation, defaulting to the idle state.
 *
 * @category Hooks
 */
export function useNavigation(): RouterValue<Navigation> {
  const state = useDataRouterState(DataRouterStateHook.UseNavigation);
  return box.with(() => state.current!.navigation);
}

/**
 * Returns the active data-route matches with their loader data and handles.
 *
 * @category Hooks
 */
export function useMatches(): RouterValue<UIMatch[]> {
  const context = useDataRouterState(DataRouterStateHook.UseMatches);
  // Navigation-only notifications do not change the UI matches. Preserve the
  // projection until one of its actual inputs changes, like upstream's memo.
  const matches = $derived(context.current!.matches);
  const loaderData = $derived(context.current!.loaderData);
  return box.with(() => matches.map(match => convertRouteMatchToUiMatch(match, loaderData)));
}

/**
  Returns a live handle to the closest route loader's data, or undefined before
  data is available. Register the loader on a data-route object explicitly.

  ```svelte
  <script module lang="ts">
    export async function loader() {
      return { invoiceCount: 42 };
    }
  </script>
  <script lang="ts">
    import { useLoaderData } from "@hvniel/svelte-router";
    const data = useLoaderData<typeof loader>();
    $effect(() => console.log(data.current));
  </script>
  ```

  @category Hooks
 */
export function useLoaderData<T = unknown>(): RouterValue<SerializeFrom<T> | undefined> {
  const state = useDataRouterState(DataRouterStateHook.UseLoaderData);
  const routeId = useCurrentRouteId(DataRouterStateHook.UseLoaderData);
  return box.with(() => state.current?.loaderData[routeId.current] as SerializeFrom<T> | undefined);
}

/**
 * Returns loader data for a route with the supplied ID.
 *
 * @category Hooks
 */
export function useRouteLoaderData<T = unknown>(
  routeId: RouterInput<string>
): RouterValue<SerializeFrom<T> | undefined> {
  const state = useDataRouterState(DataRouterStateHook.UseRouteLoaderData);
  return box.with(() => state.current?.loaderData[readRouterInput(routeId)] as SerializeFrom<T> | undefined);
}

/**
 * Returns data from the nearest route's most recent action submission.
 *
 * @category Hooks
 */
export function useActionData<T = unknown>(): RouterValue<SerializeFrom<T> | undefined> {
  const state = useDataRouterState(DataRouterStateHook.UseActionData);
  const routeId = useCurrentRouteId(DataRouterStateHook.UseActionData);
  return box.with(() => state.current?.actionData?.[routeId.current] as SerializeFrom<T> | undefined);
}

/**
 * The interface for the navigate() function returned from useNavigate().
 */
export interface NavigateFunction {
  (to: To, options?: NavigateOptions): void | Promise<void>;
  (delta: number): void | Promise<void>;
}

/**
  Returns a function that lets you navigate programmatically in the browser in response to user interactions or effects.

  ```svelte
  <script>
    import { useNavigate } from "@hvniel/svelte-router";
    const navigate = useNavigate();
  </script>
  <button onclick={() => navigate(-1)} />
  ```

  It's often better to use {@link redirect} in {@link ActionFunction | actions} and {@link LoaderFunction | loaders} than this hook.

  @category Hooks
 */
export function useNavigate(): NavigateFunction {
  let { isDataRoute } = RouteContext.current;
  // Conditional usage is OK here because the usage of a data router is static
  return isDataRoute ? useNavigateStable() : useNavigateUnstable();
}

const navigateEffectWarning =
  `You should call navigate() in a $effect(), not when ` + `your component is first rendered.`;

function useNavigateUnstable(): NavigateFunction {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useNavigate() may be used only in the context of a <Router> component.`
  );

  // Capture the context boxes during component setup, then read their current
  // values when navigation occurs. A Svelte component does not rerun its setup
  // script after navigation, so capturing the values here would make relative
  // navigation resolve against the location that existed at mount time.
  let dataRouterContext = DataRouterContext.get();
  let navigationContext = NavigationContext.get();
  let routeContext = RouteContext.get();
  let locationContext = LocationContext.get();

  // this being a $state variable allows child components to access the navigate function
  // so if useNavigate() is called in a parent component,
  // child components can access the navigate function in an effect
  // which reruns when the parent component mounts
  let activeRef = $state(false);

  // making this an $effect.pre() instead of a $effect() causes the navigate function to run
  // before the component has mounted, which isn't what we want, I think.
  // TBD: figure out if this is a problem
  $effect(() => {
    activeRef = true;
    return () => {
      activeRef = false;
    };
  });

  let navigate: NavigateFunction = (to: To | number, options: NavigateOptions = {}) => {
    warning(activeRef, navigateEffectWarning);

    // Short circuit here since if this happens on first render the navigate
    // is useless because we haven't wired up our history listener yet
    if (!activeRef) return;

    if (typeof to === "number") {
      let { navigator } = navigationContext.current;
      navigator.go(to);
      return;
    }

    let currentDataRouterContext = dataRouterContext.current;
    let { basename, navigator } = navigationContext.current;
    let { matches } = routeContext.current;
    let locationPathname = locationContext.current.location.pathname;
    let routePathnamesJson = JSON.stringify(getResolveToMatches(matches));

    let path = resolveTo(
      to,
      JSON.parse(routePathnamesJson),
      locationPathname,
      options.relative === "path"
    );

    // If we're operating within a basename, prepend it to the pathname prior
    // to handing off to history (but only if we're not in a data router,
    // otherwise it'll prepend the basename inside of the router).
    // If this is a root navigation, then we navigate to the raw basename
    // which allows the basename to have full control over the presence of a
    // trailing slash on root links
    if (currentDataRouterContext == null && basename !== "/") {
      path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname]);
    }

    (!!options.replace ? navigator.replace : navigator.push)(path, options.state, options);
  };

  return navigate;
}

/**
 * Stable version of useNavigate that is used when we are in the context of
 * a RouterProvider.
 *
 * @private
 */
function useNavigateStable(): NavigateFunction {
  const context = useDataRouterContext(DataRouterHook.UseNavigateStable);
  let id = useCurrentRouteId(DataRouterStateHook.UseNavigateStable);

  // this being a $state variable allows child components to access the navigate function
  // so if useNavigate() is called in a parent component,
  // child components can access the navigate function in an effect
  // which reruns when the parent component mounts
  let activeRef = $state(false);

  // making this an $effect.pre() instead of a $effect() causes the navigate function to run
  // before the component has mounted, which isn't what we want, I think.
  // TBD: figure out if this is a problem
  $effect(() => {
    activeRef = true;
    return () => {
      activeRef = false;
    };
  });

  let navigate: NavigateFunction = async (to: To | number, options: NavigateOptions = {}) => {
    warning(activeRef, navigateEffectWarning);

    // Short circuit here since if this happens on first render the navigate
    // is useless because we haven't wired up our router subscriber yet
    if (!activeRef) return;

    const { router } = context.current!;
    if (typeof to === "number") {
      router.navigate(to);
    } else {
      await router.navigate(to, { fromRouteId: id.current, ...options });
    }
  };

  return navigate;
}

let blockerId = 0;

/**
 * Blocks in-app data-router navigations while `shouldBlock` returns true.
 *
 * A function is the most useful Svelte form because it can read current rune
 * state when the router asks whether a navigation should be blocked:
 *
 * ```ts
 * const blocker = useBlocker(() => form.dirty);
 * ```
 *
 * The returned proxy has stable identity while its properties read the live
 * blocker held by the router.
 *
 * @category Hooks
 */
export function useBlocker(shouldBlock: boolean | BlockerFunction): Blocker {
  let dataRouterContext = useDataRouterContext(DataRouterHook.UseBlocker);
  let state = useDataRouterState(DataRouterStateHook.UseBlocker);
  let blockerKey = String(++blockerId);

  let blockerFunction: BlockerFunction = args => {
    if (typeof shouldBlock !== "function") {
      return shouldBlock;
    }

    let basename = dataRouterContext.current!.basename;
    if (basename === "/") {
      return shouldBlock(args);
    }

    let { currentLocation, nextLocation, historyAction } = args;
    return shouldBlock({
      currentLocation: {
        ...currentLocation,
        pathname:
          stripBasename(currentLocation.pathname, basename) || currentLocation.pathname,
      },
      nextLocation: {
        ...nextLocation,
        pathname: stripBasename(nextLocation.pathname, basename) || nextLocation.pathname,
      },
      historyAction,
    });
  };

  $effect(() => {
    let router = dataRouterContext.current!.router;
    router.getBlocker(blockerKey, blockerFunction);

    return () => router.deleteBlocker(blockerKey);
  });

  return new Proxy(IDLE_BLOCKER, {
    get(_target, property) {
      let blocker = state.current?.blockers.get(blockerKey) ?? IDLE_BLOCKER;
      let value = Reflect.get(blocker, property, blocker);
      return typeof value === "function" ? value.bind(blocker) : value;
    },
  });
}

/**
  Revalidate the data on the page for reasons outside of normal data mutations like window focus or polling on an interval.

  ```svelte
  <script>
    import { useRevalidator } from "@hvniel/svelte-router";

    function useFakeWindowFocus(callback) {
      $effect(() => {
        function handleFocus() {
          callback();
        }
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
      });
    }

    const revalidator = useRevalidator();
    
    useFakeWindowFocus(() => {
      revalidator.revalidate();
    });
  </script>

  <div hidden={revalidator.state === "idle"}>
    Revalidating...
  </div>
  ```

  Note that page data is already revalidated automatically after actions. If you find yourself using this for normal CRUD operations on your data in response to user interactions, you're probably not taking advantage of the other APIs like {@link useFetcher}, {@link Form}, {@link useSubmit} that do this automatically.

  @category Hooks
 */
export function useRevalidator(): {
  revalidate: () => Promise<void>;
  readonly state: "idle" | "loading";
} {
  let dataRouterContext = useDataRouterContext(DataRouterHook.UseRevalidator);
  let state = useDataRouterState(DataRouterStateHook.UseRevalidator);

  const revalidate = async () => {
    await dataRouterContext.current!.router.revalidate();
  };

  return {
    revalidate,
    get state() {
      return state.current!.revalidation;
    },
  };
}

const alreadyWarned: Record<string, boolean> = {};
export function warningOnce(key: string, cond: boolean, message: string) {
  if (!cond && !alreadyWarned[key]) {
    alreadyWarned[key] = true;
    warning(false, message);
  }
}
