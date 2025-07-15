<script lang="ts">
  import { Button } from "$ui/button/index.js";
  import { toggleMode } from "mode-watcher";
  import Sun from "~icons/lucide/sun";
  import Moon from "~icons/lucide/moon";
</script>

<Button
  variant="outline"
  size="icon"
  onclick={toggleMode}
  class="bg-card border-border hover:bg-muted rounded-full w-10 h-10 transition-colors"
>
  <Sun class="scale-100 transition-all dark:scale-0 text-foreground" />
  <Moon class="absolute scale-0 transition-all dark:scale-100 text-foreground" />
  <span class="sr-only">Toggle theme</span>
</Button>
