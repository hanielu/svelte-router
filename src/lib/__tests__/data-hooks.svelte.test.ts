import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";

// svelte:defs
import {
  createMemoryRouter,
  Form,
  Link,
  Outlet,
  RouterProvider,
  useActionData,
  useLoaderData,
  useMatches,
  useNavigation,
  useRouteLoaderData,
} from "svelte-router";
// sd

describe("data-router hooks", () => {
  it("exposes navigation, matches, and loader data", async () => {
    const Page = html`<script>
        const navigation = useNavigation();
        const matches = useMatches();
        const ownData = useLoaderData();
        const rootData = useRouteLoaderData("root");
      </script>

      <p>navigation:{navigation.current.state}</p>
      <p>root:{rootData.current?.label ?? "loading"}</p>
      <p>page:{ownData.current?.label ?? "loading"}</p>
      <p>matches:{matches.current.map((match) => match.id).join(",")}</p>`;

    const router = createMemoryRouter([
      {
        id: "root",
        path: "/",
        loader: () => ({ label: "root-data" }),
        Component: html`<Outlet />`,
        children: [
          {
            id: "page",
            index: true,
            loader: () => ({ label: "page-data" }),
            Component: Page,
          },
        ],
      },
    ]);

    const screen = await render(
      html`<script>
          let { router } = $props();
        </script>
        <RouterProvider {router} />`,
      { router }
    );

    await expect.element(screen.getByText("navigation:idle")).toBeVisible();
    await expect.element(screen.getByText("root:root-data")).toBeVisible();
    await expect.element(screen.getByText("page:page-data")).toBeVisible();
    await expect.element(screen.getByText("matches:root,page")).toBeVisible();
  });

  it("exposes action data after a form submission", async () => {
    const Page = html`<script>
        const actionData = useActionData();
      </script>

      <Form method="post">
        <input name="message" value="hello" />
        <button type="submit">Submit</button>
      </Form>
      <p>result:{actionData.current?.message ?? "none"}</p>`;

    const router = createMemoryRouter([
      {
        id: "action",
        path: "/",
        action: async ({ request }) => {
          const data = await request.formData();
          return { message: data.get("message") };
        },
        Component: Page,
      },
    ]);

    const screen = await render(
      html`<script>
          let { router } = $props();
        </script>
        <RouterProvider {router} />`,
      { router }
    );

    await expect.element(screen.getByText("result:none")).toBeVisible();
    await screen.getByRole("button", { name: "Submit" }).click();
    await expect.element(screen.getByText("result:hello")).toBeVisible();
  });
});

describe("upstream data-memory-router value hooks", () => {
  it("provides complete useMatches records to both layout and leaf, retaining old matches while loading", async () => {
    const capture = vi.fn();
    const pending = Promise.withResolvers<string>();
    const Bar = html`<script>
      let { capture } = $props();
      const matches = useMatches();
      capture("Bar", matches);
    </script><h1>Bar</h1>`;
    const Layout = html`<script>
      let { capture } = $props();
      const matches = useMatches();
      capture("Layout", matches);
    </script><Link to="/bar">Bar</Link><Outlet />`;
    const App = scope(Layout, Bar).html`<script>
      let { capture, pending } = $props();
      const router = createMemoryRouter([{ path: "/", element: layout, children: [
        { path: "foo", loader: () => "FOO LOADER" },
        { path: "bar", loader: () => pending, element: bar, handle: { key: "value" } },
      ] }]);
      $effect(() => () => router.dispose());
    </script>
    {#snippet layout()}<Layout {capture} />{/snippet}
    {#snippet bar()}<Bar {capture} />{/snippet}
    <RouterProvider {router} />`;
    const screen = await render(App, { capture, pending: pending.promise });
    const matches = capture.mock.calls[0][1];
    const root = { id: "0", pathname: "/", params: {}, data: undefined, handle: undefined };
    expect(matches.current).toEqual([root]);
    const initialMatches = matches.current;
    await screen.getByRole("link", { name: "Bar" }).click();
    expect(matches.current).toEqual([root]);
    expect(matches.current).toBe(initialMatches);
    pending.resolve("BAR LOADER");
    await expect.element(screen.getByRole("heading", { name: "Bar" })).toBeVisible();
    const expected = [root, { id: "0-1", pathname: "/bar", params: {}, data: "BAR LOADER", handle: { key: "value" } }];
    expect(matches.current).toEqual(expected);
    expect(capture.mock.calls[1][0]).toBe("Bar");
    expect(capture.mock.calls[1][1].current).toEqual(expected);
    expect(capture).toHaveBeenCalledTimes(2);
  });

  it("useRouteLoaderData drops unmatched hydrated data and exposes nested child data", async () => {
    const capture = vi.fn();
    const Layout = html`<script>
      let { capture } = $props();
      const layout = useRouteLoaderData("layout");
      const foo = useRouteLoaderData("foo");
      const bar = useRouteLoaderData("bar");
      const child = useRouteLoaderData("child");
      capture(() => ({ layout: layout.current, foo: foo.current, bar: bar.current, child: child.current }));
    </script><Link to="/bar/child">Child</Link><Outlet />`;
    const App = scope(Layout).html`<script>
      let { capture } = $props();
      const router = createMemoryRouter([{ id: "layout", path: "/", element: layout, children: [
        { id: "foo", path: "foo", loader: () => "FOO2", element: foo },
        { id: "bar", path: "bar", Component: Outlet, children: [
          { id: "child", path: "child", loader: () => "CHILD", element: child },
        ] },
      ] }], { initialEntries: ["/foo"], hydrationData: { loaderData: { foo: "FOO" } } });
      $effect(() => () => router.dispose());
    </script>
    {#snippet layout()}<Layout {capture} />{/snippet}
    {#snippet foo()}<h1>Foo</h1>{/snippet}
    {#snippet child()}<h1>Child</h1>{/snippet}
    <RouterProvider {router} />`;
    const screen = await render(App, { capture });
    const read = capture.mock.calls[0][0];
    expect(read()).toEqual({ layout: undefined, foo: "FOO", bar: undefined, child: undefined });
    await screen.getByRole("link", { name: "Child" }).click();
    await expect.element(screen.getByRole("heading", { name: "Child" })).toBeVisible();
    expect(read()).toEqual({ layout: undefined, foo: undefined, bar: undefined, child: "CHILD" });
    expect(capture).toHaveBeenCalledOnce();
  });
});
