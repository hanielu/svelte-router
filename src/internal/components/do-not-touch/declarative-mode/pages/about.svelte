<script lang="ts">
  import { useNavigate } from "$lib/index.js";

  const navigate = useNavigate();
  console.log("log location about");
</script>

<h1>About</h1>
<p>This is the about page</p>
<button onclick={() => navigate("/doom")}>Go to doom</button>
