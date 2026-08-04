import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";

// svelte:defs
import {
  createMemoryRouter,
  MemoryRouter,
  NavLink,
  Outlet,
  RouterProvider,
} from "svelte-router";
// sd

describe("<NavLink>", () => {
  it("marks active links and supplies aria-current", async () => {
    const screen = render(html`
      <MemoryRouter initialEntries={["/tasks/123"]}>
        <NavLink to="/tasks">Tasks</NavLink>
        <NavLink to="/tasks" end>Exact tasks</NavLink>
        <NavLink to="/">Home</NavLink>
      </MemoryRouter>
    `);

    await expect
      .element(screen.getByRole("link", { name: "Tasks", exact: true }))
      .toHaveClass("active");
    await expect
      .element(screen.getByRole("link", { name: "Tasks", exact: true }))
      .toHaveAttribute("aria-current", "page");
    await expect
      .element(screen.getByRole("link", { name: "Exact tasks" }))
      .not.toHaveClass("active");
    await expect.element(screen.getByRole("link", { name: "Home" })).not.toHaveClass("active");
  });

  it("supports case-sensitive matching", async () => {
    const screen = render(html`
      <MemoryRouter initialEntries={["/SpOnGe-bOB"]}>
        <NavLink to="/sponge-bob">Insensitive</NavLink>
        <NavLink to="/sponge-bob" caseSensitive>Sensitive</NavLink>
      </MemoryRouter>
    `);

    await expect
      .element(screen.getByRole("link", { name: "Insensitive", exact: true }))
      .toHaveClass("active");
    await expect
      .element(screen.getByRole("link", { name: "Sensitive", exact: true }))
      .not.toHaveClass("active");
  });

  it("passes active state to Svelte children snippets", async () => {
    const screen = render(html`
      <MemoryRouter initialEntries={["/tasks"]}>
        <NavLink to="/tasks" class={({ isActive }) => (isActive ? "selected" : "idle")}>
          {#snippet children({ isActive, isPending, isTransitioning })}
            <span>{isActive}:{isPending}:{isTransitioning}</span>
          {/snippet}
        </NavLink>
      </MemoryRouter>
    `);

    await expect.element(screen.getByRole("link")).toHaveClass("selected");
    await expect.element(screen.getByText("true:false:false")).toBeVisible();
  });

  it("tracks data-router pending state", async () => {
    let resolveSlowRoute!: () => void;
    const slowRoute = new Promise<void>(resolve => {
      resolveSlowRoute = resolve;
    });

    const Layout = html`
      <NavLink to="/slow">Slow route</NavLink>
      <Outlet />
    `;
    const router = createMemoryRouter([
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: html`<h1>Home</h1>` },
          {
            path: "slow",
            loader: () => slowRoute,
            Component: html`<h1>Slow</h1>`,
          },
        ],
      },
    ]);

    const screen = render(
      html`<script>
          let { router } = $props();
        </script>
        <RouterProvider {router} />`,
      { router }
    );

    await screen.getByRole("link", { name: "Slow route" }).click();
    await expect.element(screen.getByRole("link", { name: "Slow route" })).toHaveClass("pending");

    resolveSlowRoute();
    await expect.element(screen.getByText("Slow")).toBeVisible();
    await expect.element(screen.getByRole("link", { name: "Slow route" })).toHaveClass("active");
  });

  it("respects a router basename", async () => {
    const screen = render(html`
      <MemoryRouter basename="/admin" initialEntries={["/admin/collections/posts"]}>
        <NavLink to="/collections/posts">Posts</NavLink>
      </MemoryRouter>
    `);

    const link = screen.getByRole("link", { name: "Posts" });
    await expect.element(link).toHaveAttribute("href", "/admin/collections/posts");
    await expect.element(link).toHaveClass("active");
  });
});
