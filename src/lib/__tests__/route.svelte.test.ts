import { describe, it, expect } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";
// svelte:defs
import { MemoryRouter, Routes, Route } from "svelte-router";
// sd

describe("A <Route>", () => {
  it("renders its `element` prop", () => {
    const screen = render(
      html`
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route path="home">
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

  it("renders its `Component` prop", () => {
    const HomeComponent = html`<h1>Home</h1>`;

    const screen = render(
      html`
      <script>
        let {HomeComponent} = $props();
      </script>
      <MemoryRouter initialEntries={["/home"]}>
        <Routes>
          <Route path="home" Component={HomeComponent} />
        </Routes>
      </MemoryRouter>`,
      { HomeComponent }
    );

    expect(screen.container.firstElementChild).toMatchInlineSnapshot(`
      <h1>
        Home
      </h1>
    `);
  });

  it("renders its child routes when no `element` prop is given", () => {
    const screen = render(
      html`
      <MemoryRouter initialEntries={["/app/home"]}>
        <Routes>
          <Route path="app">
            <Route path="home">
              {#snippet element()}
                <h1>Home</h1>
              {/snippet}
            </Route>
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
