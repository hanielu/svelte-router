import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { html, scope } from "test-utils";
import NavigationRouter from "./fixtures/navigation-router.svelte";
import type { RouteObject } from "../core/context.js";

// svelte:defs
import { getContext } from "svelte";
import { Routes, Route, useHref, useResolvedPath } from "svelte-router";
// sd

const Reader = html`<script>
  const options = getContext("navigation-fixture");
  const href = useHref(() => options.to);
  const resolved = useResolvedPath(() => options.to);
  const dot = useResolvedPath(".");
  const parent = useResolvedPath("..");
  const pathParent = useResolvedPath("..", { relative: "path" });
  const child = useResolvedPath("baz/qux");
  const dotChild = useResolvedPath("./baz/qux");
  let unrelated = $state(0);
</script>
<button onclick={() => unrelated++}>Update</button><p>{unrelated}</p>
<pre data-testid="href">{href.current}</pre>
<pre data-testid="resolved">{JSON.stringify(resolved.current)}</pre>
<pre data-testid="paths">{JSON.stringify([dot.current.pathname, parent.current.pathname,
  pathParent.current.pathname, child.current.pathname, dotChild.current.pathname])}</pre>`;

describe("upstream useHref and basename resolution", () => {
  const cases = [
    { name: "child", url: "/courses", to: "advanced-react", expected: "/courses/advanced-react" },
    { name: "child trailing URL", url: "/courses/", to: "advanced-react", expected: "/courses/advanced-react" },
    { name: "child trailing href", url: "/courses", to: "advanced-react/", expected: "/courses/advanced-react/" },
    { name: "sibling", url: "/courses", to: "../about", expected: "/about" },
    { name: "sibling trailing URL", url: "/courses/", to: "../about", expected: "/about" },
    { name: "sibling trailing href", url: "/courses", to: "../about/", expected: "/about/" },
    { name: "parent", url: "/courses/advanced-react", to: "..", expected: "/courses", nested: true },
    { name: "parent trailing URL", url: "/courses/advanced-react/", to: "..", expected: "/courses", nested: true },
    { name: "parent trailing href", url: "/courses/advanced-react", to: "../", expected: "/courses/", nested: true },
    { name: "absolute", url: "/courses/advanced-react", to: "/users", expected: "/users", nested: true },
    { name: "above root", url: "/courses/advanced-react", to: "../../../courses", expected: "/courses", nested: true },
    { name: "root only", url: "/courses", to: "../../..", expected: "/" },
  ];
  it.each(cases)("$name", async scenario => {
    const routes: RouteObject[] = [{ path: "courses", ...(scenario.nested
      ? { children: [{ path: "advanced-react", Component: Reader }] }
      : { Component: Reader }) }];
    const screen = render(NavigationRouter, { mode: "declarative", initial: scenario.url, routes, options: { to: scenario.to } });
    await expect.poll(() => screen.getByTestId("href").element().textContent).toBe(scenario.expected);
  });

  const basenameCases = [
    { to: "/invoices", expected: "/app/invoices" },
    { to: "dashboard", expected: "/app/admin/dashboard" },
    { to: "dashboard", trailing: true, expected: "/app/admin/dashboard" },
    { to: "dashboard/", expected: "/app/admin/dashboard/" },
    { to: "../dashboard", expected: "/app/dashboard" },
    { to: "../dashboard", trailing: true, expected: "/app/dashboard" },
    { to: "../dashboard/", expected: "/app/dashboard/" },
    { to: "..", expected: "/app" },
    { to: "..", trailing: true, expected: "/app" },
    { to: "../", expected: "/app" },
    { to: "../../../dashboard", expected: "/app/dashboard" },
    { to: "../../..", expected: "/app" },
    { to: "../../../dashboard", trailing: true, expected: "/app/dashboard" },
    { to: "../../../dashboard/", expected: "/app/dashboard/" },
  ];
  it.each(basenameCases)("basename $to, trailing URL=$trailing", async scenario => {
    const screen = render(NavigationRouter, { mode: "declarative", initial: "/app/admin" + (scenario.trailing ? "/" : ""),
      basename: "/app", routes: [{ path: "admin", Component: Reader }], options: { to: scenario.to } });
    await expect.poll(() => screen.getByTestId("href").element().textContent).toBe(scenario.expected);
    await screen.getByRole("button", { name: "Update" }).click();
    await expect.poll(() => screen.getByTestId("href").element().textContent).toBe(scenario.expected);
  });
});

describe("upstream useResolvedPath", () => {
  it.each([
    { name: "string", to: "/home?user=mj#welcome", expected: { pathname: "/home", search: "?user=mj", hash: "#welcome" } },
    { name: "partial object", to: { pathname: "/home", search: "user=mj", hash: "#welcome" }, expected: { pathname: "/home", search: "?user=mj", hash: "#welcome" } },
    { name: "question mark inside hash", to: "/home#welcome?user=mj", expected: { pathname: "/home", search: "", hash: "#welcome?user=mj" } },
  ])("$name", async scenario => {
    const screen = render(NavigationRouter, { mode: "declarative", initial: "/", routes: [{ path: "/", Component: Reader }], options: { to: scenario.to } });
    await expect.element(screen.getByTestId("resolved")).toHaveTextContent(JSON.stringify(scenario.expected));
  });

  const Descendant = scope(Reader).html`<Routes><Route path="bar" Component={Reader} /></Routes>`;
  const configs: { name: string; routes: RouteObject[]; parent: string }[] = [
    { name: "static", routes: [{ path: "foo/bar", Component: Reader }], parent: "/" },
    { name: "parameter", routes: [{ path: "foo/:param", Component: Reader }], parent: "/" },
    { name: "nested parameter", routes: [{ path: "foo", children: [{ path: ":param", Component: Reader }] }], parent: "/foo" },
    { name: "splat", routes: [{ path: "foo/*", Component: Reader }], parent: "/" },
    { name: "nested splat", routes: [{ path: "foo", children: [{ path: "*", Component: Reader }] }], parent: "/foo" },
    { name: "splat through pathless route", routes: [{ path: "foo", children: [{ children: [{ path: "*", Component: Reader }] }] }], parent: "/foo" },
    { name: "descendant Routes under splat", routes: [{ path: "foo/*", Component: Descendant }], parent: "/foo" },
  ];
  it.each(configs)("$name: dot, parent, path-relative parent and child paths", async scenario => {
    const screen = render(NavigationRouter, { mode: "declarative", initial: "/foo/bar", routes: scenario.routes, options: { to: "." } });
    await expect.element(screen.getByTestId("paths")).toHaveTextContent(JSON.stringify([
      "/foo/bar", scenario.parent, "/foo", "/foo/bar/baz/qux", "/foo/bar/baz/qux",
    ]));
  });
});
