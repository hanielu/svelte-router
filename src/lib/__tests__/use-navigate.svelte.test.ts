import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope, snippet } from "test-utils";
import type { Snippet } from "svelte";
import NavigationRouter from "./fixtures/navigation-router.svelte";
import { navigationCases } from "./fixtures/navigation-cases.js";

// svelte:defs
import {
  MemoryRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  createMemoryRouter,
  Outlet,
  RouterProvider,
} from "svelte-router";
// sd

describe("useNavigate", () => {
  // Spy on `console.error` and provide an empty implementation
  // to keep the test output clean.
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("navigates to the new location", async () => {
    const Home = html`<script>
        let navigate = useNavigate();

        function handleClick() {
          navigate("/about");
        }
      </script>

      <div>
        <h1>Home</h1>
        <button onclick="{handleClick}">click me</button>
      </div> `;

    let screen = await render(
      scope(Home).html`
			<MemoryRouter initialEntries={["/home"]}>
				<Routes>
					<Route path="home" element={Home} />
					<Route path="about">
						{#snippet element()}
							<h1>About</h1>
						{/snippet}
					</Route>
				</Routes>
			</MemoryRouter>
      `
    );

    let button = screen.getByRole("button");
    await button.click();
    await expect.element(screen.getByText("About")).toBeVisible();
  });

  it("navigates to the new location when no pathname is provided", async () => {
    const Home = html`<script>
        const location = useLocation();
        let navigate = useNavigate();
      </script>
      <div>
        <p>{location.current.pathname + location.current.search}</p>
        <button onclick={() => navigate("?key=value")}>click me</button>
      </div> `;

    let screen = await render(
      scope(Home).html`
			<MemoryRouter initialEntries={["/home"]}>
				<Routes>
					<Route path="home" element={Home} />
				</Routes>
			</MemoryRouter>
      `
    );

    await expect.element(screen.getByText("/home")).toBeVisible();
    let button = screen.getByRole("button");
    await button.click();
    await expect.element(screen.getByText("/home?key=value")).toBeVisible();
  });

  it("navigates to the new location when no pathname is provided (with a basename)", async () => {
    const Home = html`<script>
        const location = useLocation();
        let navigate = useNavigate();
      </script>
      <div>
        <p>{location.current.pathname + location.current.search}</p>
        <button onclick={() => navigate("?key=value")}>click me</button>
      </div> `;

    let screen = await render(
      scope(Home).html`
			<MemoryRouter basename="/basename" initialEntries={["/basename/home"]}>
				<Routes>
					<Route path="home" element={Home} />
				</Routes>
			</MemoryRouter>
        `
    );

    await expect.element(screen.getByText("/home")).toBeVisible();
    let button = screen.getByRole("button");
    await button.click();
    await expect.element(screen.getByText("/home?key=value")).toBeVisible();
  });

  it("navigates to the new location with empty query string when no query string is provided", async () => {
    const Home = html`<script>
      const location = useLocation();
      let navigate = useNavigate();
		</script>
		<div>
			<p>{location.current.pathname + location.current.search}</p>
			<button onclick={() => navigate("/home")}>click me</button>
		</div>
		`;

    let screen = await render(
      scope(Home).html`
			<MemoryRouter initialEntries={["/home?key=value"]}>
          <Routes>
            <Route path="home" element={Home} />
          </Routes>
        </MemoryRouter>
      `
    );

    await expect.element(screen.getByText("/home?key=value")).toBeVisible();

    let button = screen.getByRole("button");
    await button.click();
    await expect.element(screen.getByText("/home")).toBeVisible();
  });

  it("throws on invalid destination path objects", async () => {
    const captureNavigate = vi.fn<(navigate: ReturnType<typeof useNavigate>) => void>();
    const Home = html`<script>
      let { captureNavigate } = $props();
      const navigate = useNavigate();
      captureNavigate(navigate);
    </script>
    <h1>Home</h1>`;

    await render(
      scope(Home).html`
        <script>let { captureNavigate } = $props();</script>
        <MemoryRouter initialEntries={["/home"]}>
          <Routes>
            <Route path="home">
              {#snippet element()}<Home {captureNavigate} />{/snippet}
            </Route>
          </Routes>
        </MemoryRouter>
      `,
      { captureNavigate }
    );

    expect(captureNavigate).toHaveBeenCalledOnce();
    const navigate = captureNavigate.mock.calls[0][0];

    expect(() => navigate({ pathname: "/about/thing?search" })).toThrowErrorMatchingInlineSnapshot(
      `[Error: Cannot include a '?' character in a manually specified \`to.pathname\` field [{"pathname":"/about/thing?search"}].  Please separate it out to the \`to.search\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.]`
    );
    expect(() => navigate({ pathname: "/about/thing#hash" })).toThrowErrorMatchingInlineSnapshot(
      `[Error: Cannot include a '#' character in a manually specified \`to.pathname\` field [{"pathname":"/about/thing#hash"}].  Please separate it out to the \`to.hash\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.]`
    );

    expect(() => navigate({ pathname: "/about/thing?search#hash" })).toThrowErrorMatchingInlineSnapshot(
      `[Error: Cannot include a '?' character in a manually specified \`to.pathname\` field [{"pathname":"/about/thing?search#hash"}].  Please separate it out to the \`to.search\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.]`
    );

    expect(() => navigate({ pathname: "/about/thing", search: "?search#hash" })).toThrowErrorMatchingInlineSnapshot(
      `[Error: Cannot include a '#' character in a manually specified \`to.search\` field [{"pathname":"/about/thing","search":"?search#hash"}].  Please separate it out to the \`to.hash\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.]`
    );
  });

  it("allows useNavigate usage in a mixed RouterProvider/<Routes> scenario", async () => {
    const router = createMemoryRouter([
      {
        path: "/*",
        Component: snippet.c(a => {
          const Home = html`<script>
					let navigate = useNavigate();
					</script>
					<h1>Home</h1>
          <button onclick={() => navigate("/page")}>
            Navigate /page from Routes
          </button>`;

          const Page = html`<script>
					let navigate = useNavigate();
					</script>
					<h1>Page</h1>
          <button onclick={() => navigate("/")}>
            Navigate /home from Routes
          </button>`;

          const Component = scope(Home, Page).html`<script>
					let navigate = useNavigate();
					const location = useLocation();
					</script>
					<button onclick={() => navigate(location.current.pathname === "/" ? "/page" : "/")}>
						Navigate from RouterProvider
					</button>
					<Routes>
						<Route path="/" element={Home} />
						<Route path="/page" element={Page} />
					</Routes>

				`;

          Component(a, {});
        }),
      },
    ]);
    const screen = await render(
      html`<script>
          let { router } = $props();
        </script>
        <RouterProvider router="{router}" />`,
      { router }
    );

    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByText("Navigate from RouterProvider")).toBeVisible();
    expect(screen.getByText("Navigate /page from Routes")).toBeVisible();

    await screen.getByText("Navigate from RouterProvider").click();

    expect(router.state.location.pathname).toBe("/page");
    expect(screen.getByText("Navigate from RouterProvider")).toBeVisible();
    await expect.element(screen.getByText("Navigate /home from Routes")).toBeVisible();

    await screen.getByText("Navigate from RouterProvider").click();

    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByText("Navigate from RouterProvider")).toBeVisible();
    await expect.element(screen.getByText("Navigate /page from Routes")).toBeVisible();

    await screen.getByText("Navigate /page from Routes").click();

    expect(router.state.location.pathname).toBe("/page");
    expect(screen.getByText("Navigate from RouterProvider")).toBeVisible();
    await expect.element(screen.getByText("Navigate /home from Routes")).toBeVisible();

    await screen.getByText("Navigate /home from Routes").click();

    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByText("Navigate from RouterProvider")).toBeVisible();
    await expect.element(screen.getByText("Navigate /page from Routes")).toBeVisible();
  });

  describe("navigating in effects versus render", () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    describe("MemoryRouter", () => {
      it("does not allow navigation from the render cycle", async () => {
        const Home = html`<script>
            let navigate = useNavigate();
            navigate("/about");
          </script>
          <h1>Home</h1>`;

        const screen = await render(
          scope(Home).html`
            <MemoryRouter>
              <Routes>
                <Route index element="{Home}" />
                <Route path="about">
                  {#snippet element()}
                  <h1>About</h1>
                  {/snippet}
                </Route>
              </Routes>
            </MemoryRouter>`
        );

        expect(screen.getByText("Home")).toBeVisible();
        expect(warnSpy).toHaveBeenCalledWith(
          "You should call navigate() in a $effect(), not when your component is first rendered."
        );
      });

      it("allows navigation from effects", async () => {
        const Home = html`<script>
            let navigate = useNavigate();
            $effect(() => {
              navigate("/about");
            });
          </script>
          <h1>Home</h1> `;

        const screen = await render(
          scope(Home).html`
            <MemoryRouter>
              <Routes>
                <Route index element="{Home}" />
                <Route path="about">
                  {#snippet element()}
                  <h1>About</h1>
                  {/snippet}
                </Route>
              </Routes>
            </MemoryRouter>`
        );

        expect(screen.getByText("About")).toBeVisible();
        expect(warnSpy).not.toHaveBeenCalled();
      });

      // In Svelte 5, components mount from child to parent. This means that when we call
      // useNavigate() and try to navigate in a child component, the parent component hasn't
      // mounted yet. This is important because useNavigateUnstable() uses a $effect to set
      // an activeRef flag to true, and this $effect hasn't run yet when the child calls navigate.
      //
      // The navigate function checks activeRef and short-circuits if it's false:
      //   if (!activeRef) return;
      //
      // So navigation only works in the component where useNavigate() is called, after that
      // component has mounted and its effects have run. Trying to navigate from a child
      // component will silently fail because activeRef is still false.
      it("allows navigation in child $effects", async () => {
        const Child = html`<script>
          let { onChildRendered } = $props();
          let navigate = useNavigate();

          // this works because the "navigate" function within makes reference to the activeRef flag
          // which I defined as a $state variable (after losing my mind figuring out what was going wrong)
          // essentially, initially activeRef is false, so the navigate function short-circuits and does nothing
          // but once the parent component has mounted, the $effect runs and activeRef is set to true
          // so the navigate function is no longer short-circuited and can navigate
          $effect(() => {
            onChildRendered();
          });
        </script>`;

        const Parent = scope(Child).html`<script>
            let navigate = useNavigate();
            const onChildRendered = () => navigate("/about");
          </script>
          <Child {onChildRendered} />`;

        const screen = await render(
          scope(Parent).html`
            <MemoryRouter initialEntries={["/home"]}>
							<Routes>
				<Route path="home" element="{Parent}" />
                <Route path="about">
									{#snippet element()}
										<h1>About</h1>
                  {/snippet}
                </Route>
              </Routes>
            </MemoryRouter> `
        );

        // we wait for the effect to run, which is when the parent component has mounted
        // and the navigate function is no longer short-circuited
        await expect.element(screen.getByText("About")).toBeVisible();
      });
    });

    describe("RouterProvider", () => {
      it("does not allow navigation from the render cycle", async () => {
        let router = createMemoryRouter([
          {
            index: true,
            Component: html`<script>
                let navigate = useNavigate();
                navigate("/about");
              </script>
              <h1>Home</h1>`,
          },
          {
            path: "about",
            element: html`<h1>About</h1>` as Snippet,
          },
        ]);
        let screen = await render(
          html`<script>
              let { router } = $props();
            </script>
            <RouterProvider {router} />`,
          { router }
        );

        expect(screen.getByText("Home")).toBeVisible();
        expect(warnSpy).toHaveBeenCalledWith(
          "You should call navigate() in a $effect(), not when your component is first rendered."
        );
      });

      it("allows navigation from effects", async () => {
        let router = createMemoryRouter([
          {
            index: true,
            Component: html`<script>
                let navigate = useNavigate();
                $effect(() => {
                  navigate("/about");
                });
              </script>
              <h1>Home</h1>`,
          },
          {
            path: "about",
            element: html`<h1>About</h1>` as Snippet,
          },
        ]);
        let screen = await render(
          html`<script>
              let { router } = $props();
            </script>
            <RouterProvider {router} />`,
          { router }
        );

        expect(screen.getByText("About")).toBeVisible();
        expect(warnSpy).not.toHaveBeenCalled();
      });

      it("allows navigation in child useEffects", async () => {
        let router = createMemoryRouter([
          {
            index: true,
            Component: snippet.c(a => {
              const Child = html`<script>
                let { onChildRendered } = $props();
                let navigate = useNavigate();

                $effect(() => {
                  onChildRendered();
                });
              </script>`;

              const Parent = scope(Child).html`<script>
                  let navigate = useNavigate();
                  let onChildRendered = () => navigate("/about");
                </script>
                <Child {onChildRendered} />`;

              Parent(a, {});
            }),
          },
          {
            path: "about",
            element: html`<h1>About</h1>` as Snippet,
          },
        ]);
        let screen = await render(
          html`<script>
              let { router } = $props();
            </script>
            <RouterProvider {router} />`,
          { router }
        );

        await expect.element(screen.getByText("About")).toBeVisible();
      });
    });

    describe("with state", () => {
      it("adds the state to location.state", async () => {
        const Home = html`<script>
            let navigate = useNavigate();

            function handleClick() {
              navigate("/about", { state: { from: "home" } });
            }
          </script>

          <div>
            <h1>Home</h1>
            <button onclick="{handleClick}">click me</button>
          </div>`;

        const ShowLocationState = html`<script>const location = useLocation();</script>
          <p>location.state:{JSON.stringify(location.current.state)}</p>`;

        const screen = await render(
          scope(Home, ShowLocationState).html`
					<MemoryRouter initialEntries={["/home"]}>
						<Routes>
							<Route path="home" element="{Home}" />
							<Route path="about" element="{ShowLocationState}" />
						</Routes>
					</MemoryRouter>
				`
        );

        await screen.getByText("click me").click();
        await expect.element(screen.getByText(`location.state:{"from":"home"}`)).toBeVisible();
      });
    });
  });

  describe("when relative navigation is handled via Svelte context", () => {
    describe("with an absolute href", () => {
      it("navigates to the correct URL", async () => {
        const Home = html`<script>
            const navigate = useNavigate();
          </script>

          <button onclick={() => navigate("/about")}>Go to about</button>`;

        const screen = await render(
          scope(Home).html`
            <MemoryRouter initialEntries={["/home"]}>
              <Routes>
                <Route path="home" element={Home} />
                <Route path="about">
                  {#snippet element()}<h1>About</h1>{/snippet}
                </Route>
              </Routes>
            </MemoryRouter>
          `
        );

        await screen.getByRole("button", { name: "Go to about" }).click();
        await expect.element(screen.getByRole("heading", { name: "About" })).toBeVisible();
      });
    });
  });
});

