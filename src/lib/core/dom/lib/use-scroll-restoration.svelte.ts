import { untrack } from "svelte";
import { DataRouterContext, DataRouterStateContext } from "../../context.js";
import { useMatches } from "../../hooks.svelte.js";
import { readRouterInput, type RouterInput } from "../../reactivity.svelte.js";
import { invariant, warning } from "../../router/history.js";
import { stripBasename } from "../../router/utils.js";
import type {
  GetScrollRestorationKeyFunction,
  Router,
} from "../../router/router.js";

export interface ScrollRestorationOptions {
  /** Mount-time key policy; receives a basename-relative location and data matches. */
  getKey?: GetScrollRestorationKeyFunction;
  /** Mount-time session-storage namespace. Use distinct keys for independent apps. */
  storageKey?: string;
  /** One active scroller. A getter can switch elements; null defers restoration. */
  target?: RouterInput<Window | HTMLElement | null>;
  /** Wait for application-owned content for the current location to be laid out. */
  ready?: RouterInput<boolean>;
}

const owners = new WeakSet<Router>();
const positionsByRouter = new WeakMap<
  Router,
  Map<string, Record<string, number>>
>();

/**
 * Restore vertical scroll using the data engine's navigation/save lifecycle.
 * Initialize once in a persistent layout. Only one owner per router is supported;
 * sidebars and secondary panes remain application-owned. No SSR script is emitted.
 */
export function useScrollRestoration(
  options: ScrollRestorationOptions = {}
): void {
  const context = DataRouterContext.get();
  const state = DataRouterStateContext.get();
  invariant(
    context.current && state.current,
    "useScrollRestoration must be used within a data router"
  );
  const matches = useMatches();
  const storageKey = options.storageKey ?? "svelte-router-scroll-positions";
  let enabled = $state(false);
  let restoredLocation: object | undefined;

  const getTarget = () =>
    options.target === undefined
      ? (context.current!.router.window ??
        (typeof window === "undefined" ? null : window))
      : readRouterInput(options.target);
  const getPosition = () => {
    const target = getTarget();
    return target
      ? "scrollY" in target
        ? target.scrollY
        : target.scrollTop
      : 0;
  };

  $effect.pre(() => {
    const { router, basename } = context.current!;
    const win = router.window ?? window;
    invariant(
      !owners.has(router),
      "Only one ScrollRestoration owner may be mounted per router"
    );
    owners.add(router);
    const previousRestoration = win.history.scrollRestoration;
    win.history.scrollRestoration = "manual";

    let stores = positionsByRouter.get(router);
    if (!stores) positionsByRouter.set(router, (stores = new Map()));
    let positions = stores.get(storageKey);
    if (!positions) {
      positions = Object.create(null) as Record<string, number>;
      try {
        const parsed: unknown = JSON.parse(
          win.sessionStorage.getItem(storageKey) ?? "null"
        );
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          for (const [key, value] of Object.entries(parsed)) {
            if (
              typeof value === "number" &&
              Number.isFinite(value) &&
              value >= 0
            )
              positions[key] = value;
          }
        }
      } catch {
        /* Storage denial/corruption must not break in-memory restoration. */
      }
      stores.set(storageKey, positions);
    }
    const getKey: GetScrollRestorationKeyFunction = (location, routeMatches) =>
      options.getKey?.(
        {
          ...location,
          pathname:
            stripBasename(location.pathname, basename) ?? location.pathname,
        },
        routeMatches
      ) || location.key;
    const pagehide = () => {
      if (router.state.navigation.state === "idle") {
        positions[getKey(router.state.location, matches.current)!] =
          getPosition();
      }
      try {
        win.sessionStorage.setItem(storageKey, JSON.stringify(positions));
      } catch (error) {
        warning(
          false,
          `Failed to save scroll positions in sessionStorage (${error}).`
        );
      }
      win.history.scrollRestoration = "auto";
    };
    const pageshow = () => {
      win.history.scrollRestoration = "manual";
    };
    win.addEventListener("pagehide", pagehide);
    win.addEventListener("pageshow", pageshow);
    // Engine callbacks read the active target/key at navigation time; registration
    // must not subscribe to those inputs or reset the store when a pane changes.
    const disable = untrack(() =>
      router.enableScrollRestoration(positions, getPosition, getKey)
    );
    enabled = true;
    return () => {
      disable();
      owners.delete(router);
      win.removeEventListener("pagehide", pagehide);
      win.removeEventListener("pageshow", pageshow);
      win.history.scrollRestoration = previousRestoration;
    };
  });

  $effect(() => {
    const current = state.current!;
    const target = getTarget();
    const ready = readRouterInput(options.ready ?? true);
    if (
      !enabled ||
      !ready ||
      !target ||
      current.navigation.state !== "idle" ||
      restoredLocation === current.location
    )
      return;
    restoredLocation = current.location;
    const y = current.restoreScrollPosition;
    if (y === false) return;
    if (typeof y === "number") {
      target.scrollTo(0, y);
      return;
    }
    if (current.location.hash) {
      try {
        const doc =
          "document" in target ? target.document : target.ownerDocument;
        const element = doc.getElementById(
          decodeURIComponent(current.location.hash.slice(1))
        );
        if (element && ("document" in target || target.contains(element))) {
          if ("document" in target) element.scrollIntoView();
          else
            target.scrollTo(
              0,
              target.scrollTop +
                element.getBoundingClientRect().top -
                target.getBoundingClientRect().top -
                target.clientTop
            );
          return;
        }
      } catch {
        warning(
          false,
          `"${current.location.hash.slice(1)}" is not a decodable element ID. The view will not scroll to it.`
        );
      }
    }
    if (!current.preventScrollReset) target.scrollTo(0, 0);
  });
}
