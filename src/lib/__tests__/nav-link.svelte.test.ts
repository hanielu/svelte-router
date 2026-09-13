import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";
import { createTestWindow } from "./fixtures/browser-window.js";

// svelte:defs
import {
  createMemoryRouter,
  createBrowserRouter,
  BrowserRouter,
  MemoryRouter,
  NavLink,
  Outlet,
  RouterProvider,
  Routes,
  Route,
} from "svelte-router";
// sd

describe("<NavLink>", () => {
  it("marks active links and supplies aria-current", async () => {
    const screen = render(html`
      <MemoryRouter initialEntries={["/tasks/123"]}>
        <NavLink to="/tasks">Tasks</NavLink>
        <NavLink to="/tasks" end>Exact tasks</NavLink>
        <NavLink to="/">Home</NavLink>
      </MemoryRouter>
    `);

    await expect
      .element(screen.getByRole("link", { name: "Tasks", exact: true }))
      .toHaveClass("active");
    await expect
      .element(screen.getByRole("link", { name: "Tasks", exact: true }))
      .toHaveAttribute("aria-current", "page");
    await expect
      .element(screen.getByRole("link", { name: "Exact tasks" }))
      .not.toHaveClass("active");
    await expect.element(screen.getByRole("link", { name: "Home" })).not.toHaveClass("active");
  });

  it("supports case-sensitive matching", async () => {
    const screen = render(html`
      <MemoryRouter initialEntries={["/SpOnGe-bOB"]}>
        <NavLink to="/sponge-bob">Insensitive</NavLink>
        <NavLink to="/sponge-bob" caseSensitive>Sensitive</NavLink>
      </MemoryRouter>
    `);

    await expect
      .element(screen.getByRole("link", { name: "Insensitive", exact: true }))
      .toHaveClass("active");
    await expect
      .element(screen.getByRole("link", { name: "Sensitive", exact: true }))
      .not.toHaveClass("active");
  });

  it("passes active state to Svelte children snippets", async () => {
    const screen = render(html`
      <MemoryRouter initialEntries={["/tasks"]}>
        <NavLink to="/tasks" class={({ isActive }) => (isActive ? "selected" : "idle")}>
          {#snippet children({ isActive, isPending, isTransitioning })}
            <span>{isActive}:{isPending}:{isTransitioning}</span>
          {/snippet}
        </NavLink>
      </MemoryRouter>
    `);

    await expect.element(screen.getByRole("link")).toHaveClass("selected");
    await expect.element(screen.getByText("true:false:false")).toBeVisible();
  });

  it("tracks data-router pending state", async () => {
    let resolveSlowRoute!: () => void;
    const slowRoute = new Promise<void>(resolve => {
      resolveSlowRoute = resolve;
    });

    const Layout = html`
      <NavLink to="/slow">Slow route</NavLink>
      <Outlet />
    `;
    const router = createMemoryRouter([
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: html`<h1>Home</h1>` },
          {
            path: "slow",
            loader: () => slowRoute,
            Component: html`<h1>Slow</h1>`,
          },
        ],
      },
    ]);

    const screen = render(
      html`<script>
          let { router } = $props();
        </script>
        <RouterProvider {router} />`,
      { router }
    );

    await screen.getByRole("link", { name: "Slow route" }).click();
    await expect.element(screen.getByRole("link", { name: "Slow route" })).toHaveClass("pending");

    resolveSlowRoute();
    await expect.element(screen.getByText("Slow")).toBeVisible();
    await expect.element(screen.getByRole("link", { name: "Slow route" })).toHaveClass("active");
  });

  it("respects a router basename", async () => {
    const screen = render(html`
      <MemoryRouter basename="/admin" initialEntries={["/admin/collections/posts"]}>
        <NavLink to="/collections/posts">Posts</NavLink>
      </MemoryRouter>
    `);

    const link = screen.getByRole("link", { name: "Posts" });
    await expect.element(link).toHaveAttribute("href", "/admin/collections/posts");
    await expect.element(link).toHaveClass("active");
  });
});

