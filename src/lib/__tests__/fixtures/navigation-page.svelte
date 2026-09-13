<script lang="ts">
  import { getContext } from "svelte";
  import { Navigate, Outlet, useLocation, useNavigate } from "svelte-router";
  import type { NavigationFixtureOptions } from "./navigation-cases.js";

  const options = getContext<NavigationFixtureOptions>("navigation-fixture");
  const navigate = useNavigate();
  const location = useLocation();
  options.capture?.(navigate, location);
</script>

{#if options.redirect}
  <Navigate to={options.to} relative={options.relative} replace={options.replace} state={options.state} />
{:else}
  <h2>Source</h2>
  <button onclick={() => navigate(options.to, { relative: options.relative, replace: options.replace, state: options.state })}>Navigate</button>
{/if}
<Outlet />
