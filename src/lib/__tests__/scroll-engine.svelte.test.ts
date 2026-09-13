import { describe, expect, it } from "vitest";
import { createMemoryRouter, redirect } from "svelte-router";

// Counterpart to router/scroll-restoration-test.ts. Keep the engine contract
// separate from DOM readiness/target behaviour tested in scroll-restoration.
function setup({
  initial = "/",
  basename = "/",
  hydrate = true,
  redirectLoad = false,
  redirectAction = false,
} = {}) {
  return createMemoryRouter(
    [
      {
        path: "/",
        children: [
          { id: "index", index: true, loader: () => "INDEX" },
          {
            id: "tasks",
            path: "tasks",
            loader: () => (redirectLoad ? redirect("/") : "TASKS"),
            action: () => (redirectAction ? redirect("/") : "ACTION"),
          },
          { path: "no-loader" },
        ],
      },
    ],
    {
      initialEntries: [basename === "/" ? initial : basename + initial],
      basename,
      hydrationData: hydrate
        ? { loaderData: { index: "INDEX", tasks: "TASKS" } }
        : undefined,
    }
  );
}

describe("scroll engine upstream contract", () => {
  it.each([false, true])(
    "initial restoration with hydration=%s",
    async hydrate => {
      const router = setup({ initial: hydrate ? "/" : "/no-loader", hydrate });
      try {
        expect(router.state.restoreScrollPosition).toBe(hydrate ? false : null);
        expect(router.state.preventScrollReset).toBe(false);
        router.enableScrollRestoration({ default: 50 }, () => 0);
        expect(router.state.restoreScrollPosition).toBe(hydrate ? false : 50);
      } finally {
        router.dispose();
      }
    }
  );

  it("saves outgoing positions and restores only after each loader finishes", async () => {
    const router = setup();
    const positions: Record<string, number> = {};
    let y = 100;
    router.enableScrollRestoration(positions, () => y);
    try {
      await router.navigate("/tasks");
      expect(router.state.restoreScrollPosition).toBe(null);
      expect(router.state.preventScrollReset).toBe(false);
      y = 200;
      await router.navigate(-1);
      await expect.poll(() => router.state.navigation.state).toBe("idle");
      expect(router.state.restoreScrollPosition).toBe(100);
      await router.navigate(1);
      await expect.poll(() => router.state.navigation.state).toBe("idle");
      expect(router.state.restoreScrollPosition).toBe(200);
    } finally {
      router.dispose();
    }
  });

  it.each(["/", "/base"])(
    "engine custom key retains basename %s",
    async basename => {
      const router = setup({ basename });
      const path = basename === "/" ? "/tasks" : "/base/tasks";
      let seen = "";
      router.enableScrollRestoration(
        { [path]: 100 },
        () => 0,
        location => {
          seen = location.pathname;
          return location.pathname;
        }
      );
      try {
        await router.navigate("/tasks");
        expect(seen).toBe(path);
        expect(router.state.restoreScrollPosition).toBe(100);
        expect(router.state.preventScrollReset).toBe(false);
      } finally {
        router.dispose();
      }
    }
  );

  it.each(["get", "post"] as const)(
    "restores saved positions after %s submissions",
    async method => {
      const router = createMemoryRouter(
        [
          {
            id: "tasks",
            path: "/tasks",
            loader: () => "TASKS",
            action: () => redirect("/tasks"),
          },
        ],
        {
          initialEntries: ["/tasks"],
          hydrationData: { loaderData: { tasks: "TASKS" } },
        }
      );
      const positions = { "/tasks": 100 };
      router.enableScrollRestoration(
        positions,
        () => 50,
        location => location.pathname
      );
      try {
        await router.navigate("/tasks", {
          formMethod: method,
          formData: new FormData(),
        });
        expect(router.state.restoreScrollPosition).toBe(50);
        expect(router.state.preventScrollReset).toBe(false);
      } finally {
        router.dispose();
      }
    }
  );

  it("does not restore on revalidation and still saves the subsequently scrolled position", async () => {
    const router = setup({ hydrate: false });
    let y = 100;
    router.enableScrollRestoration({}, () => y);
    try {
      await router.revalidate();
      expect(router.state.restoreScrollPosition).toBe(false);
      y = 200;
      await router.navigate("/tasks");
      await router.navigate(-1);
      await expect.poll(() => router.state.navigation.state).toBe("idle");
      expect(router.state.restoreScrollPosition).toBe(200);
    } finally {
      router.dispose();
    }
  });

  for (const preventScrollReset of [undefined, true]) {
    it.each([
      {
        name: "navigation",
        submit: false,
        redirectLoad: false,
        redirectAction: false,
        fetch: false,
      },
      {
        name: "loader redirect",
        submit: false,
        redirectLoad: true,
        redirectAction: false,
        fetch: false,
      },
      {
        name: "submission",
        submit: true,
        redirectLoad: false,
        redirectAction: false,
        fetch: false,
      },
      {
        name: "action redirect",
        submit: true,
        redirectLoad: false,
        redirectAction: true,
        fetch: false,
      },
      {
        name: "fetcher redirect",
        submit: true,
        redirectLoad: false,
        redirectAction: true,
        fetch: true,
      },
    ])(
      `$name reset policy (preventScrollReset=${preventScrollReset})`,
      async fixture => {
        const router = setup(fixture);
        router.enableScrollRestoration({}, () => 0);
        const options = {
          preventScrollReset,
          ...(fixture.submit
            ? { formMethod: "post" as const, formData: new FormData() }
            : {}),
        };
        try {
          if (fixture.fetch)
            await router.fetch("fetch", "tasks", "/tasks", options);
          else await router.navigate("/tasks", options);
          await expect.poll(() => router.state.navigation.state).toBe("idle");
          expect(router.state.restoreScrollPosition).toBe(null);
          expect(router.state.preventScrollReset).toBe(
            preventScrollReset ?? (fixture.submit && !fixture.redirectAction)
          );
        } finally {
          router.dispose();
        }
      }
    );
  }

  it("preserves the reset opt-out across concurrent redirecting fetchers", async () => {
    const first = Promise.withResolvers<Response>();
    const second = Promise.withResolvers<Response>();
    let calls = 0;
    const router = createMemoryRouter(
      [
        {
          id: "tasks",
          path: "/tasks",
          loader: () => "TASKS",
          action: () => (calls++ === 0 ? first.promise : second.promise),
        },
      ],
      {
        initialEntries: ["/tasks"],
        hydrationData: { loaderData: { tasks: "TASKS" } },
      }
    );
    router.enableScrollRestoration({}, () => 0);
    const options = {
      formMethod: "post" as const,
      formData: new FormData(),
      preventScrollReset: true,
    };
    try {
      const a = router.fetch("a", "tasks", "/tasks", options);
      const b = router.fetch("b", "tasks", "/tasks", options);
      first.resolve(redirect("/tasks"));
      await a;
      expect(router.state.restoreScrollPosition).toBe(null);
      expect(router.state.preventScrollReset).toBe(true);
      second.resolve(redirect("/tasks"));
      await b;
      expect(router.state.restoreScrollPosition).toBe(null);
      expect(router.state.preventScrollReset).toBe(true);
    } finally {
      first.resolve(redirect("/tasks"));
      second.resolve(redirect("/tasks"));
      router.dispose();
    }
  });
});
