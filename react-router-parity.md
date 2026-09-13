# React Router parity plan

This is the source of truth for bringing `@hvniel/svelte-router` to dependable
React Router parity. It is intentionally ordered by product impact for Ridu (formerly Zeno) and
other application dashboards, rather than by the order exports happen to appear
in React Router.

The comparison baseline is React Router 7's declarative and data modes. Framework
mode is explicitly excluded: SvelteKit already owns file-based routing, document
rendering, server entry points, cookies, sessions, and RSC-like framework concerns.

Capability snapshot: 2026-08-04, with targeted corrections on 2026-09-13. This is
not a fresh audit of every row. Re-audit against React Router before each minor
release; upstream is not a stationary target.

Implementation rules live in [AGENTS.md](AGENTS.md),
[architecture](docs/architecture.md), [Svelte reactivity](docs/svelte-reactivity.md),
and [the development workflow](docs/frontend-development.md). They take precedence
over historical snippets here. The compiler baseline is now Svelte `5.57.0`.

## Status rules

| Mark | Meaning |
| --- | --- |
| ✅ | Implemented, exported, and covered by meaningful automated tests |
| 🟡 | Present but incomplete, insufficiently tested, or not yet trustworthy under Svelte reactivity |
| ⬜ | Missing |
| ➖ | Deliberately not applicable to the Svelte port |

An API is not ✅ merely because copied source exists. The
[pinned upstream test audit](docs/test-parity.md) distinguishes completed
counterpart suites from partial feature evidence. A passing local suite alone
does not establish parity with unported upstream tests. Completion requires:

1. A Svelte-native public API and types.
2. Behaviour tests for the normal path and important edge cases.
3. A liveness test when location, matches, data, or props can change while the
   consuming component remains mounted.
4. Cleanup tests for subscriptions, blockers, fetchers, and dynamic routes.
5. Basename and relative-routing coverage where relevant.
6. Documentation for any intentional difference from React Router.
7. Accounting for every corresponding upstream acceptance case, with explicit
   Svelte adaptations where React-only mechanics do not apply.

## What Ridu and similar applications need first

These milestones cover an admin application with persistent navigation, nested
collection routes, forms, unsaved-change protection, loaders/actions, and routes
contributed by plugins.

### P0 — dependable application routing

| Capability | Status | Why it matters / remaining work |
| --- | --- | --- |
| `Link` | ✅ | Pinned href/click/push/custom-handler matrices, both routing modes, real browser/hash hrefs, live inputs, downloads and keyboard activation. |
| `NavLink` | ✅ | Full pinned active/pending suite: `end`, casing, basename, browser encoding, `aria-current`, callback class/style and Svelte snippets. View-transition qualification is separate in P1. |
| `Navigate` | ✅ | Declarative redirects, state/replace, and relative data-route redirects are tested. |
| Live `useNavigate` | ✅ | Persistent layouts now resolve relative navigation from current matches/location instead of mount-time snapshots. |
| `useLocation`, `useMatch`, `useNavigationType` | ✅ | Current location/match/action behaviour is covered, including same-component navigation. |
| `useParams`, `useHref`, `useResolvedPath` | ✅ | Stable `.current` handles; retained-route params, getter inputs, basename and route/path resolution covered in `reactive-values.svelte.test.ts`. |
| `Routes`, `Route`, `Outlet`, `useRoutes` | 🟡 | Core nesting works. Dynamic registration teardown and prop replacement are not safe yet. |
| Layout route without an explicit element | ✅ | Live implicit Outlet; nested index/leaf replacement and pathless layouts pass the upstream navigation matrix in both modes. |
| `RouterProvider` | 🟡 | Core updates/redirects pass; the complete upstream data-router suite is not ported. |
| Loaders and `useLoaderData` | 🟡 | Initial and retained data are covered; complete upstream loader/error/hydration/race qualification remains. |
| `useMatches`, `useRouteLoaderData` | ✅ | IDs, loader data, and ancestor lookup are covered. |
| Actions, `Form`, `useActionData` | 🟡 | Enhanced submissions and action results pass; complete upstream submission/encoding/error matrices remain. |
| `useNavigation` | ✅ | Live `.current` handle; loading/submitting/idle transitions and form data covered in `data-value-handles.svelte.test.ts`. Fetcher metadata remains separate. |
| `useBlocker` | ✅ | Svelte getter callbacks, blocked/reset/proceed states, basename handling, and cleanup are implemented. |
| `useSearchParams` | 🟡 | Full pinned search-params suite plus two-mode liveness/Back tests. Blocked functional-update mutation is covered; broader concurrent/defaults interactions remain. |
| Error boundaries and `useRouteError` | 🟡 | Native Svelte boundaries now preserve mixed declarative descendants. Loader/action/Response/null, hydration owner, 404, render-error, error UI bubbling and recovery tested; full data/static suites remain. |
| Lazy routes | 🟡 | Initial/nested fallback, module+loader, rejected import, lazy ErrorBoundary, abandoned navigation and module reuse tested. Full lazy-engine/property/SSR matrix remains. Revalidation does not retry a cached rejected import. |
| Plugin route lifecycle | ⬜ | Declarative `<Route>` registration appends to plain arrays and has no unmount/replacement cleanup. This blocks runtime plugin enable/disable. |
| `useFetcher` / `useFetchers` | 🟡 | Public live `.current` controllers, commands and active snapshots; browser/hash DOM tests cover loading, submission, keys, errors, serialization, revalidation and persistence. Full engine race suite remains. Does not replace a domain form/autosave controller. |

