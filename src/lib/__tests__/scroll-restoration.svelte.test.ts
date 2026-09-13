import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";
import { createTestWindow } from "./fixtures/browser-window.js";

// svelte:defs
import {
  RouterProvider,
  createMemoryRouter,
  createBrowserRouter,
  Outlet,
  ScrollRestoration,
  useLocation,
} from "svelte-router";
// sd

type Controls = {
  ready(path: string): void;
  target(element: HTMLElement | null): void;
};

async function mountScroll(
  options: Record<string, unknown> = {},
  routeOptions: Record<string, unknown> = {}
) {
  const capture = vi.fn();
  const controls = vi.fn<(value: Controls) => void>();
  const screen = await render(
    html`<script>
    let { options, routeOptions, capture, controls } = $props();
    const router = createMemoryRouter([{ id: "root", path: "/", element: layout,
      children: [{ path: "*", element: page, ...routeOptions }] }], {
      initialEntries: [options.initialPath ?? "/list"], basename: options.basename,
    });
    let readyPath = $state("*");
    let target = $state.raw(options.target);
    controls({ ready: path => readyPath = path, target: element => target = element });
    capture(router);
  </script>
  {#snippet layout()}
    <ScrollRestoration getKey={options.getKey} storageKey={options.storageKey}
      target={() => target} ready={() => readyPath === "*" || router.state.location.pathname === readyPath} />
    <Outlet />
  {/snippet}
  {#snippet page()}<p>Page</p>{/snippet}
  <RouterProvider {router} />`,
    { options, routeOptions, capture, controls }
  );
  return {
    screen,
    router: capture.mock.calls[0][0] as ReturnType<typeof createMemoryRouter>,
    controls: controls.mock.calls[0][0],
  };
}

function pane() {
  const element = document.createElement("div");
  element.style.cssText = "height:100px;width:100px;overflow:auto";
  const content = document.createElement("div");
  content.style.height = "2000px";
  element.append(content);
  document.body.append(element);
  return element;
}

