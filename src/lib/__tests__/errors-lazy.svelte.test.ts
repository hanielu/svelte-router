import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";
import type { RouteObject } from "svelte-router";

// svelte:defs
import { onDestroy } from "svelte";
import {
  RouterProvider,
  createMemoryRouter,
  MemoryRouter,
  Route,
  Routes,
  Outlet,
  useRouteError,
  useLocation,
  useLoaderData,
  useParams,
  useRevalidator,
  isRouteErrorResponse,
} from "svelte-router";
// sd

const ErrorView = html`<script>
  let { label = "Error" } = $props();
  const error = useRouteError();
  const location = useLocation();
  const revalidator = useRevalidator();
</script>
<p>{label}:{error.current instanceof Error ? error.current.message : isRouteErrorResponse(error.current)
  ? error.current.status + ":" + error.current.data : String(error.current)}</p>
<p>at:{location.current.pathname}</p><button onclick={() => revalidator.revalidate()}>Retry</button>`;
const Page = html`<script>const data = useLoaderData();</script><p>Page:{data.current ?? "ready"}</p>`;
const Layout = html`<h1>Layout</h1><Outlet />`;
const Fallback = html`<script>const location = useLocation();</script><p>Loading:{location.current.pathname}</p>`;
const LayoutProbe = html`<script>let { mounted, destroyed, children } = $props(); mounted(); onDestroy(destroyed);</script>
  <h1>Retained layout</h1>{@render children()}`;

function mountRouter(router: ReturnType<typeof createMemoryRouter>) {
  return render(
    html`<script>let { router } = $props();</script><RouterProvider {router} />`,
    { router }
  );
}

