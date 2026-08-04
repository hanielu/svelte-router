import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";

// svelte:defs
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useMatch,
  useNavigate,
  useNavigationType,
} from "svelte-router";
// sd

describe("declarative route hooks", () => {
  it("keeps useMatch and useNavigationType live across same-route navigation", async () => {
    const User = html`<script>
        const match = $derived(useMatch("/users/:user"));
        const navigationType = $derived(useNavigationType());
        const navigate = useNavigate();
      </script>

      <p>{match?.params.user}:{navigationType}</p>
      <button onclick={() => navigate("/users/two")}>Push</button>
      <button onclick={() => navigate("/users/three", { replace: true })}>Replace</button>`;

    const screen = render(
      scope(User).html`
        <MemoryRouter initialEntries={["/users/one"]}>
          <Routes>
            <Route path="users/:user" element={User} />
          </Routes>
        </MemoryRouter>
      `
    );

    await expect.element(screen.getByText("one:POP")).toBeVisible();
    await screen.getByRole("button", { name: "Push" }).click();
    await expect.element(screen.getByText("two:PUSH")).toBeVisible();
    await screen.getByRole("button", { name: "Replace" }).click();
    await expect.element(screen.getByText("three:REPLACE")).toBeVisible();
  });

  it("resolves relative navigation against current context in a persistent route", async () => {
    const Project = html`<script>
        const location = $derived(useLocation());
        const navigate = useNavigate();
      </script>

      <p>{location.pathname}</p>
      <button onclick={() => navigate("/projects/two")}>Change project</button>
      <button onclick={() => navigate("details")}>Open details</button>`;

    const screen = render(
      scope(Project).html`
        <MemoryRouter initialEntries={["/projects/one"]}>
          <Routes>
            <Route path="projects/:project/*" element={Project} />
          </Routes>
        </MemoryRouter>
      `
    );

    await screen.getByRole("button", { name: "Change project" }).click();
    await expect.element(screen.getByText("/projects/two")).toBeVisible();

    await screen.getByRole("button", { name: "Open details" }).click();
    await expect.element(screen.getByText("/projects/two/details")).toBeVisible();
  });
});
