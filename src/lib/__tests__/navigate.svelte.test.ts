import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";

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
        const location = $derived(useLocation());
      </script>
      <h1>Destination</h1>
      <p>{location.state.from}</p>`;

    const screen = render(
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

    const screen = render(
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
