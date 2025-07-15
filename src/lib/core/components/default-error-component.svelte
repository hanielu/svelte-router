<script lang="ts">
  import { ENABLE_DEV_WARNINGS } from "../context.js";
  import { useRouteError } from "../hooks.svelte.js";
  import { isRouteErrorResponse } from "../router/utils.js";

  let error = useRouteError();
  let message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : JSON.stringify(error);
  let stack = error instanceof Error ? error.stack : null;
  let lightgrey = "rgba(200,200,200, 0.5)";
  let preStyles = "padding: 0.5rem; background-color: " + lightgrey;
  let codeStyles = "padding: 2px 4px; background-color: " + lightgrey;

  let devInfo = $state<string | null>(null);

  $effect(() => {
    if (ENABLE_DEV_WARNINGS) {
      console.error("Error handled by @hvniel/svelte-router default ErrorBoundary:", error);

      devInfo = `
      <p>💿 Hey developer 👋</p>
      <p>
			You can provide a way better UX than this when your app throws errors by providing your own
			<code style="${codeStyles}">ErrorBoundary</code> or
			<code style="${codeStyles}">errorElement</code> prop on your route.
      </p>
			`;
    }
  });
</script>

<h2>Unexpected Application Error!</h2>
<h3 style="font-style: italic">{message}</h3>
{#if stack}
  <pre style={preStyles}>{stack}</pre>
{/if}
{@html devInfo}
