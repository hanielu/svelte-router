<script lang="ts" module>
  import type { LoaderFunction } from "$lib/index.js";

  export const loader = async ({ params }: Parameters<LoaderFunction>[0]) => {
    // Simulate API call to fetch user data
    await new Promise(resolve => setTimeout(resolve, 500));

    // Use JSONPlaceholder API for real data fetching
    const userId = params.id || "1";
    try {
      const response = await fetch(`https://jsonplaceholder.typicode.com/users/${userId}`);
      const user = await response.json();

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          website: user.website,
          company: user.company?.name || "Unknown Company",
          address: `${user.address?.city}, ${user.address?.zipcode}`,
          phone: user.phone,
        },
        preferences: {
          theme: "dark",
          notifications: true,
          language: "en",
        },
        activity: {
          lastLogin: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          projectsCount: Math.floor(Math.random() * 20) + 1,
          tasksCompleted: Math.floor(Math.random() * 100) + 10,
        },
      };
    } catch (error) {
      // Fallback data if API fails
      return {
        user: {
          id: "1",
          name: "Jane Doe",
          email: "jane@example.com",
          username: "janedoe",
          website: "https://jane.dev",
          company: "Tech Corp",
          address: "New York, 10001",
          phone: "+1-555-0123",
        },
        preferences: {
          theme: "dark",
          notifications: true,
          language: "en",
        },
        activity: {
          lastLogin: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          projectsCount: Math.floor(Math.random() * 20) + 1,
          tasksCompleted: Math.floor(Math.random() * 100) + 10,
        },
      };
    }
  };
</script>

<script lang="ts">
  import { useLoaderData, useNavigate, useLocation } from "$lib/index.js";
  import { fly } from "svelte/transition";
  import User from "~icons/lucide/user";
  import ArrowLeft from "~icons/lucide/arrow-left";
  import Settings from "~icons/lucide/settings";
  import Activity from "~icons/lucide/activity";
  import Globe from "~icons/lucide/globe";
  import Building from "~icons/lucide/building";
  import { Button } from "$ui/button/index.js";

  const data = $derived(useLoaderData<typeof loader>());

  const navigate = useNavigate();
  const location = $derived(useLocation());
</script>

<div in:fly={{ y: 20, duration: 300 }} class="space-y-6">
  <div class="flex items-center gap-3">
    <User class="w-6 h-6 text-green-500" />
    <h1 class="text-2xl font-bold">Profile (Data Mode)</h1>
  </div>

  <div class="bg-muted/50 rounded-lg p-4 space-y-3">
    <p class="text-sm text-muted-foreground">Current location:</p>
    <code class="block bg-background rounded px-3 py-2 text-sm font-mono">
      {location.pathname}
    </code>
  </div>

  <div class="bg-card border border-border rounded-lg p-6 space-y-4">
    <div class="flex items-center gap-4">
      <div
        class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg"
      >
        {data?.user.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")}
      </div>
      <div>
        <h2 class="text-xl font-semibold">{data?.user.name}</h2>
        <p class="text-muted-foreground">@{data?.user.username}</p>
        <p class="text-sm text-muted-foreground">{data?.user.company}</p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span class="font-medium text-muted-foreground">Email:</span>
        <p>{data?.user.email}</p>
      </div>
      <div>
        <span class="font-medium text-muted-foreground">Phone:</span>
        <p>{data?.user.phone}</p>
      </div>
      <div>
        <span class="font-medium text-muted-foreground">Location:</span>
        <p>{data?.user.address}</p>
      </div>
      <div>
        <span class="font-medium text-muted-foreground">Website:</span>
        <p class="text-blue-600">{data?.user.website}</p>
      </div>
    </div>
  </div>

  <div class="bg-card border border-border rounded-lg p-6 space-y-4">
    <div class="flex items-center gap-2">
      <Activity class="w-5 h-5 text-blue-500" />
      <h3 class="text-lg font-semibold">Activity</h3>
    </div>

    <div class="grid grid-cols-3 gap-4 text-center">
      <div class="p-3 bg-muted/50 rounded-lg">
        <div class="text-2xl font-bold text-blue-600">{data?.activity.projectsCount}</div>
        <div class="text-sm text-muted-foreground">Projects</div>
      </div>
      <div class="p-3 bg-muted/50 rounded-lg">
        <div class="text-2xl font-bold text-green-600">{data?.activity.tasksCompleted}</div>
        <div class="text-sm text-muted-foreground">Tasks</div>
      </div>
      <div class="p-3 bg-muted/50 rounded-lg">
        <div class="text-2xl font-bold text-purple-600">
          {data?.preferences.notifications ? "On" : "Off"}
        </div>
        <div class="text-sm text-muted-foreground">Notifications</div>
      </div>
    </div>

    <div class="text-sm text-muted-foreground">
      Last login: {new Date(data?.activity.lastLogin).toLocaleString()}
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
    This page demonstrates real data loading from JSONPlaceholder API with loaders.
  </div>
</div>
