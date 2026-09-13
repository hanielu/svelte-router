import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";

// svelte:defs
import { createMemoryRouter, RouterProvider, Outlet, Link, useLoaderData, useNavigation, useRevalidator, useRouteError } from "svelte-router";
// sd

describe("upstream useRevalidator", () => {
  it("revalidates hydrated data, keeps navigation idle, and retains controller/command identity", async () => {
    const requests = [Promise.withResolvers<number>(), Promise.withResolvers<number>()];
    const loader = vi.fn(() => requests[loader.mock.calls.length - 1].promise);
    const capture = vi.fn();
    const states = vi.fn();
    const Page = html`<script>
      let { capture, states } = $props();
      const revalidator = useRevalidator();
      const navigation = useNavigation();
      const data = useLoaderData();
      capture(revalidator, revalidator.revalidate);
      $effect(() => states(revalidator.state));
    </script>
    <button onclick={() => revalidator.revalidate()}>Revalidate</button>
    <p data-testid="data">{data.current}</p>
    <p data-testid="navigation">{navigation.current.state}</p>
    <p data-testid="revalidation">{revalidator.state}</p>
    <Link to="/">Home</Link><Link to="/foo">Foo</Link><Outlet />`;
    const App = scope(Page).html`<script>
      let { capture, states, loader } = $props();
      const router = createMemoryRouter([{ id: "root", path: "/", loader,
        element: page, children: [{ index: true, element: home }, { path: "foo", element: foo }] }],
        { hydrationData: { loaderData: { root: 0 } } });
      $effect(() => () => router.dispose());
    </script>
    {#snippet page()}<Page {capture} {states} />{/snippet}
    {#snippet home()}<h1>Home page</h1>{/snippet}
    {#snippet foo()}<h1>Foo page</h1>{/snippet}
    <RouterProvider {router} />`;
    const screen = render(App, { capture, states, loader });
    expect(loader).not.toHaveBeenCalled();
    for (let index = 0; index < 2; index++) {
      await expect.element(screen.getByTestId("data")).toHaveTextContent(String(index));
      await screen.getByRole("button", { name: "Revalidate" }).click();
      await expect.element(screen.getByTestId("revalidation")).toHaveTextContent("loading");
      await expect.element(screen.getByTestId("navigation")).toHaveTextContent("idle");
      await expect.element(screen.getByTestId("data")).toHaveTextContent(String(index));
      requests[index].resolve(index + 1);
      await expect.element(screen.getByTestId("data")).toHaveTextContent(String(index + 1));
      await expect.element(screen.getByTestId("revalidation")).toHaveTextContent("idle");
    }
    expect(states.mock.calls.map(([state]) => state)).toEqual(["idle", "loading", "idle", "loading", "idle"]);
    await screen.getByRole("link", { name: "Foo" }).click();
    await expect.element(screen.getByRole("heading", { name: "Foo page" })).toBeVisible();
    await screen.getByRole("link", { name: "Home" }).click();
    await expect.element(screen.getByRole("heading", { name: "Home page" })).toBeVisible();
    expect(capture).toHaveBeenCalledOnce();
    expect(capture.mock.calls[0][0].revalidate).toBe(capture.mock.calls[0][1]);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it.each(["child", "parent"])("recovers a failed loader through the %s error boundary", async boundary => {
    let shouldFail = true;
    const loader = vi.fn(() => {
      if (shouldFail) { shouldFail = false; throw new Error("Broken"); }
      return "Fixed";
    });
    const ErrorPage = html`<script>
      const error = useRouteError();
      const revalidator = useRevalidator();
    </script>
    <p>Error:{error.current.message}</p><button onclick={() => revalidator.revalidate()}>Try again</button>`;
    const Child = html`<script>const data = useLoaderData();</script><h1>Child:{data.current}</h1>`;
    const Layout = html`<Link to="child">Child</Link><Outlet />`;
    const router = createMemoryRouter([{ path: "/", Component: Layout,
      ErrorBoundary: boundary === "parent" ? ErrorPage : undefined,
      children: [{ path: "child", loader, Component: Child, ErrorBoundary: boundary === "child" ? ErrorPage : undefined }],
    }]);
    try {
      const screen = render(html`<script>let { router } = $props();</script><RouterProvider {router} />`, { router });
      await screen.getByRole("link", { name: "Child" }).click();
      await expect.element(screen.getByText("Error:Broken")).toBeVisible();
      expect(router.state.errors).not.toBeNull();
      await screen.getByRole("button", { name: "Try again" }).click();
      await expect.element(screen.getByRole("heading", { name: "Child:Fixed" })).toBeVisible();
      expect(router.state.errors).toBeNull();
      expect(loader).toHaveBeenCalledTimes(2);
      screen.unmount();
    } finally { router.dispose(); }
  });
});
