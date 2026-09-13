// svelte:defs
import { MemoryRouter, Routes, Route } from "svelte-router";
// sd

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";

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

  it("renders null and issues a warning when no routes match the URL", async () => {
    const renderer = await render(
      html`<MemoryRouter>
        <Routes />
      </MemoryRouter>`
    );

    expect(renderer.container.firstElementChild).toBeNull();
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith(expect.stringContaining("No routes matched location"));
  });

  it("renders the first route that matches the URL", async () => {
    let screen = await render(html`
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

  it("does not render a 2nd route that also matches the URL", async () => {
    let screen = await render(html`
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

  it("renders with non-element children", async () => {
    let screen = await render(html`
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

  it("registers grouped route definitions through a snippet (Fragment adaptation)", async () => {
    const screen = await render(html`
      {#snippet definitions()}
        <Route path="/">{#snippet element()}<h1>Home</h1>{/snippet}</Route>
        <Route path="about">{#snippet element()}<h1>About</h1>{/snippet}</Route>
      {/snippet}
      <MemoryRouter><Routes>{@render definitions()}</Routes></MemoryRouter>`);
    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    await expect.element(screen.getByRole("heading", { name: "About" })).not.toBeInTheDocument();
  });

  it("allows a Svelte component to register routes (intentional CustomRoute difference)", async () => {
    const CustomRoute = html`<Route path="/">{#snippet element()}<h1>Home</h1>{/snippet}</Route>`;
    const screen = await render(scope(CustomRoute).html`<MemoryRouter><Routes><CustomRoute /></Routes></MemoryRouter>`);
    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("does not mistake ordinary registration markup for a route (intentional children difference)", async () => {
    const screen = await render(html`<MemoryRouter><Routes>
      <div>Registration markup</div>
      <Route path="/">{#snippet element()}<h1>Home</h1>{/snippet}</Route>
    </Routes></MemoryRouter>`);
    expect(screen.getByText("Registration markup")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
