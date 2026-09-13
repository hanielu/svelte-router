import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { userEvent } from "vitest/browser";
import { html, scope } from "test-utils";
import LinkPage from "./fixtures/link-page.svelte";
import LinkRouter from "./fixtures/link-router.svelte";
import { createTestWindow } from "./fixtures/browser-window.js";
import type { RouteObject, LinkProps } from "svelte-router";

// svelte:defs
import {
  MemoryRouter,
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Link,
  createBrowserRouter,
  createHashRouter,
  RouterProvider,
} from "svelte-router";
// sd

// Accounted against all link-href/click/push and useLinkClickHandler cases at the
// pinned revision in docs/test-parity.md. Each table row retains the real route tree.
const nested = (path: string): RouteObject[] => [
  { path: "inbox", children: [{ path, Component: LinkPage }] },
];
const destinations = ["/about", ".", "..", "../../about", "../../../about"];
const hrefCases = [
  {
    name: "single static route",
    initial: "/inbox",
    routes: [{ path: "inbox", Component: LinkPage }],
    expected: ["/about", "/inbox", "/", "/about", "/about"],
  },
  {
    name: "static",
    initial: "/inbox/messages",
    routes: nested("messages"),
    expected: ["/about", "/inbox/messages", "/inbox", "/about", "/about"],
  },
  {
    name: "dynamic",
    initial: "/inbox/messages/abc",
    routes: nested("messages/:id"),
    expected: ["/about", "/inbox/messages/abc", "/inbox", "/about", "/about"],
  },
  {
    name: "index",
    initial: "/inbox",
    routes: [
      { path: "inbox", children: [{ index: true, Component: LinkPage }] },
    ],
    expected: ["/about", "/inbox", "/", "/about", "/about"],
  },
  {
    name: "pathless layout",
    initial: "/inbox/messages",
    routes: [
      {
        path: "inbox",
        children: [
          {
            Component: LinkPage,
            children: [
              { path: "messages", Component: html`<h1>Messages</h1>` },
            ],
          },
        ],
      },
    ],
    expected: ["/about", "/inbox", "/", "/about", "/about"],
  },
  {
    name: "splat",
    initial: "/inbox/messages/abc",
    routes: nested("messages/*"),
    expected: ["/about", "/inbox/messages/abc", "/inbox", "/about", "/about"],
  },
  {
    name: "basename",
    basename: "/app",
    initial: "/app/inbox",
    routes: [{ path: "inbox", Component: LinkPage }],
    expected: ["/app/about", "/app/inbox", "/app", "/app/about", "/app/about"],
  },
  {
    name: "path relative",
    relative: "path" as const,
    initial: "/inbox/messages/1",
    routes: [
      { path: "inbox" },
      { path: "inbox/messages" },
      { path: "inbox/messages/:id", Component: LinkPage },
    ],
    expected: [
      "/about",
      "/inbox/messages/1",
      "/inbox/messages",
      "/inbox/about",
      "/about",
    ],
  },
  {
    name: "path relative over-traversal",
    relative: "path" as const,
    initial: "/inbox/messages",
    routes: [{ path: "inbox/messages", Component: LinkPage }],
    expected: ["/about", "/inbox/messages", "/inbox", "/about", "/about"],
  },
];

// Observe what the router did, then prevent only the browser's final navigation.
// This lets native/external/download cases run safely in a real browser runner.
function click(anchor: Element, init: MouseEventInit = {}) {
  let prevented: boolean | undefined;
  const observe = (event: MouseEvent) => {
    prevented = event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener("click", observe);
  try {
    anchor.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, ...init })
    );
  } finally {
    document.removeEventListener("click", observe);
  }
  return prevented;
}