P0 is complete when every row is ✅, including plugin route teardown. Until then,
consumers should keep each mounted declarative definition tree static. Whole-tree
replacement is distinct from changing individual registrations; see the
architecture guide. The `.current` migration does not implement route teardown.

### P1 — polished application-router DX

| Capability | Status | Notes |
| --- | --- | --- |
| `ScrollRestoration` | ✅ | Client vertical window/element restoration, keys, storage, hashes, reset policy and app-owned readiness. Full pinned scroll-engine suite and client DOM cases; SSR scripts are not supplied. |
| `useBeforeUnload` | ⬜ | Complements `useBlocker` for tab close/reload protection. |
| `unstable_usePrompt` | ⬜ | Convenience API over blocker + browser confirm; preserve its upstream caveats. |
| `Await`, `useAsyncValue`, `useAsyncError` | ⬜ | Needed if consumers adopt streamed/deferred route data. |
| `useViewTransitionState` | 🟡 | Implemented but needs mocked View Transition API tests and interruption coverage. |
| `useRevalidator` | 🟡 | Full pinned hook suite: data/state transitions, identity, and child/parent error recovery. Overlapping engine revalidation remains unqualified. |
| `useSubmit`, `useFormAction` | 🟡 | Implemented; test index routes, encodings, JSON/text bodies, basename, and `navigate: false`. |
| Fetcher persistence and cleanup | 🟡 | Key sharing/change, retained data, active lifetime, unmounted/remounted errors, superseded redirects/loads and revalidation tested in both history modes. Wider engine cancellation/race matrix remains. |
| Prefetch/discovery behaviour | 🟡 | Types and pieces exist; verify `render`, `intent`, viewport, and `none`. |
| View transitions on `Link`/`NavLink` | 🟡 | Plumbing exists; verify interrupted and back-to-back transitions. |
| Hydration | 🟡 | Data-router fields exist; add server-to-client tests before claiming support. |

### P2 — broad React Router library parity

| Capability | Status | Notes |
| --- | --- | --- |
| Public low-level `Router` component | ⬜ | The internal component exists but is not exported. |
| `useOutlet` | ⬜ | `Outlet` and `useOutletContext` exist; the child outlet hook does not. |
| `renderMatches` | ⬜ | Useful for advanced composition and testing. |
| `createRoutesFromChildren` / `createRoutesFromElements` | ➖ | Svelte cannot inspect arbitrary child component trees like React elements. Prefer route objects or `<Route>` registration. |
| `unstable_HistoryRouter` | ⬜ | Low priority; custom history users can use the low-level router once exported. |
| `createRoutesStub` equivalent | ⬜ | A Svelte testing helper would materially improve loader/action/error tests. |
| Static handler/router SSR | 🟡 | `StaticRouter`, `StaticRouterProvider`, and `createStaticRouter` exist, but the provider contains an unresolved TODO and `createStaticHandler` is not publicly exported. |
| Package/type conformance | ✅ | Unused framework type machinery removed; source and emitted consumer types pass with strict library checking. Public route/controller types and ESM export paths verified. |
| Dev warnings and invariant parity | 🟡 | Core warnings exist; audit wording and failure timing after behaviour parity. |

## API inventory

### Components and routers

