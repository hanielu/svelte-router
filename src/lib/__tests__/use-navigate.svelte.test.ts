import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render } from "vitest-browser-svelte";
import { createClickGetter, html, snippet } from "test-utils";
import type { Snippet } from "svelte";

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

    let screen = render(
      html`
			<script>
				let {Home} = $props();
			</script>
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
      `,
      { Home }
    );

    let button = screen.getByRole("button");
    await button.click();
    await expect.element(screen.getByText("About")).toBeVisible();
  });

  it("navigates to the new location when no pathname is provided", async () => {
    const Home = html`<script>
        let location = $derived(useLocation());
        let navigate = useNavigate();
      </script>
      <div>
      	<p>{location.pathname + location.search}</p>
        <button onclick={() => navigate("?key=value")}>click me</button>
      </div> `;

    let screen = render(
      html`
			<script>
				let {Home} = $props();
			</script>
			<MemoryRouter initialEntries={["/home"]}>
				<Routes>
					<Route path="home" element={Home} />
				</Routes>
			</MemoryRouter>
      `,
      { Home }
    );

    await expect.element(screen.getByText("/home")).toBeVisible();
    let button = screen.getByRole("button");
    await button.click();
    await expect.element(screen.getByText("/home?key=value")).toBeVisible();
  });

  it("navigates to the new location when no pathname is provided (with a basename)", async () => {
    const Home = html`<script>
        let location = $derived(useLocation());
        let navigate = useNavigate();
      </script>
      <div>
      	<p>{location.pathname + location.search}</p>
        <button onclick={() => navigate("?key=value")}>click me</button>
      </div> `;

    let screen = render(
      html`
			<script>
				let {Home} = $props();
			</script>
			<MemoryRouter basename="/basename" initialEntries={["/basename/home"]}>
				<Routes>
					<Route path="home" element={Home} />
				</Routes>
			</MemoryRouter>
        `,
      { Home }
    );

    await expect.element(screen.getByText("/home")).toBeVisible();
    let button = screen.getByRole("button");
    await button.click();
    await expect.element(screen.getByText("/home?key=value")).toBeVisible();
  });

  it("navigates to the new location with empty query string when no query string is provided", async () => {
    const Home = html`<script>
      let location = $derived(useLocation());
      let navigate = useNavigate();
		</script>
		<div>
			<p>{location.pathname + location.search}</p>
			<button onclick={() => navigate("/home")}>click me</button>
		</div>
		`;

    let screen = render(
      html`
			<script>
				let {Home} = $props();
			</script>
			<MemoryRouter initialEntries={["/home?key=value"]}>
          <Routes>
            <Route path="home" element={Home} />
          </Routes>
        </MemoryRouter>
      `,
      { Home }
    );

    await expect.element(screen.getByText("/home?key=value")).toBeVisible();

    let button = screen.getByRole("button");
    await button.click();
    await expect.element(screen.getByText("/home")).toBeVisible();
  });

  it("throws on invalid destination path objects", () => {
    const Home = html`<script>
      let navigate = useNavigate();
    </script>
        <div>
          <h1>Home</h1>
          <button onclick={() => navigate({ pathname: "/about/thing?search" })}>click 1</button>
          <button onclick={() => navigate({ pathname: "/about/thing#hash" })}>click 2</button>
          <button onclick={() => navigate({ pathname: "/about/thing?search#hash" })}>
            click 3
          </button>
          <button
            onclick={() =>
              navigate({
                pathname: "/about/thing",
                search: "?search#hash",
              })
            }
          >
            click 4
          </button>
        </div>
    	`;

    let screen = render(
      html`
			<script>
				let {Home} = $props();
			</script>
        <MemoryRouter initialEntries={["/home"]}>
          <Routes>
            <Route path="home" element={Home} />
          </Routes>
        </MemoryRouter>
      `,
      { Home }
    );

    const getClick = (text: string) => createClickGetter(screen.getByText(text));

    expect(getClick("click 1")).toThrowErrorMatchingInlineSnapshot(
      `[Error: Cannot include a '?' character in a manually specified \`to.pathname\` field [{"pathname":"/about/thing?search"}].  Please separate it out to the \`to.search\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.]`
    );
    expect(getClick("click 2")).toThrowErrorMatchingInlineSnapshot(
      `[Error: Cannot include a '#' character in a manually specified \`to.pathname\` field [{"pathname":"/about/thing#hash"}].  Please separate it out to the \`to.hash\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.]`
    );

    expect(getClick("click 3")).toThrowErrorMatchingInlineSnapshot(
      `[Error: Cannot include a '?' character in a manually specified \`to.pathname\` field [{"pathname":"/about/thing?search#hash"}].  Please separate it out to the \`to.search\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.]`
    );

    expect(getClick("click 4")).toThrowErrorMatchingInlineSnapshot(
      `[Error: Cannot include a '#' character in a manually specified \`to.search\` field [{"pathname":"/about/thing","search":"?search#hash"}].  Please separate it out to the \`to.hash\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.]`
    );
  });

  it("allows useNavigate usage in a mixed RouterProvider/<Routes> scenario", async () => {
    const router = createMemoryRouter([
      {
        path: "/*",
        Component: snippet.c(a => {
          const Component = html`<script>
					let {Home, Page} = $props();
					let navigate = useNavigate();
					let location = useLocation();
					</script>
					<button onclick={() => navigate(location.pathname === "/" ? "/page" : "/")}>
						Navigate from RouterProvider
					</button>
					<Routes>
						<Route path="/" element={Home} />
						<Route path="/page" element={Page} />
					</Routes>

				`;

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

          Component(a, { Home, Page });
        }),
      },
    ]);
    const screen = render(
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
      it("does not allow navigation from the render cycle", () => {
        const Home = html`<script>
            let navigate = useNavigate();
            navigate("/about");
          </script>
          <h1>Home</h1>`;

        const screen = render(
          html`<script>
              let { Home } = $props();
            </script>
            <MemoryRouter>
              <Routes>
                <Route index element="{Home}" />
                <Route path="about">
                  {#snippet element()}
                  <h1>About</h1>
                  {/snippet}
                </Route>
              </Routes>
            </MemoryRouter>`,
          { Home }
        );

        expect(screen.getByText("Home")).toBeVisible();
        expect(warnSpy).toHaveBeenCalledWith(
          "You should call navigate() in a $effect(), not when your component is first rendered."
        );
      });

      it("allows navigation from effects", () => {
        const Home = html`<script>
            let navigate = useNavigate();
            $effect(() => {
              navigate("/about");
            });
          </script>
          <h1>Home</h1> `;

        const screen = render(
          html`<script>
              let { Home } = $props();
            </script>
            <MemoryRouter>
              <Routes>
                <Route index element="{Home}" />
                <Route path="about">
                  {#snippet element()}
                  <h1>About</h1>
                  {/snippet}
                </Route>
              </Routes>
            </MemoryRouter>`,
          { Home }
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
        const Parent = html`<script>
            let { Child } = $props();
            let navigate = useNavigate();
            const onChildRendered = () => navigate("/about");
          </script>
          <Child {onChildRendered} />`;

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

        const screen = render(
          html`<script>
              let { Parent } = $props();
            </script>
            <MemoryRouter initialEntries={["/home"]}>
							<Routes>
								<Route path="home" element="{Parent}" />
                <Route path="about">
									{#snippet element()}
										{console.log("c reh")}
										<h1>About</h1>
                  {/snippet}
                </Route>
              </Routes>
            </MemoryRouter> `,
          { Parent: snippet.c(a => Parent(a, { Child })) }
        );

        // we wait for the effect to run, which is when the parent component has mounted
        // and the navigate function is no longer short-circuited
        await expect.element(screen.getByText("About")).toBeVisible();
      });
    });

    describe("RouterProvider", () => {
      it("does not allow navigation from the render cycle", () => {
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
        let screen = render(
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

      it("allows navigation from effects", () => {
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
        let screen = render(
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
              const Parent = html`<script>
                  let { Child } = $props();
                  let navigate = useNavigate();
                  let onChildRendered = () => navigate("/about");
                </script>
                <Child {onChildRendered} />`;

              const Child = html`<script>
                let { onChildRendered } = $props();
                let navigate = useNavigate();

                $effect(() => {
                  onChildRendered();
                });
              </script>`;
              Parent(a, { Child });
            }),
          },
          {
            path: "about",
            element: html`<h1>About</h1>` as Snippet,
          },
        ]);
        let screen = render(
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

        const ShowLocationState = html`<p>location.state:{JSON.stringify(useLocation().state)}</p>`;

        const screen = render(
          html`<script>
						let { Home, ShowLocationState } = $props();
					</script>
					<MemoryRouter initialEntries={["/home"]}>
						<Routes>
							<Route path="home" element="{Home}" />
							<Route path="about" element="{ShowLocationState}" />
						</Routes>
					</MemoryRouter>
				`,
          { Home, ShowLocationState }
        );

        await screen.getByText("click me").click();
        await expect.element(screen.getByText(`location.state:{"from":"home"}`)).toBeVisible();
      });
    });
  });

  describe("when relative navigation is handled via React Context", () => {
    describe("with an absolute href", () => {
      it("navigates to the correct URL", async () => {});
    });
  });
});
