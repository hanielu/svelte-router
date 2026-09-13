import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";
import { createTestWindow } from "./fixtures/browser-window.js";

// svelte:defs
import { MemoryRouter, Routes, Route, useSearchParams, useLocation, useBlocker, createBrowserRouter, RouterProvider } from "svelte-router";
// sd

describe("upstream useSearchParams", () => {
  it.each([false, true])("reads and writes query strings, functional=%s", async functional => {
    const Page = html`<script>
      let { functional } = $props();
      const [params, setParams] = useSearchParams({ q: "" });
      let query = $state("Michael Jackson");
      function submit(event) {
        event.preventDefault();
        setParams(functional ? prev => {
          prev.set("q", prev.get("q") + " - appended");
          prev.set("new", "Ryan Florence");
          return prev;
        } : { q: query });
      }
    </script>
    <p data-testid="query">{params.current.get("q")}</p>
    <p data-testid="new-query">{params.current.get("new") ?? ""}</p>
    <form onsubmit={submit}>
      <input aria-label="Query" bind:value={query} /><button>Search</button>
    </form>`;
    const screen = render(scope(Page).html`<script>let { functional } = $props();</script>
      <MemoryRouter initialEntries={["/search?q=Michael+Jackson"]}>
        <Routes><Route path="search">{#snippet element()}<Page {functional} />{/snippet}</Route></Routes>
      </MemoryRouter>`, { functional });
    await expect.element(screen.getByTestId("query")).toHaveTextContent("Michael Jackson");
    await screen.getByRole("textbox", { name: "Query" }).fill("Ryan Florence");
    await screen.getByRole("button", { name: "Search" }).click();
    await expect.element(screen.getByTestId("query")).toHaveTextContent(functional ? "Michael Jackson - appended" : "Ryan Florence");
    if (functional) await expect.element(screen.getByTestId("new-query")).toHaveTextContent("Ryan Florence");
  });

  it("merges defaults without changing the URL and permits removing them", async () => {
    const Page = html`<script>
      const [params, setParams] = useSearchParams({ a: "1", b: "2", value: "initial" });
      const location = useLocation();
    </script>
    <p data-testid="params">{params.current.toString()}</p>
    <p data-testid="search">{location.current.search}</p>
    <button onclick={() => setParams({})}>Clear</button>`;
    const screen = render(scope(Page).html`<MemoryRouter initialEntries={["/search?value=initial"]}>
      <Routes><Route path="search" Component={Page} /></Routes>
    </MemoryRouter>`);
    await expect.element(screen.getByTestId("params")).toHaveTextContent("value=initial&a=1&b=2");
    await expect.element(screen.getByTestId("search")).toHaveTextContent("?value=initial");
    await screen.getByRole("button", { name: "Clear" }).click();
    // Svelte retains an empty text node; it is the query value that must be empty.
    await expect.poll(() => screen.getByTestId("params").element().textContent).toBe("");
    await expect.poll(() => screen.getByTestId("search").element().textContent).toBe("");
  });

  it("does not expose functional-update mutation when browser navigation is blocked", async () => {
    const isolated = await createTestWindow("/");
    const Page = html`<script>
      const location = useLocation();
      const [params, setParams] = useSearchParams();
      let shouldBlock = $state(false);
      const blocker = useBlocker(() => shouldBlock);
      const update = value => setParams(prev => { prev.set("foo", value); return prev; });
    </script>
    <p data-testid="output">{location.current.search}|{params.current.toString()}|{blocker.state}</p>
    <button onclick={() => shouldBlock = !shouldBlock}>Toggle blocking</button>
    <button onclick={() => update("bar")}>First</button>
    <button onclick={() => update("baz")}>Second</button>
    {#if blocker.state === "blocked"}<button onclick={() => blocker.proceed()}>Proceed</button>{/if}`;
    const router = createBrowserRouter([{ path: "/", Component: Page }], { window: isolated.window });
    try {
      const screen = render(html`<script>let { router } = $props();</script><RouterProvider {router} />`, { router });
      await expect.element(screen.getByTestId("output")).toHaveTextContent("||unblocked");
      await screen.getByRole("button", { name: "First" }).click();
      await expect.element(screen.getByTestId("output")).toHaveTextContent("?foo=bar|foo=bar|unblocked");
      await screen.getByRole("button", { name: "Toggle blocking" }).click();
      await screen.getByRole("button", { name: "Second" }).click();
      await expect.element(screen.getByTestId("output")).toHaveTextContent("?foo=bar|foo=bar|blocked");
      expect(isolated.window.location.search).toBe("?foo=bar");
      await screen.getByRole("button", { name: "Proceed" }).click();
      await expect.element(screen.getByTestId("output")).toHaveTextContent("?foo=baz|foo=baz|unblocked");
      screen.unmount();
    } finally { router.dispose(); isolated.dispose(); }
  });
});
