# Upstream test coverage

Reference: the owner's local React Router checkout at commit
`35718a35725627fd9fcfbd60199b50b70db9490d`; its package manifest reports `7.7.0`.
Upstream paths below are relative to `packages/react-router/__tests__/`.
This is a pinned comparison, not a claim about the latest release.

Behavioural assertions, not matching counts or filenames, define a port. Several
upstream tests inspect different points in the same transition. A Svelte test may
group them only if it checks all the intermediate states and final outcomes.
Additional Svelte liveness tests do not compensate for missing upstream cases.

## Completed counterpart audit

The September 2026 pass completes the already-started component/navigation
counterparts, plus the reader/revalidator/search suites listed here. This is
**not** a completed port of the entire upstream directory. Counts describe
upstream cases, not an expected one-to-one Svelte test count.

| Upstream file / cases | Svelte file in `src/lib/__tests__/` | Accounting |
| --- | --- | --- |
| `Route-test.tsx` / 3 | `route.svelte.test.ts` | Element, Component, implicit child outlet. |
| `Router-test.tsx` / 2 | `router.svelte.test.ts` | Nested-router rejection; location snapshot identity across consumer replacement in one retained provider. React renderer console-error counts are not a Svelte contract. |
| `Router-basename-test.tsx` / 5 | `router-basename.svelte.test.ts` | Mismatch warning/empty rendering, match, exclusivity, both casing directions. |
| `Routes-test.tsx` / 7 | `routes.svelte.test.ts` | Four direct cases and three explicit Svelte grouping/registration adaptations below. |
| `Routes-location-test.tsx` / 2 | `routes-location.svelte.test.ts` | Overridden and ambient matching. |
| `route-matching-test.tsx` / 18 expanded | `route-matching.svelte.test.ts` | All nine URLs in both route-object and component-definition modes. |
| `useLocation-test.tsx` / 3 | `use-location.svelte.test.ts` | Complete current/scoped records and initial state/key. |
| `useNavigate-test.tsx` / 49 | `use-navigate.svelte.test.ts` | Six basic/error/mixed cases, six setup/effect cases, state, 15 destination/tree cases in both modes, two identity adaptations, four basename/root/descendant combinations. |
| `navigate-test.tsx` / 22 | `navigate.svelte.test.ts` | All 15 destination/tree cases, additionally in data mode; three loop/sync/async cases; four setup/effect state cases. |
| `dom/nav-link-active-test.tsx` / 32 | `nav-link.svelte.test.ts` | Active/end/casing/segment/root/trailing-slash/basename matrix, callback class/style and snippets, real browser encoding. Four data scenarios group seven upstream cases and assert every presentation channel through pending/active/unrelated transitions. |
| `dom/use-blocker-test.tsx` / 37 | `use-blocker.svelte.test.ts` | Four initialization/basename/callback/layout cases; 33 push/replace/POP assertions grouped into nine allow/reset/proceed sequences. Every state, method, location and final outcome is checked. |
| `useMatch-test.tsx` / 4 | `params-match.svelte.test.ts` | Match, trailing pathname/base distinction, null, memoization across unrelated updates. |
| `useParams-test.tsx` / 8 | `params-match.svelte.test.ts` | Unmatched/empty/dynamic, inherited params, percent/plus/malformed decoding and warning, child params in parent. |
| `useHref-test.tsx` / 12; `useHref-basename-test.tsx` / 15 | `path-hooks.svelte.test.ts` | Child/sibling/parent/absolute/trailing slash/root clamping; unchanged href after updates. Basename root preserves `/app`, not `/app/`. |
| `useResolvedPath-test.tsx` / 11 | `path-hooks.svelte.test.ts` | String/object/hash parsing; dot/parent/child projections across static, parameter, splat, nested, pathless and descendant Routes. Related projection cases share full-record assertions. |
| `use-revalidator-test.tsx` / 5 | `use-revalidator.svelte.test.ts` | Hydrated data and idle navigation during revalidation, child/parent boundary recovery, controller identity across navigation, command identity and exact state sequence across two revalidations. |
| `dom/search-params-test.tsx` / 5 | `search-params.svelte.test.ts` | Form read/write, mutating updater, merged/removable defaults, mutation isolation during blocked browser navigation; also verifies proceeding commits the staged query. |
| `dom/link-href-test.tsx` / 44; `link-click-test.tsx` / 12; `link-push-test.tsx` / 6; `useLinkClickHandler-test.tsx` / 4 | `link.svelte.test.ts` | Single/nested static, dynamic, index, pathless, splat, basename, descendant and path-relative tree matrices; over-traversal; external/protocol/search/hash/sibling hrefs; real browser/hash adapters; invalid URL/outside route; click listener/default prevention/native target/modifiers; push/replace/state. Additional live-input, download and Enter activation tests. |
| `router/scroll-restoration-test.ts` / 19 | `scroll-engine.svelte.test.ts` | Initial hydration with/without data, saved Back/Forward, custom keys and both basenames, GET/POST redirects, uninterrupted revalidation, five reset-policy cases with both options and concurrent redirecting fetchers. Direct engines in Chromium replace the upstream fixture harness. |

