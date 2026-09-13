import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";
import FetcherHost from "./fixtures/fetcher-host.svelte";
import FetcherRouter from "./fixtures/fetcher-router.svelte";
import { createTestWindow } from "./fixtures/browser-window.js";
import type {
  FetcherController,
  FormProps,
  RouteObject,
  SubmitTarget,
  FetcherSubmitOptions,
} from "svelte-router";

// svelte:defs
import { getContext } from "svelte";
import {
  createMemoryRouter,
  createBrowserRouter,
  createHashRouter,
  Outlet,
  Form,
  RouterProvider,
  useFetchers,
  useFetcher,
  useRouteError,
  isRouteErrorResponse,
  useLoaderData,
  redirect,
} from "svelte-router";
// sd

const ErrorView = html`<script>const error = useRouteError();</script><p data-testid="error">{error.current instanceof Error
  ? error.current.message : isRouteErrorResponse(error.current) ? error.current.status + " " + error.current.statusText : String(error.current)}</p>`;
const Observer = html`<script>
  const options = getContext("fetcher-fixture");
  const active = useFetchers();
  options.captureActive(active);
</script><p data-testid="root-active">{active.current.length}</p><Outlet />`;

type Instance = { fetcher: FetcherController; setKey(key: string): void };
async function mountFetchers(
  router: ReturnType<typeof createMemoryRouter>,
  options: {
    keys?: Record<string, string>;
    secondary?: boolean;
    form?: FormProps;
    keyedForm?: boolean;
  } = {}
) {
  const captures = new Map<string, Instance>();
  const capture = vi.fn((name: string, value: Instance) =>
    captures.set(name, value)
  );
  const captureActive =
    vi.fn<(value: ReturnType<typeof useFetchers>) => void>();
  const screen = await render(FetcherRouter, {
    router,
    options: { ...options, capture, captureActive },
  });
  return {
    screen,
    capture,
    get first() {
      return captures.get("first")!;
    },
    get second() {
      return captures.get("second")!;
    },
    get active() {
      return captureActive.mock.calls[0][0];
    },
    cleanup: async () => {
      await screen.unmount();
      router.dispose();
    },
  };
}

