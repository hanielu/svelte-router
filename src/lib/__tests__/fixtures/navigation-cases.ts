// Behavioural cases from React Router useNavigate-test.tsx and navigate-test.tsx.
// Pinned source and non-literal Svelte adaptations: docs/test-parity.md.
import { Outlet, type useLocation, type useNavigate } from "svelte-router";
import type { To } from "../../core/router/history.js";
import type { RouteObject } from "../../core/context.js";
import Source from "./navigation-page.svelte";
import Destination from "./navigation-destination.svelte";
import Layout from "./navigation-layout.svelte";

export interface NavigationFixtureOptions {
  to: To;
  relative?: "route" | "path";
  redirect?: boolean;
  replace?: boolean;
  state?: unknown;
  capture?: (navigate: ReturnType<typeof useNavigate>, location: ReturnType<typeof useLocation>) => void;
}

interface NavigationCase extends NavigationFixtureOptions {
  name: string;
  initial: string;
  expected: string;
  heading?: string;
  routes: RouteObject[];
}

const layouts = (leaf: RouteObject): RouteObject => ({ Component: Outlet, children: [
  { Component: Outlet, children: [{ Component: Outlet, children: [leaf] }] },
] });
const about: RouteObject = { path: "about", Component: Destination };
const contacts: RouteObject = { path: "contacts", Component: Destination };
const nested = (): RouteObject[] => [{ path: "layout", children: [{ path: ":param", children: [
  { index: true, Component: Source }, { path: "dest", Component: Destination },
] }] }];

export const navigationCases: NavigationCase[] = [
  { name: "absolute", initial: "/home", to: "/about", expected: "/about",
    routes: [{ path: "home", Component: Source }, about] },
  { name: "route: sibling", initial: "/home", to: "../about", expected: "/about",
    routes: [{ path: "home", Component: Source }, about] },
  { name: "route: index", initial: "/home", to: "../about", expected: "/about",
    routes: [{ path: "home", children: [{ index: true, Component: Source }] }, about] },
  { name: "route: pathless layout", initial: "/home", to: "../about", expected: "/about",
    routes: [{ Component: Outlet, children: [{ path: "home", Component: Source }] }, about] },
  { name: "route: multiple pathless layouts and index", initial: "/home", to: "../about", expected: "/about",
    routes: [{ path: "home", children: [layouts({ index: true, Component: Source })] }, about] },
  { name: "route: multiple pathless layouts and path", initial: "/home/page", to: "../../about", expected: "/about",
    routes: [{ path: "home", Component: Outlet, children: [layouts({ path: "page", Component: Source })] }, about] },
  { name: "route: parent through multiple pathless layouts", initial: "/home/page", to: "..", expected: "/home", heading: "Home",
    routes: [{ path: "home", Component: Layout, children: [layouts({ path: "page", Component: Source })] }, about] },
  { name: "route: nested dynamic index", initial: "/layout/thing", to: "dest", expected: "/layout/thing/dest", routes: nested() },
  { name: "path: multi-segment sibling", relative: "path", initial: "/contacts/1", to: "..", expected: "/contacts",
    routes: [contacts, { path: "contacts/:id", Component: Source }] },
  { name: "path: index", relative: "path", initial: "/contacts/1", to: "..", expected: "/contacts",
    routes: [contacts, { path: "contacts/:id", children: [{ index: true, Component: Source }] }] },
  { name: "path: pathless layout", relative: "path", initial: "/contacts/1", to: "..", expected: "/contacts",
    routes: [contacts, { Component: Outlet, children: [{ path: "contacts/:id", Component: Source }] }] },
  { name: "path: multiple pathless layouts and index", relative: "path", initial: "/contacts/1", to: "..", expected: "/contacts",
    routes: [contacts, { path: "contacts/:id", children: [layouts({ index: true, Component: Source })] }] },
  { name: "path: multiple pathless layouts and path", relative: "path", initial: "/contacts/1", to: "..", expected: "/contacts",
    routes: [{ path: "contacts", Component: Outlet, children: [{ index: true, Component: Destination }, layouts({ path: ":id", Component: Source })] }] },
  { name: "path: nested dynamic index", relative: "path", initial: "/layout/thing", to: "dest", expected: "/layout/thing/dest", routes: nested() },
  { name: "path: search and hash", relative: "path", initial: "/contacts/1", to: "..?foo=bar#hash", expected: "/contacts?foo=bar#hash",
    routes: [contacts, { path: "contacts/:id", Component: Source }] },
];