describe("upstream NavLink active matching", () => {
  const cases = [
    { name: "no match", url: "/home", path: "home", to: "somewhere-else", active: false },
    { name: "exact relative", url: "/home", path: "home", to: ".", active: true },
    { name: "trailing slash exact", url: "/home/", path: "home", to: "/home/", active: true },
    { name: "partial segment", url: "/home/children", path: "home", child: "children", to: "child", active: false },
    { name: "link subset", url: "/user-preferences", path: "/", child: "user-preferences", to: "user", active: false },
    { name: "link subset exact sibling", url: "/user-preferences", path: "/", child: "user-preferences", to: "user-preferences", active: true },
    { name: "URL subset", url: "/user", path: "/", child: "user", to: "user-preferences", active: false },
    { name: "URL subset exact sibling", url: "/user", path: "/", child: "user", to: "user", active: true },
    { name: "root", url: "/", path: "/", to: "/", active: true },
    { name: "root end", url: "/", path: "/", to: "/", end: true, active: true },
    { name: "root is not every non-layout route", url: "/home", path: "home", to: "/", active: false },
    { name: "root is not every layout route", url: "/home", path: "home", rootLayout: true, to: "/", active: false },
    { name: "prefix", url: "/home/child", path: "home", child: "child", to: ".", active: true },
    { name: "prefix trailing slash", url: "/home/child", path: "home", child: "child", to: "/home/", active: true },
    { name: "prefix end", url: "/home/child", path: "home", child: "child", to: ".", end: true, active: false },
    { name: "end no slash URL no slash link", url: "/home", path: "home", to: "/home", end: true, active: true },
    { name: "end no slash URL slash link", url: "/home", path: "home", to: "/home/", end: true, active: false },
    { name: "end slash URL no slash link", url: "/home/", path: "home", to: "/home", end: true, active: false },
    { name: "end slash URL slash link", url: "/home/", path: "home", to: "/home/", end: true, active: true },
    { name: "case insensitive", url: "/Home", path: "home", to: ".", active: true },
    { name: "case sensitive", url: "/Home", path: "home", to: "/home", caseSensitive: true, active: false },
    { name: "path relative", url: "/contacts/1", path: "contacts/:id", to: "../1", relative: "path", active: true },
    { name: "basename inactive", url: "/app/home", basename: "/app", path: "home", to: "somewhere-else", active: false },
    { name: "basename active", url: "/app/home", basename: "/app", path: "home", to: ".", active: true },
  ];

  it.each(cases)("$name", async scenario => {
    const screen = render(html`<script>let { scenario } = $props();</script>
      {#snippet links()}
        <NavLink to={scenario.to} end={scenario.end} caseSensitive={scenario.caseSensitive} relative={scenario.relative}>Link</NavLink>
        <Outlet />
      {/snippet}
      {#snippet definitions()}
        <Route path={scenario.path} element={links}>
          {#if scenario.child}<Route path={scenario.child}>{#snippet element()}<p>Child</p>{/snippet}</Route>{/if}
        </Route>
      {/snippet}
      <MemoryRouter basename={scenario.basename} initialEntries={[scenario.url]}>
        <Routes>
          {#if scenario.rootLayout}<Route path="/" Component={Outlet}>{@render definitions()}</Route>
          {:else}{@render definitions()}{/if}
        </Routes>
      </MemoryRouter>`, { scenario });
    const link = screen.getByRole("link", { name: "Link", exact: true });
    await expect.poll(() => link.element().className).toBe(scenario.active ? "active" : "");
    if (scenario.active) await expect.element(link).toHaveAttribute("aria-current", "page");
    else await expect.element(link).not.toHaveAttribute("aria-current");
    if (scenario.relative) await expect.element(link).toHaveAttribute("href", "/contacts/1");
  });

  it.each([false, true])("class/style callbacks and children snippet, active=%s", async active => {
    const screen = render(html`<script>let { active } = $props();</script>
      <MemoryRouter initialEntries={["/home"]}>
        <Routes><Route path="home">{#snippet element()}
          <NavLink to={active ? "." : "somewhere-else"}
            class={({ isActive }) => isActive ? "nav-link highlighted" : undefined}
            style={({ isActive }) => isActive ? "text-transform: uppercase" : undefined}>
            {#snippet children({ isActive })}{isActive ? "Home (current)" : "Somewhere else"}{/snippet}
          </NavLink>
        {/snippet}</Route></Routes>
      </MemoryRouter>`, { active });
    const link = screen.getByRole("link");
    await expect.element(link).toHaveTextContent(active ? "Home (current)" : "Somewhere else");
    if (active) {
      await expect.element(link).toHaveClass("nav-link", "highlighted");
      await expect.element(link).toHaveStyle({ textTransform: "uppercase" });
    } else {
      await expect.element(link).not.toHaveAttribute("class");
      await expect.element(link).not.toHaveAttribute("style");
    }
  });

  it("encodes relative and absolute browser URLs for active matching", async () => {
    const isolated = await createTestWindow("/users/matt brophy");
    try {
      const screen = render(html`<script>let { testWindow } = $props();</script>
        <BrowserRouter window={testWindow}>
          <Routes><Route path="users/:name">{#snippet element()}
            <NavLink to=".">Relative</NavLink>
            <NavLink to="/users/matt brophy">Absolute</NavLink>
            <NavLink to="/users/michael jackson">Other</NavLink>
          {/snippet}</Route></Routes>
        </BrowserRouter>`, { testWindow: isolated.window });
      await expect.element(screen.getByRole("link", { name: "Relative" })).toHaveClass("active");
      await expect.element(screen.getByRole("link", { name: "Absolute" })).toHaveClass("active");
      await expect.element(screen.getByRole("link", { name: "Other" })).not.toHaveClass("active");
      screen.unmount();
    } finally { isolated.dispose(); }
  });
});

