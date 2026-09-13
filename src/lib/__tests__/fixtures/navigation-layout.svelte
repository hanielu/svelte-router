<script lang="ts">
  import { Outlet, useLocation } from "svelte-router";
  const location = useLocation();
</script>

<h1>Home</h1>
<p data-testid="destination-location">{location.current.pathname}{location.current.search}{location.current.hash}</p>
<Outlet />
