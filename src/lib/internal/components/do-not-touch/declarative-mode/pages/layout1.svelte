<script lang="ts">
  import { Outlet, useLocation } from "$lib/index.js";

  $effect(() => {
    return () => {
      console.log("unmounting nested layout1");
    };
  });
</script>

<Outlet />
<h1>Nested Layout 1</h1>
