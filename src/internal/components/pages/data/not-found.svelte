<script lang="ts">
  import { useNavigate } from "$lib/index.js";
  import { Button } from "$ui/button/index.js";
  import ArrowLeft from "~icons/lucide/arrow-left";

  const navigate = useNavigate();
</script>

<div class="text-center py-12 space-y-4">
  <h2 class="text-2xl font-bold mb-2">404 - Page Not Found</h2>
  <p class="text-muted-foreground mb-6">The page you're looking for doesn't exist in data mode.</p>

  <Button onclick={() => navigate("/")} class="flex items-center gap-2 mx-auto">
    <ArrowLeft class="w-4 h-4" />
    Back to Home
  </Button>
</div>