describe("upstream NavLink pending state", () => {
  it.each(["plain", "callbacks", "encoded", "basename"])("browser navigation: %s", async variant => {
    const basename = variant === "basename" ? "/base" : "/";
    const prefix = basename === "/" ? "" : basename;
    const bar = variant === "encoded" ? "/bar/matt brophy" : "/bar";
    const baz = variant === "encoded" ? "/baz-✅" : "/baz";
    const barData = Promise.withResolvers<null>();
    const bazData = Promise.withResolvers<null>();
    const isolated = await createTestWindow(prefix + "/foo");
    const App = html`<script>
      let { testWindow, basename, bar, baz, barData, bazData, variant, capture } = $props();
      const router = createBrowserRouter([{ path: "/", element: layout, children: [
        { path: "foo", element: fooPage },
        { path: "bar/:param?", loader: () => barData, element: barPage },
        { path: baz, loader: () => bazData, element: bazPage },
      ] }], { window: testWindow, basename });
      capture(router);
      $effect(() => () => router.dispose());
    </script>
    {#snippet fooPage()}<h1>Foo page</h1>{/snippet}
    {#snippet barPage()}<h1>Bar page</h1>{/snippet}
    {#snippet bazPage()}<h1>Baz page</h1>{/snippet}
    {#snippet layout()}
      <NavLink to="/foo">Foo</NavLink>
      <NavLink to={bar} data-testid="bar"
        class={variant === "callbacks" ? ({ isActive, isPending }) => isPending ? "waiting" : isActive ? "selected" : undefined : ""}
        style={({ isActive, isPending }) => isPending ? "text-transform: lowercase" : isActive ? "text-transform: uppercase" : undefined}>
        {#snippet children({ isActive, isPending })}Bar {isPending ? "loading" : isActive ? "current" : "idle"}{/snippet}
      </NavLink>
      <NavLink to={baz}>Baz</NavLink>
      <Outlet />
    {/snippet}
    <RouterProvider {router} />`;
    let router: ReturnType<typeof createBrowserRouter> | undefined;
    try {
      const screen = render(App, { testWindow: isolated.window, basename, bar, baz,
        barData: barData.promise, bazData: bazData.promise, variant,
        capture: (value: ReturnType<typeof createBrowserRouter>) => { router = value; },
      });
      const link = screen.getByTestId("bar");
      const other = screen.getByRole("link", { name: "Baz" });
      await expect.element(link).toHaveTextContent("Bar idle");
      await expect.poll(() => link.element().className).toBe("");
      await link.click();
      await expect.element(link).toHaveAttribute("class", variant === "callbacks" ? "waiting" : "pending");
      await expect.element(link).toHaveTextContent("Bar loading");
      await expect.element(link).toHaveStyle({ textTransform: "lowercase" });
      await expect.poll(() => other.element().className).toBe("");
      await expect.element(screen.getByRole("heading", { name: "Foo page" })).toBeVisible();
      barData.resolve(null);
      await expect.element(screen.getByRole("heading", { name: "Bar page" })).toBeVisible();
      await expect.element(link).toHaveAttribute("class", variant === "callbacks" ? "selected" : "active");
      await expect.element(link).toHaveTextContent("Bar current");
      await expect.element(link).toHaveStyle({ textTransform: "uppercase" });
      await other.click();
      await expect.element(other).toHaveAttribute("class", "pending");
      await expect.element(link).toHaveAttribute("class", variant === "callbacks" ? "selected" : "active");
      bazData.resolve(null);
      await expect.element(screen.getByRole("heading", { name: "Baz page" })).toBeVisible();
      await expect.element(other).toHaveAttribute("class", "active");
      await expect.element(link).toHaveTextContent("Bar idle");
      await expect.poll(() => link.element().className).toBe("");
      await expect.poll(() => (link.element() as HTMLAnchorElement).style.textTransform).toBe("");
      screen.unmount();
    } finally { router?.dispose(); isolated.dispose(); }
  });
});
