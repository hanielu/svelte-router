<script lang="ts">
  import { setContext } from "svelte";
  import { RouterProvider, type createMemoryRouter } from "svelte-router";
  let {
    router,
    options,
  }: {
    router: ReturnType<typeof createMemoryRouter>;
    options: Record<string, unknown>;
  } = $props();
  // The fixture's callbacks/options are mount-owned. Router updates come from its provider.
  // svelte-ignore state_referenced_locally
  setContext("fetcher-fixture", options);
</script>

<RouterProvider {router} />
