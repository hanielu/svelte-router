import { getContext } from "svelte";
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
import { invariant, parsePath, warning, type Path, type To } from "./router/history.js";
import {
  matchRoutes,
  joinPaths,
  getResolveToMatches,
  resolveTo,
  type Params,
} from "./router/utils.js";
import { box } from "$lib/utils/index.js";
import type { SerializeFrom } from "./types/route-data.js";
import type { RelativeRoutingType } from "./router/router.js";

/**
  Resolves a URL against the current location.

  ```svelte
  <script>
    import { useHref } from "@hvniel/svelte-router"
    let href = useHref("some/where");
    // "/resolved/some/where"
  </script>
  ```

  @category Hooks
 */
export function useHref(to: To, { relative }: { relative?: RelativeRoutingType } = {}): string {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useHref() may be used only in the context of a <Router> component.`
  );

  let { basename, navigator } = NavigationContext.current;
  let { hash, pathname, search } = useResolvedPath(to, { relative });

  let joinedPathname = pathname;

  // If we're operating within a basename, prepend it to the pathname prior
  // to creating the href.  If this is a root navigation, then just use the raw
  // basename which allows the basename to have full control over the presence
  // of a trailing slash on root links
  if (basename !== "/") {
    joinedPathname = pathname === "/" ? basename : joinPaths([basename, pathname]);
  }

  return navigator.createHref({ pathname: joinedPathname, search, hash });
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
  let route = useRouteContext(hookName).current;
  let thisRoute = route.matches[route.matches.length - 1];
  invariant(
    thisRoute.route.id,
    `${hookName} can only be used on routes that contain a unique "id"`
  );
  return thisRoute.route.id;
}

/**
 * Returns the ID for the nearest contextual route
 */
export function useRouteId() {
  return useCurrentRouteId(DataRouterStateHook.UseRouteId);
}

/**
  Accesses the error thrown during an {@link ActionFunction | action}, {@link LoaderFunction | loader}, or component render to be used in a route module Error Boundary.

  ```svelte
  <script>
    import { useRouteError } from "@hvniel/svelte-router";
    const error = $derived(useRouteError());
  </script>
  <div>{error.message}</div>
  ```

  @category Hooks
 */
export function useRouteError() {
  let error = RouteErrorContext.get();
  let state = useDataRouterState(DataRouterStateHook.UseRouteError);
  let routeId = useCurrentRouteId(DataRouterStateHook.UseRouteError);

  // If this was a render error, we put it in a RouteError context inside
  // of RenderErrorBoundary
  if (error.current !== undefined) {
    return error.current;
  }

  // Otherwise look for errors from our data router state
  return state.current?.errors?.[routeId];
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

  <p>{params.postId}</p>
  ```

  Assuming a route pattern like `/posts/:postId` is matched by `/posts/123` then `params.postId` will be `"123"`.

  @category Hooks
 */
export function useParams<
  ParamsOrKey extends string | Record<string, string | undefined> = string
>(): Readonly<[ParamsOrKey] extends [string] ? Params<ParamsOrKey> : Partial<ParamsOrKey>> {
  let { matches } = RouteContext.current;
  let routeMatch = matches[matches.length - 1];
  return routeMatch ? (routeMatch.params as any) : {};
}

/**
  Resolves the pathname of the given `to` value against the current location. Similar to {@link useHref}, but returns a {@link Path} instead of a string.

  ```svelte
  <script>
    import { useResolvedPath } from "@hvniel/svelte-router"
    // if the user is at /dashboard/profile
    let path = $derived(useResolvedPath("../accounts"))
    console.log(path.pathname) // "/dashboard/accounts"
    console.log(path.search) // ""
    console.log(path.hash) // ""
  </script>
  ```

  @category Hooks
 */
export function useResolvedPath(
  to: To,
  { relative }: { relative?: RelativeRoutingType } = {}
): Path {
  let matches = RouteContext.current.matches;
  let { pathname: locationPathname } = useLocation();
  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches));

  return resolveTo(to, JSON.parse(routePathnamesJson), locationPathname, relative === "path");
}

/**
  Returns the current {@link Location}. This can be useful if you'd like to perform some side effect whenever it changes.

  ```svelte
  <script>
    import { useLocation } from '@hvniel/svelte-router'

    // use a derived if using the location in a layout
    const location = $derived(useLocation())

    // we don't need a derived if using the location in a route
    // since the location is not updated when the route changes
    const location = useLocation()

    $effect(() => {
      console.log(location)
    })
  </script>
  ```

  @category Hooks
 */
export function useLocation() {
  invariant(
    useInRouterContext(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    `useLocation() may be used only in the context of a <Router> component.`
  );

  return LocationContext.current.location;
}

/**
  Returns the data from the closest route {@link LoaderFunction | loader} or {@link ClientLoaderFunction | client loader}.

  ```svelte
  <script module>
    export async function loader() {
      return await fakeDb.invoices.findAll();
    }
  </script>
  <script>
    import { useLoaderData } from "@hvniel/svelte-router";
    const data = $derived(useLoaderData<typeof loader>());
  </script>
  ```

  @category Hooks
 */
export function useLoaderData<T = any>(): SerializeFrom<T> {
  let state = useDataRouterState(DataRouterStateHook.UseLoaderData);
  let routeId = useCurrentRouteId(DataRouterStateHook.UseLoaderData);
  return state.current?.loaderData[routeId] as SerializeFrom<T>;
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

  let dataRouterContext = DataRouterContext.current;
  let { basename, navigator } = NavigationContext.current;
  let { matches } = RouteContext.current;
  let { pathname: locationPathname } = useLocation();

  let routePathnamesJson = JSON.stringify(getResolveToMatches(matches));

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
  });

  let navigate: NavigateFunction = (to: To | number, options: NavigateOptions = {}) => {
    warning(activeRef, navigateEffectWarning);

    // Short circuit here since if this happens on first render the navigate
    // is useless because we haven't wired up our history listener yet
    if (!activeRef) return;

    if (typeof to === "number") {
      navigator.go(to);
      return;
    }

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
    if (dataRouterContext == null && basename !== "/") {
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
  let { router } = useDataRouterContext(DataRouterHook.UseNavigateStable).current!;
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
  });

  let navigate: NavigateFunction = async (to: To | number, options: NavigateOptions = {}) => {
    warning(activeRef, navigateEffectWarning);

    // Short circuit here since if this happens on first render the navigate
    // is useless because we haven't wired up our router subscriber yet
    if (!activeRef) return;

    if (typeof to === "number") {
      router.navigate(to);
    } else {
      await router.navigate(to, { fromRouteId: id, ...options });
    }
  };

  return navigate;
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
  state: "idle" | "loading";
} {
  let dataRouterContext = useDataRouterContext(DataRouterHook.UseRevalidator);
  let state = useDataRouterState(DataRouterStateHook.UseRevalidator);

  const revalidate = async () => {
    await dataRouterContext.current!.router.revalidate();
  };

  return {
    revalidate,
    state: state.current!.revalidation,
  };
}

const alreadyWarned: Record<string, boolean> = {};
export function warningOnce(key: string, cond: boolean, message: string) {
  if (!cond && !alreadyWarned[key]) {
    alreadyWarned[key] = true;
    warning(false, message);
  }
}
