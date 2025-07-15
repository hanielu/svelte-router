<script lang="ts">
  import { Button } from "$ui/button/index.js";
  // import Github from "~icons/lucide/github";
  import LogosSvelteIcon from "~icons/logos/svelte-icon";
  // import CalIcon from "~icons/lucide/calendar-days";

  const githubUrl = "https://github.com/HanielU/svelte-router";
  const docsUrl = "https://reactrouter.com/home";
</script>

<section class="relative bg-background py-24 sm:py-32">
  <div class="mx-auto max-w-7xl px-6 lg:px-8">
    <div class="mx-auto max-w-4xl">
      <div class="flex items-center justify-between mb-12">
        <div class="flex items-center space-x-4">
          <div class="shrink-0 text-4xl">
            <LogosSvelteIcon />
          </div>

          <div>
            <h1 class="text-2xl font-bold text-foreground">Svelte Router</h1>
            <div class="flex items-center space-x-4 mt-1">
              <a
                href={githubUrl}
                class="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Github
              </a>
              <a
                href={docsUrl}
                target="_blank"
                class="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>
        <Button
          href="https://cal.com/hanielu"
          target="_blank"
          class="bg-foreground hover:bg-foreground/90 text-background rounded-full px-4 py-2 text-sm font-medium"
        >
          <!-- prettier-ignore -->
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" id="svg1721545991_663">
            <path d="M6.66667 5.83333V2.5M13.3333 5.83333V2.5M5.83333 9.16667H14.1667M4.16667 17.5H15.8333C16.2754 17.5 16.6993 17.3244 17.0118 17.0118C17.3244 16.6993 17.5 16.2754 17.5 15.8333V5.83333C17.5 5.39131 17.3244 4.96738 17.0118 4.65482C16.6993 4.34226 16.2754 4.16667 15.8333 4.16667H4.16667C3.72464 4.16667 3.30072 4.34226 2.98816 4.65482C2.67559 4.96738 2.5 5.39131 2.5 5.83333V15.8333C2.5 16.2754 2.67559 16.6993 2.98816 17.0118C3.30072 17.3244 3.72464 17.5 4.16667 17.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Hire me
        </Button>
      </div>

      <div class="space-y-6">
        <h2 class="text-4xl sm:text-5xl font-bold text-foreground leading-tight">
          React Router Patterns
        </h2>
        <p class="text-xl text-muted-foreground leading-relaxed max-w-3xl">
          The React Router experience, reimagined for Svelte with declarative routing and data
          loading patterns.
        </p>
      </div>
    </div>
  </div>
</section>
