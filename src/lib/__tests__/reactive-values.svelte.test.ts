import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";

// svelte:defs
import { onDestroy } from "svelte";
import {
  MemoryRouter, Route, Routes, Link, NavLink, RouterProvider,
  createMemoryRouter, useLocation, useParams, useNavigationType, useMatch,
  useHref, useResolvedPath, useLoaderData, useRouteId,
  useNavigate, useSearchParams,
} from "svelte-router";
// sd

describe("live router values", () => {
  it("retains handles, local state, and reactive inputs across same-pattern navigation", async () => {
    const capture = vi.fn<(values: {
      location: ReturnType<typeof useLocation>;
      href: ReturnType<typeof useHref>;
      params: ReturnType<typeof useParams<"id">>;
    }) => void>();
    const read = vi.fn<(value: string) => void>();
    const observe = vi.fn<(id: string | undefined) => void>();
    const cleanup = vi.fn();
    const Page = html`<script lang="ts">
      let { capture, read, observe, cleanup } = $props();
      let count = $state(0);
      let target = $state("details");
      let relative = $state<"route" | "path">("route");
      let pattern = $state("/projects/:id/*");
      const location = useLocation();
      const params = useParams<"id">();
      const action = useNavigationType();
      const match = useMatch(() => pattern);
      const path = useResolvedPath(() => target, () => ({ relative }));
      const href = useHref(() => target, () => ({ relative }));
      const navigate = useNavigate();
      capture({ location, params, href });
      $effect(() => observe(params.current.id));
      onDestroy(cleanup);
    </script>
    <p>route:{params.current.id}:{action.current}</p>
    <p>match:{match.current?.params.id ?? "none"}</p>
    <p>path:{path.current.pathname}</p>
    <Link to={target} {relative}>Destination</Link>
    <NavLink to={location.current.pathname}>Current</NavLink>
    <button onclick={() => count++}>count:{count}</button>
    <button onclick={() => navigate("/projects/two/deep/leaf")}>Next</button>
    <button onclick={() => navigate("/projects/three/deep/leaf", { replace: true })}>Replace</button>
    <button onclick={() => navigate(-1)}>Back</button>
    <button onclick={() => { target = ".."; pattern = "/absent"; }}>Change inputs</button>
    <button onclick={() => relative = "path"}>Path relative</button>
    <button onclick={() => read(params.current.id + "|" + location.current.pathname + "|" + href.current)}>Read</button>`;

    const screen = await render(scope(Page).html`<script>let { capture, read, observe, cleanup } = $props();</script>
      <MemoryRouter basename="/base" initialEntries={["/base/projects/one/deep/leaf"]}>
        <Routes><Route path="projects/:id/*">
          {#snippet element()}<Page {capture} {read} {observe} {cleanup} />{/snippet}
        </Route></Routes>
      </MemoryRouter>`, { capture, read, observe, cleanup });

    await expect.element(screen.getByText("route:one:POP")).toBeVisible();
    const handles = capture.mock.calls[0][0];
    const initial = handles.location.current;
    expect(Reflect.set(handles.location, "current", initial)).toBe(false);
    await screen.getByRole("button", { name: "count:0" }).click();
    await screen.getByRole("button", { name: "Next", exact: true }).click();
    await expect.element(screen.getByText("route:two:PUSH")).toBeVisible();
    await expect.element(screen.getByText("match:two")).toBeVisible();
    await expect.element(screen.getByText("path:/projects/two/deep/leaf/details")).toBeVisible();
    await expect.element(screen.getByRole("link", { name: "Destination" })).toHaveAttribute("href", "/base/projects/two/deep/leaf/details");
    await expect.element(screen.getByRole("link", { name: "Current" })).toHaveAttribute("aria-current", "page");
    await expect.element(screen.getByRole("button", { name: "count:1" })).toBeVisible();
    expect(capture).toHaveBeenCalledOnce();
    expect(handles.location.current).not.toBe(initial);
    expect(handles.params.current.id).toBe("two");
    expect(observe).toHaveBeenLastCalledWith("two");
    await screen.getByRole("button", { name: "Read", exact: true }).click();
    expect(read).toHaveBeenLastCalledWith("two|/projects/two/deep/leaf|/base/projects/two/deep/leaf/details");

    await screen.getByRole("button", { name: "Change inputs" }).click();
    await expect.element(screen.getByText("match:none")).toBeVisible();
    expect(handles.href.current).toBe("/base");
    await screen.getByRole("button", { name: "Path relative" }).click();
    await expect.element(screen.getByRole("link", { name: "Destination" })).toHaveAttribute("href", "/base/projects/two/deep");
    expect(handles.href.current).toBe("/base/projects/two/deep");
    await screen.getByRole("button", { name: "Replace", exact: true }).click();
    await expect.element(screen.getByText("route:three:REPLACE")).toBeVisible();
    await screen.getByRole("button", { name: "Back", exact: true }).click();
    await expect.element(screen.getByText("route:one:POP")).toBeVisible();
    expect(capture).toHaveBeenCalledOnce();
    await screen.unmount();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("keeps sibling router handles isolated, including reads after setup", async () => {
    const capture = vi.fn<(value: ReturnType<typeof useLocation>) => void>();
    const Page = html`<script>let { capture } = $props(); const location = useLocation();
      const navigate = useNavigate(); capture(location);</script>
      <p>{location.current.pathname}</p><button onclick={() => navigate("/changed")}>Change</button>`;
    const screen = await render(scope(Page).html`<script>let { capture } = $props();</script>
      <MemoryRouter initialEntries={["/one"]}><Page {capture} /></MemoryRouter>
      <MemoryRouter initialEntries={["/two"]}><Page {capture} /></MemoryRouter>`, { capture });
    const [first, second] = capture.mock.calls.map(([value]) => value);
    await screen.getByRole("button", { name: "Change" }).nth(0).click();
    expect(first.current.pathname).toBe("/changed");
    expect(second.current.pathname).toBe("/two");
    expect(first).not.toBe(second);
  });

  it("reports missing providers during initialization", async () => {
    await expect(render(html`<script>useLocation();</script>`)).rejects.toThrow(/useLocation.*Router/);
    await expect(render(html`<script>useParams();</script>`)).rejects.toThrow(/useParams.*Router/);
    await expect(render(html`<script>useLoaderData();</script>`)).rejects.toThrow(/useLoaderData.*data router/);
    await expect(render(html`<script>useRouteId();</script>`)).rejects.toThrow(/unique "id"/);
  });

  it.each(["declarative", "data"])("follows search navigation, defaults, and functional setters in %s mode", async mode => {
    const Page = html`<script>
      const [search, setSearch] = useSearchParams({ mode: "default" });
      const location = useLocation();
      const navigate = useNavigate();
      let read = $state("");
    </script>
    <p>query:{search.current.toString()}</p><p>url:{location.current.search || "empty"}</p>
    <button onclick={() => navigate("?q=second")}>Navigate</button>
    <button onclick={() => setSearch(previous => { previous.set("q", previous.get("q") + "!"); return previous; })}>Append</button>
    <button onclick={() => setSearch({})}>Clear</button>
    <button onclick={() => navigate(-1)}>Back</button>
    <button onclick={() => read = search.current.get("q") ?? "none"}>Read</button><p>read:{read}</p>`;
    const router = mode === "data" ? createMemoryRouter([{ path: "search", Component: Page }], {
      initialEntries: ["/search?q=first"],
    }) : undefined;
    const screen = router
      ? await render(html`<script>let { router } = $props();</script><RouterProvider {router} />`, { router })
      : await render(scope(Page).html`<MemoryRouter initialEntries={["/search?q=first"]}>
          <Routes><Route path="search" Component={Page} /></Routes></MemoryRouter>`);
    try {
    await expect.element(screen.getByText("query:q=first&mode=default")).toBeVisible();
    await expect.element(screen.getByText("url:?q=first", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "Navigate" }).click();
    await expect.element(screen.getByText("query:q=second&mode=default")).toBeVisible();
    await screen.getByRole("button", { name: "Append" }).click();
    await expect.element(screen.getByText("query:q=second%21&mode=default")).toBeVisible();
    await screen.getByRole("button", { name: "Clear" }).click();
    await expect.element(screen.getByText("query:", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "Back" }).click();
    await screen.getByRole("button", { name: "Back" }).click();
    await expect.element(screen.getByText("query:q=second", { exact: true })).toBeVisible();
    await screen.getByRole("button", { name: "Read", exact: true }).click();
    await expect.element(screen.getByText("read:second")).toBeVisible();
    } finally {
      await screen.unmount();
      router?.dispose();
    }
  });
});
