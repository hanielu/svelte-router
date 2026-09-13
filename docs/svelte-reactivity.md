# Svelte reactivity and public API design

This guide defines how to design and consume reactive router APIs. It describes
the `0.1.0` `.current` contract, which breaks the snapshot-returning
API of `0.0.6`. See
[AGENTS.md](../AGENTS.md) for repository-wide rules and
[the development guide](frontend-development.md) for probes and evidence.

## State ownership before syntax

Svelte runs component setup once per mounted instance. A function call returns a
value at the moment it runs. Passing a reactive value through an ordinary function
does not automatically preserve the relationship to a variable that will later be
reassigned.

| Kind of value | Representation | Owner |
| --- | --- | --- |
| Stable router or controller identity | Plain `const` | Its creator |
| Engine state replaced after navigation | `$state.raw` at the adapter boundary | Provider subscription |
| Mutable local interaction state | `$state` | Component/controller |
| Pure projection | `$derived` or getter | Consumer of the source |
| Replaceable public value | Stable readonly handle with a getter | Public value-hook contract |
| Navigation, submission, revalidation | Named commands | Engine/controller |
| Non-rendered counters and cleanup handles | Ordinary variables | Resource owner |

Do not mirror one owner's state into another effect-driven store. Avoid a `$state`
proxy around an external engine or arbitrary loader payload solely to make it look
reactive. Engine notifications already define the replacement boundary.

## Initialize once; read `.current`

Value hooks return a stable `RouterValue<T>` with a getter-only `current` property.
Their context is captured during component initialization. Read the handle in
markup, an effect, a derivation, or a later event handler:

```svelte
<script lang="ts">
  import { useLocation, useParams } from "@hvniel/svelte-router";

  const location = useLocation();
  const params = useParams<"postId">();
  const search = $derived(new URLSearchParams(location.current.search));
</script>

<p>{params.current.postId}: {location.current.pathname}</p>
<p>View: {search.get("view") ?? "edit"}</p>
```

This applies to route components as well as layouts. Same-pattern navigation can
retain the component while changing params, search, data, and matches. A one-time
snapshot is valid when intentional, such as recording the initial location for a
comparison. Constructing the hook itself repeatedly is not the update mechanism.

| API | `.current` value / absence |
| --- | --- |
| `useLocation`, `useNavigationType` | Location snapshot / history action |
| `useParams` | Readonly parameter map, empty when no route is matched |
| `useMatch` | Match or `null` |
| `useHref`, `useResolvedPath`, `useFormAction` | Resolved string / path / form-action string |
| `useNavigation`, `useMatches` | Engine navigation / cached UI-match array |
| `useLoaderData`, `useRouteLoaderData`, `useActionData` | Typed data or `undefined` before it exists |
| `useRouteId` | Nearest matched route ID; missing IDs fail at setup |
| `useRouteError` | `unknown` error value, normally `undefined` without an error |
| `useOutletContext<T>` | Nearest Outlet's value or `undefined` when not provided |
| `useViewTransitionState` | Boolean transition match |

Data hooks require a data provider; a generic `Routes` descendant does not register
engine data routes. Location/parameter readers require a router. `useInRouterContext`
remains a plain boolean because ancestry is fixed for the mounted instance.

## Why a readonly handle

