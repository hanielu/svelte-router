<script lang="ts" module>
  import type { Snippet } from "svelte";

  /**
   * @category Types
   */
  export interface StaticRouterProps {
    basename?: string;
    children?: Snippet;
    location: Partial<Location> | string;
  }
</script>

<script lang="ts">
  import Router from "../../components/router.svelte";
  import { parsePath, Action as NavigationType, type Location } from "../../router/history.js";
  import { getStatelessNavigator } from "./index.js";

  let { basename, children, location: locationProp = "/" }: StaticRouterProps = $props();

  if (typeof locationProp === "string") {
    locationProp = parsePath(locationProp);
  }

  let action = NavigationType.Pop;
  let location: Location = {
    pathname: locationProp.pathname || "/",
    search: locationProp.search || "",
    hash: locationProp.hash || "",
    state: locationProp.state != null ? locationProp.state : null,
    key: locationProp.key || "default",
  };

  let staticNavigator = getStatelessNavigator();
</script>

<!-- 
  @component
  A `<Router>` that may not navigate to any other location. This is useful
  on the server where there is no stateful UI.
  
  @category Component Routers
-->

<Router
  {basename}
  {children}
  {location}
  navigationType={action}
  navigator={staticNavigator}
  static={true}
/>
