# Router architecture and ownership

This guide defines where a routing change belongs and which guarantees must survive
it. Use [AGENTS.md](../AGENTS.md) for conventions and the
[parity plan](../react-router-parity.md) for the capability inventory. The library
is a partial port; current code can demonstrate a mechanism without qualifying
every edge of its public contract.

## Repository boundaries

| Path | Responsibility | Boundary |
| --- | --- | --- |
| `src/lib/index.ts` | Public entry and re-exports | No application initialization or site imports |
| `src/lib/core/router/` | History, matching, route normalization, data-router engine | Independent of Svelte components and SvelteKit |
| `src/lib/core/context.ts` | Svelte-facing route types and typed contexts | Preserve stable context identity and explicit snapshots |
| `src/lib/core/hooks.svelte.ts` | Reactive readers and navigation/control APIs | Adapt the engine, not duplicate it |
| `src/lib/core/reactivity.svelte.ts` | Structural public value/input types and getter-input extraction | No second handle implementation or public box branding |
| `src/lib/core/components/` | Route registration, matching/rendering, outlets, provider, boundaries | Own Svelte instances and cleanup |
| `src/lib/core/dom/lib/` | Browser/hash/memory wrappers, anchors, forms, DOM navigation hooks | Preserve native interaction behaviour |
| `src/lib/core/dom/server/` | Existing static-router adapter surface | Separately test SSR; no framework-mode expansion by implication |
| `src/lib/core/types/` | Public type support and inherited type machinery | Do not expose unusable React/framework dependencies |
| `src/lib/utils/` | Existing focused context, box, and reactive utilities | No application state or generic policy bucket |
| `src/lib/__tests__/` | Library behaviour tests and local test support | Test the public behaviour and clean up owned resources |
| `type-tests/` | Isolated consumer type assertions against `dist/` | Outside SvelteKit's source/test compilation |
| `src/routes/`, `src/internal/` | SvelteKit site and examples | Consumers of the library, not dependencies of it |
| `static/`, `presets/`, `uno.config.ts` | Site assets and presentation | Must not be required by a router consumer |
| `dist/`, `.svelte-kit/`, `build/` | Generated package and site output | Regenerate; never hand-edit |

