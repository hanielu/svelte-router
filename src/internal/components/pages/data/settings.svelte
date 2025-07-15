<script lang="ts" module>
  export const loader = async () => {
    // Simulate API call to fetch settings
    await new Promise(resolve => setTimeout(resolve, 400));

    // Simulate fetching user settings from API
    return {
      userSettings: {
        theme: "auto",
        notifications: {
          email: true,
          push: false,
          sms: false,
        },
        privacy: {
          profileVisible: true,
          showActivity: false,
          allowMessages: true,
        },
        preferences: {
          language: "en",
          timezone: "UTC-5",
          dateFormat: "MM/DD/YYYY",
        },
      },
      metadata: {
        lastModified: new Date(Date.now() - Math.random() * 604800000).toISOString(),
        version: "2.1.0",
      },
    };
  };
</script>

<script lang="ts">
  import { useLoaderData, useNavigate, useLocation } from "$lib/index.js";
  import { fly } from "svelte/transition";
  import Settings from "~icons/lucide/settings";
  import ArrowLeft from "~icons/lucide/arrow-left";
  import User from "~icons/lucide/user";
  import Shield from "~icons/lucide/shield";
  import Globe from "~icons/lucide/globe";
  import { Button } from "$ui/button/index.js";

  const data = $derived(useLoaderData<typeof loader>());

  const navigate = useNavigate();
  const location = $derived(useLocation());

  // Local state for settings (would normally sync with server)
  let settings = $derived(data.userSettings);
</script>

{#if data?.userSettings}
  <div in:fly={{ y: 20, duration: 300 }} class="space-y-6">
    <div class="flex items-center gap-3">
      <Settings class="w-6 h-6 text-purple-500" />
      <h1 class="text-2xl font-bold">Settings (Data Mode)</h1>
    </div>

    <div class="bg-muted/50 rounded-lg p-4 space-y-3">
      <p class="text-sm text-muted-foreground">Current location:</p>
      <code class="block bg-background rounded px-3 py-2 text-sm font-mono">
        {location.pathname}
      </code>
    </div>

    <!-- Notifications Section -->
    <div class="bg-card border border-border rounded-lg p-6 space-y-4">
      <h2 class="text-lg font-semibold flex items-center gap-2">
        <Settings class="w-5 h-5" />
        Notifications
      </h2>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium">Email Notifications</h3>
            <p class="text-sm text-muted-foreground">Receive updates via email</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              bind:checked={settings.notifications.email}
              class="sr-only peer"
            />
            <div
              class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
            ></div>
          </label>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium">Push Notifications</h3>
            <p class="text-sm text-muted-foreground">Browser push notifications</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              bind:checked={settings.notifications.push}
              class="sr-only peer"
            />
            <div
              class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
            ></div>
          </label>
        </div>
      </div>
    </div>

    <!-- Privacy Section -->
    <div class="bg-card border border-border rounded-lg p-6 space-y-4">
      <h2 class="text-lg font-semibold flex items-center gap-2">
        <Shield class="w-5 h-5" />
        Privacy
      </h2>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium">Profile Visibility</h3>
            <p class="text-sm text-muted-foreground">Make profile visible to others</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              bind:checked={settings.privacy.profileVisible}
              class="sr-only peer"
            />
            <div
              class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
            ></div>
          </label>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium">Allow Messages</h3>
            <p class="text-sm text-muted-foreground">Receive messages from other users</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              bind:checked={settings.privacy.allowMessages}
              class="sr-only peer"
            />
            <div
              class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
            ></div>
          </label>
        </div>
      </div>
    </div>

    <!-- Preferences Section -->
    <div class="bg-card border border-border rounded-lg p-6 space-y-4">
      <h2 class="text-lg font-semibold flex items-center gap-2">
        <Globe class="w-5 h-5" />
        Preferences
      </h2>

      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="font-medium text-muted-foreground">Theme:</span>
          <p class="capitalize">{settings.theme}</p>
        </div>
        <div>
          <span class="font-medium text-muted-foreground">Language:</span>
          <p class="uppercase">{settings.preferences.language}</p>
        </div>
        <div>
          <span class="font-medium text-muted-foreground">Timezone:</span>
          <p>{settings.preferences.timezone}</p>
        </div>
        <div>
          <span class="font-medium text-muted-foreground">Date Format:</span>
          <p>{settings.preferences.dateFormat}</p>
        </div>
      </div>
    </div>

    <div class="bg-muted/50 rounded-lg p-4 text-sm">
      <p class="text-muted-foreground">
        Last modified: {new Date(data?.metadata?.lastModified).toLocaleString()}
        • Version: {data?.metadata?.version}
      </p>
    </div>

    <div class="flex gap-3">
      <Button onclick={() => navigate("/")} variant="outline" class="flex items-center gap-2">
        <ArrowLeft class="w-4 h-4" />
        Back to Home
      </Button>

      <Button
        onclick={() => navigate("/profile")}
        variant="outline"
        class="flex items-center gap-2"
      >
        <User class="w-4 h-4" />
        Profile
      </Button>
    </div>

    <div class="text-xs text-muted-foreground">
      This page demonstrates data loading with complex nested settings.
    </div>
  </div>
{:else}
  <div class="text-center py-8">
    <p class="text-muted-foreground">Loading...</p>
  </div>
{/if}
