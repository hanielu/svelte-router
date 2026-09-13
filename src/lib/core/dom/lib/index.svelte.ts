import {
  ErrorResponseImpl,
  joinPaths,
  matchPath,
  stripBasename,
  type DataStrategyFunction,
  type FormEncType,
  type HTMLFormMethod,
} from "$lib/core/router/utils.js";
import {
  DataRouterContext,
  DataRouterStateContext,
  NavigationContext,
  RouteContext,
  ViewTransitionContext,
  type NavigateOptions,
  type PatchRoutesOnNavigationFunction,
  type RouteObject,
} from "$lib/core/context.js";
import {
  createBrowserHistory,
  createHashHistory,
  createPath,
  invariant,
  type To,
} from "$lib/core/router/history.js";
import {
  type RouterInit,
  type FutureConfig,
  type HydrationState,
  createRouter,
  type Router as DataRouter,
  type RelativeRoutingType,
} from "$lib/core/router/router.js";
import { mapRouteProperties, hydrationRouteProperties } from "$lib/core/components/index.js";
import {
  type SubmitTarget,
  type SubmitOptions,
  getFormSubmissionInfo,
  shouldProcessLinkClick,
  type URLSearchParamsInit,
  createSearchParams,
  getSearchParamsForLocation,
} from "../dom.js";
import { useLocation, useNavigate, useResolvedPath, useRouteId } from "$lib/core/hooks.svelte.js";
import { box } from "$lib/utils/box.svelte.js";
import {
  readRouterInput,
  type RouterInput,
  type RouterValue,
} from "../../reactivity.svelte.js";
import type { HTMLAttributeAnchorTarget } from "svelte/elements";
import { warning } from "$lib/core/router/history.js";

////////////////////////////////////////////////////////////////////////////////
//#region Global Stuff
////////////////////////////////////////////////////////////////////////////////

/**
 * @private
 */
export const isBrowser =
  typeof window !== "undefined" &&
  typeof window.document !== "undefined" &&
  typeof window.document.createElement !== "undefined";

// HEY YOU! DON'T TOUCH THIS VARIABLE!
//
// It is replaced with the proper version at build time via a babel plugin in
// the rollup config.
//
// Export a global property onto the window for React Router detection by the
// Core Web Vitals Technology Report.  This way they can configure the `wappalyzer`
// to detect and properly classify live websites as being built with React Router:
// https://github.com/HTTPArchive/wappalyzer/blob/main/src/technologies/r.json
declare global {
  const SVELTE_ROUTER_VERSION: string;
}
try {
  if (isBrowser) {
    window.__svelteRouterVersion = SVELTE_ROUTER_VERSION;
  }
} catch (e) {
  // no-op
}
//#endregion

/**
 * @category Routers
 */
export interface DOMRouterOpts {
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
   * Override the default data strategy of loading in parallel.
   * Only intended for advanced usage.
   */
  dataStrategy?: DataStrategyFunction;
  /**
   * Lazily define portions of the route tree on navigations.
   */
  patchRoutesOnNavigation?: PatchRoutesOnNavigationFunction;
  /**
   * Window object override - defaults to the global `window` instance.
   */
  window?: Window;
}

/**
 * Create a new data router that manages the application path via `history.pushState`
 * and `history.replaceState`.
 *
 * @category Data Routers
 */
export function createBrowserRouter(
  /**
   * Application routes
   */
  routes: RouteObject[],
  /**
   * Router options
   */
  opts?: DOMRouterOpts
): DataRouter {
  return createRouter({
    basename: opts?.basename,
    unstable_getContext: opts?.unstable_getContext,
    future: opts?.future,
    history: createBrowserHistory({ window: opts?.window }),
    hydrationData: opts?.hydrationData || parseHydrationData(),
    routes,
    mapRouteProperties,
    hydrationRouteProperties,
    dataStrategy: opts?.dataStrategy,
    patchRoutesOnNavigation: opts?.patchRoutesOnNavigation,
    window: opts?.window,
  }).initialize();
}

