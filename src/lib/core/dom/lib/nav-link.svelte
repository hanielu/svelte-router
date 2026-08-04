<script lang="ts" module>
  import type { LinkProps } from "./link.svelte";
  import type { Snippet } from "svelte";

  export interface NavLinkRenderProps {
    isActive: boolean;
    isPending: boolean;
    isTransitioning: boolean;
  }

  export interface NavLinkProps
    extends Omit<LinkProps, "children" | "child" | "class" | "style"> {
    children?: Snippet<[NavLinkRenderProps]>;
    child?: Snippet<[
      {
        props: Record<string, unknown>;
        state: NavLinkRenderProps;
      },
    ]>;
    caseSensitive?: boolean;
    end?: boolean;
    class?: string | ((state: NavLinkRenderProps) => string | undefined);
    style?: string | ((state: NavLinkRenderProps) => string | undefined);
  }
</script>

<script lang="ts">
  import {
    DataRouterStateContext,
    NavigationContext,
    ViewTransitionContext,
  } from "$lib/core/context.js";
  import { matchPath, stripBasename } from "$lib/core/router/utils.js";
  import { useLocation, useResolvedPath } from "$lib/core/hooks.svelte.js";
  import Link from "./link.svelte";

  let {
    "aria-current": ariaCurrentProp = "page",
    caseSensitive = false,
    class: classProp = "",
    end = false,
    style: styleProp,
    to,
    viewTransition,
    relative,
    children,
    child: navChild,
    ref = $bindable(null),
    ...rest
  }: NavLinkProps & { ref?: HTMLAnchorElement | null } = $props();

  const dataRouterStateContext = DataRouterStateContext.get();
  const navigationContext = NavigationContext.get();
  const viewTransitionContext = ViewTransitionContext.get();

  const path = $derived(useResolvedPath(to, { relative }));
  const location = $derived(useLocation());
  const routerState = $derived(dataRouterStateContext.current);

  const toPathname = $derived.by(() => {
    const navigator = navigationContext.current.navigator;
    return navigator.encodeLocation ? navigator.encodeLocation(path).pathname : path.pathname;
  });

  const locationPathname = $derived(
    caseSensitive ? location.pathname : location.pathname.toLowerCase()
  );
  const comparableToPathname = $derived(
    caseSensitive ? toPathname : toPathname.toLowerCase()
  );

  const nextLocationPathname = $derived.by(() => {
    let pathname = routerState?.navigation.location?.pathname ?? null;
    if (!pathname) return null;

    const basename = navigationContext.current.basename;
    pathname = stripBasename(pathname, basename) || pathname;
    return caseSensitive ? pathname : pathname.toLowerCase();
  });

  const endSlashPosition = $derived(
    comparableToPathname !== "/" && comparableToPathname.endsWith("/")
      ? comparableToPathname.length - 1
      : comparableToPathname.length
  );

  const isActive = $derived(
    locationPathname === comparableToPathname ||
      (!end &&
        locationPathname.startsWith(comparableToPathname) &&
        locationPathname.charAt(endSlashPosition) === "/")
  );

  const isPending = $derived(
    nextLocationPathname !== null &&
      (nextLocationPathname === comparableToPathname ||
        (!end &&
          nextLocationPathname.startsWith(comparableToPathname) &&
          nextLocationPathname.charAt(comparableToPathname.length) === "/"))
  );

  const isTransitioning = $derived.by(() => {
    const transition = viewTransitionContext.current;
    if (!viewTransition || !transition.isTransitioning) return false;

    const basename = navigationContext.current.basename;
    const currentPath =
      stripBasename(transition.currentLocation.pathname, basename) ||
      transition.currentLocation.pathname;
    const nextPath =
      stripBasename(transition.nextLocation.pathname, basename) ||
      transition.nextLocation.pathname;

    return Boolean(matchPath(path.pathname, currentPath) || matchPath(path.pathname, nextPath));
  });

  const renderState = $derived<NavLinkRenderProps>({
    isActive,
    isPending,
    isTransitioning,
  });

  const className = $derived.by(() => {
    if (typeof classProp === "function") return classProp(renderState);

    return [
      classProp,
      isActive ? "active" : null,
      isPending ? "pending" : null,
      isTransitioning ? "transitioning" : null,
    ]
      .filter(Boolean)
      .join(" ");
  });

  const style = $derived(
    typeof styleProp === "function" ? styleProp(renderState) : styleProp
  );
  const ariaCurrent = $derived(isActive ? ariaCurrentProp : undefined);
</script>

{#if navChild}
  <Link
    {...rest}
    {to}
    {relative}
    {viewTransition}
    class={className}
    {style}
    aria-current={ariaCurrent}
    bind:ref
  >
    {#snippet child({ props })}
      {@render navChild({ props, state: renderState })}
    {/snippet}
  </Link>
{:else}
  <Link
    {...rest}
    {to}
    {relative}
    {viewTransition}
    class={className}
    {style}
    aria-current={ariaCurrent}
    bind:ref
  >
    {@render children?.(renderState)}
  </Link>
{/if}