`utils/box.svelte.ts` owns the single cached projection implementation. Both
context providers and public value hooks use `box.with`; hook signatures expose
only the structural `RouterValue<T>` type. Writable boxes remain for owned mutable
values and element refs, not copies of engine state. See the
[context caching audit](svelte-reactivity.md#shared-projection-and-context-audit).

The existing renderer contains manually invoked components, casts, and a retained
alternate rendering implementation. Treat these as implementation debt. New feature
components must not copy compiler calling conventions or create another renderer.
A renderer simplification needs equivalent lifecycle evidence first.

The active renderer invokes a route's `Component` with Svelte component syntax in
`RenderedRoute`, not as a zero-argument snippet. Element snippets stay snippets.
An undefined element reads the live child outlet directly; it must not introduce a
new Outlet context that hides an ancestor's value. Explicit `element: null` renders
nothing. Descendant Routes append their matches to the captured ancestor chain for
hook resolution. The [upstream tests](test-parity.md) protect these distinctions.

The library's source barrel is broad and includes upstream utilities. Before
documenting an API, follow its re-export chain and emitted declaration. A type that
exists privately in `context.ts` is not automatically importable from the package.
Packaging must resolve source aliases and ESM extensions without a consumer's Vite
configuration compensating for missing files.

## Declarative routing

`BrowserRouter`, `HashRouter`, and `MemoryRouter` own a history instance and pass its
location and navigator to the internal `Router`. `Routes` collects `Route`
definitions, then `useRoutesImpl` matches and renders them.

In the current implementation, registration appends to plain arrays from effects.
There is no corresponding keyed replacement/removal protocol. Keep one definition
tree stable while mounted. Mounting a fresh entire `Routes` tree for a new auth
state is different from mutating route props or toggling individual definitions
inside the same registrar. Both require lifecycle tests when changed.

`Component` and `element` describe matched UI. Default `children` describe nested
route definitions. A layout renders its selected child with `Outlet`. Do not treat
arbitrary child markup as something equivalent to a React element tree that can be
inspected synchronously.

Declarative UI matching does not schedule route loaders or actions. A component
may fetch through an application controller, but those requests do not become
router loading state simply because the component appears under `Route`.

## Data routing

`createBrowserRouter`, `createHashRouter`, and `createMemoryRouter` create and
initialize an engine with route objects. `RouterProvider` subscribes to the engine,
provides data/navigation contexts, and renders the engine's route definitions.

The engine owns request scheduling, aborts, redirects, submission state,
revalidation, and blockers. The Svelte adapter owns the reactive view of those
results, context propagation, and component lifetime. Do not implement parallel
loader caches, history interception, or cancellation pipelines in the provider.

Separate ownership of the engine from ownership of its subscription. A provider
must unsubscribe on teardown; disposing an externally supplied engine belongs to
the owner that created it under the chosen lifetime contract. Do not assume an
unsubscribe removes all history listeners or that a component may dispose a shared
instance. Verify creation, unmount, remount, and instance replacement explicitly.

Route objects normally precede rendering. Reactive authentication and other
application state need an explicit integration contract. Recreating a router in a
derivation or every render is not a substitute for that contract.

Data mode is usable by client-only SPAs; it does not require a JavaScript server.
SSR/static support and React Router framework mode are separate subjects. A
client-side `Form` cannot promise a functional no-JavaScript server endpoint.

## Mixing data providers and declarative descendants

A data route ending in a splat can render a descendant `Routes` table. It receives
the provider's location and navigator, and performs its own view matching.

The current Ridu integration uses one `*` data route around an auth-dependent
declarative route table. The provider enables `useBlocker` for dirty editors;
application controllers retain ownership of data. This is one valid consumer use
case, not the required composition for every application.

The distinction matters:

- Inner `Route` definitions are not inserted into `router.routes`.
- `useMatches` reports the data engine's matches, not all declarative descendants.
- Adding `loader`, `action`, or an ID to an inner definition does not make it an
  engine-managed data route.
- Inner navigation uses the provider-backed navigator, so the engine can block it.
- `useBlocker` reads the ambient data-router contexts; plain `BrowserRouter` does
  not provide them in `0.0.6`.
- An insufficient parent path can stop matching before a descendant is reached.
  A splat must cover the descendant URLs under this composition.

Keep the mixed-mode navigation test in
[`use-navigate.svelte.test.ts`](../src/lib/__tests__/use-navigate.svelte.test.ts)
when changing context or navigation selection. Test basename and nested relative
resolution in addition to root-absolute links when extending the contract.

## Route identity and rendering

Separate the route definition's identity from its matched URL. Navigation from
`/posts/one` to `/posts/two` can retain the same route component while replacing
params, location, and data. Changing the route branch should unmount the outgoing
branch while preserving still-matched layouts.

The renderer must update reactive match slices and outlets without reusing stale
params. A forced remount can hide a reactivity defect while destroying unsaved
state, subscriptions, focus, or scroll. Use an instance counter or retained local
state in a test to prove whether the intended component survived.

IDs must have an unambiguous owner and meaning across normalization, registration,
matching, data lookup, and rendering. Do not fix an ID collision by making a view
silently read another route's loader result.

Imperative mounting must preserve the correct ancestor contexts. Every mounted
root must be unmounted through its owner; changing an outlet must also release the
old branch. Test nested providers and sibling routers to expose context leakage.

## Navigation and browser semantics

Treat pathname, search, hash, state, key, and history action as distinct values.
Basename handling must agree between href construction and actual navigation.
Keep route-relative and path-relative resolution distinct; do not normalize either
into the other for convenience.

Preserve index, optional, dynamic, splat, encoded-segment, and trailing-slash
behaviour across the public adapters. Avoid decoding paths twice. Test Back and
Forward as well as push and replace, including a retained route after navigation.

Links enhance real anchors. External destinations, downloads, target windows,
modifier keys, non-primary buttons, and prevented events must keep their intended
browser behaviour. `aria-current` and pending state describe routing state and
must not be approximated by naive string prefixes.

Blockers guard in-app engine navigation. Browser unload protection requires its
own listener or separately supported hook. No client route guard substitutes for
application/server authorization.

## Data and failure ownership

Preserve the engine's request signal, cancellation, redirect, response, and
revalidation semantics across the adapter. A superseded request must not win a
later navigation, expose stale data, or clear a newer error/loading state.

Data handles expose current engine state; they do not implicitly deep-proxy,
freeze, serialize, or clone arbitrary loader results. Document whether values are
snapshots and whether callers may mutate them. Router state writes happen through
commands rather than assignment to a reader.

`DataRoutes` passes a state getter into its renderer. Retained error-boundary
props read the current engine snapshot; render exceptions have separate locally
owned state. Do not capture the initial loader error or copy changing error props
into an effect-driven state mirror. The error-value tests cover loader failures
changing in a retained error view and recovery; they do not qualify every nested
action/render-error boundary case.

Thrown responses, rejected loaders/actions, render exceptions, and consumer
validation results are distinct cases. Boundary placement and reset-on-navigation
must be tested in Svelte. Svelte boundaries do not automatically catch arbitrary
event-handler or asynchronous failures.

Unsupported fetcher, lazy, error, and static behaviour remains marked in the
parity plan. Copied engine code is a place to investigate, not a support claim.
