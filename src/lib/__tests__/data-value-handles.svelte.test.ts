import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";

// svelte:defs
import { onDestroy } from "svelte";
import {
  RouterProvider, createMemoryRouter, Outlet, Form,
  useLoaderData, useActionData, useMatches, useRouteLoaderData, useRouteId,
  useNavigation, useRevalidator, useRouteError, useOutletContext, useFormAction,
  useNavigate, useLocation,
  useViewTransitionState,
} from "svelte-router";
// sd

describe("data-router value handles", () => {
  it("updates a retained error view when loader errors change and recovers on success", async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error("first failure"))
      .mockRejectedValueOnce(new Error("second failure")).mockResolvedValue({ ok: true });
    const ErrorView = html`<script>
      const error = useRouteError();
      let count = $state(0);
      let read = $state("");
    </script>
    <p>error:{error.current instanceof Error ? error.current.message : "unknown"}</p>
    <button onclick={() => count++}>count:{count}</button>
    <button onclick={() => read = error.current.message}>Read error</button><p>read:{read}</p>`;
    const router = createMemoryRouter([{
      path: "/", loader, Component: html`<p>Recovered</p>`, ErrorBoundary: ErrorView,
    }]);
    const screen = await render(html`<script>let { router } = $props();</script><RouterProvider {router} />`, { router });
    try {
      await expect.element(screen.getByText("error:first failure")).toBeVisible();
      await screen.getByRole("button", { name: "count:0" }).click();
      await router.revalidate();
      await expect.element(screen.getByText("error:second failure")).toBeVisible();
      await expect.element(screen.getByRole("button", { name: "count:1" })).toBeVisible();
      await screen.getByRole("button", { name: "Read error" }).click();
      await expect.element(screen.getByText("read:second failure")).toBeVisible();
      await router.revalidate();
      await expect.element(screen.getByText("Recovered")).toBeVisible();
    } finally {
      await screen.unmount();
      router.dispose();
    }
  });

  it("tracks a view transition and a changing target under a basename", async () => {
    const finished = Promise.withResolvers<void>();
    const descriptor = Object.getOwnPropertyDescriptor(document, "startViewTransition");
    const start = vi.fn((update: () => void | Promise<void>) => {
      const updateCallbackDone = Promise.resolve().then(update);
      return {
        updateCallbackDone, ready: updateCallbackDone,
        finished: Promise.all([finished.promise, updateCallbackDone]),
        skipTransition: () => finished.resolve(),
      };
    });
    Object.defineProperty(document, "startViewTransition", { configurable: true, value: start });
    const Page = html`<script>
      let target = $state("/items/one");
      const transitioning = useViewTransitionState(() => target);
    </script>
    <p>transition:{String(transitioning.current)}</p>
    <button onclick={() => target = "/absent"}>Unrelated</button>
    <button onclick={() => target = "/items/two"}>Destination</button>`;
    const router = createMemoryRouter([{ path: "items/:id", Component: Page }], {
      basename: "/base", initialEntries: ["/base/items/one"],
    });
    const screen = await render(html`<script>let { router } = $props();</script><RouterProvider {router} />`, { router });
    try {
      await expect.element(screen.getByText("transition:false")).toBeVisible();
      await router.navigate("/items/two", { viewTransition: true });
      await expect.element(screen.getByText("transition:true")).toBeVisible();
      await screen.getByRole("button", { name: "Unrelated" }).click();
      await expect.element(screen.getByText("transition:false")).toBeVisible();
      await screen.getByRole("button", { name: "Destination" }).click();
      await expect.element(screen.getByText("transition:true")).toBeVisible();
      finished.resolve();
      await expect.element(screen.getByText("transition:false")).toBeVisible();
      expect(start).toHaveBeenCalledOnce();
    } finally {
      finished.resolve();
      await screen.unmount();
      router.dispose();
      if (descriptor) Object.defineProperty(document, "startViewTransition", descriptor);
      else Reflect.deleteProperty(document, "startViewTransition");
    }
  });

  it("retains cached data handles through loading, submitting, and revalidation", async () => {
    type Data = { label: string };
    const first: Data = { label: "one" };
    const second: Data = { label: "two" };
    const nextLoad = Promise.withResolvers<Data>();
    const nextAction = Promise.withResolvers<{ message: string }>();
    const nextRevalidation = Promise.withResolvers<Data>();
    const loader = vi.fn<() => Promise<Data>>().mockResolvedValue(second)
      .mockResolvedValueOnce(first).mockReturnValueOnce(nextLoad.promise);
    const action = vi.fn(() => nextAction.promise);
    const capture = vi.fn<(handles: {
      data: ReturnType<typeof useLoaderData<Data>>;
      action: ReturnType<typeof useActionData<{ message: string }>>;
      matches: ReturnType<typeof useMatches>;
      revalidator: ReturnType<typeof useRevalidator>;
      navigation: ReturnType<typeof useNavigation>;
    }) => void>();
    const ready = vi.fn<(router: ReturnType<typeof createMemoryRouter>) => void>();
    const Page = html`<script lang="ts">
      let { capture } = $props();
      const data = useLoaderData<{ label: string }>();
      const action = useActionData<{ message: string }>();
      const matches = useMatches();
      const routeId = useRouteId();
      const navigation = useNavigation();
      const revalidator = useRevalidator();
      let selectedId = $state("page");
      const selected = useRouteLoaderData<{ label: string }>(() => selectedId);
      let read = $state("");
      capture({ data, action, matches, navigation, revalidator });
    </script>
    <p>data:{data.current?.label ?? "loading"}</p><p>route:{routeId.current}</p>
    <p>navigation:{navigation.current.state}</p>
    <p>revalidation:{revalidator.state}</p>
    <p>action:{action.current?.message ?? "none"}</p>
    <p>selected:{selected.current?.label ?? "missing"}</p>
    <button onclick={() => selectedId = selectedId === "page" ? "root" : "absent"}>Select</button>
    <button onclick={() => read = data.current?.label + ":" + revalidator.state}>Read</button>
    <p>read:{read}</p>`;
    const screen = await render(scope(Page).html`<script>
      let { loader, action, capture, ready } = $props();
      const router = createMemoryRouter([{
        id: "root", path: "/", Component: Outlet, loader: () => ({ label: "root" }),
        children: [{ id: "page", path: "items/:id", element: page,
          loader: () => loader(), action: () => action() }],
      }], { initialEntries: ["/items/one"] });
      ready(router);
      onDestroy(() => router.dispose());
    </script>
    {#snippet page()}<Page {capture} />{/snippet}
    <RouterProvider {router} />`, { loader, action, capture, ready });

    await expect.element(screen.getByText("data:one")).toBeVisible();
    await expect.element(screen.getByText("route:page")).toBeVisible();
    const router = ready.mock.calls[0][0];
    const handles = capture.mock.calls[0][0];
    expect(handles.data.current).toBe(first);
    expect(handles.matches.current).toBe(handles.matches.current);
    const firstMatches = handles.matches.current;
    const navigation = router.navigate("/items/two");
    await expect.element(screen.getByText("navigation:loading")).toBeVisible();
    expect(handles.navigation.current.location?.pathname).toBe("/items/two");
    expect(handles.data.current).toBe(first);
    nextLoad.resolve(second);
    await navigation;
    await expect.element(screen.getByText("data:two")).toBeVisible();
    expect(capture).toHaveBeenCalledOnce();
    expect(handles.data.current).toBe(second);
    expect(handles.matches.current).not.toBe(firstMatches);
    expect(handles.matches.current).toBe(handles.matches.current);
    expect(handles.matches.current.at(-1)?.data).toBe(second);
    await screen.getByRole("button", { name: "Select" }).click();
    await expect.element(screen.getByText("selected:root")).toBeVisible();
    await screen.getByRole("button", { name: "Select" }).click();
    await expect.element(screen.getByText("selected:missing")).toBeVisible();

    const formData = new FormData();
    formData.set("message", "hello");
    const submission = router.navigate("/items/two", { formMethod: "post", formData });
    await expect.element(screen.getByText("navigation:submitting")).toBeVisible();
    expect(handles.navigation.current.formData?.get("message")).toBe("hello");
    nextAction.resolve({ message: "saved" });
    await submission;
    await expect.element(screen.getByText("action:saved")).toBeVisible();
    expect(handles.action.current?.message).toBe("saved");

    loader.mockReturnValueOnce(nextRevalidation.promise);
    const revalidating = handles.revalidator.revalidate();
    await expect.element(screen.getByText("revalidation:loading")).toBeVisible();
    expect(handles.revalidator.state).toBe("loading");
    nextRevalidation.resolve({ label: "refreshed" });
    await revalidating;
    await expect.element(screen.getByText("data:refreshed")).toBeVisible();
    expect(handles.revalidator.state).toBe("idle");
    await screen.getByRole("button", { name: "Read", exact: true }).click();
    await expect.element(screen.getByText("read:refreshed:idle")).toBeVisible();
    expect(capture).toHaveBeenCalledOnce();
    await screen.unmount();
  });

  it("updates Outlet context and form destinations in a retained index route", async () => {
    const submitted = vi.fn<(target: string) => void>();
    const Page = html`<script>
      const context = useOutletContext();
      const location = useLocation();
      let action = $state(undefined);
      const destination = useFormAction(() => action);
      let read = $state("");
    </script>
    <p>context:{context.current.label}</p><p>destination:{destination.current}</p>
    <button onclick={() => action = "/save"}>Set action</button>
    <button onclick={() => read = context.current.label + ":" + destination.current}>Read</button>
    <p>read:{read}</p>
    <Form {action} method="post"><button type="submit">Submit</button></Form>`;
    const Layout = html`<script>
      let context = $state.raw({ label: "first" });
      const navigate = useNavigate();
    </script>
    <button onclick={() => context = { label: "second" }}>Context</button>
    <button onclick={() => navigate("?q=two&index=keep&index")}>Search</button>
    <Outlet {context} />`;
    const router = createMemoryRouter([{
      path: "/", Component: Layout,
      children: [{ index: true, Component: Page, action: () => { submitted("index"); return null; } }],
    }, { path: "/save", action: () => { submitted("save"); return null; } }], {
      basename: "/base", initialEntries: ["/base/?q=one"],
    });
    const screen = await render(html`<script>let { router } = $props();</script><RouterProvider {router} />`, { router });
    try {
      await expect.element(screen.getByText("destination:/base?index&q=one")).toBeVisible();
      await screen.getByRole("button", { name: "Context", exact: true }).click();
      await expect.element(screen.getByText("context:second")).toBeVisible();
      await screen.getByRole("button", { name: "Search", exact: true }).click();
      await expect.element(screen.getByText("destination:/base?index&q=two&index=keep")).toBeVisible();
      await screen.getByRole("button", { name: "Set action" }).click();
      await screen.getByRole("button", { name: "Read", exact: true }).click();
      await expect.element(screen.getByText("read:second:/base/save")).toBeVisible();
      await screen.getByRole("button", { name: "Submit", exact: true }).click();
      await expect.poll(() => submitted.mock.calls).toEqual([["save"]]);
    } finally {
      await screen.unmount();
      router.dispose();
    }
  });
});