describe.each(["declarative", "data"] as const)("upstream useNavigate: %s", mode => {
  it.each(navigationCases)("$name", async scenario => {
    const screen = await render(NavigationRouter, {
      mode, initial: scenario.initial, routes: scenario.routes, options: scenario,
    });
    await screen.getByRole("button", { name: "Navigate", exact: true }).click();
    await expect.element(screen.getByRole("heading", { name: scenario.heading ?? "Destination", exact: true })).toBeVisible();
    await expect.poll(() => screen.getByTestId("destination-location").element().textContent).toBe(scenario.expected);
    await expect.element(screen.getByRole("heading", { name: "Source" })).not.toBeInTheDocument();
  });

  it("retains one command across location changes and resolves from the latest match", async () => {
    const capture = vi.fn();
    const Page = html`<script>
      let { capture } = $props();
      const navigate = useNavigate();
      const location = useLocation();
      capture(navigate, location);
      let count = $state(0);
    </script>
    <button onclick={() => count++}>Increment</button>
    <p>count:{count}</p>
    <p>{location.current.pathname}</p>`;
    const App = scope(Page).html`<script>
      let { mode, capture } = $props();
      const router = mode === "data" ? createMemoryRouter([
        { path: "projects/:id/*", element: page }
      ], { initialEntries: ["/projects/one"] }) : undefined;
      $effect(() => () => router?.dispose());
    </script>
    {#snippet page()}<Page {capture} />{/snippet}
    {#if router}<RouterProvider {router} />{:else}
      <MemoryRouter initialEntries={["/projects/one"]}>
        <Routes><Route path="projects/:id/*" element={page} /></Routes>
      </MemoryRouter>
    {/if}`;
    const screen = await render(App, { mode, capture });
    await screen.getByRole("button", { name: "Increment" }).click();
    const [navigate, location] = capture.mock.calls[0];
    await navigate("/projects/two");
    await expect.element(screen.getByText("/projects/two", { exact: true })).toBeVisible();
    await navigate("details");
    await expect.element(screen.getByText("/projects/two/details", { exact: true })).toBeVisible();
    await navigate(-1);
    await expect.element(screen.getByText("/projects/two", { exact: true })).toBeVisible();
    expect(location.current.pathname).toBe("/projects/two");
    expect(capture).toHaveBeenCalledOnce();
    await expect.element(screen.getByText("count:1")).toBeVisible();
  });

  it.each([false, true])("basename, descendant Routes=%s", async descendant => {
    const Home = html`<script>const navigate = useNavigate();</script>
      <button onclick={() => navigate("/path")}>Go</button>`;
    const Descendant = scope(Home).html`<Routes><Route index Component={Home} /></Routes>`;
    const Destination = html`<script>const location = useLocation();</script>
      <h1>Path</h1><p>{location.current.pathname}</p>`;
    const screen = await render(NavigationRouter, {
      mode, initial: "/base", basename: "/base", options: { to: "/path" },
      routes: [
        { path: descendant ? "/*" : "/", Component: descendant ? Descendant : Home },
        { path: "/path", Component: Destination },
      ],
    });
    await screen.getByRole("button", { name: "Go" }).click();
    await expect.element(screen.getByRole("heading", { name: "Path" })).toBeVisible();
    await expect.element(screen.getByText("/path", { exact: true })).toBeVisible();
  });
});