describe("ScrollRestoration (upstream DOM cases and Svelte element/readiness contract)", () => {
  it("uses the router's window, waits for loaders, and restores real browser Back/Forward", async () => {
    const testWindow = await createTestWindow("/list");
    const win = testWindow.window;
    let y = 0;
    const scroll = vi
      .spyOn(win, "scrollTo")
      .mockImplementation((x: number | ScrollToOptions, top?: number) => {
        y = top ?? 0;
      });
    const scrollY = vi.spyOn(win, "scrollY", "get").mockImplementation(() => y);
    const pending = Promise.withResolvers<null>();
    const loader = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(null);
    const capture = vi.fn();
    const screen = await render(
      html`<script>
      let { win, loader, capture } = $props();
      const router = createBrowserRouter([{ path: "/", element: layout, children: [
        { path: "list", element: list }, { path: "document", loader, element: doc },
      ] }], { window: win });
      capture(router);
    </script>
    {#snippet layout()}<ScrollRestoration /><Outlet />{/snippet}
    {#snippet list()}<p>List</p>{/snippet}{#snippet doc()}<p>Document</p>{/snippet}
    <RouterProvider {router} />`,
      { win, loader, capture }
    );
    const router = capture.mock.calls[0][0] as ReturnType<
      typeof createBrowserRouter
    >;
    try {
      await expect
        .element(screen.getByText("List", { exact: true }))
        .toBeVisible();
      expect(scroll.mock.calls).toEqual([[0, 0]]);
      y = 100;
      const navigation = router.navigate("/document");
      await expect.poll(() => router.state.navigation.state).toBe("loading");
      expect(y).toBe(100);
      pending.resolve(null);
      await navigation;
      await expect
        .element(screen.getByText("Document", { exact: true }))
        .toBeVisible();
      expect(y).toBe(0);
      y = 200;
      await router.navigate(-1);
      await expect
        .element(screen.getByText("List", { exact: true }))
        .toBeVisible();
      expect(y).toBe(100);
      await router.navigate(1);
      await expect
        .element(screen.getByText("Document", { exact: true }))
        .toBeVisible();
      expect(y).toBe(200);
    } finally {
      pending.resolve(null);
      await screen.unmount();
      router.dispose();
      scroll.mockRestore();
      scrollY.mockRestore();
      testWindow.dispose();
    }
  });

  it("restores Back/Forward after application content is ready, without scrolling a sidebar", async () => {
    const target = pane();
    const sidebar = pane();
    const { screen, router, controls } = await mountScroll({ target });
    try {
      await expect.element(screen.getByText("Page")).toBeVisible();
      target.scrollTop = 600;
      sidebar.scrollTop = 80;
      await router.navigate("/document");
      await expect.poll(() => target.scrollTop).toBe(0);
      target.scrollTop = 300;
      controls.ready("/document");
      await router.navigate(-1);
      await expect.poll(() => router.state.location.pathname).toBe("/list");
      expect(target.scrollTop).toBe(300);
      controls.ready("/list");
      await expect.poll(() => target.scrollTop).toBe(600);
      expect(sidebar.scrollTop).toBe(80);
      controls.ready("*");
      await router.navigate(1);
      await expect.poll(() => target.scrollTop).toBe(300);
    } finally {
      await screen.unmount();
      router.dispose();
      target.remove();
      sidebar.remove();
    }
  });

  it("restores a custom pathname key on a push and strips basename from getKey", async () => {
    const target = pane();
    const getKey = vi.fn(
      (location: { pathname: string }, _matches: { id: string }[]) =>
        location.pathname
    );
    const { screen, router } = await mountScroll({
      target,
      basename: "/base",
      initialPath: "/base/list",
      getKey,
    });
    try {
      await expect.element(screen.getByText("Page")).toBeVisible();
      target.scrollTop = 100;
      await router.navigate("/document");
      await expect.poll(() => target.scrollTop).toBe(0);
      await router.navigate("/list");
      await expect.poll(() => target.scrollTop).toBe(100);
      expect(getKey.mock.calls.map(call => call[0].pathname)).toEqual([
        "/list",
        "/list",
        "/document",
        "/document",
        "/list",
      ]);
      expect(
        getKey.mock.calls[0][1].map((match: { id: string }) => match.id)
      ).toEqual(["root", "0-0"]);
    } finally {
      await screen.unmount();
      router.dispose();
      target.remove();
    }
  });

  it("does not consume a restoration while the active element is missing", async () => {
    const target = pane();
    const { screen, router, controls } = await mountScroll({ target });
    try {
      await expect.element(screen.getByText("Page")).toBeVisible();
      target.scrollTop = 240;
      await router.navigate("/document");
      await expect.poll(() => target.scrollTop).toBe(0);
      controls.target(null);
      await router.navigate(-1);
      await expect.poll(() => router.state.location.pathname).toBe("/list");
      expect(target.scrollTop).toBe(0);
      controls.target(target);
      await expect.poll(() => target.scrollTop).toBe(240);
    } finally {
      await screen.unmount();
      router.dispose();
      target.remove();
    }
  });

  it("does not let readiness for an abandoned location scroll a later page", async () => {
    const target = pane();
    const { screen, router, controls } = await mountScroll({ target });
    try {
      await expect.element(screen.getByText("Page")).toBeVisible();
      target.scrollTop = 500;
      controls.ready("never");
      await router.navigate("/slow");
      await router.navigate("/new");
      controls.ready("/slow");
      await expect.poll(() => router.state.location.pathname).toBe("/new");
      expect(target.scrollTop).toBe(500);
      controls.ready("/new");
      await expect.poll(() => target.scrollTop).toBe(0);
    } finally {
      await screen.unmount();
      router.dispose();
      target.remove();
    }
  });

  it("honours preventScrollReset, but restores saved positions before the opt-out", async () => {
    const target = pane();
    const { screen, router } = await mountScroll({ target });
    try {
      await expect.element(screen.getByText("Page")).toBeVisible();
      target.scrollTop = 120;
      await router.navigate("/document", { preventScrollReset: true });
      await expect.poll(() => router.state.location.pathname).toBe("/document");
      expect(target.scrollTop).toBe(120);
      target.scrollTop = 350;
      await router.navigate(-1);
      await expect.poll(() => target.scrollTop).toBe(120);
    } finally {
      await screen.unmount();
      router.dispose();
      target.remove();
    }
  });

  it("does not reset on revalidation or an action submission without a redirect", async () => {
    const target = pane();
    const { screen, router } = await mountScroll(
      { target },
      { loader: () => null, action: () => null }
    );
    try {
      await expect.element(screen.getByText("Page")).toBeVisible();
      target.scrollTop = 120;
      await router.revalidate();
      expect(target.scrollTop).toBe(120);
      await router.navigate("/document", {
        formMethod: "post",
        formData: new FormData(),
      });
      await expect.poll(() => router.state.location.pathname).toBe("/document");
      expect(target.scrollTop).toBe(120);
    } finally {
      await screen.unmount();
      router.dispose();
      target.remove();
    }
  });

  it("scrolls decoded hashes inside the active element and safely handles invalid hashes", async () => {
    const target = pane();
    const marker = document.createElement("div");
    marker.id = "scroll marker";
    marker.style.marginTop = "700px";
    target.firstElementChild!.append(marker);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { screen, router } = await mountScroll({ target });
    try {
      await expect.element(screen.getByText("Page")).toBeVisible();
      await router.navigate("/document#scroll%20marker", {
        preventScrollReset: true,
      });
      await expect.poll(() => target.scrollTop).toBe(700);
      await router.navigate("/other#%E0%A4%A");
      await expect.poll(() => target.scrollTop).toBe(0);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("not a decodable element ID")
      );
    } finally {
      await screen.unmount();
      router.dispose();
      target.remove();
      warn.mockRestore();
    }
  });

  it.each([false, true])(
    "persists on pagehide and cleans up history/listeners (storage denied: %s)",
    async denied => {
      const target = pane();
      const win = window;
      const storageKey = `scroll-test-${crypto.randomUUID()}`;
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const original = win.history.scrollRestoration;
      const storage = win.sessionStorage;
      const deniedStorage = denied
        ? vi.spyOn(win, "sessionStorage", "get").mockImplementation(() => {
            throw new Error("denied");
          })
        : undefined;
      const { screen, router } = await mountScroll({
        target,
        storageKey,
        getKey: (location: { pathname: string }) => location.pathname,
      });
      try {
        await expect.element(screen.getByText("Page")).toBeVisible();
        expect(win.history.scrollRestoration).toBe("manual");
        target.scrollTop = 180;
        win.dispatchEvent(new Event("pagehide"));
        expect(win.history.scrollRestoration).toBe("auto");
        win.dispatchEvent(new Event("pageshow"));
        expect(win.history.scrollRestoration).toBe("manual");
        if (denied)
          expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("Failed to save scroll positions")
          );
        else
          expect(JSON.parse(storage.getItem(storageKey)!)).toEqual({
            "/list": 180,
          });
        await router.navigate("/document");
        await expect.poll(() => target.scrollTop).toBe(0);
        await router.navigate("/list");
        await expect.poll(() => target.scrollTop).toBe(180);
      } finally {
        await screen.unmount();
        router.dispose();
        target.remove();
        deniedStorage?.mockRestore();
        warn.mockRestore();
        storage.removeItem(storageKey);
      }
      expect(win.history.scrollRestoration).toBe(original);
      win.dispatchEvent(new Event("pageshow"));
      expect(win.history.scrollRestoration).toBe(original);
    }
  );

  it.each([
    JSON.stringify({ default: 77 }),
    "bad JSON",
    JSON.stringify({ default: "wrong" }),
  ])("validates stored positions: %s", async stored => {
    const target = pane();
    const storageKey = `scroll-test-${crypto.randomUUID()}`;
    window.sessionStorage.setItem(storageKey, stored);
    const { screen, router } = await mountScroll({ target, storageKey });
    try {
      await expect.element(screen.getByText("Page")).toBeVisible();
      await expect
        .poll(() => target.scrollTop)
        .toBe(stored.includes("77") ? 77 : 0);
    } finally {
      await screen.unmount();
      router.dispose();
      target.remove();
      window.sessionStorage.removeItem(storageKey);
    }
  });
});