## Client data and renderer additions

The following are bounded ports within larger upstream files, not completion of
the whole data-browser/data-memory or engine directories:

| Upstream case group | Svelte evidence / accounting |
| --- | --- |
| `dom/scroll-restoration-test.tsx`: three client cases | `scroll-restoration.svelte.test.ts`: window/loader readiness, navigation-key restoration and basename-relative custom keys. Four SSR inline-script cases are excluded from this explicitly client-only API, not claimed implemented. |
| Svelte dashboard scroll additions | Element list→document→Back/Forward, async application readiness, abandoned restoration, unavailable target, independent sidebar, hashes, pagehide/storage denial/corruption and owner cleanup. Measurements are controlled scroll stubs inside Chromium; this is not a Ridu built-admin E2E claim. |
| `dom/data-browser-router-test.tsx`: `useFetcher(s)` | `fetchers.svelte.test.ts` runs with isolated real browser **and** hash histories. The rows below map the upstream groups; renderer invocation counts/React component factories are intentionally adapted. |
| load/submit; `?index`; four object serialization cases | Controlled `idle → loading/submitting → loading → idle`, data retained through pending work, action and loader results, full request form/JSON/text bodies, explicit parent/index GET/POST, omitted index action. |
| load/deferred/submit/Form GET/Form POST errors; four hierarchy cases | Caller boundary versus target/parent, 404 and error text. Native Svelte await/catch replaces `Await` for a deferred rejection, retaining data and interactive UI; async-value hooks are not claimed. |
| Form operation; six `navigate=false` permutations | Ordinary Svelte `Form` with the fetcher's key replaces `fetcher.Form`. GET/POST × navigation/unkeyed/keyed operations assert pending state, location identity/history key, loader/action/fetcher data and form payload. |
| active fetchers/navigation/unmount; revalidating fetchers | Active key lists, navigation independence, retained data and completion; action-triggered fetcher revalidation; unmounted owners no longer revalidate. |
| five key cases | Generated unique keys, shared key data, key change in a retained component, keys visible through `useFetchers`, final-owner cleanup and clean remount. |
| eleven persistence cases | Load/submit/Form remain active until completion; action-triggered revalidation with/without remount; superseded redirect; unmounted and remounted load/action errors; no revalidation after unmount. Related assertions are grouped in sequences, not discarded. |
| four basename cases | `load`, GET submit, POST submit, keyed Form resolve through the basename in both history adapters. |
| `data-memory-router-test.tsx` operation promise ordering | Controlled fetcher promises remain pending through action/loader revalidation, with intermediate data/metadata assertions. Svelte render scheduling is tested separately, not equated to React render logs. |
| `dom/flush-sync-navigations-test.tsx`: two fetcher cases | Initial synchronous update flag and later asynchronous flags; additionally prove pending DOM is immediately readable with Svelte `flushSync`. Navigation/submission-only counterparts are not claimed by these two tests. |
| `data-memory-router-test.tsx`: error rendering groups | `errors-lazy.svelte.test.ts`: leaf/root hydration errors with component and real snippet; loader/action errors, Responses and null to leaf/root/default; root/index/shim 404; render failures, failure in error UI, Back/revalidation recovery and parent lifetime. Existing `data-value-handles` tests cover error replacement in retained views. Whole upstream file remains partial. |
| `router/lazy-test.ts`: selected function initialization/error/navigation cases | Initial module and loader gates, nearest nested hydration snippet, lazy-exported boundary, rejected import and upstream cached-failure semantics, abandoned navigation and module reuse. Property-function, fetcher-lazy and full concurrency/SSR matrices remain unported. |

