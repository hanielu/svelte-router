import {
  ErrorResponseImpl,
  joinPaths,
  type DataStrategyFunction,
  type FormEncType,
  type HTMLFormMethod,
} from "$lib/core/router/utils.js";
import {
  DataRouterContext,
  DataRouterStateContext,
  NavigationContext,
  RouteContext,
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
) => void;

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
  return ctx.current;
}

function useDataRouterState(hookName: DataRouterStateHook) {
  let state = DataRouterStateContext.get();
  invariant(state.current, getDataRouterConsoleError(hookName));
  return state.current;
}

let fetcherId = 0;
let getUniqueFetcherId = () => `__${String(++fetcherId)}__`;

export function useSubmit(): SubmitFunction {
  const router = useDataRouterContext(DataRouterHook.UseSubmit).router;
  const basename = useDataRouterContext(DataRouterHook.UseSubmit).basename;
  const currentRouteId = useRouteId();

  return async (target, options = {}) => {
    let { action, method, encType, formData, body } = getFormSubmissionInfo(target, basename);

    if (options.navigate === false) {
      let key = options.fetcherKey || getUniqueFetcherId();
      await router.fetch(key, currentRouteId, options.action || action, {
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
        fromRouteId: currentRouteId,
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
  action?: string,
  { relative }: { relative?: RelativeRoutingType } = {}
): string {
  const basename = NavigationContext.current?.basename;
  const routeContext = RouteContext.current;
  invariant(routeContext, "useFormAction must be used inside a RouteContext");

  let [match] = routeContext.matches.slice(-1);
  // Shallow clone path so we can modify it below, otherwise we modify the
  // object referenced by useMemo inside useResolvedPath
  let path = { ...useResolvedPath(action ? action : ".", { relative }) };

  // If no action was specified, browsers will persist current search params
  // when determining the path, so match that behavior
  // https://github.com/remix-run/remix/issues/927
  let location = useLocation();
  if (action == null) {
    // Safe to write to this directly here since if action was undefined, we
    // would have called useResolvedPath(".") which will never include a search
    path.search = location.search;

    // When grabbing search params from the URL, remove any included ?index param
    // since it might not apply to our contextual route.  We add it back based
    // on match.route.index below
    let params = new URLSearchParams(path.search);
    let indexValues = params.getAll("index");
    let hasNakedIndexParam = indexValues.some(v => v === "");
    if (hasNakedIndexParam) {
      params.delete("index");
      indexValues.filter(v => v).forEach(v => params.append("index", v));
      let qs = params.toString();
      path.search = qs ? `?${qs}` : "";
    }
  }

  if ((!action || action === ".") && match.route.index) {
    path.search = path.search ? path.search.replace(/^\?/, "?index&") : "?index";
  }

  // If we're operating within a basename, prepend it to the pathname prior
  // to creating the form action.  If this is a root navigation, then just use
  // the raw basename which allows the basename to have full control over the
  // presence of a trailing slash on root actions
  if (basename !== "/") {
    path.pathname = path.pathname === "/" ? basename : joinPaths([basename, path.pathname]);
  }

  return createPath(path);
}

/**
  Returns a tuple of the current URL's {@link URLSearchParams} and a function to update them. Setting the search params causes a navigation.

  ```svelte
  <script>
    import { useSearchParams } from "@hvniel/svelte-router";

    const [searchParams, setSearchParams] = $derived(useSearchParams());
    
    function handleSubmit() {
      setSearchParams({ q: "new search" });
    }
  </script>

  <form onsubmit={handleSubmit}>
    <input name="q" value={searchParams.get("q") || ""} />
    <button type="submit">Search</button>
  </form>
  ```

  @category Hooks
 */
export function useSearchParams(
  defaultInit?: URLSearchParamsInit
): [URLSearchParams, SetURLSearchParams] {
  warning(
    typeof URLSearchParams !== "undefined",
    `You cannot use the \`useSearchParams\` hook in a browser that does not ` +
      `support the URLSearchParams API. If you need to support Internet ` +
      `Explorer 11, we recommend you load a polyfill such as ` +
      `https://github.com/ungap/url-search-params.`
  );

  let defaultSearchParams = createSearchParams(defaultInit);
  let hasSetSearchParams = false;

  let location = useLocation();
  let searchParams =
    // Only merge in the defaults if we haven't yet called setSearchParams.
    // Once we call that we want those to take precedence, otherwise you can't
    // remove a param with setSearchParams({}) if it has an initial value
    getSearchParamsForLocation(location.search, hasSetSearchParams ? null : defaultSearchParams);

  let navigate = useNavigate();
  let setSearchParams: SetURLSearchParams = (nextInit, navigateOptions) => {
    const newSearchParams = createSearchParams(
      typeof nextInit === "function" ? nextInit(searchParams) : nextInit
    );
    hasSetSearchParams = true;
    navigate("?" + newSearchParams, navigateOptions);
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
    state?: any;
    preventScrollReset?: boolean;
    relative?: RelativeRoutingType;
    viewTransition?: boolean;
  }
): (event: MouseEvent) => void {
  let navigate = useNavigate();
  let location = $derived(useLocation());
  const {
    target,
    replace: replaceProp,
    state,
    preventScrollReset,
    relative,
    viewTransition,
  } = $derived(props());
  let path = $derived(useResolvedPath(to(), { relative }));

  return (event: MouseEvent) => {
    if (shouldProcessLinkClick(event, target)) {
      event.preventDefault();

      // If the URL hasn't changed, a regular <a> will do a replace instead of
      // a push, so do the same here unless the replace prop is explicitly set
      let replace =
        replaceProp !== undefined ? replaceProp : createPath(location) === createPath(path);

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

export { default as MemoryRouter } from "./memory-router.svelte";
export { default as BrowserRouter } from "./browser-router.svelte";
export { default as HashRouter } from "./hash-router.svelte";
export { default as Form } from "./form.svelte";
export { default as Link } from "./link.svelte";

export type { MemoryRouterProps } from "./memory-router.svelte";
export type { BrowserRouterProps } from "./browser-router.svelte";
export type { HashRouterProps } from "./hash-router.svelte";
export type { FormProps } from "./form.svelte";
export type { LinkProps } from "./link.svelte";
