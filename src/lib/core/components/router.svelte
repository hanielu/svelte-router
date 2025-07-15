<script lang="ts" module>
  import type { Location } from "../router/history.js";
  import type { Snippet } from "svelte";
  import { Action as NavigationType, invariant, parsePath, warning } from "../router/history.js";
  import { LocationContext, NavigationContext, type Navigator } from "../context.js";
  import { stripBasename } from "../router/utils.js";
  import { useInRouterContext } from "../hooks.svelte.js";

  export interface RouterProps {
    basename?: string;
    children?: Snippet;
    location: Partial<Location> | string;
    navigationType?: NavigationType;
    navigator: Navigator;
    static?: boolean;
  }
</script>

<script lang="ts">
  let {
    basename: basenameProp = "/",
    children,
    location: locationProp,
    navigationType = NavigationType.Pop,
    navigator,
    static: staticProp = false,
  }: RouterProps = $props();

  invariant(
    !useInRouterContext(),
    `You cannot render a <Router> inside another <Router>.` +
      ` You should never have more than one in your app.`
  );

  // Preserve trailing slashes on basename, so we can let the user control
  // the enforcement of trailing slashes throughout the app
  const basename = $derived(basenameProp.replace(/^\/*/, "/"));
  const navigationContext = $derived({
    basename,
    navigator,
    static: staticProp,
    future: {},
  });

  const location: Partial<Location> = $derived.by(() => {
    if (typeof locationProp === "string") {
      return parsePath(locationProp);
    }
    return locationProp;
  });

  const {
    pathname = "/",
    search = "",
    hash = "",
    state = null,
    key = "default",
  } = $derived(location);

  const locationContext = $derived.by(() => {
    let trailingPathname = stripBasename(pathname, basename);

    if (trailingPathname == null) {
      return null;
    }

    return {
      location: {
        pathname: trailingPathname,
        search,
        hash,
        state,
        key,
      },
      navigationType,
    };
  });

  // this is because component-bricking errors can only be triggered:
  // - when thrown during component initialization
  // - when thrown in a component's template effect
  function runWarning() {
    warning(
      locationContext != null,
      `<Router basename="${basename}"> is not able to match the URL ` +
        `"${pathname}${search}${hash}" because it does not start with the ` +
        `basename, so the <Router> won't render anything.`
    );
  }

  NavigationContext.setWith(() => navigationContext);
  LocationContext.setWith(() => locationContext!);
</script>

{runWarning()}

{#if locationContext !== null}
  {@render children?.()}
{/if}
