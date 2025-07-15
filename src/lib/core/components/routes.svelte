<script lang="ts" module>
  import type { Location } from "../router/history.js";
  import type { RouteObject } from "../context.js";
  import type { Snippet } from "svelte";
  import { Context } from "$lib/utils/index.js";
  import { useRoutes } from "./use-routes.svelte.js";

  export interface RoutesProps {
    /**
     * Nested {@link Route} elements
     */
    children?: Snippet;

    /**
     * The location to match against. Defaults to the current location.
     */
    location?: Partial<Location> | string;
  }

  export const AddRouteContext = new Context<
    [addRoute: (r: RouteObject) => void, getNextChildIndex: () => number, treePath: number[]] | null
  >("AddRouteContext", null!);
</script>

<script lang="ts">
  let { children, location }: RoutesProps = $props();

  let routes: RouteObject[] = [];

  // Utility to generate sequential indices for direct children
  let rootChildIndex = 0;

  // registrar exposed to direct children
  AddRouteContext.set([r => routes.push(r), () => rootChildIndex++, []]);

  const renderedRoutes = useRoutes(children, routes, location);
</script>

{@render renderedRoutes()}
