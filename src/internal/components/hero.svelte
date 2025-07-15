<script lang="ts">
  import { Button } from "$ui/button/index.js";
  import Github from "~icons/lucide/github";

  const githubUrl = "https://github.com/HanielU/svelte-router";
  const docsUrl = "https://svelte-router.hvniel.com";
</script>

<section class="relative bg-background py-24 sm:py-32">
  <div class="mx-auto max-w-7xl px-6 lg:px-8">
    <div class="mx-auto max-w-4xl">
      <div class="flex items-center justify-between mb-12">
        <div class="flex items-center space-x-4">
          <div
            class="w-10 h-10 bg-linear-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center"
          >
            <span class="text-white font-bold text-lg">S</span>
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
          href={githubUrl}
          target="_blank"
          class="bg-foreground hover:bg-foreground/90 text-background rounded-full px-4 py-2 text-sm font-medium"
        >
          <Github class="w-4 h-4" />
          View Code
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