describe.each(["browser", "hash"] as const)(
  "useFetcher/useFetchers upstream %s DOM contract",
  mode => {
    let historyWindow: Awaited<ReturnType<typeof createTestWindow>>;
    beforeEach(async () => {
      historyWindow = await createTestWindow("/");
    });
    afterEach(() => historyWindow.dispose());
    // Keep upstream's BrowserRouter/HashRouter matrix. Each test owns real isolated
    // history; this local constructor accepts the initial-entry shorthand used below.
    const createTestRouter = (
      routes: RouteObject[],
      options: Parameters<typeof createBrowserRouter>[1] & {
        initialEntries?: string[];
      } = {}
    ) => {
      const { initialEntries, ...init } = options;
      const initial = initialEntries?.[0] ?? "/";
      historyWindow.window.history.replaceState(
        null,
        "",
        mode === "hash" ? `/#${initial}` : initial
      );
      return (mode === "browser" ? createBrowserRouter : createHashRouter)(
        routes,
        { ...init, window: historyWindow.window }
      );
    };

    it.each(["load", "submit"] as const)(
      "flushes the initial %s DOM update only when requested",
      async kind => {
        const pending = Promise.withResolvers<string>();
        const router = createTestRouter([
          { path: "/", Component: FetcherHost },
          {
            path: "/fetch",
            loader: () => pending.promise,
            action: () => pending.promise,
          },
        ]);
        const app = await mountFetchers(router);
        const updates = vi.fn();
        const unsubscribe = router.subscribe(updates);
        try {
          await expect.element(app.screen.getByTestId("first")).toBeVisible();
          const operation =
            kind === "load"
              ? app.first.fetcher.load("/fetch", { flushSync: true })
              : app.first.fetcher.submit(
                  {},
                  { action: "/fetch", method: "post", flushSync: true }
                );
          // No tick/auto-retrying assertion: callers can measure/focus the updated DOM
          // in the same event handler after asking for a synchronous initial update.
          expect(
            app.screen.getByTestId("first").element().textContent
          ).toContain(kind === "load" ? "loading" : "submitting");
          pending.resolve("DONE");
          await operation;
          await expect
            .element(app.screen.getByTestId("first"))
            .toHaveTextContent('idle:"DONE"');
          expect(updates.mock.calls[0][1].flushSync).toBe(true);
          expect(
            updates.mock.calls.slice(1).every(call => !call[1].flushSync)
          ).toBe(true);
        } finally {
          pending.resolve("DONE");
          unsubscribe();
          await app.cleanup();
        }
      }
    );

    it("retains the GET form result during POST and keeps action data after loader revalidation", async () => {
      const loading = Promise.withResolvers<void>();
      const submitting = Promise.withResolvers<void>();
      let count = 0;
      const Forms = html`<script>const fetcher = useFetcher();</script>
      <p data-testid="result">{fetcher.current.state}:{JSON.stringify(fetcher.current.data) ?? "empty"}</p>
      <Form navigate={false} fetcherKey={fetcher.key}><input name="increment" value="1" /><button>GET one</button></Form>
      <Form navigate={false} fetcherKey={fetcher.key} method="post"><button name="increment" value="10">POST ten</button></Form>`;
      const router = createTestRouter(
        [
          {
            id: "root",
            path: "/",
            Component: Forms,
            loader: async ({ request }) => {
              await loading.promise;
              count += Number(
                new URL(request.url).searchParams.get("increment") ?? "1"
              );
              return { count };
            },
            action: async ({ request }) => {
              await submitting.promise;
              count += Number((await request.formData()).get("increment"));
              return { count };
            },
          },
        ],
        { hydrationData: { loaderData: { root: null } } }
      );
      const screen = await render(
        html`<script>let { router } = $props();</script><RouterProvider {router} />`,
        { router }
      );
      try {
        const location = router.state.location;
        await expect
          .element(screen.getByTestId("result"))
          .toHaveTextContent("idle:empty");
        await screen.getByRole("button", { name: "GET one" }).click();
        await expect
          .element(screen.getByTestId("result"))
          .toHaveTextContent("loading:empty");
        loading.resolve();
        await expect
          .element(screen.getByTestId("result"))
          .toHaveTextContent('idle:{"count":1}');
        await screen.getByRole("button", { name: "POST ten" }).click();
        await expect
          .element(screen.getByTestId("result"))
          .toHaveTextContent('submitting:{"count":1}');
        submitting.resolve();
        await expect
          .element(screen.getByTestId("result"))
          .toHaveTextContent('idle:{"count":11}');
        expect(router.state.loaderData.root).toEqual({ count: 12 });
        expect(router.state.location).toBe(location);
      } finally {
        loading.resolve();
        submitting.resolve();
        await screen.unmount();
        router.dispose();
      }
    });
    it.each([
      { kind: "load", outcome: "success", remount: false },
      { kind: "submit", outcome: "success", remount: false },
      { kind: "form", outcome: "success", remount: false },
      { kind: "submit", outcome: "revalidation", remount: false },
      { kind: "submit", outcome: "revalidation", remount: true },
      { kind: "submit", outcome: "redirect", remount: false },
      { kind: "load", outcome: "error", remount: false },
      { kind: "load", outcome: "error", remount: true },
      { kind: "submit", outcome: "error", remount: false },
      { kind: "submit", outcome: "error", remount: true },
    ])(
      "persists $kind until $outcome (remounted owner: $remount)",
      async ({ kind, outcome, remount }) => {
        const pending = Promise.withResolvers<unknown>();
        let pageLoads = 0;
        const router = createTestRouter([
          {
            path: "/",
            Component: Observer,
            ErrorBoundary: ErrorView,
            children: [
              { index: true, Component: FetcherHost },
              {
                id: "page",
                path: "page",
                Component: remount ? FetcherHost : html`<h1>Page</h1>`,
                ...(outcome === "revalidation"
                  ? { loader: () => ++pageLoads }
                  : {}),
              },
              { path: "redirect", Component: html`<h1>Wrong redirect</h1>` },
            ],
          },
          {
            path: "/fetch",
            loader: () => pending.promise,
            action: () => pending.promise,
          },
        ]);
        const app = await mountFetchers(router, {
          keys: { first: "shared" },
          form: { method: "post", action: "/fetch" },
        });
        try {
          await expect.element(app.screen.getByTestId("first")).toBeVisible();
          const operation =
            kind === "load"
              ? app.first.fetcher.load("/fetch")
              : kind === "submit"
                ? app.first.fetcher.submit(
                    {},
                    { method: "post", action: "/fetch" }
                  )
                : undefined;
          if (kind === "form")
            await app.screen
              .getByRole("button", { name: "Submit first" })
              .click();
          await expect
            .element(app.screen.getByTestId("root-active"))
            .toHaveTextContent("1");
          await router.navigate("/page");
          await expect.poll(() => router.state.location.pathname).toBe("/page");
          if (remount)
            await expect
              .element(app.screen.getByTestId("first"))
              .toHaveTextContent(
                kind === "load" ? "loading:empty" : "submitting:empty"
              );
          else
            await expect
              .element(
                app.screen.getByRole("heading", { name: "Page", exact: true })
              )
              .toBeVisible();
          await expect
            .element(app.screen.getByTestId("root-active"))
            .toHaveTextContent("1");
          if (outcome === "error") pending.reject(new Error("FETCH ERROR"));
          else
            pending.resolve(
              outcome === "redirect" ? redirect("/redirect") : "FETCH"
            );
          await operation;
          if (outcome === "error" && remount) {
            await expect
              .element(app.screen.getByTestId("error"))
              .toHaveTextContent("FETCH ERROR");
          } else {
            await expect
              .element(app.screen.getByTestId("root-active"))
              .toHaveTextContent("0");
            expect(router.state.errors).toBeNull();
            expect(router.state.location.pathname).toBe("/page");
            if (outcome === "revalidation")
              expect(router.state.loaderData.page).toBe(2);
            if (remount)
              await expect
                .element(app.screen.getByTestId("first"))
                .toHaveTextContent('idle:"FETCH"');
          }
        } finally {
          pending.resolve(null);
          await app.cleanup();
        }
      }
    );

    it("revalidates a loaded fetcher after a navigation action, but not after its owner unmounts", async () => {
      const loader = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
      const router = createTestRouter([
        { path: "/", Component: FetcherHost, action: () => "ACTION" },
        { path: "/fetch", loader },
      ]);
      const app = await mountFetchers(router);
      try {
        await expect.element(app.screen.getByTestId("first")).toBeVisible();
        await app.first.fetcher.load("/fetch");
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent("idle:1");
        await router.navigate("/", {
          formMethod: "post",
          formData: new FormData(),
        });
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent("idle:2");
        await app.screen.getByRole("button", { name: "Toggle first" }).click();
        await router.navigate("/", {
          formMethod: "post",
          formData: new FormData(),
        });
        expect(loader).toHaveBeenCalledTimes(2);
        expect(router.state.actionData).toEqual({ "0": "ACTION" });
        expect(app.active.current).toEqual([]);
      } finally {
        await app.cleanup();
      }
    });

    for (const method of ["get", "post"] as const) {
      it.each(["navigation", "unkeyed", "keyed"])(
        `${method} Form %s has the correct navigation/data lifecycle`,
        async kind => {
          const loading = Promise.withResolvers<string>();
          const action = Promise.withResolvers<string>();
          const router = createTestRouter(
            [
              {
                id: "root",
                path: "/",
                Component: FetcherHost,
                loader: () => loading.promise,
                action: async ({ request }) =>
                  `${await action.promise}:${(await request.formData()).get("key")}`,
              },
            ],
            { hydrationData: { loaderData: { root: "INIT" } } }
          );
          const app = await mountFetchers(router, {
            keyedForm: kind === "keyed",
            form: {
              method,
              navigate: kind === "navigation" ? undefined : false,
            },
          });
          try {
            await expect.element(app.screen.getByTestId("first")).toBeVisible();
            const location = router.state.location;
            await app.screen
              .getByRole("button", { name: "Submit first" })
              .click();
            const initialState = method === "post" ? "submitting" : "loading";
            if (kind === "navigation") {
              expect(router.state.navigation.state).toBe(initialState);
              expect(app.active.current).toEqual([]);
            } else {
              expect(router.state.navigation.state).toBe("idle");
              expect(app.active.current.map(item => item.state)).toEqual([
                initialState,
              ]);
            }
            expect(router.state.location).toBe(location);
            expect(router.state.loaderData.root).toBe("INIT");
            if (method === "post") {
              action.resolve("ACTION");
              await expect
                .poll(() =>
                  kind === "navigation"
                    ? router.state.navigation.state
                    : app.active.current[0]?.state
                )
                .toBe("loading");
              expect(router.state.actionData).toEqual(
                kind === "navigation" ? { root: "ACTION:value" } : null
              );
              if (kind === "keyed")
                expect(app.first.fetcher.current.data).toBe("ACTION:value");
            }
            loading.resolve("LOADER");
            await expect.poll(() => router.state.navigation.state).toBe("idle");
            await expect.poll(() => app.active.current.length).toBe(0);
            if (kind === "navigation")
              expect(router.state.location.key).not.toBe(location.key);
            else expect(router.state.location).toBe(location);
            expect(router.state.loaderData.root).toBe(
              method === "post" || kind === "navigation" ? "LOADER" : "INIT"
            );
            if (kind === "keyed")
              expect(app.first.fetcher.current.data).toBe(
                method === "post" ? "ACTION:value" : "LOADER"
              );
            else expect(app.first.fetcher.current.data).toBeUndefined();
          } finally {
            loading.resolve("LOADER");
            action.resolve("ACTION");
            await app.cleanup();
          }
        }
      );
    }

    it("allows Svelte await blocks to own deferred fetcher errors without losing the fetched result", async () => {
      const pending = Promise.withResolvers<string>();
      const DeferredPage = html`<script>const fetcher = useFetcher();</script>
      <p>state:{fetcher.current.state}</p>
      {#if fetcher.current.data}
        {#await fetcher.current.data.value}<p>Loading 2</p>{:then value}<p>{value}</p>{:catch error}<p>{error.message}</p>{/await}
      {:else}<p>Loading 1</p>{/if}
      <button onclick={() => fetcher.load("/fetch")}>Fetch</button>`;
      const router = createTestRouter([
        { path: "/", Component: DeferredPage, ErrorBoundary: ErrorView },
        { path: "/fetch", loader: () => ({ value: pending.promise }) },
      ]);
      const screen = await render(
        html`<script>let { router } = $props();</script><RouterProvider {router} />`,
        { router }
      );
      try {
        await expect
          .element(screen.getByText("Loading 1", { exact: true }))
          .toBeVisible();
        await screen
          .getByRole("button", { name: "Fetch", exact: true })
          .click();
        await expect
          .element(screen.getByText("Loading 2", { exact: true }))
          .toBeVisible();
        await expect.element(screen.getByText("state:idle")).toBeVisible();
        pending.reject(new Error("deferred failure"));
        await expect
          .element(screen.getByText("deferred failure", { exact: true }))
          .toBeVisible();
        await expect
          .element(screen.getByRole("button", { name: "Fetch", exact: true }))
          .toBeVisible();
      } finally {
        pending.resolve("done");
        await screen.unmount();
        router.dispose();
      }
    });

    it("retains data through load/submit/revalidation, exposes promises, and never navigates", async () => {
      const load = Promise.withResolvers<unknown>();
      const action = Promise.withResolvers<unknown>();
      const revalidation = Promise.withResolvers<unknown>();
      const loader = vi
        .fn()
        .mockReturnValueOnce(load.promise)
        .mockReturnValueOnce(revalidation.promise);
      const router = createTestRouter(
        [
          {
            id: "root",
            path: "/",
            Component: FetcherHost,
            loader,
            action: () => action.promise,
          },
        ],
        { hydrationData: { loaderData: { root: "initial" } } }
      );
      const app = await mountFetchers(router);
      try {
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent("idle:empty");
        const fetcher = app.first.fetcher;
        const originalLocation = router.state.location;
        const done = vi.fn();
        const loading = fetcher.load("/").then(done);
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent("loading:empty");
        expect(app.active.current.map(item => [item.key, item.state])).toEqual([
          [fetcher.key, "loading"],
        ]);
        expect(done).not.toHaveBeenCalled();
        const payload = { date: new Date(), callback: () => true };
        load.resolve(payload);
        await loading;
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent(`idle:${JSON.stringify(payload)}`);
        expect(fetcher.current.data).toBe(payload);
        expect(fetcher.current).toBe(fetcher.current);
        expect(app.active.current).toEqual([]);
        done.mockClear();
        const submitting = fetcher
          .submit({ increment: "10" }, { method: "post" })
          .then(done);
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent(`submitting:${JSON.stringify(payload)}`);
        expect(fetcher.current.data).toBe(payload);
        expect(fetcher.current.formData?.get("increment")).toBe("10");
        action.resolve({ saved: true });
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent('loading:{"saved":true}');
        expect(done).not.toHaveBeenCalled();
        revalidation.resolve("refreshed");
        await submitting;
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent('idle:{"saved":true}');
        expect(router.state.loaderData.root).toBe("refreshed");
        expect(router.state.location).toBe(originalLocation);
        expect(app.capture).toHaveBeenCalledOnce();
        expect(done).toHaveBeenCalledOnce();
      } finally {
        load.resolve(null);
        action.resolve(null);
        revalidation.resolve(null);
        await app.cleanup();
      }
    });

    it("aborts a superseded load, ignores stale completions, and leaves other keys independent", async () => {
      const old = Promise.withResolvers<string>();
      const fresh = Promise.withResolvers<string>();
      const other = Promise.withResolvers<string>();
      const signals: AbortSignal[] = [];
      const router = createTestRouter([
        { path: "/", Component: FetcherHost },
        {
          path: "/fetch/:id",
          loader: ({ params, request }) => {
            signals.push(request.signal);
            return params.id === "old"
              ? old.promise
              : params.id === "new"
                ? fresh.promise
                : other.promise;
          },
        },
      ]);
      const app = await mountFetchers(router, { secondary: true });
      try {
        await expect.element(app.screen.getByTestId("second")).toBeVisible();
        const a = app.first.fetcher.load("/fetch/old");
        const b = app.second.fetcher.load("/fetch/other");
        const c = app.first.fetcher.load("/fetch/new");
        expect(signals[0].aborted).toBe(true);
        expect(signals[1].aborted).toBe(false);
        expect(app.first.fetcher.key).not.toBe(app.second.fetcher.key);
        await expect.poll(() => app.active.current.length).toBe(2);
        fresh.resolve("new");
        await c;
        old.resolve("old");
        await a;
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent('idle:"new"');
        await expect
          .element(app.screen.getByTestId("second"))
          .toHaveTextContent("loading:empty");
        other.resolve("other");
        await b;
        await expect
          .element(app.screen.getByTestId("second"))
          .toHaveTextContent('idle:"other"');
        expect(app.active.current).toEqual([]);
      } finally {
        old.resolve("old");
        fresh.resolve("new");
        other.resolve("other");
        await app.cleanup();
      }
    });

    it("shares keyed data, switches a live key, and clears it after the final owner unmounts", async () => {
      let count = 0;
      const router = createTestRouter([
        { path: "/", Component: FetcherHost },
        { path: "fetch", loader: () => ++count },
      ]);
      const app = await mountFetchers(router, {
        keys: { first: "shared", second: "shared" },
        secondary: true,
      });
      try {
        await expect.element(app.screen.getByTestId("second")).toBeVisible();
        await app.first.fetcher.load("/fetch");
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent("idle:1");
        await expect
          .element(app.screen.getByTestId("second"))
          .toHaveTextContent("idle:1");
        app.first.setKey("new");
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent("idle:empty");
        expect(app.first.fetcher.key).toBe("new");
        await app.first.fetcher.load("/fetch");
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent("idle:2");
        await expect
          .element(app.screen.getByTestId("second"))
          .toHaveTextContent("idle:1");
        await app.screen.getByRole("button", { name: "Toggle second" }).click();
        await app.screen.getByRole("button", { name: "Toggle second" }).click();
        await expect
          .element(app.screen.getByTestId("second"))
          .toHaveTextContent("idle:empty");
        await app.second.fetcher.load("/fetch");
        await expect
          .element(app.screen.getByTestId("second"))
          .toHaveTextContent("idle:3");
      } finally {
        await app.cleanup();
      }
    });

    it("keeps the controller and commands stable across retained route navigation", async () => {
      const router = createTestRouter(
        [
          {
            path: "/:id",
            Component: FetcherHost,
            loader: ({ params }) => params.id,
          },
        ],
        { initialEntries: ["/one"] }
      );
      const app = await mountFetchers(router);
      try {
        await expect.element(app.screen.getByTestId("first")).toBeVisible();
        const controller = app.first.fetcher;
        const { load, submit } = controller;
        await router.navigate("/two?changed");
        expect(app.first.fetcher).toBe(controller);
        expect(app.first.fetcher.load).toBe(load);
        expect(app.first.fetcher.submit).toBe(submit);
        await load(".");
        await expect
          .element(app.screen.getByTestId("first"))
          .toHaveTextContent('idle:"two"');
        expect(app.capture).toHaveBeenCalledOnce();
      } finally {
        await app.cleanup();
      }
    });

    it.each([
      { encType: undefined, body: { key: "value" } },
      {
        encType: "application/x-www-form-urlencoded" as const,
        body: { key: "value" },
      },
      { encType: "application/json" as const, body: { key: "value" } },
      { encType: "text/plain" as const, body: "Look ma, no FormData!" },
    ])(
      "serializes $encType and exposes the exact in-flight payload",
      async ({ encType, body }) => {
        const result = Promise.withResolvers<null>();
        const action = vi.fn(() => result.promise);
        const router = createTestRouter([
          { path: "/", Component: FetcherHost, action },
        ]);
        const app = await mountFetchers(router);
        try {
          await expect.element(app.screen.getByTestId("first")).toBeVisible();
          const request = app.first.fetcher.submit(body, {
            method: "post",
            encType,
          });
          await expect.poll(() => action.mock.calls.length).toBe(1);
          const pending = app.first.fetcher.current;
          const submitted = (
            action.mock.calls[0] as unknown as [{ request: Request }]
          )[0].request;
          expect(pending.state).toBe("submitting");
          if (encType === "application/json") {
            expect(pending.json).toBe(body);
            expect(pending.formData).toBeUndefined();
            expect(pending.text).toBeUndefined();
            expect(await submitted.json()).toEqual(body);
          } else if (encType === "text/plain") {
            expect(pending.text).toBe(body);
            expect(pending.formData).toBeUndefined();
            expect(pending.json).toBeUndefined();
            expect(await submitted.text()).toBe(body);
          } else {
            expect(pending.formData?.get("key")).toBe("value");
            expect(pending.text).toBeUndefined();
            expect(pending.json).toBeUndefined();
            expect((await submitted.formData()).get("key")).toBe("value");
          }
          result.resolve(null);
          await request;
        } finally {
          result.resolve(null);
          await app.cleanup();
        }
      }
    );

    it.each([
      { kind: "load", action: "/parent", expected: "PARENT LOADER" },
      { kind: "load", action: "/parent?index", expected: "INDEX LOADER" },
      { kind: "get", action: undefined, expected: "INDEX LOADER" },
      { kind: "get", action: "/parent", expected: "PARENT LOADER" },
      { kind: "get", action: "/parent?index", expected: "INDEX LOADER" },
      { kind: "post", action: "/parent", expected: "PARENT ACTION" },
      { kind: "post", action: "/parent?index", expected: "INDEX ACTION" },
    ])(
      "routes $kind $action to $expected",
      async ({ kind, action, expected }) => {
        const router = createTestRouter(
          [
            {
              id: "parent",
              path: "/parent",
              Component: Outlet,
              loader: () => "PARENT LOADER",
              action: () => "PARENT ACTION",
              children: [
                {
                  id: "index",
                  index: true,
                  Component: FetcherHost,
                  loader: () => "INDEX LOADER",
                  action: () => "INDEX ACTION",
                },
              ],
            },
          ],
          {
            initialEntries: ["/parent"],
            hydrationData: { loaderData: { parent: null, index: null } },
          }
        );
        const app = await mountFetchers(router);
        try {
          await expect.element(app.screen.getByTestId("first")).toBeVisible();
          if (kind === "load") await app.first.fetcher.load(action!);
          else
            await app.first.fetcher.submit(
              {},
              { method: kind as "get" | "post", action }
            );
          await expect
            .element(app.screen.getByTestId("first"))
            .toHaveTextContent(`idle:${JSON.stringify(expected)}`);
          expect(router.state.location.pathname).toBe("/parent");
        } finally {
          await app.cleanup();
        }
      }
    );

    it.each(["load", "submit", "form-get", "form-post", "404"])(
      "routes %s failures to the calling route boundary, not the target",
      async kind => {
        const failure = () => {
          throw new Error("Kaboom!");
        };
        const router = createTestRouter(
          [
            {
              path: "/",
              Component: Outlet,
              ErrorBoundary: html`<p>Wrong parent</p>`,
              children: [
                {
                  path: "child",
                  Component: FetcherHost,
                  ErrorBoundary: ErrorView,
                },
                {
                  path: "fetch",
                  loader: failure,
                  action: failure,
                  ErrorBoundary: html`<p>Wrong target</p>`,
                },
              ],
            },
          ],
          { initialEntries: ["/child"] }
        );
        const app = await mountFetchers(router, {
          form: {
            action: "/fetch",
            method: kind === "form-get" ? "get" : "post",
          },
        });
        try {
          await expect.element(app.screen.getByTestId("first")).toBeVisible();
          if (kind.startsWith("form"))
            await app.screen
              .getByRole("button", { name: "Submit first" })
              .click();
          else if (kind === "submit")
            await app.first.fetcher.submit(
              {},
              { method: "post", action: "/fetch" }
            );
          else
            await app.first.fetcher.load(kind === "404" ? "/absent" : "/fetch");
          await expect
            .element(app.screen.getByTestId("error"))
            .toHaveTextContent(kind === "404" ? "404 Not Found" : "Kaboom!");
          expect(router.state.location.pathname).toBe("/child");
          expect(app.screen.container.textContent).not.toContain("Wrong");
        } finally {
          await app.cleanup();
        }
      }
    );

    it.each(["browser", "hash"])(
      "%s basename applies to load, submit GET/POST, and Form",
      async mode => {
        const testWindow = await createTestWindow(
          mode === "hash" ? "/#/base/parent" : "/base/parent"
        );
        const requests: Request[] = [];
        const operation = ({ request }: { request: Request }) => {
          requests.push(request);
          return new URL(request.url).pathname;
        };
        const routes: RouteObject[] = [
          { path: "/parent", Component: FetcherHost },
          { path: "/fetch", loader: operation, action: operation },
        ];
        const create = mode === "hash" ? createHashRouter : createBrowserRouter;
        const router = create(routes, {
          basename: "/base",
          window: testWindow.window,
        });
        const app = await mountFetchers(router, {
          form: { method: "post", action: "/fetch" },
        });
        try {
          await expect.element(app.screen.getByTestId("first")).toBeVisible();
          await app.first.fetcher.load("/fetch");
          await app.first.fetcher.submit(
            {},
            { method: "get", action: "/fetch" }
          );
          await app.first.fetcher.submit(
            {},
            { method: "post", action: "/fetch" }
          );
          await app.screen
            .getByRole("button", { name: "Submit first" })
            .click();
          await expect.poll(() => requests.length).toBe(4);
          expect(
            requests.map(request => [
              new URL(request.url).pathname,
              request.method,
            ])
          ).toEqual([
            ["/base/fetch", "GET"],
            ["/base/fetch", "GET"],
            ["/base/fetch", "POST"],
            ["/base/fetch", "POST"],
          ]);
          await expect
            .element(app.screen.getByTestId("first"))
            .toHaveTextContent('idle:"/base/fetch"');
          expect(router.state.location.pathname).toBe("/base/parent");
        } finally {
          await app.cleanup();
          testWindow.dispose();
        }
      }
    );
  }
);
