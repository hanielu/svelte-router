import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";
import type { Blocker } from "../core/router/router.js";

// svelte:defs
import {
  createMemoryRouter,
  RouterProvider,
  Link,
  Outlet,
  useBlocker,
  useNavigate,
} from "svelte-router";
// sd

describe("useBlocker", () => {
  it("blocks, resets, and proceeds through in-app navigation", async () => {
    const FormPage = html`<script>
        let dirty = $state(true);
        const navigate = useNavigate();
        const blocker = useBlocker(() => dirty);
      </script>

      <h1>Form</h1>
      <p>state:{blocker.state}</p>
      <button onclick={() => navigate("/next")}>Leave</button>
      {#if blocker.state === "blocked"}
        <button onclick={() => blocker.reset?.()}>Stay</button>
        <button onclick={() => blocker.proceed?.()}>Proceed</button>
      {/if}`;

    const router = createMemoryRouter([
      { path: "/", Component: FormPage },
      { path: "/next", Component: html`<h1>Next</h1>` },
    ]);
    const screen = await render(
      html`<script>
          let { router } = $props();
        </script>
        <RouterProvider {router} />`,
      { router }
    );

    await screen.getByRole("button", { name: "Leave" }).click();
    await expect.element(screen.getByText("state:blocked")).toBeVisible();
    await expect.element(screen.getByText("Form")).toBeVisible();

    await screen.getByRole("button", { name: "Stay" }).click();
    await expect.element(screen.getByText("state:unblocked")).toBeVisible();

    await screen.getByRole("button", { name: "Leave" }).click();
    await screen.getByRole("button", { name: "Proceed" }).click();
    await expect.element(screen.getByText("Next")).toBeVisible();
  });
});

const BlockerPage = html`<script>
  let { capture, predicate, initiallyDirty = true, action } = $props();
  let dirty = $state(initiallyDirty);
  const blocker = useBlocker(args => predicate ? predicate(args, dirty) : dirty);
  const navigate = useNavigate();
  capture(blocker);
</script>
<p data-testid="blocker-state">{blocker.state}</p>
<Link to="/about" replace={action === "REPLACE"}>About</Link>
<Link to="/contact">Contact</Link>
<button onclick={() => navigate(-1)}>Back</button>
<button onclick={() => dirty = !dirty}>Toggle dirty</button>
{#if blocker.state === "blocked"}
  <button onclick={() => blocker.proceed()}>Proceed</button>
  <button onclick={() => blocker.reset()}>Reset</button>
{/if}
<Outlet />`;

const BlockerApp = scope(BlockerPage).html`<script>
  let { capture, predicate, initiallyDirty, action, loader, basename = "/", captureRouter } = $props();
  const prefix = basename === "/" ? "" : basename;
  const router = createMemoryRouter([{ element: layout, children: [
    { path: "/", element: home },
    { path: "about", loader, element: about },
    { path: "contact", element: contact },
  ] }], {
    basename,
    initialEntries: (action === "POP" ? ["/", "/about", "/contact"] : ["/"]).map(path => prefix + path),
  });
  captureRouter(router);
  $effect(() => () => router.dispose());
</script>
{#snippet layout()}<BlockerPage {capture} {predicate} {initiallyDirty} {action} />{/snippet}
{#snippet home()}<h1>Home</h1>{/snippet}
{#snippet about()}<h1>About</h1>{/snippet}
{#snippet contact()}<h1>Contact</h1>{/snippet}
<RouterProvider {router} />`;

function blockerSnapshot(blocker: Blocker) {
  return { state: blocker.state, location: blocker.location, proceed: blocker.proceed, reset: blocker.reset };
}
const unblocked = { state: "unblocked", location: undefined, proceed: undefined, reset: undefined };

