<script lang="ts">
  // import "@unocss/reset/tailwind.css";
  import "uno.css";
  import "../app.css";

  import { ModeWatcher } from "mode-watcher";
  import DarkModeToggle from "$components/dark-mode-toggle.svelte";
  import Hero from "$components/hero.svelte";
  import Showcase from "$components/showcase.svelte";

  let { data } = $props();
</script>

<div class="min-h-screen bg-background">
  <div class="fixed top-4 right-4 z-50">
    <DarkModeToggle />
  </div>

  <Hero />

  <Showcase codeExamples={data.codeExamples} />
</div>

<ModeWatcher />
