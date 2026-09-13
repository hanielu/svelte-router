import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";

// svelte:defs
import { MemoryRouter, Routes, Route, Outlet, useParams, useMatch } from "svelte-router";
// sd

const Params = html`<script>const params = useParams();</script><pre>{JSON.stringify(params.current)}</pre>`;

describe("upstream useParams", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns an empty map outside a matched route", async () => {
    const screen = await render(scope(Params).html`<MemoryRouter initialEntries={["/home"]}><Params /></MemoryRouter>`);
    expect(screen.getByText("{}")).toBeVisible();
  });

  it.each([
    { path: "home", url: "/home", expected: {} },
    { path: "blog/:slug", url: "/blog/react-router", expected: { slug: "react-router" } },
    { path: "blog/:slug", url: "/blog/react%20router", expected: { slug: "react router" } },
    { path: "blog/:slug", url: "/blog/react+router+is%20awesome", expected: { slug: "react+router+is awesome" } },
    { path: "blog/:slug", url: "/blog/react%2router", expected: { slug: "react%2router" }, malformed: true },
  ])("decodes $url", async scenario => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const screen = await render(scope(Params).html`<script>let { scenario } = $props();</script>
      <MemoryRouter initialEntries={[scenario.url]}><Routes><Route path={scenario.path} Component={Params} /></Routes></MemoryRouter>`, { scenario });
    await expect.element(screen.getByText(JSON.stringify(scenario.expected), { exact: true })).toBeVisible();
    if (scenario.malformed) expect(warn).toHaveBeenCalledWith(expect.stringContaining("malformed URL segment"));
    else expect(warn).not.toHaveBeenCalled();
  });

  it("combines parent and child params", async () => {
    const screen = await render(scope(Params).html`<MemoryRouter initialEntries={["/users/mjackson/courses/react-router"]}>
      <Routes><Route path="users/:username" Component={Outlet}>
        <Route path="courses/:course" Component={Params} />
      </Route></Routes>
    </MemoryRouter>`);
    expect(screen.getByText('{"username":"mjackson","course":"react-router"}')).toBeVisible();
  });

  it("exposes matched child params to the parent even when it has no Outlet", async () => {
    const screen = await render(scope(Params).html`<MemoryRouter initialEntries={["/blog/react-router"]}>
      <Routes><Route path="blog" Component={Params}><Route path=":slug" element={null} /></Route></Routes>
    </MemoryRouter>`);
    expect(screen.getByText('{"slug":"react-router"}')).toBeVisible();
  });
});

describe("upstream useMatch", () => {
  const Match = html`<script>
    let { pattern, capture } = $props();
    const match = useMatch(() => pattern);
    let count = $state(0);
    $effect(() => { void count; capture(match.current); });
  </script>
  <pre>{JSON.stringify(match.current)}</pre><button onclick={() => count++}>Update</button>`;
  it.each([
    { url: "/home", pattern: "home", expected: { params: {}, pathname: "/home", pathnameBase: "/home", pattern: { path: "home", caseSensitive: false, end: true } } },
    { url: "/home/", pattern: "home", expected: { params: {}, pathname: "/home/", pathnameBase: "/home", pattern: { path: "home", caseSensitive: false, end: true } } },
    { url: "/home", pattern: "about", expected: null },
  ])("$pattern at $url, including memoization after unrelated state updates", async scenario => {
    const capture = vi.fn();
    const screen = await render(scope(Match).html`<script>let { scenario, capture } = $props();</script>
      <MemoryRouter initialEntries={[scenario.url]}><Routes><Route path="/">{#snippet element()}
        <Match pattern={scenario.pattern} {capture} />
      {/snippet}<Route path="home" /></Route></Routes></MemoryRouter>`, { scenario, capture });
    await expect.element(screen.getByText(JSON.stringify(scenario.expected), { exact: true })).toBeVisible();
    expect(capture).toHaveBeenCalledOnce();
    await screen.getByRole("button", { name: "Update" }).click();
    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture.mock.calls[0][0]).toBe(capture.mock.calls[1][0]);
  });
});