Svelte has APIs using `.current`, including
[`fromStore`](https://svelte.dev/docs/svelte/svelte-store#fromStore) and
[reactive window values](https://svelte.dev/docs/svelte/svelte-reactivity-window).
It is a JavaScript getter convention. The property name alone provides neither
reactivity nor read-only enforcement.

Use `$derived` for a projection of the live value:

```svelte
<script lang="ts">
  import { useLocation, useParams } from "@hvniel/svelte-router";

  const location = useLocation();
  const params = useParams<"postId">();
  const editing = $derived(location.current.pathname.endsWith("/edit"));
</script>

<p>{params.current.postId}</p>
<p>{editing ? "Editing" : "Viewing"}</p>
```

`.current` removes the need to re-run the hook to follow its value. `$derived`
remains useful for consumer computations, memoization, and destructured live
projections. It has not become obsolete.

The core mechanism can be expressed without the router:

```svelte
<script lang="ts">
  let state = $state.raw({ pathname: "/posts/one" });
  const location = {
    get current() {
      return state;
    },
  };

  function next() {
    state = { pathname: "/posts/two" };
  }
</script>

<button onclick={next}>{location.current.pathname}</button>
```

An effect or template that reads the getter tracks the reactive state read inside
it. A plain event handler can also read the latest value without subscribing.
Taking `const snapshot = location.current` outside tracking is still a snapshot.
Destructuring `const { current } = location` also reads once.

For a hook, capture the context box during setup and close over it in the getter.
Do not put `getContext` or the existing `Context.current` convenience lookup inside
a getter that can run later from an event handler. Fail at hook initialization when
a required provider is missing.

## Handle contract and implementation decisions

Before changing a public reader, specify:

1. Whether its handle identity remains stable across navigation and data changes.
2. Which source replaces `.current`, and the value before data or a match exists.
3. Whether reading outside an effect returns the latest snapshot.
4. Whether multiple reads cache a projection or allocate new objects/arrays.
5. How reactive arguments such as a match pattern or target path are supplied.
6. Whether the result has any subscription or resource lifetime.
7. The inferred type, including nullability and route parameter names.

Prefer a small structural readonly type over exposing private box branding to
application authors. Getter-only `.current` prevents replacing the value through
the handle; it does not make arbitrary nested data immutable. Do not promise deep
immutability without a separate explicit contract.

For direct location access, a getter can forward the existing reactive source.
For derived arrays such as matches, consider an internal `$derived.by` so repeated
reads share a cached result until its dependencies change. Prove the desired
identity semantics instead of always allocating or always deep-proxying.

`utils/box.svelte.ts` owns the single cached projection implementation:
`box.with(read)`. Context providers and public value hooks both use it; there is
no separate `createRouterValue` factory. The class-backed getter reads a private
`$derived.by` value. Public hook signatures expose only `RouterValue<T>`, defined
in `core/reactivity.svelte.ts`, without the internal box branding or a setter.
The helper adds neither an effect nor a second engine subscription. Repeated
client reads reuse a projection until tracked sources change. Data payloads keep
their engine identity; the provider uses `$state.raw` for replacement snapshots.
Do not deep-freeze or deep-proxy arbitrary loader data to implement a readonly handle.

`useMatches` tracks the engine's matches and loader-data references separately.
Navigation-only notifications keep its cached UI-match array; actual match or data
replacement recomputes it. Do not invalidate the projection on unrelated state.

Computed hooks accept `RouterInput<T>` (a value or zero-argument getter). This
includes the complete relative-options object, not just the destination:

```svelte
<script lang="ts">
  import { useHref, useMatch } from "@hvniel/svelte-router";
  let { to, pattern, relative = "route" }: {
    to: string; pattern: string; relative?: "route" | "path";
  } = $props();
  const href = useHref(() => to, () => ({ relative }));
  const match = useMatch(() => pattern);
</script>

<a href={href.current}>Destination</a>
<p>{match.current ? "Matched" : "No match"}</p>
```

Plain inputs are intentional snapshots. Getter inputs must be pure and read their
reactive source synchronously. Loader/action request arguments remain ordinary
engine data (`params.id`), not hook handles (`params.current.id`).

## Shared projection and context audit

The readonly `box.with` path previously bypassed its declared derivation and
executed the getter on every read. It now caches through the same implementation
as public hooks and writable projections. `box.readonly` delegates to that
implementation too; it returns an already-readonly box unchanged. `box(value)`
still owns writable `$state`, and a getter/setter box delegates writes to its
owner. Neither is a reason to introduce writable copies of router snapshots.

All fixed-shape boxes use private classes with shared prototype accessors:
`StateBox` owns mutable state, `DerivedBox` owns the cached projection, and
`WritableDerivedBox` extends that projection with a delegated setter. The writable
subclass must explicitly forward the getter too: a setter-only override would
hide the inherited getter. It does not allocate a second derived box or cache.
Keep the factory functions and structural consumer types; do not expose these
implementation classes as another authoring API.

Read or assign `.current` explicitly. It is a non-enumerable prototype accessor,
not an own property that spreading, `Object.keys`, or JSON serialization copies.
`box.flatten` still creates an ordinary object with dynamically named accessors;
its getters/setters forward to the boxes. Owned `$state` retains deep reactivity
for plain objects, while cached projections continue to preserve raw payloads.
This representation choice is not a measured router-performance guarantee.

The provider audit found pure reads or record/snippet construction, not
side effects that require per-read execution:

| Existing source | Cached projection and preserved behaviour |
| --- | --- |
| `Router` navigation/location contexts | Forward existing derivations; basename, URL fields and history action remain reactive |
| `RouterProvider` data/state/transition contexts | Forward derivations or raw replacement snapshots; the provider retains subscription ownership |
| `RenderedRoute` | Read outlet, matches and data-mode fields explicitly; record identity is now stable until those fields change |
| Error boundaries and Outlet | Forward live props or error derivations; nearest-provider selection and absence are unchanged |
| Scoped locations and the retained alternate renderer | Construct location records or snippet functions; invoking a snippet still owns rendering/context setup, not reading the box |
| Static provider and context fallbacks | Read render-time values or constants; no new cross-request mutable state or SSR support claim |

Getters must stay pure and read reactive dependencies synchronously. Mutating an
ordinary nonreactive variable does not invalidate a cached projection. Capture
context at setup, and use the handle during its owner's mounted lifetime; this
is not a subscription that survives unmount. The existing `Context` wrapper's
missing-provider/default policy has not changed.

[`box.svelte.test.ts`](../src/lib/__tests__/box.svelte.test.ts) covers lazy client
caching, immediate reads after source replacement, dynamic dependencies, raw
payload identity, readonly enforcement, shared accessors with isolated state,
deep state mutation/replacement, conversion/flattening, writable projections,
effect cleanup, nested/fallback contexts and writable element-ref attachment cleanup. Public
navigation/data/outlet tests additionally protect retained route instances and
engine ownership; emitted consumer type checks keep box branding private.

## Search parameters

`useSearchParams(defaultInit)` returns `[RouterValue<URLSearchParams>, setParams]`.
Create the tuple once and read `params.current`. The optional defaults are cloned
at initialization and fill missing keys without navigating. After the first setter
call, defaults stop filling absent keys, so `setParams({})` can clear them.

The setter navigates and consults the latest location. Functional updaters receive
a fresh copy, allowing `previous.set(...)` without mutating the live snapshot.
Multiple calls before navigation commits do not queue or accumulate like state
updates. Navigate, await completion when available, and use a tracked DOM condition
in browser tests. Mutating `params.current` directly is not navigation and is not
a supported way to update the UI. No deep readonly guarantee is implied.

## Controllers and commands

Not every object needs `.current`. A controller with named commands and a small
fixed set of state projections can expose ordinary getters, for example a live
`state` alongside `revalidate()`. A value that may be a primitive, `undefined`, a
union, or a replaceable array is a stronger candidate for a uniform handle.

`useNavigate` returns a command and `useBlocker` owns registration. Initialize such
factories once. Re-running them in a derivation can allocate ownership repeatedly.
Their methods should consult captured context handles when invoked.

`useBlocker` currently returns a proxy reading live blocker properties.
`useRevalidator` returns a stable `revalidate()` command plus a live readonly
`state` getter. Read `revalidator.state` directly; it does not need `.current` or
repeated controller construction. Captured `useNavigate`/`useSubmit` commands read
current context and route-ID handles when invoked.

Fixed-shape getters usually communicate ownership more clearly than proxies. Use
a proxy only for a concrete dynamic-shape requirement and test method binding,
enumeration, identity, and mutation behaviour. Do not implement a proxy just to
hide a deliberate change in public return shape.

## Effects, timing, and cleanup

Every effect should name what it synchronizes and who releases the resource.
History subscriptions, browser listeners, and imperative rendering are legitimate
external boundaries. Copying `location.pathname` into another reactive variable is
usually a derivation instead.

Read intended dependencies first, then use `untrack` for incidental reads performed
by a command. Avoid an effect becoming dependent on the state that its navigation
mutates. Use the mounted-redirect test to verify this boundary.

Do not use `untrack` as a generic setup snapshot tool. An intentional mount-time
capture should be plain and documented; narrowly suppress a compiler warning only
after proving the chosen lifetime. Global warning suppression hides regressions.

Prefer synchronous effect setup with a returned cleanup. Async work started from
an effect must handle rejection and stale completion explicitly. Returning an
async function's promise does not register teardown. Cancellation must protect
both state replacement and late side effects.

Use `$effect.pre`, `tick`, or `flushSync` for a named timing requirement such as
subscribing before a mounted redirect. Do not infer ordering from React's layout
effect or Svelte component nesting alone. Prove it with the installed runtime.

Context stores stable identity. Do not allocate mutable module-level fallback
router state shared by independent applications or requests. Existing fallbacks
need an explicit optional-context policy, not automatic expansion to new hooks.

## Modern Svelte markup

Use `$props`, event attributes, snippets, and direct dynamic components. Default
zero-argument content stays implicit between component tags. A snippet with state
arguments stays explicit so its values have a clear source:

```svelte
<script lang="ts">
  import { NavLink } from "@hvniel/svelte-router";
</script>

<NavLink to="/posts">
  {#snippet children({ isActive, isPending })}
    <span class={["nav-label", { active: isActive, pending: isPending }]}>Posts</span>
  {/snippet}
</NavLink>
```

Use array/object `class` attributes for conditional classes in maintained code and
examples. [Svelte supports these forms since 5.16](https://svelte.dev/docs/svelte/class).
Prefer `ClassValue` from `svelte/elements` when designing a component that forwards
the native class contract. Check the component's actual type: current `NavLink`
has a narrower string/callback API, so the example applies classes on a native
`span` rather than advertising an unsupported component prop.

Use direct `<Page />` or `<route.component />` for dynamic components. Preserve
branches when structure, bindings, or lifetime differ. Avoid creating generic
renderers just to reduce markup or copying imperative compiler calls from the
router's internal renderer into ordinary components.

Prefer [declaration tags](https://svelte.dev/docs/svelte/declaration-tags) for
region-local values. Their reactivity is explicit, just as in `<script>`:

```svelte
<script lang="ts">
  let { label = "Posts" } = $props();
</script>

{const heading = $derived(label.toUpperCase())}
<h2>{heading}</h2>
{let expanded = $state(false)}
<button onclick={() => expanded = !expanded} aria-expanded={expanded}>
  {expanded ? "Collapse" : "Expand"}
</button>
```

Plain `{const heading = label.toUpperCase()}` captures a value at that region's
initialization; it is not an equivalent migration from the implicitly reactive
legacy `{@const}`. Use `$derived` when the projection should update. Keep shared
component setup and resource ownership in `<script>` when that is their scope.

## Compiler and dependency baseline

The development compiler and minimum peer are Svelte `5.57.0`. In-memory probes
verified class arrays/objects, attachments, declaration tags with runes, and the
getter example above. The previous `5.38.1` compiler could not parse declaration
tags; that restriction no longer applies. Do not copy it into new guidance.

Svelte's `createContext<T>()` is now available. Prefer it for new typed contexts,
and retrieve the context during component initialization. The existing `Context`
wrapper uses `getContext`/`setContext` plus boxed values and fallback defaults.
Simplifying it requires a scoped audit of those behaviours; this dependency
upgrade does not itself replace it. Update tests and consumers when changing the
missing-provider or fallback contract.

Official references help explain behaviour, but the installed compiler and focused
browser tests determine what this package can currently execute. Read
[Svelte's context guide](https://svelte.dev/docs/svelte/context) with that version
boundary in mind.
