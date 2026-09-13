# Client data, errors, and scroll

These APIs are included in `0.1.0` and require Svelte 5.57. They are not
part of the `0.0.6` contract. See [the upstream audit](test-parity.md)
for exact evidence and [Ridu adoption](ridu-adoption.md) for the consumer boundary.

## Fetchers

Initialize a fetcher once inside a matched data route. Its target must be a
registered engine route, whose loader/action can call an ordinary SDK. The hook
does not fetch an arbitrary HTTP URL directly or register declarative descendants.

```svelte
<script lang="ts">
  import { Form, useFetcher, useFetchers } from '@hvniel/svelte-router';
  const fetcher = useFetcher<{ saved: boolean }>({ key: 'profile-save' });
  const active = useFetchers();
</script>

<!-- Requires an action registered on the /profile data route. -->
<Form method="post" action="/profile" navigate={false} fetcherKey={fetcher.key}>
  <input name="name" aria-label="Name" />
  <button disabled={fetcher.current.state !== 'idle'}>Save</button>
</Form>
{#if fetcher.current.data?.saved}<p>Saved</p>{/if}
<p>{active.current.length} active operations</p>
```

`load(href)` calls a loader; `submit(target, options)` calls a loader for GET or an
action otherwise, without navigating. Both return `Promise<void>` settling after
the engine operation, including triggered revalidation. Read the payload from
`.current.data`; awaiting does not guarantee the next Svelte DOM flush.
`flushSync: true` flushes the initial pending DOM update for immediate focus or
measurement. Later updates use normal Svelte scheduling.

The controller and commands retain identity across navigation. Options may be a
getter: `useFetcher(() => ({ key }))`. Owners sharing a key share data/operations;
different keys run independently. A superseding load aborts the old request and
ignores its late result. Completed data persists on owned handles; `useFetchers`
lists active operations only. Unmount releases ownership, but active work may
persist until completion. Remounting a shared key can observe that work. Unmounted
unowned failures/redirects do not hijack the new screen. Cancellation is **not**
server rollback; SDK loaders/actions must forward `request.signal` where useful.

Svelte uses ordinary `Form` with `navigate={false}` and `fetcherKey`; there is no
per-hook `fetcher.Form` component factory. `useSubmit` also supports
`navigate: false`. Unexpected failures go to the calling route's boundary, not
the target route's. Return structured expected validation outcomes from actions
when they belong inline. Fetcher state does not replace domain form values, dirty
state, field issue mapping, revisions, autosave policy, or authorization.

## Scroll restoration

Mount one owner in a persistent data-router layout. Omit `target` to use the
router's window. Here the application supplies current-location content readiness
and the layout owns the scrolling element:

```svelte
<script lang="ts">
  import { Outlet, ScrollRestoration } from '@hvniel/svelte-router';
  let { ready }: { ready: boolean } = $props();
  let viewport = $state<HTMLElement | null>(null);
</script>

<ScrollRestoration target={() => viewport} ready={() => ready} />
<main bind:this={viewport} style="height: 100dvh; overflow-y: auto"><Outlet /></main>
```

The hook alternative is `useScrollRestoration({ target: () => viewport,
ready: () => ready })`. Null targets and false readiness defer restoration.
Readiness must identify **this location's** completed layout, not a stale ready
flag from the previous page. The engine saves the outgoing position at navigation
start, before the UI is replaced. Keep the outgoing target available at that point.
Restoration waits for idle navigation and readiness; a superseded location is not
restored later. One completed restoration is applied per location object.

Saved positions win over hash/reset policy. Otherwise a decoded hash inside the
active scroller is used, or the view goes to the top unless navigation specified
`preventScrollReset`. Revalidation alone does not reset scroll. The API restores
vertical scroll in **one active scroller**, not every pane/sidebar. A getter may
switch the target between route-owned panes. Other scroll containers remain
application-owned; switching a target after this location was already restored
does not replay restoration.

Positions default to history-entry keys. Mount-time `getKey(location, matches)`
receives a basename-relative location and data matches; `storageKey` selects the
session-storage namespace. Pagehide persists positions, history restoration is
manual while mounted, and cleanup restores the preceding setting. Invalid or
denied storage does not break in-memory navigation. Stores are isolated per
engine, with shared session storage only through the chosen namespace.

No SSR script, flash-prevention script, horizontal scroll, or simultaneous
multi-pane restoration is promised. Use distinct storage keys for independent
apps on one origin.

## Error and lazy rendering

Data routes accept `ErrorBoundary: ErrorView` (a Svelte component) or `errorElement`
(a snippet). Read `useRouteError().current` there. The nearest declared boundary
handles loader/action errors, thrown responses and render exceptions; the root
has a default fallback. Declarative descendants inside a data route retain that
enclosing boundary. Plain declarative routers need an application-owned
`<svelte:boundary>`.

Use `HydrateFallback` or `hydrateFallbackElement` for initial lazy/missing-loader
content. Subsequent navigation keeps the old screen while loading. Successful
revalidation can recover loader/render errors, navigation resets render failures,
and a failure in error UI bubbles to its ancestor. These guarantees depend on
native branch nesting, not independent imperative Svelte mount roots.

Like the pinned React Router engine, a rejected lazy-import promise is cached:
revalidation is **not** an import retry. Offer navigation away/reload for chunk
failures. Boundaries do not catch detached async work or arbitrary event-handler
errors. Native Svelte await/catch blocks can own deferred values; React-style
`Await`/async-value hooks remain absent. Full upstream lazy/static/hydration
qualification remains a separate task.

`SerializeFrom<T>` unwraps `data()`, preserves client Dates/functions/objects,
maps a void result to undefined and an untyped Response to no inferred body.
It deliberately does not imply turbo-stream serialization or framework-generated
route modules. Public consumers are checked against packaged declarations with
`skipLibCheck: false` and Svelte-compatible Bundler module resolution.
