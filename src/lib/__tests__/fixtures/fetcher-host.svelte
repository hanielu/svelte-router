<script lang="ts">
  import { getContext } from "svelte";
  import {
    useFetchers,
    Outlet,
    type useFetchers as UseFetchers,
  } from "svelte-router";
  import FetcherInstance from "./fetcher-instance.svelte";
  const options = getContext<{
    secondary?: boolean;
    captureActive(active: ReturnType<typeof UseFetchers>): void;
  }>("fetcher-fixture");
  const active = useFetchers();
  let first = $state(true);
  let second = $state(options.secondary ?? false);
  options.captureActive(active);
</script>

<p data-testid="active">
  {JSON.stringify(
    active.current.map(fetcher => ({
      key: fetcher.key,
      state: fetcher.state,
      data: fetcher.data,
    }))
  )}
</p>
<button onclick={() => (first = !first)}>Toggle first</button>
<button onclick={() => (second = !second)}>Toggle second</button>
{#if first}<FetcherInstance name="first" />{/if}
{#if second}<FetcherInstance name="second" />{/if}
<Outlet />
