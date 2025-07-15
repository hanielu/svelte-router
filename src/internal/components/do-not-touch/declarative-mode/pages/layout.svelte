<script lang="ts">
  import { Outlet, useLocation } from "$lib/index.js";

  const location = $derived(useLocation());

  console.log("render layout");

  $effect(() => {
    console.log("location", location);
  });

  $effect(() => {
    return () => {
      console.log("unmounting layout");
    };
  });
</script>

<Outlet />
<h1>Layout</h1>
<p>True CSR layout</p>
