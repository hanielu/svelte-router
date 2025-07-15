<script lang="ts">
  import { useNavigate, useLocation } from "$lib/index.js";
  import { fly } from "svelte/transition";

  let navigate = useNavigate();
  let location = $derived(useLocation());

  $effect(() => {
    console.log("location", location.pathname);
    return () => {
      console.log("unmounting home");
    };
  });
</script>

<!-- 
  you're supposed to use the transition on the root element(s) of the page
  this is so that when the page changes, the transition is applied to the root
-->
<div in:fly>
  <h1>Home</h1>
  <p>This is the home page</p>
  <p>Insane stuff</p>
</div>

<button onclick={() => navigate("/about")}>About</button>
