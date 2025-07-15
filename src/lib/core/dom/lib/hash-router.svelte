<script lang="ts" module>
  import type { Snippet } from "svelte";

  /**
   * @category Types
   */
  export interface HashRouterProps {
    basename?: string;
    children?: Snippet;
    window?: Window;
  }
</script>

<script lang="ts">
  import Router from "../../components/router.svelte";
  import { createHashHistory } from "../../router/history.js";

  let { basename, children, window }: HashRouterProps = $props();

  const history = createHashHistory({ window, v5Compat: true });

  let _state = $state.raw({
    action: history.action,
    location: history.location,
  });

  $effect.pre(() => history.listen(v => (_state = v)));
</script>

<!-- 
  @component
  A `<Router>` for use in web browsers. Stores the location in the hash
  portion of the URL so it is not sent to the server.
  
  @category Component Routers
-->

<Router
  {basename}
  {children}
  location={_state.location}
  navigationType={_state.action}
  navigator={history}
/>
