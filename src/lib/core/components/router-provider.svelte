<script lang="ts" module>
  import type { Location } from "../router/history.js";
  import type { Router as DataRouter, RouterState, RouterSubscriber } from "../router/router.js";
  import {
    DataRouterContext,
    DataRouterStateContext,
    FetchersContext,
    ViewTransitionContext,
    type Navigator,
    type ViewTransitionContextObject,
  } from "../context.js";
  import type { ViewTransition } from "../dom/global.js";
  import Router from "./router.svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { box } from "$lib/utils/box.svelte.js";
  import DataRoutes from "./data-routes.svelte";

  export interface RouterProviderProps {
    router: DataRouter;
    flushSync?: (fn: () => unknown) => undefined;
  }

  class Deferred<T> {
    status: "pending" | "resolved" | "rejected" = "pending";
    promise: Promise<T>;
    // @ts-expect-error - no initializer
    resolve: (value: T) => void;
    // @ts-expect-error - no initializer
    reject: (reason?: unknown) => void;
    constructor() {
      this.promise = new Promise((resolve, reject) => {
        this.resolve = value => {
          if (this.status === "pending") {
            this.status = "resolved";
            resolve(value);
          }
        };
        this.reject = reason => {
          if (this.status === "pending") {
            this.status = "rejected";
            reject(reason);
          }
        };
      });
    }
  }
</script>