/**
 * Create a new data router that manages the application path via the URL hash
 *
 * @category Data Routers
 */
export function createHashRouter(routes: RouteObject[], opts?: DOMRouterOpts): DataRouter {
  return createRouter({
    basename: opts?.basename,
    unstable_getContext: opts?.unstable_getContext,
    future: opts?.future,
    history: createHashHistory({ window: opts?.window }),
    hydrationData: opts?.hydrationData || parseHydrationData(),
    routes,
    mapRouteProperties,
    hydrationRouteProperties,
    dataStrategy: opts?.dataStrategy,
    patchRoutesOnNavigation: opts?.patchRoutesOnNavigation,
    window: opts?.window,
  }).initialize();
}

function parseHydrationData(): HydrationState | undefined {
  let state = window?.__staticRouterHydrationData;
  if (state && state.errors) {
    state = {
      ...state,
      errors: deserializeErrors(state.errors),
    };
  }
  return state;
}

function deserializeErrors(errors: DataRouter["state"]["errors"]): DataRouter["state"]["errors"] {
  if (!errors) return null;
  let entries = Object.entries(errors);
  let serialized: DataRouter["state"]["errors"] = {};
  for (let [key, val] of entries) {
    // Hey you!  If you change this, please change the corresponding logic in
    // serializeErrors in react-router-dom/server.tsx :)
    if (val && val.__type === "RouteErrorResponse") {
      serialized[key] = new ErrorResponseImpl(
        val.status,
        val.statusText,
        val.data,
        val.internal === true
      );
    } else if (val && val.__type === "Error") {
      // Attempt to reconstruct the right type of Error (i.e., ReferenceError)
      if (val.__subType) {
        let ErrorConstructor = window[val.__subType];
        if (typeof ErrorConstructor === "function") {
          try {
            // @ts-expect-error
            let error = new ErrorConstructor(val.message);
            // Wipe away the client-side stack trace.  Nothing to fill it in with
            // because we don't serialize SSR stack traces for security reasons
            error.stack = "";
            serialized[key] = error;
          } catch (e) {
            // no-op - fall through and create a normal Error
          }
        }
      }

      if (serialized[key] == null) {
        let error = new Error(val.message);
        // Wipe away the client-side stack trace.  Nothing to fill it in with
        // because we don't serialize SSR stack traces for security reasons
        error.stack = "";
        serialized[key] = error;
      }
    } else {
      serialized[key] = val;
    }
  }
  return serialized;
}

export type SetURLSearchParams = (
  nextInit?: URLSearchParamsInit | ((prev: URLSearchParams) => URLSearchParamsInit),
  navigateOpts?: NavigateOptions
) => void | Promise<void>;

/**
 * Submits a HTML `<form>` to the server without reloading the page.
 */
export interface SubmitFunction {
  (
    /**
      Can be multiple types of elements and objects

      **`HTMLFormElement`**

      ```tsx
      <Form
        onSubmit={(event) => {
          submit(event.currentTarget);
        }}
      />
      ```

      **`FormData`**

      ```tsx
      const formData = new FormData();
      formData.append("myKey", "myValue");
      submit(formData, { method: "post" });
      ```

      **Plain object that will be serialized as `FormData`**

      ```tsx
      submit({ myKey: "myValue" }, { method: "post" });
      ```

      **Plain object that will be serialized as JSON**

      ```tsx
      submit(
        { myKey: "myValue" },
        { method: "post", encType: "application/json" }
      );
      ```
     */
    target: SubmitTarget,

    /**
     * Options that override the `<form>`'s own attributes. Required when
     * submitting arbitrary data without a backing `<form>`.
     */
    options?: SubmitOptions
  ): Promise<void>;
}

enum DataRouterHook {
  UseScrollRestoration = "useScrollRestoration",
  UseSubmit = "useSubmit",
  UseSubmitFetcher = "useSubmitFetcher",
  UseFetcher = "useFetcher",
  useViewTransitionState = "useViewTransitionState",
}

