import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { html } from "test-utils";
import NavigationRouter from "./fixtures/navigation-router.svelte";
import type { RouteObject } from "../core/context.js";

// svelte:defs
import { Outlet, useOutletContext } from "svelte-router";
// sd

describe.each(["declarative", "data"] as const)("upstream Outlet/context rendering: %s", mode => {
  const Profile = html`<script>const context = useOutletContext();</script>
    <h1>Profile</h1><pre data-testid="context">{context.current === undefined ? "undefined" : JSON.stringify(context.current)}</pre>`;
  const Layout = html`<Outlet context={["Mary", "Jane", "Michael"]} />`;

  it("renders nothing when there is no matched child", async () => {
    const screen = await render(NavigationRouter, { mode, initial: "/users", options: { to: "." },
      routes: [{ path: "users", Component: Outlet }] });
    expect(screen.container.textContent?.trim()).toBe("");
  });

  it("an explicitly null element does not render a matched child", async () => {
    const screen = await render(NavigationRouter, { mode, initial: "/users/profile", options: { to: "." },
      routes: [{ path: "users", element: null, children: [{ path: "profile", Component: Profile }] }] });
    expect(screen.container.textContent?.trim()).toBe("");
  });

  for (const implicit of [false, true]) {
    for (const provided of [false, true]) {
      it(`renders a child with context=${provided}, implicit intermediate route=${implicit}`, async () => {
        const leaf: RouteObject = { path: "profile", Component: Profile };
        const routes: RouteObject[] = [{ path: "/", Component: provided ? Layout : Outlet,
          children: implicit ? [{ path: "users", children: [leaf] }] : [{ ...leaf, path: "users/profile" }],
        }];
        const screen = await render(NavigationRouter, { mode, initial: "/users/profile", options: { to: "." }, routes });
        await expect.element(screen.getByRole("heading", { name: "Profile" })).toBeVisible();
        expect(screen.getByTestId("context").element().textContent).toBe(provided ? '["Mary","Jane","Michael"]' : "undefined");
      });
    }
  }
});
