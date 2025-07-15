<script lang="ts" module>
  import type { Snippet } from "svelte";

  /**
   * @category Types
   */
  export interface MemoryRouterProps {
    basename?: string;
    children?: Snippet;
    initialEntries?: InitialEntry[];
    initialIndex?: number;
  }
</script>

<script lang="ts">
  import { createMemoryHistory, type InitialEntry } from "../../router/history.js";
  import Router from "../../components/router.svelte";

  let { basename, children, initialEntries, initialIndex }: MemoryRouterProps = $props();

  let history = createMemoryHistory({ initialEntries, initialIndex, v5Compat: true });

  let _state = $state.raw({
    action: history.action,
    location: history.location,
  });

  $effect.pre(() => history.listen(v => (_state = v)));
</script>

<!-- 
  @component
  A `<Router>` that stores all entries in memory.
  
  @category Component Routers
-->

<Router
  {basename}
  {children}
  location={_state.location}
  navigationType={_state.action}
  navigator={history}
/>