enum DataRouterStateHook {
  UseFetcher = "useFetcher",
  UseFetchers = "useFetchers",
  UseScrollRestoration = "useScrollRestoration",
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
  return state.current;
}

let fetcherId = 0;
let getUniqueFetcherId = () => `__${String(++fetcherId)}__`;

export function useSubmit(): SubmitFunction {
  const context = useDataRouterContext(DataRouterHook.UseSubmit);
  const currentRouteId = useRouteId();

  return async (target, options = {}) => {
    const { router, basename } = context.current!;
    let { action, method, encType, formData, body } = getFormSubmissionInfo(target, basename);

    if (options.navigate === false) {
      let key = options.fetcherKey || getUniqueFetcherId();
      await router.fetch(key, currentRouteId.current, options.action || action, {
        preventScrollReset: options.preventScrollReset,
        formData,
        body,
        formMethod: options.method || (method as HTMLFormMethod),
        formEncType: options.encType || (encType as FormEncType),
        flushSync: options.flushSync,
      });
    } else {
      await router.navigate(options.action || action, {
        preventScrollReset: options.preventScrollReset,
        formData,
        body,
        formMethod: options.method || (method as HTMLFormMethod),
        formEncType: options.encType || (encType as FormEncType),
        replace: options.replace,
        state: options.state,
        fromRouteId: currentRouteId.current,
        flushSync: options.flushSync,
        viewTransition: options.viewTransition,
      });
    }
  };
}

export function useFormAction(
  /**
   * The action to append to the closest route URL.
   */
  action: RouterInput<string | undefined> = undefined,
  options: RouterInput<{ relative?: RelativeRoutingType }> = {}
): RouterValue<string> {
  const navigation = NavigationContext.get();
  const route = RouteContext.get();
  invariant(route.current.matches.length, "useFormAction must be used inside a matched Route");
  const resolved = useResolvedPath(() => readRouterInput(action) || ".", options);
  const location = useLocation();
  return box.with(() => {
    const currentAction = readRouterInput(action);
    const basename = navigation.current.basename;
    const match = route.current.matches.at(-1);
    const path = { ...resolved.current };

    // An omitted action preserves search, but only the contextual index route
    // contributes a naked ?index marker.
    if (currentAction == null) {
      path.search = location.current.search;
      const params = new URLSearchParams(path.search);
      const indexValues = params.getAll("index");
      if (indexValues.some(v => v === "")) {
        params.delete("index");
        indexValues.filter(v => v).forEach(v => params.append("index", v));
        const qs = params.toString();
        path.search = qs ? `?${qs}` : "";
      }
    }
    if ((!currentAction || currentAction === ".") && match?.route.index) {
      path.search = path.search ? path.search.replace(/^\?/, "?index&") : "?index";
    }
    if (basename !== "/") {
      path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname]);
    }
    return createPath(path);
  });
}

/**
  Returns a tuple of a live {@link URLSearchParams} handle and a navigation setter.
  Defaults are captured once and do not change the URL. After the first setter
  call they no longer fill missing keys. Functional updates receive a copy of the
  latest params; multiple calls before navigation commits are not queued updates.

  ```svelte
  <script>
    import { useSearchParams } from "@hvniel/svelte-router";

    const [searchParams, setSearchParams] = useSearchParams();
    
    function handleSubmit(event) {
      event.preventDefault();
      setSearchParams({ q: "new search" });
    }
  </script>

  <form onsubmit={handleSubmit}>
    <input name="q" value={searchParams.current.get("q") || ""} />
    <button type="submit">Search</button>
  </form>
  ```

  @category Hooks
 */