describe.each(["PUSH", "REPLACE", "POP"])("upstream useBlocker: %s", action => {
  it.each(["allow", "reset", "proceed"])("%s: complete location, state and method transitions", async decision => {
    const pending = Promise.withResolvers<null>();
    const loader = vi.fn(() => pending.promise);
    const capture = vi.fn<(blocker: Blocker) => void>();
    const captureRouter = vi.fn<(router: ReturnType<typeof createMemoryRouter>) => void>();
    const predicate = vi.fn((_args, dirty: boolean) => dirty);
    const screen = await render(BlockerApp, { action, initiallyDirty: decision !== "allow", capture, captureRouter, predicate, loader });
    const blocker = capture.mock.calls[0][0];
    const router = captureRouter.mock.calls[0][0];
    const initialPath = action === "POP" ? "/contact" : "/";
    const initialHeading = action === "POP" ? "Contact" : "Home";
    expect(blockerSnapshot(blocker)).toEqual(unblocked);
    const start = () => action === "POP"
      ? screen.getByRole("button", { name: "Back" }).click()
      : screen.getByRole("link", { name: "About" }).click();
    await start();
    expect(predicate).toHaveBeenCalledWith({
      currentLocation: expect.objectContaining({ pathname: initialPath }),
      nextLocation: expect.objectContaining({ pathname: "/about" }),
      historyAction: action,
    }, decision !== "allow");
    await expect.element(screen.getByRole("heading", { name: initialHeading })).toBeVisible();
    expect(router.state.location.pathname).toBe(initialPath);

    if (decision === "allow") {
      expect(blockerSnapshot(blocker)).toEqual(unblocked);
      expect(router.state.navigation.state).toBe("loading");
    } else {
      const blocked = {
        state: "blocked", location: expect.objectContaining({ pathname: "/about" }),
        proceed: expect.any(Function), reset: expect.any(Function),
      };
      expect(blockerSnapshot(blocker)).toEqual(blocked);
      expect(loader).not.toHaveBeenCalled();
      // The navigation command has completed but the block persists.
      await Promise.resolve();
      expect(blockerSnapshot(blocker)).toEqual(blocked);
      if (decision === "reset") {
        await screen.getByRole("button", { name: "Reset" }).click();
        expect(blockerSnapshot(blocker)).toEqual(unblocked);
        pending.resolve(null);
        await Promise.resolve();
        expect(loader).not.toHaveBeenCalled();
        expect(router.state.location.pathname).toBe(initialPath);
        await expect.element(screen.getByRole("heading", { name: initialHeading })).toBeVisible();
        // Reset must also restore the history cursor, especially after POP.
        await screen.getByRole("button", { name: "Toggle dirty" }).click();
        await start();
      } else {
        await screen.getByRole("button", { name: "Proceed" }).click();
        expect(blockerSnapshot(blocker)).toEqual({
          state: "proceeding", location: expect.objectContaining({ pathname: "/about" }),
          proceed: undefined, reset: undefined,
        });
        expect(router.state.navigation.state).toBe("loading");
        expect(router.state.location.pathname).toBe(initialPath);
      }
    }

    pending.resolve(null);
    await expect.element(screen.getByRole("heading", { name: "About" })).toBeVisible();
    expect(blockerSnapshot(blocker)).toEqual(unblocked);
    expect(router.state.location.pathname).toBe("/about");
    expect(router.state.historyAction).toBe(action);
    expect(loader).toHaveBeenCalledOnce();
    expect(capture).toHaveBeenCalledOnce();
    // Remove the component's registration without disposing the externally visible engine first.
    screen.unmount();
    expect(router.state.blockers.size).toBe(0);
  });
});

describe("upstream useBlocker lifetime", () => {
  it("initializes with a boolean false and releases its registration", async () => {
    const capture = vi.fn<(blocker: Blocker) => void>();
    const Page = html`<script>
      let { capture } = $props();
      const blocker = useBlocker(false);
      capture(blocker);
    </script>`;
    const App = scope(Page).html`<script>
      let { capture, captureRouter } = $props();
      const router = createMemoryRouter([{ path: "/", element: page }]);
      captureRouter(router);
    </script>
    {#snippet page()}<Page {capture} />{/snippet}
    <RouterProvider {router} />`;
    const captureRouter = vi.fn();
    const screen = await render(App, { capture, captureRouter });
    const router = captureRouter.mock.calls[0][0];
    expect(blockerSnapshot(capture.mock.calls[0][0])).toEqual(unblocked);
    screen.unmount();
    expect(router.state.blockers.size).toBe(0);
    router.dispose();
  });

  it("strips basename before invoking the blocker predicate", async () => {
    const predicate = vi.fn(() => false);
    const captureRouter = vi.fn();
    const screen = await render(BlockerApp, { capture: vi.fn(), captureRouter, predicate,
      initiallyDirty: true, action: "PUSH", basename: "/base", loader: () => null });
    await expect.element(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/base/about");
    await screen.getByRole("link", { name: "About" }).click();
    await expect.element(screen.getByRole("heading", { name: "About" })).toBeVisible();
    expect(predicate).toHaveBeenCalledWith({
      currentLocation: expect.objectContaining({ pathname: "/" }),
      nextLocation: expect.objectContaining({ pathname: "/about" }),
      historyAction: "PUSH",
    }, true);
    expect(captureRouter.mock.calls[0][0].state.location.pathname).toBe("/base/about");
  });

  it("reuses a layout blocker across multiple blocked navigations without registration loops", async () => {
    const capture = vi.fn<(blocker: Blocker) => void>();
    const captureRouter = vi.fn();
    const screen = await render(BlockerApp, { capture, captureRouter, initiallyDirty: true,
      action: "PUSH", loader: () => null });
    const blocker = capture.mock.calls[0][0];
    for (const heading of ["About", "Contact"]) {
      await screen.getByRole("link", { name: heading }).click();
      expect(blocker.state).toBe("blocked");
      await screen.getByRole("button", { name: "Proceed" }).click();
      await expect.element(screen.getByRole("heading", { name: heading })).toBeVisible();
      expect(blockerSnapshot(blocker)).toEqual(unblocked);
    }
    expect(capture).toHaveBeenCalledOnce();
    expect(captureRouter.mock.calls[0][0].state.blockers.size).toBe(1);
    // A live closure takes the place of React's per-render callback identity.
    await screen.getByRole("button", { name: "Toggle dirty" }).click();
    await screen.getByRole("link", { name: "About" }).click();
    await expect.element(screen.getByRole("heading", { name: "About" })).toBeVisible();
    expect(blockerSnapshot(blocker)).toEqual(unblocked);
    expect(capture).toHaveBeenCalledOnce();
  });
});
