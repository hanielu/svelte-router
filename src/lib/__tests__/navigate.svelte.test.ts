import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";
import NavigationRouter from "./fixtures/navigation-router.svelte";
import { navigationCases } from "./fixtures/navigation-cases.js";

// svelte:defs
import {
  createMemoryRouter,
  MemoryRouter,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  Routes,
  useLocation,
} from "svelte-router";
// sd

describe("<Navigate>", () => {
  it("navigates after mount and forwards state", async () => {
    const Destination = html`<script>
        const location = useLocation();
      </script>
      <h1>Destination</h1>
      <p>{location.current.state.from}</p>`;

    const screen = await render(
      scope(Destination).html`
        <MemoryRouter initialEntries={["/start"]}>
          <Routes>
            <Route path="start">
              {#snippet element()}
                <Navigate to="/destination" replace state={{ from: "start" }} />
              {/snippet}
            </Route>
            <Route path="destination" element={Destination} />
          </Routes>
        </MemoryRouter>
      `,
    );

    await expect.element(screen.getByText("Destination")).toBeVisible();
    await expect.element(screen.getByText("start")).toBeVisible();
  });

  it("resolves relative destinations from the matched route", async () => {
    const Redirect = html`<Navigate to="edit" replace />`;
    const EditProject = html`<h1>Edit project</h1>`;
    const Layout = html`<Outlet />`;
    const router = createMemoryRouter(
      [
        {
          path: "projects/:project",
          Component: Layout,
          children: [
            { index: true, Component: Redirect },
            { path: "edit", Component: EditProject },
          ],
        },
      ],
      { initialEntries: ["/projects/42"] },
    );

    const screen = await render(
      html`<script>
          let { router } = $props();
        </script>
        <RouterProvider {router} />`,
      { router },
    );

    await expect.element(screen.getByText("Edit project")).toBeVisible();
    expect(router.state.location.pathname).toBe("/projects/42/edit");
  });
});

describe.each(["declarative", "data"] as const)("upstream Navigate: %s", mode => {
  it.each(navigationCases)("$name", async scenario => {
    const screen = await render(NavigationRouter, {
      mode, initial: scenario.initial, routes: scenario.routes,
      options: { ...scenario, redirect: true },
    });
    await expect.element(screen.getByRole("heading", { name: scenario.heading ?? "Destination", exact: true })).toBeVisible();
    await expect.poll(() => screen.getByTestId("destination-location").element().textContent).toBe(scenario.expected);
  });
});

describe("Navigate data-router effect lifetime", () => {
  it.each(["absolute", "relative-sync", "relative-async"])("does not loop: %s", async kind => {
    const pending = Promise.withResolvers<null>();
    const loader = vi.fn(() => kind === "relative-sync" ? null : pending.promise);
    const Redirect = html`<script>let { to } = $props();</script><Navigate {to} replace />`;
    const Destination = html`<h1>Page B</h1>`;
    // Scope the destination explicitly: inline fixtures do not capture JS closures.
    const capture = vi.fn();
    const ScopedApp = scope(Destination, Redirect).html`<script>
      let { loader, kind, capture } = $props();
      const router = createMemoryRouter([
        { path: "/a", children: [
          { index: true, element: redirect },
          { path: "b", loader, Component: Destination },
        ] },
      ], { initialEntries: ["/a"] });
      capture(router);
      $effect(() => () => router.dispose());
    </script>
    {#snippet redirect()}<Redirect to={kind === "absolute" ? "/a/b" : "b"} />{/snippet}
    <RouterProvider {router} />`;
    const screen = await render(ScopedApp, { loader, kind, capture });
    await expect.poll(() => loader.mock.calls.length).toBe(1);
    pending.resolve(null);
    await expect.element(screen.getByRole("heading", { name: "Page B" })).toBeVisible();
    const router = capture.mock.calls[0][0];
    expect(router.state.location.pathname).toBe("/a/b");
    expect(router.state.historyAction).toBe("REPLACE");
    expect(loader).toHaveBeenCalledOnce();
  });

  describe.each([false, true])("changing redirect state, async loader=%s", asynchronous => {
    it.each(["setup", "effect"])("forwards the latest %s state without chasing a relative URL", async timing => {
      const pending = Promise.withResolvers<null>();
      const loader = vi.fn(() => asynchronous ? pending.promise : null);
      const Redirect = html`<script>
        let { timing } = $props();
        let count = $state(timing === "setup" ? 1 : 0);
        $effect(() => { if (timing === "effect") count = 1; });
      </script>
      <Navigate to="b" replace state={{ count }} />`;
      const Destination = html`<script>
        const location = useLocation();
      </script>
      <h1>Page B</h1><p data-testid="redirect-state">{location.current.state.count}</p>`;
      const App = scope(Redirect, Destination).html`<script>
        let { timing, loader, capture } = $props();
        const router = createMemoryRouter([{ path: "/", children: [
          { index: true, element: redirect }, { path: "b", loader, Component: Destination },
        ] }]);
        capture(router);
        $effect(() => () => router.dispose());
      </script>
      {#snippet redirect()}<Redirect {timing} />{/snippet}
      <RouterProvider {router} />`;
      const capture = vi.fn();
      const screen = await render(App, { timing, loader, capture });
      await expect.poll(() => loader.mock.calls.length).toBeGreaterThan(0);
      pending.resolve(null);
      await expect.element(screen.getByTestId("redirect-state")).toHaveTextContent("1");
      const router = capture.mock.calls[0][0];
      expect(router.state.location.pathname).toBe("/b");
      expect(router.state.location.state).toEqual({ count: 1 });
      expect(router.state.historyAction).toBe("REPLACE");
      expect(loader.mock.calls.length).toBeLessThanOrEqual(timing === "setup" ? 1 : 2);
    });
  });
});
