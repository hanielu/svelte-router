<script lang="ts" module>
  import { invariant } from "../../router/history.js";
  import type { Router as DataRouter, StaticHandlerContext } from "../../router/router.js";
  import {
    DataRouterContext,
    DataRouterStateContext,
    FetchersContext,
    ViewTransitionContext,
  } from "../../context.js";
  import Router from "../../components/router.svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { box } from "$lib/utils/box.svelte.js";
  import { getStatelessNavigator, htmlEscape, serializeErrors } from "./index.js";
  import { useDataRoutes } from "../../components/use-routes.svelte.js";

  export interface StaticRouterProviderProps {
    context: StaticHandlerContext;
    router: DataRouter;
    hydrate?: boolean;
    nonce?: string;
  }
</script>

<script lang="ts">
  let { context, router, hydrate = true, nonce }: StaticRouterProviderProps = $props();

  invariant(router && context, "You must provide `router` and `context` to <StaticRouterProvider>");

  let dataRouterContext = $derived({
    router,
    navigator: getStatelessNavigator(),
    static: true,
    staticContext: context,
    basename: context.basename || "/",
  });

  let fetchersContext = new SvelteMap<any, any>();
  let hydrateScript = "";

  if (hydrate !== false) {
    let data = {
      loaderData: context.loaderData,
      actionData: context.actionData,
      errors: serializeErrors(context.errors),
    };
    // Use JSON.parse here instead of embedding a raw JS object here to speed
    // up parsing on the client.  Dual-stringify is needed to ensure all quotes
    // are properly escaped in the resulting string.  See:
    //   https://v8.dev/blog/cost-of-javascript-2019#json
    let json = htmlEscape(JSON.stringify(JSON.stringify(data)));
    hydrateScript = `window.__staticRouterHydrationData = JSON.parse(${json});`;
  }

  const state = $derived(dataRouterContext.router.state);

  DataRouterContext.set(box.with(() => dataRouterContext));
  DataRouterStateContext.set(box.with(() => state));
  FetchersContext.set(fetchersContext);
  ViewTransitionContext.set(box.with(() => ({ isTransitioning: false })));

  const renderedRoutes = useDataRoutes(undefined, router.routes, router.future, () => state);
</script>

<Router
  basename={dataRouterContext.basename}
  location={state.location}
  navigationType={state.historyAction}
  navigator={dataRouterContext.navigator}
  static={dataRouterContext.static}
>
  {@render renderedRoutes()}
</Router>

<!-- TODO: (haniel) need to fix this -->
<!-- <svelte:head>
  {#if hydrateScript}
    <script {nonce}>
{@html hydrateScript}
    </script>
  {/if}
</svelte:head> -->
