<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    DataRouterContext,
    RouteContext,
    type RouteContextObject,
    type RouteMatch,
    type RouteObject,
  } from "../context.js";

  interface RenderedRouteProps {
    routeContext: RouteContextObject;
    match: RouteMatch<string, RouteObject>;
    children: Snippet | null;
  }

  let { routeContext, match, children }: RenderedRouteProps = $props();

  // TODO: (haniel) come back to this
  const dataRouterContext = DataRouterContext.current;

  // Track how deep we got in our render pass to emulate SSR componentDidCatch
  // in a DataStaticRouter
  if (
    dataRouterContext &&
    dataRouterContext.static &&
    dataRouterContext.staticContext &&
    (match.route.errorElement || match.route.ErrorBoundary)
  ) {
    dataRouterContext.staticContext._deepestRenderedBoundaryId = match.route.id;
  }

  RouteContext.setWith(() => routeContext);
</script>

{@render children?.()}
