# Svelte Router Repository Guide

## What This Package Is

`@hvniel/svelte-router` is a Svelte 5 routing library for client applications. It aims
for the useful behaviour of React Router's declarative and data modes, expressed
through Svelte components, snippets, reactivity, and lifecycle ownership.

Behavioural parity does not require identical hooks, return types, component
internals, or framework APIs. A React-shaped API that routinely produces stale
values in Svelte needs a better Svelte contract. Preserve route semantics and
observable guarantees while making that contract explicit.

The published library lives in `src/lib/`. The SvelteKit application in
`src/routes/` and `src/internal/` is its demonstration/documentation site.
SvelteKit, UnoCSS, Bits UI, and the site's presentation dependencies must not
become runtime requirements of the router. Framework mode is out of scope;
existing static-router exports have a narrower, separately qualified scope.

Ridu (formerly Zeno) is an important consumer and source of acceptance cases. Its
Go runtime, authentication policy, SDK, plugin registry, and form controllers are
application concerns, not router features. Do not assume every consumer uses
Ridu's declarative route tables or data ownership model.

## Read The Owning Guide

Read the narrowest relevant guide before changing a subsystem:

- [Architecture and package boundaries](docs/architecture.md): source ownership,
  router modes, route identity, navigation, data operations, and public exports.
- [Svelte reactivity and API design](docs/svelte-reactivity.md): snapshots, context,
  `.current`, reactive inputs, effects, snippets, classes, and version constraints.
- [Development and verification](docs/frontend-development.md): behavioural slices,
  compiler probes, browser evidence, commands, package checks, and documentation.
- [React Router parity plan](react-router-parity.md): scoped capability status,
  missing features, evidence requirements, and implementation priorities.
- [Upstream test audit](docs/test-parity.md): pinned source revision, case accounting,
  completed counterpart suites and intentional Svelte adaptations.
- [Client data, errors and scroll](docs/client-data.md): fetcher/scroll contracts,
  readiness, persistence, boundaries, and cached lazy-import failures.
- [Ridu adoption assessment](docs/ridu-adoption.md): consumer integration and
  unreleased dependency boundary; do not infer a production migration from tests.
- [README](README.md): supported consumer entry points and examples.

This guide and the subsystem guides define development rules. The parity plan
records capability evidence; it does not override Svelte conventions. The README
must describe implemented public APIs. `todos.md` and
`src/internal/components/do-not-touch/` are historical material, not instructions
to copy or independent sources of current support claims.

When sources disagree, check exports, implementation, focused tests, and the
installed compiler. Correct the owning document along with the implementation.
Do not quietly turn a historical workaround or a proposal into a supported API.
External documentation must be checked against the version actually installed.

## Current Baseline

The foundation audit on 2026-09-13 found:

- Package version `0.0.6`; development compiler and minimum Svelte peer `5.57.0`.
- Runes enabled in `svelte.config.js`; strict TypeScript with NodeNext resolution.
- Vite `8.3.0`, Vitest `4.1.11`, SvelteKit `2.70.3`, and the Svelte Vite plugin
  `7.3.0`. Chromium tests use `@vitest/browser-playwright` and async
  `vitest-browser-svelte` `3.1.0` rendering with Playwright `1.63.0`.
  Development requires Node `^20.19.0 || ^22.12.0 || >=24.0.0`; verified on
  `24.13.0`. See the development guide before revisiting the Vitest 5 upgrade.
- Svelte checking `4.7.6`, packaging `2.5.8`, and locked `svelte2tsx` `0.7.61`
  understand the declaration-tag baseline; compiler syntax probes alone do not
  qualify an older TypeScript/declaration transformer.
- Source exports are assembled in `src/lib/index.ts`; consumers receive `dist/`.
- An existing `pnpm-lock.yaml`; Bun can run the installed package scripts without
  changing dependency resolution. Do not add another lockfile or silently migrate
  package managers during unrelated work.
- The declared Svelte peer range is `^5.57.0`. Keep the development compiler,
  minimum peer, lockfile, and examples aligned when adopting newer framework APIs.
  Test the minimum rather than inferring compatibility from another application's
  compiler or the latest online documentation.

Class arrays/objects, attachments, and `{const ...}`/`{let ...}` declaration tags
compile on this baseline; Svelte's typed `createContext` helper is available.
These were checked against the installed compiler, not inferred from React or an
older Svelte release. Recheck the compiler and surrounding tooling when upgrading.

## General Conventions

