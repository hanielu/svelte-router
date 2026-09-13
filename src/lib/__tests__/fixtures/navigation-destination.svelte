<script lang="ts">
  import { useLocation } from "svelte-router";
  const location = useLocation();
</script>

<h1>Destination</h1>
<p data-testid="destination-location">{location.current.pathname}{location.current.search}{location.current.hash}</p>
