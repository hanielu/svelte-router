<script lang="ts">
  import { useNavigate, useLocation } from "$lib/index.js";
  import { fly } from "svelte/transition";
  import User from "~icons/lucide/user";
  import ArrowLeft from "~icons/lucide/arrow-left";
  import Settings from "~icons/lucide/settings";
  import { Button } from "$ui/button/index.js";

  let navigate = useNavigate();
  let location = $derived(useLocation());

  // Simulate user data
  const userData = {
    name: "Jane Doe",
    email: "jane@example.com",
    role: "Developer",
    joinDate: "2023-01-15",
  };
</script>

<div in:fly={{ y: 20, duration: 300 }} class="space-y-6">
  <div class="flex items-center gap-3">
    <User class="w-6 h-6 text-green-500" />
    <h1 class="text-2xl font-bold">Profile</h1>
  </div>

  <div class="bg-muted/50 rounded-lg p-4 space-y-3">
    <p class="text-sm text-muted-foreground">Current location:</p>
    <code class="block bg-background rounded px-3 py-2 text-sm font-mono">
      {location.pathname}
    </code>
  </div>

  <div class="bg-card border border-border rounded-lg p-6 space-y-4">
    <h2 class="text-lg font-semibold">User Information</h2>

    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span class="font-medium text-muted-foreground">Name:</span>
        <p>{userData.name}</p>
      </div>
      <div>
        <span class="font-medium text-muted-foreground">Email:</span>
        <p>{userData.email}</p>
      </div>
      <div>
        <span class="font-medium text-muted-foreground">Role:</span>
        <p>{userData.role}</p>
      </div>
      <div>
        <span class="font-medium text-muted-foreground">Join Date:</span>
        <p>{userData.joinDate}</p>
      </div>
    </div>
  </div>

  <div class="flex gap-3">
    <Button onclick={() => navigate("/")} variant="outline" class="flex items-center gap-2">
      <ArrowLeft class="w-4 h-4" />
      Back to Home
    </Button>

    <Button onclick={() => navigate("/settings")} class="flex items-center gap-2">
      <Settings class="w-4 h-4" />
      Settings
    </Button>
  </div>

  <div class="text-xs text-muted-foreground">
    This page demonstrates declarative routing with static data.
  </div>
</div>
