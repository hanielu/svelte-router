import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";

// svelte:defs
import {
  createMemoryRouter,
  RouterProvider,
  useBlocker,
  useNavigate,
} from "svelte-router";
// sd

describe("useBlocker", () => {
  it("blocks, resets, and proceeds through in-app navigation", async () => {
    const FormPage = html`<script>
        let dirty = $state(true);
        const navigate = useNavigate();
        const blocker = useBlocker(() => dirty);
      </script>

      <h1>Form</h1>
      <p>state:{blocker.state}</p>
      <button onclick={() => navigate("/next")}>Leave</button>
      {#if blocker.state === "blocked"}
        <button onclick={() => blocker.reset?.()}>Stay</button>
        <button onclick={() => blocker.proceed?.()}>Proceed</button>
      {/if}`;

    const router = createMemoryRouter([
      { path: "/", Component: FormPage },
      { path: "/next", Component: html`<h1>Next</h1>` },
    ]);
    const screen = render(
      html`<script>
          let { router } = $props();
        </script>
        <RouterProvider {router} />`,
      { router }
    );

    await screen.getByRole("button", { name: "Leave" }).click();
    await expect.element(screen.getByText("state:blocked")).toBeVisible();
    await expect.element(screen.getByText("Form")).toBeVisible();

    await screen.getByRole("button", { name: "Stay" }).click();
    await expect.element(screen.getByText("state:unblocked")).toBeVisible();

    await screen.getByRole("button", { name: "Leave" }).click();
    await screen.getByRole("button", { name: "Proceed" }).click();
    await expect.element(screen.getByText("Next")).toBeVisible();
  });
});