- Use kebab-case filenames; put rune-bearing TypeScript in `.svelte.ts` files.
- Keep TypeScript strict. Use `unknown` and narrow it at external boundaries.
  Preserve exact inference for route parameters, loader/action data, and snippets.
  Existing `any` and compiler-internal casts are debt, not a template for new APIs.
- Use `const` unless a binding is reassigned or must be live through `$props`,
  `$state`, or another rebindable rune. Prefer inferred local return types; annotate
  public contracts, predicates, and boundaries where inference hides intent.
- Use type-only imports. Follow the existing `.js`/`.svelte.js` source specifier
  convention where appropriate for ESM packaging. Check emitted paths rather than
  assuming a Vite alias proves that the published package resolves them.
- Keep imports inside the owning layer. Library source may use `$lib` or relative
  imports that packaging resolves; it must not import `$internal`, `$components`,
  `$ui`, SvelteKit route modules, or a sibling application's source.
- Import named component exports explicitly. Use direct Svelte component expressions
  for dynamic components; do not add `svelte:component` or namespace indirection to
  imitate React rendering.
- Name abstractions after the routing concern they own. Do not expand `utils/`
  into a home for route policy, feature state, or application behaviour.
- Comments explain ownership, semantics, timing, or a measured workaround. Remove
  superseded comments when the implementation changes.
- Preserve `LICENSE` and upstream attribution in `NOTICE.txt` when porting code.

## Svelte And Reactive APIs

- Component setup runs once per instance. A retained route can change params,
  search, loader data, and navigation state without mounting a new component.
- Classify every API result as a snapshot, live value handle, or controller with
  commands. Document its identity, read behaviour, mutability, and lifetime.
- This branch's value hooks return stable readonly `RouterValue<T>` handles.
  Initialize once with `const location = useLocation()` and read
  `location.current`. Do not wrap hook factories in `$derived` or teach the old
  snapshot-returning API. This is a breaking, unreleased change from `0.0.6`.
- Changing path/pattern/route-ID inputs use getters, including the options object:
  `useResolvedPath(() => to, () => ({ relative }))`. A live result cannot repair
  a captured input. Do not retain parallel snapshot APIs solely for React syntax.
- `useSearchParams` returns `[paramsHandle, setParams]`; defaults are mount-time
  inputs. `useRevalidator` exposes live readonly `state` and `revalidate()`.
- `.current` is an ordinary JavaScript getter convention, not a special Svelte
  keyword. Read underlying reactive state in the getter or a cached derivation;
  do not copy state into another box with an effect.
- Use the shared `box.with` cached projection for context boxes and value hooks.
  Public hook signatures expose structural `RouterValue<T>`, not box branding.
  Do not introduce a second readonly handle factory; keep its getters pure.
- Capture context handles during component initialization. Later callbacks and
  getters read those handles; they must not call `getContext` at event time.
- Prefer Svelte's typed `createContext` for new contexts. The existing `Context`
  wrapper also supplies boxes and defaults; a migration must preserve or explicitly
  replace those semantics, not just rename the constructor.
- Prefer plain getters over proxies for fixed controller properties. A stable
  command function does not make adjacent state properties live automatically.
- Keep imperative APIs such as `useNavigate` and `useBlocker` at setup. Do not wrap
  resource-owning factories in `$derived` to compensate for stale return values.
- Use `$derived` for pure computation, `$state` for owned mutable values, and
  `$state.raw` for replacement snapshots from the external router engine.
- Effects synchronize with external state and return cleanup. Never use an effect
  to copy a value that can be derived. Use `untrack` only around incidental reads
  inside an existing tracking scope, not to hide setup-capture warnings.
- Every history listener, subscription, route registration, blocker, request,
  timer, transition, and imperatively mounted root has an owner and teardown.
- Use `tick`, `$effect.pre`, and `flushSync` only for an explained ordering need.
  Prove ordering in a focused test; a comment about React effects is not evidence.

## Components, Markup, And Styling

- Use modern event attributes (`onclick`, `onsubmit`) and callback props. Keep
  ordinary HTML interaction semantics before adding router behaviour.
- Compose conditional classes with the `class` attribute's array/object forms.
  Do not introduce `class:` directives or template strings for conditional classes
  in maintained source, tests, or documentation examples.
- Native class support does not automatically widen a component's `class` prop.
  `NavLink` in `0.0.6` accepts a string or a callback returning a string. Use modern
  classes inside its snippet; change and test the public prop before documenting
  array/object input on `NavLink` itself.
- Use `Component={Page}` for route UI without composition. A named `element`
  snippet owns composed UI; a `Route`'s default `children` are nested definitions.
- Use implicit children for zero-argument default content. Named snippets are for
  separate regions or state arguments, such as `NavLink`'s `children(state)`.