export function useSearchParams(
  defaultInit?: URLSearchParamsInit
): [RouterValue<URLSearchParams>, SetURLSearchParams] {
  warning(
    typeof URLSearchParams !== "undefined",
    `You cannot use the \`useSearchParams\` hook in a browser that does not ` +
      `support the URLSearchParams API. If you need to support Internet ` +
      `Explorer 11, we recommend you load a polyfill such as ` +
      `https://github.com/ungap/url-search-params.`
  );

  const defaultSearchParams = createSearchParams(defaultInit);
  let hasSetSearchParams = $state(false);

  const location = useLocation();
  const searchParams = box.with(() =>
    // Only merge in the defaults if we haven't yet called setSearchParams.
    // Once we call that we want those to take precedence, otherwise you can't
    // remove a param with setSearchParams({}) if it has an initial value
    getSearchParamsForLocation(location.current.search, hasSetSearchParams ? null : defaultSearchParams)
  );

  let navigate = useNavigate();
  let setSearchParams: SetURLSearchParams = (nextInit, navigateOptions) => {
    const newSearchParams = createSearchParams(
      typeof nextInit === "function"
        ? nextInit(new URLSearchParams(searchParams.current))
        : nextInit
    );
    hasSetSearchParams = true;
    return navigate("?" + newSearchParams, navigateOptions);
  };

  return [searchParams, setSearchParams];
}

/**
 * Handles the click behavior for router `<Link>` components. This is useful if
 * you need to create custom `<Link>` components with the same click behavior we
 * use in our exported `<Link>`.
 *
 * @category Hooks
 */
export function useLinkClickHandler<E extends Element = HTMLAnchorElement>(
  to: () => To,
  props: () => {
    target?: HTMLAttributeAnchorTarget;
    replace?: boolean;
    state?: unknown;
    preventScrollReset?: boolean;
    relative?: RelativeRoutingType;
    viewTransition?: boolean;
  }
): (event: MouseEvent) => void {
  const navigate = useNavigate();
  const location = useLocation();
  const path = useResolvedPath(to, () => ({ relative: props().relative }));

  return (event: MouseEvent) => {
    const { target, replace: replaceProp, state, preventScrollReset, relative, viewTransition } = props();
    if (shouldProcessLinkClick(event, target)) {
      event.preventDefault();

      // If the URL hasn't changed, a regular <a> will do a replace instead of
      // a push, so do the same here unless the replace prop is explicitly set
      let replace =
        replaceProp !== undefined ? replaceProp : createPath(location.current) === createPath(path.current);

      navigate(to(), {
        replace,
        state,
        preventScrollReset,
        relative,
        viewTransition,
      });
    }
  };
}

/**
 * Returns whether a data-router view transition is moving to or from `to`.
 *
 * Read `.current`; pass getters for changing destinations or relative options.
 *
 * @category Hooks
 */
export function useViewTransitionState(
  to: RouterInput<To>,
  opts: RouterInput<{ relative?: RelativeRoutingType }> = {}
): RouterValue<boolean> {
  const viewTransitionContext = ViewTransitionContext.get();
  const context = useDataRouterContext(DataRouterHook.useViewTransitionState);
  const path = useResolvedPath(to, opts);
  return box.with(() => {
    const transition = viewTransitionContext.current;
    if (!transition.isTransitioning) return false;
    const { basename } = context.current!;
    const currentPath = stripBasename(transition.currentLocation.pathname, basename)
      || transition.currentLocation.pathname;
    const nextPath = stripBasename(transition.nextLocation.pathname, basename)
      || transition.nextLocation.pathname;
    return Boolean(
      matchPath(path.current.pathname, nextPath) || matchPath(path.current.pathname, currentPath)
    );
  });
}

export { default as MemoryRouter } from "./memory-router.svelte";
export { default as BrowserRouter } from "./browser-router.svelte";
export { default as HashRouter } from "./hash-router.svelte";
export { default as Form } from "./form.svelte";
export { default as Link } from "./link.svelte";
export { default as NavLink } from "./nav-link.svelte";

export type { MemoryRouterProps } from "./memory-router.svelte";
export type { BrowserRouterProps } from "./browser-router.svelte";
export type { HashRouterProps } from "./hash-router.svelte";
export type { FormProps } from "./form.svelte";
export type { LinkProps } from "./link.svelte";
export type { NavLinkProps, NavLinkRenderProps } from "./nav-link.svelte";