for (const mode of ["declarative", "data"] as const) {
  describe(`Link (${mode})`, () => {
    it("supports native Enter-key activation", async () => {
      const screen = await render(LinkRouter, {
        mode,
        initial: "/home",
        routes: [
          { path: "home", Component: LinkPage },
          { path: "about", Component: LinkPage },
        ],
        options: { link: { to: "/about" } },
      });
      try {
        await expect.element(screen.getByRole("link")).toBeVisible();
        (screen.getByRole("link").element() as HTMLAnchorElement).focus();
        await userEvent.keyboard("{Enter}");
        await expect
          .element(screen.getByTestId("location"))
          .toHaveTextContent("/about");
        await expect
          .element(screen.getByTestId("action"))
          .toHaveTextContent("PUSH");
      } finally {
        await screen.unmount();
      }
    });
    for (const fixture of hrefCases) {
      it.each(destinations.map((to, i) => ({ to, href: fixture.expected[i] })))(
        `${fixture.name}: $to → $href`,
        async ({ to, href }) => {
          const screen = await render(LinkRouter, {
            ...fixture,
            mode,
            options: { link: { to, relative: fixture.relative } },
          });
          try {
            await expect
              .element(screen.getByRole("link"))
              .toHaveAttribute("href", href);
          } finally {
            await screen.unmount();
          }
        }
      );
    }

    it.each([
      { to: "https://remix.run", href: "https://remix.run" },
      { to: "//remix.run", href: "//remix.run" },
      { to: "mailto:remix@example.com", href: "mailto:remix@example.com" },
      { to: "web+remix://somepath", href: "web+remix://somepath" },
      {
        to: `${window.location.origin}/inbox`,
        href: `${window.location.origin}/inbox`,
      },
      { to: { search: "key=value" }, href: "/inbox/messages?key=value" },
      { to: { hash: "hash" }, href: "/inbox/messages#hash" },
      { to: "../messages/def", href: "/inbox/messages/def" },
    ])("preserves href $href", async ({ to, href }) => {
      const screen = await render(LinkRouter, {
        mode,
        initial: "/inbox/messages",
        routes: nested("messages/*"),
        options: { link: { to } },
      });
      try {
        await expect
          .element(screen.getByRole("link"))
          .toHaveAttribute("href", href);
      } finally {
        await screen.unmount();
      }
    });

    it.each([
      { to: "../about", expected: "/about", action: "PUSH" },
      { to: "?name=michael", expected: "/home?name=michael", action: "PUSH" },
      { to: "#bio", expected: "/home#bio", action: "PUSH" },
      { to: ".", expected: "/home", action: "REPLACE" },
      { to: ".", replace: false, expected: "/home", action: "PUSH" },
      { to: "../about", replace: true, expected: "/about", action: "REPLACE" },
      {
        to: `${window.location.origin}/base/about`,
        basename: "/base",
        expected: "/about",
        action: "PUSH",
      },
    ])("navigates $to with $action", async fixture => {
      const capture = vi.fn();
      const screen = await render(LinkRouter, {
        mode,
        basename: fixture.basename,
        initial: `${fixture.basename ?? ""}/home`,
        routes: [
          { path: "home", Component: LinkPage },
          { path: "about", Component: LinkPage },
        ],
        options: {
          link: {
            to: fixture.to,
            replace: fixture.replace,
            state: { from: "link" },
          },
          capture,
        },
      });
      try {
        await expect.element(screen.getByRole("link")).toBeVisible();
        expect(click(screen.getByRole("link").element())).toBe(true);
        await expect
          .element(screen.getByTestId("location"))
          .toHaveTextContent(fixture.expected);
        await expect
          .element(screen.getByTestId("action"))
          .toHaveTextContent(fixture.action);
        expect(capture.mock.calls.at(-1)![0].location.current.state).toEqual({
          from: "link",
        });
      } finally {
        await screen.unmount();
      }
    });

    it.each([
      { name: "external", props: { to: "https://remix.run" } },
      {
        name: "outside basename",
        props: { to: `${window.location.origin}/not/base` },
      },
      { name: "reloadDocument", props: { reloadDocument: true } },
      { name: "download filename", props: { download: "file.txt" } },
      { name: "empty download", props: { download: "" } },
      { name: "new window", props: { target: "_blank" } },
      { name: "right button", event: { button: 2 } },
      { name: "middle button", event: { button: 1 } },
      { name: "ctrl", event: { ctrlKey: true } },
      { name: "meta", event: { metaKey: true } },
      { name: "shift", event: { shiftKey: true } },
      { name: "alt", event: { altKey: true } },
    ])("keeps native $name behaviour and calls onclick", async fixture => {
      const callback = vi.fn((event: MouseEvent) =>
        expect(event.defaultPrevented).toBe(false)
      );
      const screen = await render(LinkRouter, {
        mode,
        basename: "/base",
        initial: "/base/home",
        routes: [{ path: "home", Component: LinkPage }],
        options: {
          link: { to: "../about", ...fixture.props, onclick: callback },
        },
      });
      try {
        await expect.element(screen.getByRole("link")).toBeVisible();
        expect(click(screen.getByRole("link").element(), fixture.event)).toBe(
          false
        );
        expect(callback).toHaveBeenCalledOnce();
        await expect
          .element(screen.getByTestId("location"))
          .toHaveTextContent("/home");
      } finally {
        await screen.unmount();
      }
    });

    it("respects a prevented event", async () => {
      const screen = await render(LinkRouter, {
        mode,
        initial: "/home",
        routes: [{ path: "home", Component: LinkPage }],
        options: {
          link: { to: "../about", onclick: event => event.preventDefault() },
        },
      });
      try {
        await expect.element(screen.getByRole("link")).toBeVisible();
        expect(click(screen.getByRole("link").element())).toBe(true);
        await expect
          .element(screen.getByTestId("location"))
          .toHaveTextContent("/home");
      } finally {
        await screen.unmount();
      }
    });

    it("reactively switches absolute/internal/external targets without mutating the caller's props", async () => {
      const original = { to: `${window.location.origin}/home?first` };
      const capture = vi.fn();
      const screen = await render(LinkRouter, {
        mode,
        initial: "/home",
        routes: [{ path: "home", Component: LinkPage }],
        options: { link: original, capture },
      });
      try {
        await expect
          .element(screen.getByRole("link"))
          .toHaveAttribute("href", original.to);
        expect(original.to).toBe(`${window.location.origin}/home?first`);
        capture.mock.calls[0][0].update({ to: "https://remix.run" });
        await expect
          .element(screen.getByRole("link"))
          .toHaveAttribute("href", "https://remix.run");
        expect(click(screen.getByRole("link").element())).toBe(false);
        capture.mock.calls[0][0].update({
          to: "?second",
          target: "_self",
          download: false,
        });
        await expect
          .element(screen.getByRole("link"))
          .toHaveAttribute("href", "/home?second");
        expect(click(screen.getByRole("link").element())).toBe(true);
        await expect
          .element(screen.getByTestId("location"))
          .toHaveTextContent("/home?second");
        expect(capture).toHaveBeenCalledOnce();
      } finally {
        await screen.unmount();
      }
    });

    it.each([{}, { button: 2 }, { ctrlKey: true }, { target: "_blank" }])(
      "custom useLinkClickHandler preserves native semantics %j",
      async input => {
        const stays =
          "button" in input || "ctrlKey" in input || "target" in input;
        const screen = await render(LinkRouter, {
          mode,
          initial: "/home",
          routes: [
            { path: "home", Component: LinkPage },
            { path: "about", Component: LinkPage },
          ],
          options: {
            custom: true,
            link: {
              to: "../about",
              target:
                "target" in input ? (input.target as "_blank") : undefined,
            },
          },
        });
        try {
          await expect.element(screen.getByRole("link")).toBeVisible();
          expect(click(screen.getByRole("link").element(), input)).toBe(!stays);
          await expect
            .element(screen.getByTestId("location"))
            .toHaveTextContent(stays ? "/home" : "/about");
        } finally {
          await screen.unmount();
        }
      }
    );
  });
}