- Prefer local `{const ...}`/`{let ...}` declaration tags for values owned by a
  markup region. Use `$derived` for changing projections and `$state` for local
  mutable state. Do not introduce legacy `{@const}` or mistake plain `const` for
  a derivation; component-wide values can stay in `<script>`.
- Keep branches when they represent different structure or lifetime. Use a derived
  value and one render site when only text, props, or component selection changes.
- Prefer native anchors, buttons, and forms. Preserve accessible names, keyboard
  focus, `aria-current`, modified clicks, downloads, and external destinations.
- Presentation tokens, icons, and Bits UI belong to the site. Router primitives
  must remain usable without the site's CSS, theme, or component collection.
- Bindings and attachments need an explicit owner and cleanup. Do not add two-way
  binding to read-only router state or treat mutating a location as navigation.

## Routing Guarantees

- One engine owns data-router navigation, loaders/actions, cancellation,
  revalidation, and blockers. Svelte components project its state and lifecycle;
  they must not create competing history or request state machines.
- Declarative and data routing are both supported directions. A descendant
  `Routes` table inside `RouterProvider` performs UI matching; it does not add
  loader/action routes to the data engine.
- In `0.0.6`, `useBlocker` requires a data router. Reload/tab-close protection is a
  separate browser concern. Do not claim a plain `BrowserRouter` supplies blockers.
- Basenames, relative routes, index routes, splats, search/hash/state, and encoding
  must agree across matching, links, imperative navigation, and browser history.
- Route identity controls instance lifetime. Test same-pattern navigation and
  branch changes; remounting on every URL change can erase application state.
- Keep declarative definition trees static during their mounted lifetime until
  registration replacement/removal is implemented and verified. Whole-tree
  replacement and individual route registration teardown are different cases.
- Missing/error route behaviour, thrown responses, render exceptions, and async
  request failures require distinct evidence. Do not assume a Svelte boundary
  catches every rejected promise or all React Router error semantics.
- An export or inherited engine feature is not proof of supported Svelte behaviour.
  Avoid speculative APIs and undocumented private-engine dependencies.

## Workflow And Verification

Before substantial work, follow [the development guide](docs/frontend-development.md).
Name the observable behaviour, select the owning layer, probe technical uncertainty,
and complete the smallest slice through API, implementation, tests, and docs.

- Run focused browser tests for routing, context, reactivity, DOM events, and
  lifecycle changes; use node tests for pure algorithms.
- Keep aliases in `svelte.config.js`. The test script syncs Kit's generated
  tsconfig paths; Vite reads them natively using an explicit root `tsconfig` and
  `resolve.tsconfigPaths`. Do not duplicate aliases in the test configuration.
- Await `render()` and async DOM assertions. Use exact locator matching when
  distinguishing similar labels; do not mistake partial text matches for equality.
- Treat the corresponding React Router tests as the minimum behavioural checklist.
  Account for every upstream case before calling a counterpart complete. Matching
  test counts, exports and happy paths are insufficient; never comment out an
  assertion or silently classify an unimplemented library feature as inapplicable.
  Replace React-only lifecycle mechanics with explicit Svelte guarantees and tests.
- Run `bun run check` and `bun run test:unit --run` for a substantial library change.
  Run `bun run test:types` for public hook/type changes; it regenerates declarations
  and checks an isolated consumer of the emitted package.
  Run `bun run prepack` for export/type/packaging changes; inspect its diagnostics
  and emitted package, not just the command's exit status.
- Run `bun run build` for site/bundling changes and release verification. There is
  no Ridu `make check-full` or admin-assets gate in this repository.
- For documentation work, validate local links, compile changed Svelte examples,
  and check public names against exports. A syntax probe does not prove runtime
  behaviour, types, packaging, or support at the minimum peer version.
- Report pre-existing failures separately from new failures. Do not mark a gate
  green, weaken assertions, or suppress diagnostics merely because old code fails.
- Update capability status only for the behaviour actually demonstrated. Add the
  test reference and limitation to the owning guide/roadmap.

## Scope And Working Tree

Preserve existing user changes. Do not stage, commit, publish, or push unless asked.
Create requested branches with the `codex/` prefix unless another name is supplied.
Do not edit sibling repositories or add absolute local dependencies without that
work being placed in scope. Use sibling sources as read-only references when useful.

Proceed on routine decisions within an authorized feature. Public API changes need
a concrete migration contract; an already requested API redesign supplies that
scope. Do not invent approval gates for reversible implementation work, and do not
extend a documentation task into an unrequested package release or runtime rewrite.