| React Router API | Svelte status | Svelte shape / difference |
| --- | --- | --- |
| `BrowserRouter` | ✅ | Svelte component with a children snippet. |
| `HashRouter` | ✅ | Svelte component with a children snippet. |
| `MemoryRouter` | ✅ | Svelte component; tested across navigation and basenames. |
| `StaticRouter` | 🟡 | Exported, broader SSR verification pending. |
| `Router` | ⬜ | Internal only. |
| `RouterProvider` | ✅ | Svelte component; owns reactive data-router state. |
| `Routes` | ✅ | Collects nested `<Route>` registrations. Dynamic teardown remains a separate P0 capability. |
| `Route` | ✅ | `Component` accepts a Svelte component; `element` is a Svelte snippet. |
| `Outlet` | ✅ | `context` is exposed through Svelte context. |
| `Navigate` | ✅ | No rendered DOM; navigates from an effect after setup. |
| `Link` | ✅ | Svelte children/child snippets replace React nodes/render props; native click and href matrices audited. |
| `NavLink` | ✅ | Callback `class`/`style` and a state-bearing children snippet replace React render props. |
| `Form` | ✅ | Enhanced Svelte form, validated through a route action. |
| `Await` | ⬜ | Requires Svelte boundary/snippet design rather than a literal Suspense port. |
| `ScrollRestoration` | ✅ | One active window/element; optional current-content readiness gate. Client-only, no SSR script. |
| `StaticRouterProvider` | 🟡 | Exported but not production-ready. |

### Route and navigation hooks

| Hook | Status | Required follow-up |
| --- | --- | --- |
| `useInRouterContext` | ✅ | — |
| `useLocation` | ✅ | Consumers initialize once and read `.current`, including later event handlers. |
| `useNavigationType` | ✅ | POP/PUSH/REPLACE changes tested. |
| `useNavigate` | ✅ | Declarative and data implementations; live relative resolution fixed. |
| `useParams` | ✅ | Persistent same-pattern params, readonly handle, and exact generic keys tested. |
| `useMatch` | ✅ | Decoded path and liveness covered. |
| `useHref` | ✅ | Getter inputs, basename, and retained-route destinations tested; broader encoding matrix remains a separate capability. |
| `useResolvedPath` | ✅ | Live cached path; changing destination and route/path-relative options tested. |
| `useRoutes` | ✅ | Core matching coverage exists; runtime route replacement does not. |
| `useOutlet` | ⬜ | Missing. |
| `useOutletContext` | ✅ | Exported from `Outlet`. |

### Data-router hooks

| Hook | Status | Required follow-up |
| --- | --- | --- |
| `useLoaderData` | ✅ | — |
| `useActionData` | ✅ | — |
| `useMatches` | ✅ | — |
| `useNavigation` | ✅ | Add complete submission metadata assertions. |
| `useRouteLoaderData` | ✅ | — |
| `useRouteError` | 🟡 | Core nested data/render/reset matrix covered; broader SSR/hydration qualification remains. |
| `useRouteId` | ✅ | Live ID handle; nearest route, missing ID, and public type covered by the handle tests. |
| `useRevalidator` | 🟡 | Live state tested; add overlapping revalidation coverage. |
| `useBlocker` | ✅ | Prefer `useBlocker(() => dirty)` so the router reads current rune state. |
| `useFetcher` | 🟡 | Stable `.current`/`key`/`load`/`submit`; use ordinary `<Form navigate={false} fetcherKey={fetcher.key}>`, not a component factory. |
| `useFetchers` | 🟡 | Cached live active snapshots without exposing mutable engine maps. DOM matrix covered; complete engine qualification remains. |
| `useAsyncValue` | ⬜ | Depends on `Await`. |
| `useAsyncError` | ⬜ | Depends on `Await`. |

### DOM hooks and helpers

| API | Status | Required follow-up |
| --- | --- | --- |
| `useSearchParams` | 🟡 | Live tuple handle implemented; persistence/defaults/functional updates tested. Broader navigation matrix remains. |
| `useSubmit` | 🟡 | Broad submission matrix. |
| `useFormAction` | 🟡 | Index-route and basename matrix. |
| `useLinkClickHandler` | ✅ | Pinned custom-anchor click suite plus native-event matrix. |
| `useScrollRestoration` | ✅ | Hook alternative to the component; mount-owned engine/browser lifecycle. |
| `useViewTransitionState` | 🟡 | Browser API mock, basename, and changing target covered; interruption matrix remains. |
| `useBeforeUnload` | ⬜ | Add/remove listener lifecycle tests. |
| `unstable_usePrompt` | ⬜ | Build after blocker/before-unload behaviour is firm. |
| `createSearchParams` | ✅ | Exported utility. |

### Router utilities

The copied router engine already exposes the high-value utilities: `matchRoutes`,
`matchPath`, `generatePath`, `resolvePath`, `createPath`, `parsePath`, `data`,
`redirect`, `redirectDocument`, `replace`, and `isRouteErrorResponse`. Treat these
as 🟡 as a group until their public exports and tests are audited; copied core code
is valuable, but public package parity is the contract.

## Svelte porting rules

