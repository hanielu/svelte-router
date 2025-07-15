<script lang="ts" module>
  import type { Snippet } from "svelte";

  /**
   * @category Types
   */
  export interface BrowserRouterProps {
    basename?: string;
    children?: Snippet;
    window?: Window;
  }
</script>

<script lang="ts">
  import Router from "../../components/router.svelte";
  import { createBrowserHistory } from "../../router/history.js";

  let { basename, children, window }: BrowserRouterProps = $props();

  const history = createBrowserHistory({ window, v5Compat: true });

  let _state = $state.raw({
    action: history.action,
    location: history.location,
  });

  $effect.pre(() => history.listen(v => (_state = v)));
</script>

<!-- 
  @component
  A `<Router>` for use in web browsers. Provides the cleanest URLs
  
  @category Component Routers
-->

<Router
  {basename}
  {children}
  location={_state.location}
  navigationType={_state.action}
  navigator={history}
/>