<script lang="ts">
  let { router, flushSync: reactDomFlushSyncImpl }: RouterProviderProps = $props();

  let _state = $state(router.state);
  let pendingState = $state<RouterState>();
  let vtContext = $state<ViewTransitionContextObject>({ isTransitioning: false });
  let renderDfd = $state<Deferred<void>>();
  let transition = $state<ViewTransition>();
  let interruption = $state<{
    state: RouterState;
    currentLocation: Location;
    nextLocation: Location;
  }>();
  let fetcherData = new SvelteMap<any, any>();

  const setState: RouterSubscriber = (
    newState: RouterState,
    { deletedFetchers, flushSync, viewTransitionOpts }
  ) => {
    newState.fetchers.forEach((fetcher, key) => {
      if (fetcher.data !== undefined) {
        fetcherData.set(key, fetcher.data);
      }
    });
    deletedFetchers.forEach(key => fetcherData.delete(key));

    // warnOnce(
    //   flushSync === false || reactDomFlushSyncImpl != null,
    //   "You provided the `flushSync` option to a router update, " +
    //     "but you are not using the `<RouterProvider>` from `react-router/dom` " +
    //     "so `ReactDOM.flushSync()` is unavailable.  Please update your app " +
    //     'to `import { RouterProvider } from "react-router/dom"` and ensure ' +
    //     "you have `react-dom` installed as a dependency to use the " +
    //     "`flushSync` option."
    // );

    let isViewTransitionAvailable =
      router.window != null &&
      router.window.document != null &&
      typeof router.window.document.startViewTransition === "function";

    // warnOnce(
    //   viewTransitionOpts == null || isViewTransitionAvailable,
    //   "You provided the `viewTransition` option to a router update, " +
    //     "but you do not appear to be running in a DOM environment as " +
    //     "`window.startViewTransition` is not available."
    // );

    // If this isn't a view transition or it's not available in this browser,
    // just update and be done with it
    if (!viewTransitionOpts || !isViewTransitionAvailable) {
      if (reactDomFlushSyncImpl && flushSync) {
        reactDomFlushSyncImpl(() => (_state = newState));
      } else {
        // React.startTransition(() => setStateImpl(newState));
        _state = newState;
      }
      return;
    }

    // flushSync + startViewTransition
    if (reactDomFlushSyncImpl && flushSync) {
      // Flush through the context to mark DOM elements as transition=ing
      reactDomFlushSyncImpl(() => {
        // Cancel any pending transitions
        if (transition) {
          renderDfd && renderDfd.resolve();
          transition.skipTransition();
        }
        vtContext = {
          isTransitioning: true,
          flushSync: true,
          currentLocation: viewTransitionOpts.currentLocation,
          nextLocation: viewTransitionOpts.nextLocation,
        };
      });

      // Update the DOM
      let t = router.window!.document.startViewTransition(() => {
        reactDomFlushSyncImpl(() => (_state = newState));
      });

      // Clean up after the animation completes
      t.finished.finally(() => {
        reactDomFlushSyncImpl(() => {
          renderDfd = undefined;
          transition = undefined;
          pendingState = undefined;
          vtContext = { isTransitioning: false };
        });
      });

      reactDomFlushSyncImpl(() => (transition = t));
      return;
    }

    // startTransition + startViewTransition
    if (transition) {
      // Interrupting an in-progress transition, cancel and let everything flush
      // out, and then kick off a new transition from the interruption state
      renderDfd && renderDfd.resolve();
      transition.skipTransition();
      interruption = {
        state: newState,
        currentLocation: viewTransitionOpts.currentLocation,
        nextLocation: viewTransitionOpts.nextLocation,
      };
    } else {
      // Completed navigation update with opted-in view transitions, let 'er rip
      pendingState = newState;
      vtContext = {
        isTransitioning: true,
        flushSync: false,
        currentLocation: viewTransitionOpts.currentLocation,
        nextLocation: viewTransitionOpts.nextLocation,
      };
    }
  };

  // Need to use a layout effect here so we are subscribed early enough to
  // pick up on any render-driven redirects/navigations (useEffect/<Navigate>)
  $effect.pre(() => router.subscribe(setState));

  // When we start a view transition, create a Deferred we can use for the
  // eventual "completed" render
  $effect(() => {
    if (vtContext.isTransitioning && !vtContext.flushSync) {
      renderDfd = new Deferred<void>();
    }
  });

  // Once the deferred is created, kick off startViewTransition() to update the
  // DOM and then wait on the Deferred to resolve (indicating the DOM update has
  // happened)
  $effect(() => {
    if (renderDfd && pendingState && router.window) {
      let newState = pendingState;
      let renderPromise = renderDfd.promise;
      let _transition = router.window.document.startViewTransition(async () => {
        _state = newState;
        await renderPromise;
      });
      _transition.finished.finally(() => {
        renderDfd = undefined;
        transition = undefined;
        pendingState = undefined;
        vtContext = { isTransitioning: false };
      });
      transition = _transition;
    }
  });

  // When the new location finally renders and is committed to the DOM, this
  // effect will run to resolve the transition
  $effect(() => {
    if (renderDfd && pendingState && _state.location.key === pendingState.location.key) {
      renderDfd.resolve();
    }
  });

  // If we get interrupted with a new navigation during a transition, we skip
  // the active transition, let it cleanup, then kick it off again here
  $effect(() => {
    if (!vtContext.isTransitioning && interruption) {
      pendingState = interruption.state;
      vtContext = {
        isTransitioning: true,
        flushSync: false,
        currentLocation: interruption.currentLocation,
        nextLocation: interruption.nextLocation,
      };
      interruption = undefined;
    }
  });

  const navigator = $derived<Navigator>({
    createHref: router.createHref,
    encodeLocation: router.encodeLocation,
    go: n => router.navigate(n),
    push: (to, state, opts) =>
      router.navigate(to, {
        state,
        preventScrollReset: opts?.preventScrollReset,
      }),
    replace: (to, state, opts) =>
      router.navigate(to, {
        replace: true,
        state,
        preventScrollReset: opts?.preventScrollReset,
      }),
  });

  const basename = $derived(router.basename || "/");
  const dataRouterContext = $derived({
    router,
    navigator,
    static: false,
    basename,
  });

  DataRouterContext.set(box.with(() => dataRouterContext));
  DataRouterStateContext.set(box.with(() => _state));
  FetchersContext.set(fetcherData);
  ViewTransitionContext.set(box.with(() => vtContext));
</script>

<Router {basename} location={_state.location} navigationType={_state.historyAction} {navigator}>
  <DataRoutes routes={router.routes} future={router.future} state={_state} />
</Router>
