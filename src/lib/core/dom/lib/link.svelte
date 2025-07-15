<script lang="ts" module>
  import { warning, type To } from "$lib/core/router/history.js";
  import { ABSOLUTE_URL_REGEX, type RelativeRoutingType } from "$lib/core/router/router.js";
  import type {
    FocusEventHandler,
    HTMLAnchorAttributes,
    MouseEventHandler,
    TouchEventHandler,
  } from "svelte/elements";
  import type { DiscoverBehavior } from "../server/index.js";
  import type { PrefetchBehavior } from "$lib/core/components/index.js";
  import { NavigationContext } from "$lib/core/context.js";
  import { stripBasename } from "$lib/core/router/utils.js";
  import { isBrowser, useLinkClickHandler } from "./index.svelte.js";
  import { useHref } from "$lib/core/hooks.svelte.js";

  interface PrefetchHandlers {
    onfocus?: FocusEventHandler<HTMLAnchorElement> | null;
    onblur?: FocusEventHandler<HTMLAnchorElement> | null;
    onmouseenter?: MouseEventHandler<HTMLAnchorElement> | null;
    onmouseleave?: MouseEventHandler<HTMLAnchorElement> | null;
    ontouchstart?: TouchEventHandler<HTMLAnchorElement> | null;
  }

  export function usePrefetchBehavior(): [boolean, null, PrefetchHandlers] {
    // No prefetching if not using SSR
    // NOTE: NOT IMPLEMENTED BECAUSE THIS PORT DOESN'T COVER THE FRAMEWORK ASPECT
    return [false, null, {}];
  }

  export function composeEventHandlers<EventType extends Event>(
    theirHandler: ((event: EventType) => any) | undefined,
    ourHandler: (event: EventType) => any
  ): (event: EventType) => any {
    return event => {
      theirHandler && theirHandler(event);
      if (!event.defaultPrevented) {
        ourHandler(event);
      }
    };
  }

  /**
   * @category Types
   */
  export interface LinkProps extends Omit<HTMLAnchorAttributes, "href"> {
    /**
    Defines the link discovery behavior

    ```svelte
    <Link /> // default ("render")
    <Link discover="render" />
    <Link discover="none" />
    ```

    - **render** - default, discover the route when the link renders
    - **none** - don't eagerly discover, only discover if the link is clicked
  */
    discover?: DiscoverBehavior;

    /**
    Defines the data and module prefetching behavior for the link.

    ```svelte
    <Link /> // default
    <Link prefetch="none" />
    <Link prefetch="intent" />
    <Link prefetch="render" />
    <Link prefetch="viewport" />
    ```

    - **none** - default, no prefetching
    - **intent** - prefetches when the user hovers or focuses the link
    - **render** - prefetches when the link renders
    - **viewport** - prefetches when the link is in the viewport, very useful for mobile

    Prefetching is done with HTML `<link rel="prefetch">` tags. They are inserted after the link.

    ```svelte
    <a href="..." />
    <a href="..." />
    <link rel="prefetch" /> // might conditionally render
    ```

    Because of this, if you are using `nav :last-child` you will need to use `nav :last-of-type` so the styles don't conditionally fall off your last link (and any other similar selectors).
   */
    prefetch?: PrefetchBehavior;

    /**
    Will use document navigation instead of client side routing when the link is clicked: the browser will handle the transition normally (as if it were an `<a href>`).

    ```svelte
    <Link to="/logout" reloadDocument />
    ```
   */
    reloadDocument?: boolean;

    /**
    Replaces the current entry in the history stack instead of pushing a new one onto it.

    ```svelte
    <Link replace />
    ```

    ```
    # with a history stack like this
    A -> B

    # normal link click pushes a new entry
    A -> B -> C

    # but with `replace`, B is replaced by C
    A -> C
    ```
   */
    replace?: boolean;

    /**
    Adds persistent client side routing state to the next location.

    ```svelte
    <Link to="/somewhere/else" state={{ some: "value" }} />
    ```

    The location state is accessed from the `location`.

    ```svelte
    <script>
      const location = useLocation()
      location.state; // { some: "value" }
    </script\>
    ```

    This state is inaccessible on the server as it is implemented on top of [`history.state`](https://developer.mozilla.org/en-US/docs/Web/API/History/state)
   */
    state?: any;

    /**
    Prevents the scroll position from being reset to the top of the window when the link is clicked and the app is using {@link ScrollRestoration}. This only prevents new locations reseting scroll to the top, scroll position will be restored for back/forward button navigation.

    ```svelte
    <Link to="?tab=one" preventScrollReset />
    ```
   */
    preventScrollReset?: boolean;

    /**
    Defines the relative path behavior for the link.

    ```svelte
    <Link to=".." /> // default: "route"
    <Link relative="route" />
    <Link relative="path" />
    ```

    Consider a route hierarchy where a parent route pattern is "blog" and a child route pattern is "blog/:slug/edit".

    - **route** - default, resolves the link relative to the route pattern. In the example above a relative link of `".."` will remove both `:slug/edit` segments back to "/blog".
    - **path** - relative to the path so `..` will only remove one URL segment up to "/blog/:slug"
   */
    relative?: RelativeRoutingType;

    /**
    Can be a string or a partial {@link Path}:

    ```svelte
    <Link to="/some/path" />

    <Link
      to={{
        pathname: "/some/path",
        search: "?query=string",
        hash: "#hash",
      }}
    />
    ```
   */
    to: To;

    /**
    Enables a [View Transition](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) for this navigation.

    ```svelte
    <Link to={to} viewTransition>
      Click me
    </Link>
    ```

    To apply specific styles for the transition, see {@link useViewTransitionState}
   */
    viewTransition?: boolean;
  }