describe("route error and lazy rendering", () => {
  for (const boundary of ["component", "snippet"] as const) {
    it.each(["root", "child"])(
      `renders hydration errors at the owning %s ${boundary} boundary`,
      async owner => {
        const capture = vi.fn();
        const screen = await render(
          scope(ErrorView, Layout, Page).html`<script>
        let { owner, boundary, capture } = $props();
        const errorUI = boundary === "component" ? { ErrorBoundary: ErrorView } : { errorElement: failure };
        const router = createMemoryRouter([{ id: "root", path: "/", Component: Layout,
          ...(owner === "root" ? errorUI : {}), children: [{ id: "child", path: "child", Component: Page,
            ...(owner === "child" ? errorUI : {}) }] }], { initialEntries: ["/child"],
          hydrationData: { loaderData: { root: "parent" }, errors: { [owner]: new Error("hydration failed") } } });
        capture(router);
      </script>
      {#snippet failure()}<ErrorView label="Snippet" />{/snippet}<RouterProvider {router} />`,
          { owner, boundary, capture }
        );
        const router = capture.mock.calls[0][0];
        try {
          await expect
            .element(
              screen.getByText(
                `${boundary === "component" ? "Error" : "Snippet"}:hydration failed`,
                { exact: true }
              )
            )
            .toBeVisible();
          expect(screen.container.textContent?.includes("Layout")).toBe(
            owner === "child"
          );
          expect(screen.container.textContent).not.toContain("Page:");
        } finally {
          await screen.unmount();
          router.dispose();
        }
      }
    );
  }

  for (const operation of ["loader", "action"] as const) {
    for (const owner of ["child", "root", "default"] as const) {
      it.each(["error", "response", "null"])(
        `routes ${operation} %s failures to the ${owner} boundary and recovers on navigation`,
        async kind => {
          const failure =
            kind === "error"
              ? new Error("request failed")
              : kind === "response"
                ? new Response("denied", {
                    status: 403,
                    statusText: "Forbidden",
                  })
                : null;
          const report = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
          const router = createMemoryRouter(
            [
              {
                path: "/",
                Component: Layout,
                ...(owner === "root" ? { ErrorBoundary: ErrorView } : {}),
                children: [
                  { path: "good", Component: Page },
                  {
                    path: "bad",
                    Component: Page,
                    [operation]: () => {
                      throw failure;
                    },
                    ...(owner === "child" ? { ErrorBoundary: ErrorView } : {}),
                  },
                ],
              },
            ],
            { initialEntries: ["/good"] }
          );
          const screen = await mountRouter(router);
          try {
            await expect.element(screen.getByText("Page:ready")).toBeVisible();
            await router.navigate(
              "/bad",
              operation === "action"
                ? { formMethod: "post", body: new URLSearchParams() }
                : undefined
            );
            const message =
              kind === "error"
                ? "request failed"
                : kind === "response"
                  ? owner === "default"
                    ? "403 Forbidden"
                    : "403:denied"
                  : "null";
            await expect
              .element(
                screen.getByText(
                  owner === "default" ? message : `Error:${message}`,
                  { exact: true }
                )
              )
              .toBeVisible();
            expect(screen.container.textContent?.includes("Layout")).toBe(
              owner === "child"
            );
            expect(screen.container.textContent).not.toContain("Page:");
            await router.navigate(-1);
            await expect.element(screen.getByText("Page:ready")).toBeVisible();
          } finally {
            await screen.unmount();
            router.dispose();
            report.mockRestore();
          }
        }
      );
    }
  }

  it.each(["path", "index", "default"])(
    "uses the %s root boundary for unmatched 404s",
    async kind => {
      const report = vi.spyOn(console, "error").mockImplementation(() => {});
      const routes: RouteObject[] = [
        {
          path: "/unrelated",
          Component: Page,
          ErrorBoundary: html`<p>Wrong boundary</p>`,
        },
      ];
      if (kind === "default")
        routes.push({ path: "/another", Component: Page });
      if (kind !== "default")
        routes.push({
          ...(kind === "path" ? { path: "/" } : { index: true as const }),
          ErrorBoundary: ErrorView,
        });
      const router = createMemoryRouter(routes, {
        initialEntries: ["/missing"],
      });
      const screen = await mountRouter(router);
      try {
        await expect
          .poll(() => screen.container.textContent)
          .toContain(kind === "default" ? "404 Not Found" : "Error:404:");
        expect(screen.container.textContent).not.toContain("Wrong boundary");
        expect(screen.container.querySelector("pre")).toBeNull();
      } finally {
        await screen.unmount();
        router.dispose();
        report.mockRestore();
      }
    }
  );

  it("bubbles an error UI failure to its parent, cleans up the failed branch, and recovers on Back", async () => {
    const mounted = vi.fn();
    const destroyed = vi.fn();
    const Child = html`<script>const params = useParams();
      const value = $derived.by(() => { if (params.current.id !== "good") throw new Error("child failed"); return params.current.id; });
    </script><p>Child:{value}</p>`;
    const BrokenError = html`<script>throw new Error("error UI failed");</script>`;
    const capture = vi.fn();
    const screen = await render(
      scope(Child, ErrorView, BrokenError, LayoutProbe).html`<script>
      let { mounted, destroyed, capture } = $props();
      const router = createMemoryRouter([{ path: "/", element: layout, ErrorBoundary: ErrorView, children: [
        { path: ":id", element: child, ErrorBoundary: BrokenError }
      ] }], { initialEntries: ["/good"] }); capture(router);
    </script>
    {#snippet layout()}<LayoutProbe {mounted} {destroyed}><Outlet /></LayoutProbe>{/snippet}
    {#snippet child()}<Child />{/snippet}
    <RouterProvider {router} />`,
      { mounted, destroyed, capture }
    );
    const router = capture.mock.calls[0][0];
    try {
      await expect.element(screen.getByText("Child:good")).toBeVisible();
      await router.navigate("/other-good");
      await expect
        .element(screen.getByText("Error:error UI failed", { exact: true }))
        .toBeVisible();
      expect(mounted).toHaveBeenCalledOnce();
      expect(destroyed).toHaveBeenCalledOnce();
      await router.navigate(-1);
      await expect.element(screen.getByText("Child:good")).toBeVisible();
      expect(mounted).toHaveBeenCalledTimes(2);
    } finally {
      await screen.unmount();
      router.dispose();
    }
    expect(destroyed).toHaveBeenCalledTimes(2);
  });

  it("does not mount descendants below a loader error boundary, and retries through the engine", async () => {
    const mounted = vi.fn();
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("broken"))
      .mockResolvedValue("fixed");
    const Child = html`<script>let { mounted } = $props(); mounted();</script><p>Child</p>`;
    const capture = vi.fn();
    const screen = await render(
      scope(Child, ErrorView).html`<script>
      let { loader, mounted, capture } = $props();
      const router = createMemoryRouter([{ path: "/", loader, Component: Outlet, ErrorBoundary: ErrorView,
        children: [{ path: "child", element: child }] }], { initialEntries: ["/child"] });
      capture(router);
    </script>
    {#snippet child()}<Child {mounted} />{/snippet}<RouterProvider {router} />`,
      { loader, mounted, capture }
    );
    const router = capture.mock.calls[0][0];
    try {
      await expect
        .element(screen.getByText("Error:broken", { exact: true }))
        .toBeVisible();
      expect(mounted).not.toHaveBeenCalled();
      await screen.getByRole("button", { name: "Retry" }).click();
      await expect
        .element(screen.getByText("Child", { exact: true }))
        .toBeVisible();
      expect(mounted).toHaveBeenCalledOnce();
    } finally {
      await screen.unmount();
      router.dispose();
    }
  });

  it("renders a context-aware fallback while an initial lazy route and loader resolve", async () => {
    const lazy = Promise.withResolvers<{
      Component: typeof Page;
      loader: () => Promise<string>;
    }>();
    const data = Promise.withResolvers<string>();
    const loader = vi.fn(() => data.promise);
    const router = createMemoryRouter(
      [
        {
          path: "/",
          Component: Layout,
          HydrateFallback: Fallback,
          children: [{ path: "child", lazy: () => lazy.promise }],
        },
      ],
      { initialEntries: ["/child"] }
    );
    const screen = await mountRouter(router);
    try {
      await expect.element(screen.getByText("Loading:/child")).toBeVisible();
      lazy.resolve({ Component: Page, loader });
      await expect.poll(() => loader.mock.calls.length).toBe(1);
      expect(router.state.initialized).toBe(false);
      await expect.element(screen.getByText("Loading:/child")).toBeVisible();
      data.resolve("loaded");
      await expect.element(screen.getByText("Page:loaded")).toBeVisible();
      await expect
        .element(screen.getByRole("heading", { name: "Layout" }))
        .toBeVisible();
    } finally {
      data.resolve("loaded");
      await screen.unmount();
      router.dispose();
    }
  });

  it("catches render errors in declarative descendants of a data route and recovers on Back", async () => {
    const Child = html`<script>const params = useParams();
      const value = $derived.by(() => { if (params.current.id === "bad") throw new Error("render failed"); return params.current.id; });
    </script><p>Document:{value}</p>`;
    const Mixed = scope(Child)
      .html`<Routes><Route path="documents/:id" Component={Child} /></Routes>`;
    const router = createMemoryRouter(
      [{ path: "*", Component: Mixed, ErrorBoundary: ErrorView }],
      { initialEntries: ["/documents/good"] }
    );
    const screen = await mountRouter(router);
    try {
      await expect.element(screen.getByText("Document:good")).toBeVisible();
      await router.navigate("/documents/bad");
      await expect
        .element(screen.getByText("Error:render failed", { exact: true }))
        .toBeVisible();
      await router.navigate(-1);
      await expect.element(screen.getByText("Document:good")).toBeVisible();
    } finally {
      await screen.unmount();
      router.dispose();
    }
  });

  it("retries a render failure after revalidation without replacing the parent layout", async () => {
    const mounted = vi.fn();
    const destroyed = vi.fn();
    const load = vi.fn().mockResolvedValueOnce("bad").mockResolvedValue("good");
    const Child = html`<script>const data = useLoaderData();
      const value = $derived.by(() => { if (data.current === "bad") throw new Error("render failed"); return data.current; });
    </script><p>Child:{value}</p>`;
    const capture = vi.fn();
    const screen = await render(
      scope(Child, ErrorView, LayoutProbe, Fallback).html`<script>
      let { mounted, destroyed, load, capture } = $props();
      const router = createMemoryRouter([{ path: "/", element: layout, HydrateFallback: Fallback, children: [
        { path: "child", Component: Child, loader: load, ErrorBoundary: ErrorView }
      ] }], { initialEntries: ["/child"] }); capture(router);
    </script>
    {#snippet layout()}<LayoutProbe {mounted} {destroyed}><Outlet /></LayoutProbe>{/snippet}
    <RouterProvider {router} />`,
      { mounted, destroyed, load, capture }
    );
    const router = capture.mock.calls[0][0];
    try {
      await expect
        .element(screen.getByText("Error:render failed", { exact: true }))
        .toBeVisible();
      await screen.getByRole("button", { name: "Retry" }).click();
      await expect.element(screen.getByText("Child:good")).toBeVisible();
      expect(mounted).toHaveBeenCalledOnce();
      expect(destroyed).not.toHaveBeenCalled();
    } finally {
      await screen.unmount();
      router.dispose();
    }
    expect(destroyed).toHaveBeenCalledOnce();
  });

  it("leaves declarative render errors to the application's Svelte boundary", async () => {
    const Child = html`<script>throw new Error("declarative failed");</script>`;
    const screen = await render(scope(Child).html`<svelte:boundary>
      <MemoryRouter><Routes><Route path="/" Component={Child} /></Routes></MemoryRouter>
      {#snippet failed(error)}<p>Application:{error.message}</p>{/snippet}
    </svelte:boundary>`);
    try {
      await expect
        .element(screen.getByText("Application:declarative failed"))
        .toBeVisible();
    } finally {
      await screen.unmount();
    }
  });

  it("renders the nearest nested hydration snippet until missing child data resolves", async () => {
    const data = Promise.withResolvers<string>();
    const capture = vi.fn();
    const screen = await render(
      scope(Layout, Page, Fallback).html`<script>
      let { data, capture } = $props();
      const router = createMemoryRouter([{ id: "root", path: "/", Component: Layout, HydrateFallback: Fallback,
        children: [{ id: "child", path: "child", Component: Page, hydrateFallbackElement: pending, loader: () => data }]
      }], { initialEntries: ["/child"], hydrationData: { loaderData: { root: "hydrated" } } }); capture(router);
    </script>
    {#snippet pending()}<p>Child pending</p>{/snippet}<RouterProvider {router} />`,
      { data: data.promise, capture }
    );
    const router = capture.mock.calls[0][0];
    try {
      await expect.element(screen.getByText("Child pending")).toBeVisible();
      await expect
        .element(screen.getByRole("heading", { name: "Layout" }))
        .toBeVisible();
      expect(screen.container.textContent).not.toContain("Loading:");
      data.resolve("ready");
      await expect.element(screen.getByText("Page:ready")).toBeVisible();
    } finally {
      data.resolve("ready");
      await screen.unmount();
      router.dispose();
    }
  });

  it("renders rejected lazy imports, preserves upstream's cached failure on revalidation, and can navigate away", async () => {
    const lazy = vi.fn().mockRejectedValue(new Error("import failed"));
    const router = createMemoryRouter(
      [
        {
          path: "/",
          Component: Layout,
          ErrorBoundary: ErrorView,
          HydrateFallback: Fallback,
          children: [
            { path: "lazy", lazy },
            { path: "good", Component: Page },
          ],
        },
      ],
      { initialEntries: ["/lazy"] }
    );
    const screen = await mountRouter(router);
    try {
      await expect
        .element(screen.getByText("Error:import failed", { exact: true }))
        .toBeVisible();
      await router.revalidate();
      await expect
        .element(screen.getByText("Error:import failed", { exact: true }))
        .toBeVisible();
      expect(lazy).toHaveBeenCalledOnce();
      await router.navigate("/good");
      await expect.element(screen.getByText("Page:ready")).toBeVisible();
    } finally {
      await screen.unmount();
      router.dispose();
    }
  });

  it("does not render an abandoned lazy navigation and reuses its resolved module later", async () => {
    const module = Promise.withResolvers<{
      Component: typeof Page;
      loader: () => string;
    }>();
    const lazy = vi.fn(() => module.promise);
    const router = createMemoryRouter(
      [
        {
          path: "/",
          Component: Layout,
          children: [
            { path: "good", Component: Page },
            { path: "lazy", lazy },
          ],
        },
      ],
      { initialEntries: ["/good"] }
    );
    const screen = await mountRouter(router);
    try {
      await expect.element(screen.getByText("Page:ready")).toBeVisible();
      const abandoned = router.navigate("/lazy");
      await expect.poll(() => lazy.mock.calls.length).toBe(1);
      await expect.element(screen.getByText("Page:ready")).toBeVisible();
      await router.navigate("/good?new");
      module.resolve({ Component: Page, loader: () => "lazy loaded" });
      await abandoned;
      expect(
        router.state.location.pathname + router.state.location.search
      ).toBe("/good?new");
      await expect.element(screen.getByText("Page:ready")).toBeVisible();
      await router.navigate("/lazy");
      await expect.element(screen.getByText("Page:lazy loaded")).toBeVisible();
      expect(lazy).toHaveBeenCalledOnce();
    } finally {
      module.resolve({ Component: Page, loader: () => "lazy loaded" });
      await screen.unmount();
      router.dispose();
    }
  });

  it("uses ErrorBoundary exported by a lazy module for that module's loader failure", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          Component: Layout,
          HydrateFallback: Fallback,
          children: [
            {
              path: "lazy",
              lazy: async () => ({
                Component: Page,
                ErrorBoundary: ErrorView,
                loader: () => {
                  throw new Error("lazy loader failed");
                },
              }),
            },
          ],
        },
      ],
      { initialEntries: ["/lazy"] }
    );
    const screen = await mountRouter(router);
    try {
      await expect
        .element(screen.getByText("Error:lazy loader failed", { exact: true }))
        .toBeVisible();
      await expect
        .element(screen.getByRole("heading", { name: "Layout" }))
        .toBeVisible();
    } finally {
      await screen.unmount();
      router.dispose();
    }
  });
});
