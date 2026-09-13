import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";

// svelte:defs
import { MemoryRouter, useLocation } from "svelte-router";
// sd

describe("<Router>", () => {
  it("throws if another <Router> is already in context", () => {
    expect(() => {
      render(html`<MemoryRouter><MemoryRouter /></MemoryRouter>`);
    }).toThrow(/cannot render a <Router> inside another <Router>/);
  });

  it("memoizes the current location across consumer replacement in the same router", async () => {
    const capture = vi.fn();
    const Consumer = html`<script>
      let { capture } = $props();
      const location = useLocation();
      capture(location.current);
    </script>`;
    const screen = render(
      scope(Consumer).html`<script>
      let { capture } = $props();
      let generation = $state(0);
    </script>
    <button onclick={() => generation++}>Replace consumer</button>
    <MemoryRouter>
      {#key generation}<Consumer {capture} />{/key}
    </MemoryRouter>`,
      { capture },
    );
    expect(capture).toHaveBeenCalledOnce();
    await screen.getByRole("button", { name: "Replace consumer" }).click();
    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture.mock.calls[0][0]).toBe(capture.mock.calls[1][0]);
  });
});
