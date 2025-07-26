// svelte:defs
import { MemoryRouter, Routes, Route } from "svelte-router";
// sd

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";

describe("<Routes>", () => {
  let consoleWarn: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });

  it("renders null and issues a warning when no routes match the URL", () => {
    const renderer = render(
      html`<MemoryRouter>
        <Routes />
      </MemoryRouter>`
    );

    expect(renderer.container.firstElementChild).toBeNull();
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining("No routes matched location"));
  });

  it("renders the first route that matches the URL", () => {
    let screen = render(html`
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/">
							{#snippet element()}
								<h1>Home</h1>
							{/snippet}
						</Route>
          </Routes>
        </MemoryRouter>`);

    expect(screen.container.firstElementChild).toMatchInlineSnapshot(`
      <h1>
        Home
      </h1>
    `);
  });

  it("does not render a 2nd route that also matches the URL", () => {
    let screen = render(html`
        <MemoryRouter initialEntries={["/home"]}>
          <Routes>
            <Route path="home">
							{#snippet element()}
								<h1>Home</h1>
							{/snippet}
						</Route>
            <Route path="home">
							{#snippet element()}
								<h1>Dashboard</h1>
							{/snippet}
						</Route>
          </Routes>
        </MemoryRouter>`);

    expect(screen.container.firstElementChild).toMatchInlineSnapshot(`
      <h1>
        Home
      </h1>
    `);
  });

  it("renders with non-element children", () => {
    let screen = render(html`
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/">
							{#snippet element()}
								<h1>Home</h1>
							{/snippet}
						</Route>
            {false}
            {undefined}
          </Routes>
        </MemoryRouter>`);

    expect(screen.container.firstElementChild).toMatchInlineSnapshot(`
      <h1>
        Home
      </h1>
    `);
  });

  // not applicable to svelte, there's no fragment component
  // it("renders with React.Fragment children", () => {});

  // not applicable to svelte because there's no way for
  // a parent component to know what Component is being passed as a child
  // it("throws if some <CustomRoute> is passed as a child of <Routes>", () => {});
  // it("throws if a regular element (ex: <div>) is passed as a child of <Routes>", () => {});
});
