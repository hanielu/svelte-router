<script lang="ts" module>
  import type { NavigateOptions } from "../context.js";
  import type { To } from "../router/history.js";
  import type { RelativeRoutingType } from "../router/router.js";

  export interface NavigateProps {
    to: To;
    replace?: boolean;
    state?: unknown;
    relative?: RelativeRoutingType;
  }
</script>

<script lang="ts">
  import { untrack } from "svelte";
  import { NavigationContext } from "../context.js";
  import { invariant, warning } from "../router/history.js";
  import { useInRouterContext, useNavigate, useResolvedPath } from "../hooks.svelte.js";

  let { to, replace, state, relative }: NavigateProps = $props();

  invariant(
    useInRouterContext(),
    `<Navigate> may be used only in the context of a <Router> component.`
  );

  const navigationContext = NavigationContext.get();
  const isStatic = navigationContext.current.static;
  const navigate = useNavigate();
  // Resolve again when the destination props change, but not merely because
  // the navigation itself changed the current location. Otherwise a relative
  // <Navigate to="edit"> can chase itself into /edit/edit/... before its old
  // route branch has unmounted.
  const path = $derived.by(() => {
    const destination = to;
    const relativeMode = relative;
    return untrack(() => useResolvedPath(destination, { relative: relativeMode }));
  });
  const serializedPath = $derived(JSON.stringify(path));

  $effect(() => {
    if (isStatic) {
      warning(
        false,
        `<Navigate> must not be used on the initial render in a <StaticRouter>. ` +
          `This is a no-op, but you should modify your code so <Navigate> is only ` +
          `rendered in response to user interaction or state change.`
      );
      return;
    }

    const destination = JSON.parse(serializedPath);
    const options = { replace, state, relative } satisfies NavigateOptions;

    // useNavigate() intentionally reads live router contexts. Those reads must
    // not become dependencies of this effect or the resulting location update
    // would immediately schedule the same navigation again.
    untrack(() => void navigate(destination, options));
  });
</script>
