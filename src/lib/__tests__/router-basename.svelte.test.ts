import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";

// svelte:defs
import { MemoryRouter, Routes, Route } from "svelte-router";
// sd

describe("<Router>", () => {
  let consoleWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {}); // silence & track
  });

  afterEach(() => {
    consoleWarn.mockRestore(); // restore native impl
  });

  it("renders null and issues a warning when the URL does not match the basename", () => {
    const screen = render(
      html`
      <MemoryRouter basename="/app" initialEntries={["/home"]}>
        <Routes>
          <Route path="/home">
            {#snippet element()}
              <h1>App</h1>
            {/snippet}
          </Route>
        </Routes>
      </MemoryRouter>`
    );

    expect(screen.container.firstElementChild).toBeNull();
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining("<Router> won't render anything")
    );
  });

  it("renders the first route that matches the URL", () => {
    const screen = render(
      html`
      <MemoryRouter basename="/home" initialEntries={["/home"]}>
        <Routes>
          <Route path="/">
            {#snippet element()}
              <h1>Home</h1>
            {/snippet}
          </Route>
        </Routes>
      </MemoryRouter>`
    );

    expect(screen.container.firstElementChild).toMatchInlineSnapshot(`
      <h1>
        Home
      </h1>
    `);
  });

  it("does not render a 2nd route that also matches the URL", () => {
    const screen = render(
      html`
      <MemoryRouter basename="/app" initialEntries={["/app/home"]}>
        <Routes>
          <Route path="home">
            {#snippet element()}
              <h1>Home</h1>
            {/snippet}
          </Route>
          <Route path="home">
            {#snippet element()}
              <h1>Something else</h1>
            {/snippet}
          </Route>
        </Routes>
      </MemoryRouter>`
    );

    expect(screen.container.firstElementChild).toMatchInlineSnapshot(`
      <h1>
        Home
      </h1>
    `);
  });

  it("matches regardless of basename casing", () => {
    const screen = render(
      html`
      <MemoryRouter basename="/HoME" initialEntries={["/home"]}>
        <Routes>
          <Route path="/">
            {#snippet element()}
              <h1>Home</h1>
            {/snippet}
          </Route>
        </Routes>
      </MemoryRouter>`
    );

    expect(screen.container.firstElementChild).toMatchInlineSnapshot(`
      <h1>
        Home
      </h1>
    `);
  });

  it("matches regardless of URL casing", () => {
    const screen = render(
      html`
      <MemoryRouter basename="/home" initialEntries={["/hOmE"]}>
        <Routes>
          <Route path="/">
            {#snippet element()}
              <h1>Home</h1>
            {/snippet}
          </Route>
        </Routes>
      </MemoryRouter>`
    );

    expect(screen.container.firstElementChild).toMatchInlineSnapshot(`
      <h1>
        Home
      </h1>
    `);
  });
});