The renderer regressions were reproduced before the fix: Component boundaries
were called like snippets without props; initial fallbacks were absent; independent
imperative mount roots prevented mixed declarative descendants reaching their
ancestor data boundary. Native keyed branch components fix those defects while
retaining all earlier navigation/outlet/retained-state tests. The scroll suite also
found and ported the engine's missing uninterrupted-revalidation guard.

`fixtures/navigation-cases.ts` spells out the actual route trees.
`route-definitions.svelte` registers them through real Route components; data mode
uses the engine with the same definitions. The matrix does not replace either
adapter with a matching mock.

## Svelte adaptations, not silent skips

- React's declarative navigate callback changes identity on render. Svelte creates
  one command per retained component in both modes. Tests prove one setup, retained
  local state, current location, and correct relative navigation from a changed
  match using that same command.
- StrictMode replay and React `startTransition` render counts have no literal
  Svelte equivalent. Navigate tests check setup/effect state, sync/controlled-async
  loaders, latest final state, bounded calls, replace semantics and no `/b/b` loops.
  They do not reproduce React's exact duplicate invocations.
- Routes cannot introspect snippets/components like React element trees. Snippet
  grouping replaces Fragment. A Svelte component can register Route descendants;
  ordinary registration markup is rendered, not rejected. Explicit tests protect
  these intentional differences rather than retaining commented-out React tests.
- Compare meaningful DOM class/style values. Svelte can omit an empty class or
  leave `style=""` after clearing styles. Class callbacks use `class`, style
  callbacks return CSS strings, and children functions become snippets.
- Ordering uses controlled promises instead of upstream sleeps. Encoding and
  blocked query tests use real, isolated iframe history documents, not memory
  history pretending to exercise browser URL encoding.

## Additional coverage and remaining boundaries

`data-hooks.svelte.test.ts` fully covers the specific `data-memory-router-test.tsx`
`provides useMatches` and `provides useRouteLoaderData` cases: complete match
records, old matches while loading, nested data and removal of unmatched hydrated
data. Its other loader/action tests and `data-value-handles.svelte.test.ts` are
**not a completed port of that whole upstream file**.

`reactive-values.svelte.test.ts`, `route-hooks.svelte.test.ts`, and
`data-value-handles.svelte.test.ts` add cached/readonly handles, getter inputs,
retained-instance liveness, untracked reads, context isolation, loader error
replacement/recovery, forms and view-transition evidence.

`outlet.svelte.test.ts` ports the render/context portions of `useOutlet-test.tsx`
through the public Outlet component in both modes: no child, with/without context,
and implicit intermediate routes. It also distinguishes an explicitly null element.
The absent `useOutlet` return-value/fallback API is still a gap, not silently
classified as React-only.

Still outside the completed counterpart audit: full data-memory/browser/static
router suites, remaining Form matrices, standalone useRoutes/Outlet suites,
matching/encoding/lifecycle suites, and engine tests except the audited scroll
suite. Some cover implemented but unqualified behaviour; others require absent
APIs such as useOutlet or Await. Missing library features are
gaps, not React-specific exclusions. Framework/server-runtime tests remain product
non-goals in the parity plan.

The port found renderer defects: implicit layouts captured their initial child;
descendant Routes omitted ancestor matches; Component values were invoked as
snippets without a props object. The fixes preserve inherited Outlet context and
explicitly null elements. Tests also retain useMatches' cached array through
navigation-only state changes. Nested-index, descendant-resolution and context
cases protect these contracts.

## Maintaining the audit

Read the pinned test bodies, not just titles. Account for every case and deliberate
adaptation when changing a suite's status. Never comment out an assertion or count
a skipped/missing feature as implemented behaviour. Update the reference revision
deliberately. Run the full test suite, source check, public type tests and production
build as described in [the development guide](frontend-development.md).
