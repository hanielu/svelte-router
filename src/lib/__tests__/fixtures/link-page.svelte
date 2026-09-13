<script lang="ts">
  import { getContext } from "svelte";
  import {
    Link,
    Outlet,
    useHref,
    useLinkClickHandler,
    useLocation,
    useNavigate,
    useNavigationType,
    type LinkProps,
  } from "svelte-router";
  const options = getContext<{
    link: LinkProps;
    custom?: boolean;
    capture?: (value: unknown) => void;
  }>("link-fixture");
  let props = $state.raw(options.link);
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const href = useHref(() => props.to);
  const click = useLinkClickHandler(
    () => props.to,
    () => ({
      target: props.target ?? undefined,
      replace: props.replace,
      state: props.state,
    })
  );
  options.capture?.({
    location,
    navigate,
    update: (next: LinkProps) => (props = next),
  });
</script>

{#if options.custom}
  <a href={href.current} onclick={click} target={props.target}>Link</a>
{:else}
  <Link {...props}>Link</Link>
{/if}
<p data-testid="location">
  {location.current.pathname + location.current.search + location.current.hash}
</p>
<p data-testid="action">{navigationType.current}</p>
<Outlet />