</script>

<script lang="ts">
  let {
    onclick,
    discover = "render",
    prefetch = "none",
    relative,
    reloadDocument,
    replace,
    state: stateProp,
    target,
    to,
    preventScrollReset,
    viewTransition,
    ref = $bindable(),
    children,
    ...rest
  }: LinkProps & { ref?: HTMLAnchorElement } = $props();

  let { basename } = NavigationContext.current;
  let isAbsolute = $derived(typeof to === "string" && ABSOLUTE_URL_REGEX.test(to));

  // Rendered into <a href> for absolute URLs
  // let absoluteHref: string | undefined;
  // let isExternal = false;

  const { absoluteHref, isExternal } = $derived.by(() => {
    let absoluteHref: string | undefined;
    let isExternal = false;

    if (typeof to === "string" && isAbsolute) {
      // Render the absolute href server- and client-side
      absoluteHref = to;

      // Only check for external origins client-side
      if (isBrowser) {
        try {
          let currentUrl = new URL(window.location.href);
          let targetUrl = to.startsWith("//") ? new URL(currentUrl.protocol + to) : new URL(to);
          let path = stripBasename(targetUrl.pathname, basename);

          if (targetUrl.origin === currentUrl.origin && path != null) {
            // Strip the protocol/origin/basename for same-origin absolute URLs
            to = path + targetUrl.search + targetUrl.hash;
          } else {
            isExternal = true;
          }
        } catch (e) {
          // We can't do external URL detection without a valid URL
          warning(
            false,
            `<Link to="${to}"> contains an invalid URL which will probably break ` +
              `when clicked - please update to a valid URL path.`
          );
        }
      }
    }

    return { absoluteHref, isExternal };
  });

  // Rendered into <a href> for relative URLs
  let href = $derived(useHref(to, { relative }));
  // let [shouldPrefetch, prefetchRef, prefetchHandlers] = usePrefetchBehavior();

  type OnClickEvent = Parameters<NonNullable<HTMLAnchorAttributes["onclick"]>>[0];
  let internalOnClick = useLinkClickHandler(
    () => to,
    () => ({
      replace,
      state: stateProp,
      target: target ?? undefined,
      preventScrollReset,
      relative,
      viewTransition,
    })
  );
  function handleClick(event: OnClickEvent) {
    if (onclick) onclick(event);
    if (!event.defaultPrevented) {
      internalOnClick(event);
    }
  }
</script>

<a
  {...rest}
  href={absoluteHref || href}
  onclick={isExternal || reloadDocument ? onclick : handleClick}
  bind:this={ref}
  {target}
  data-discover={!isAbsolute && discover === "render" ? "true" : undefined}
>
  {@render children?.()}
</a>

<!-- 
  @component
  A progressively enhanced `<a href>` wrapper to enable navigation with client-side routing.

  ```svelte
  <script>
    import { Link } from "@hvniel/svelte-router";
  </script>
  <Link to="/dashboard">Dashboard</Link>

  <Link
    to={{
      pathname: "/some/path",
      search: "?query=string",
      hash: "#hash",
    }}
  />
  ```
-->