describe("Link adapter and descendant hrefs", () => {
  it.each([
    ["/auth/forgot-password", "/auth/forgot-password"],
    [".", "/auth/login"],
    ["..", "/auth"],
    ["../../about", "/about"],
    ["../../../about", "/about"],
  ])("descendant Routes resolves %s", async (to, href) => {
    const screen = await render(
      html`<script>let { to } = $props();</script>
      <MemoryRouter initialEntries={["/auth/login"]}><Routes><Route path="auth/*">
        {#snippet element()}<Routes><Route path="login">{#snippet element()}<Link {to}>Link</Link>{/snippet}</Route></Routes>{/snippet}
      </Route></Routes></MemoryRouter>`,
      { to }
    );
    try {
      await expect
        .element(screen.getByRole("link"))
        .toHaveAttribute("href", href);
    } finally {
      await screen.unmount();
    }
  });

  it.each(["browser", "hash", "data-browser", "data-hash"])(
    "%s preserves search/hash in real history hrefs",
    async mode => {
      const testWindow = await createTestWindow("/");
      const capture = vi.fn();
      const screen = await render(
        html`<script>
      let { mode, win, capture } = $props();
      const router = mode === "data-browser" ? createBrowserRouter([{ path: "/", element: link }], { window: win })
        : mode === "data-hash" ? createHashRouter([{ path: "/", element: link }], { window: win }) : undefined;
      capture(router);
    </script>
    {#snippet link()}<Link to="/path?search=value#hash">Link</Link>{/snippet}
    {#if router}<RouterProvider {router} />
    {:else if mode === "browser"}<BrowserRouter window={win}><Routes><Route path="/" element={link} /></Routes></BrowserRouter>
    {:else}<HashRouter window={win}><Routes><Route path="/" element={link} /></Routes></HashRouter>{/if}`,
        { mode, win: testWindow.window, capture }
      );
      try {
        await expect
          .element(screen.getByRole("link"))
          .toHaveAttribute(
            "href",
            `${mode.includes("hash") ? "#" : ""}/path?search=value#hash`
          );
      } finally {
        await screen.unmount();
        capture.mock.calls[0][0]?.dispose();
        testWindow.dispose();
      }
    }
  );

  it("warns without crashing on an invalid absolute URL", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const screen = await render(
      html`<MemoryRouter><Link to="//">Link</Link></MemoryRouter>`
    );
    try {
      await expect
        .element(screen.getByRole("link"))
        .toHaveAttribute("href", "//");
      expect(warn).toHaveBeenCalledWith(
        '<Link to="//"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.'
      );
    } finally {
      await screen.unmount();
      warn.mockRestore();
    }
  });

  it("renders outside a route context", async () => {
    const screen = await render(
      html`<MemoryRouter><Link to="route">Route</Link><Link to="path" relative="path">Path</Link></MemoryRouter>`
    );
    try {
      await expect
        .element(screen.getByRole("link", { name: "Route" }))
        .toHaveAttribute("href", "/route");
      await expect
        .element(screen.getByRole("link", { name: "Path" }))
        .toHaveAttribute("href", "/path");
    } finally {
      await screen.unmount();
    }
  });
});