These are non-negotiable lessons from the current port and from the React-to-Svelte
work in `lexical-svelte`.

### Values do not become live just because React hooks were live

React reruns a component function. Svelte runs component setup once. A direct port
that captures `location`, `matches`, or router state in a closure can remain forever
stuck at its mount-time value.

For the implemented, unreleased value-hook contract, document and test this pattern:

```svelte
<script lang="ts">
  import { useLocation, useMatch } from "@hvniel/svelte-router";

  const location = useLocation();
  const collectionMatch = useMatch("/collections/:slug/*");
</script>

<p>{location.current.pathname}: {collectionMatch.current?.params.slug}</p>
```

For function hooks such as `useNavigate`, capture context boxes during setup and
read `.current` inside the returned function. Do not capture a destructured location
or match array at hook creation.

Value hooks now use stable readonly `.current` handles for replaceable values.
This is a breaking branch change from the published `0.0.6` API, not a release.
The [reactivity guide](docs/svelte-reactivity.md) defines identity, context capture,
cached projections, reactive inputs, and the distinction between value handles
and command controllers. Migrate the implementation, types, tests, JSDoc, and
maintained examples together; do not merely replace the examples above.

### Effects must not accidentally subscribe to their own mutations

Calling a navigation function inside `$effect` can make all reactive reads performed
inside that function dependencies of the effect. Use `untrack` around the mutation
after explicitly reading the props that should trigger it. `<Navigate>` has a test
for this exact update-loop failure.

### React render props become snippets

Use named state objects so the API remains legible and extensible:

```svelte
<script lang="ts">
  import { NavLink } from "@hvniel/svelte-router";
</script>

<NavLink to="/posts">
  {#snippet children({ isActive, isPending })}
    <span class={{ active: isActive, pending: isPending }}>Posts</span>
  {/snippet}
</NavLink>
```

Do not emulate React nodes or callback children with hidden component constructors.
Use modern native `class` arrays/objects, not `class:` directives. `NavLink` itself
currently accepts string/callback classes; native element support does not widen
that component prop automatically.

### Registration APIs need teardown

Any component that registers a route, blocker, fetcher, listener, or subscriber must
return cleanup or use `onDestroy`. Runtime plugin systems make mount/unmount behaviour
a core correctness property, not an edge case.

## Test parity policy

For each implemented upstream feature:

1. Find the corresponding React Router tests and port the behaviour, not JSX syntax.
2. Add at least one Svelte-specific liveness or lifecycle test.
3. Run browser tests for DOM APIs and node tests for pure router utilities.
4. Test both declarative and data modes when their implementations differ.
5. Test persistent layouts; remount-only tests hide stale-closure bugs.
6. Test basename, relative routing, index routes, and nested routes where applicable.
7. Prefer accessible assertions (`role`, name, `aria-current`) over implementation details.
8. A parity row becomes ✅ only after the focused test and the complete suite pass.

Library tests now use a minimal Svelte Vite configuration rather than starting
the SvelteKit documentation/SSR/Shiki pipeline. Production site builds remain
separate evidence. Read [the test audit](docs/test-parity.md), not test counts,
to distinguish covered counterparts from unported engine cases.

## Recommended build order

The branch implements the foundation, live hooks, package/type cleanup, Link
matrix, client scroll restoration, native error/lazy rendering, and fetcher DOM
adapter. [Client data](docs/client-data.md) records the supported shape and limits;
[Ridu adoption](docs/ridu-adoption.md) separates library work from consumer migration.
The wider backlog remains:

1. Finish P0 route lifecycle: replace append-only route arrays with keyed registration
   and cleanup, then test plugin enable/disable and route prop changes.
2. Complete the full Form/search/encoding matrices beyond the audited cases.
3. Port the remaining fetcher-engine races, cancellations and revalidation cases.
4. Complete lazy-property, hydration, static and broader data-router error matrices.
5. Implement `useBeforeUnload` and prompt; preserve their distinct browser caveats.
6. Implement `Await` with Svelte boundaries/snippets, then async value/error hooks.
7. Finish view transitions, hydration, static routing, and testing helpers.
8. Repeat package/type/publint/build verification for release; measure bundle size
   before making size/performance claims. The package remains a partial port.

## Deliberate non-goals

- React Router framework mode (`Meta`, `Links`, `Scripts`, server entry modules,
  cookies/sessions, request handlers, RSC streams).
- JSX/React element introspection APIs that have no sound Svelte equivalent.
- Literal source parity where Svelte runes, snippets, context, or lifecycle demand a
  different public shape.

The goal is behavioural parity and excellent Svelte DX—not preserving React's
implementation accidents.
