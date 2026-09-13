# Developing and verifying router features

This is the implementation workflow for a substantial router change. Use
[architecture](architecture.md) to locate ownership and
[Svelte reactivity](svelte-reactivity.md) to define the public and internal state
contracts. Small documentation or leaf changes need proportionate verification,
not a ritual full-suite run.

## Orient from evidence

Start with `git status --short`, the current branch, `package.json`, and the
narrowest relevant implementation and tests. Preserve existing changes and use a
requested branch before editing. Do not stage, commit, or release implicitly.

For a React Router parity case, identify the corresponding upstream behaviour and
tests. Use an available source checkout as a read-only reference; record the
version or revision when the comparison matters. Check current official sources
for changing upstream contracts. Copying a React hook or test body without
reconciling its execution model is not a port.

Separate three claims throughout the work:

- Current implementation: what the exported package and observed tests do now.
- Chosen design: the contract this scoped change will implement.
- Deferred work: a documented gap or proposal that remains unavailable.

Use [the upstream test audit](test-parity.md) to locate completed counterpart
suites, their pinned reference revision and explicit Svelte adaptations. The
corresponding upstream assertions are a minimum checklist, not optional inspiration.
Do not count a partial smoke test, commented-out assertion or skipped feature as a
completed port. Svelte liveness and cleanup checks are additional requirements.

The roadmap's checked rows are bounded evidence, not a guarantee about every
combination of routing mode, lifecycle, type, and browser behaviour. Keep its
limitations visible while strengthening the evidence.

## Define one observable slice

Write the acceptance case before selecting a mechanism. For a reactive hook,
"return a box" is an implementation choice; "a retained post view observes the
second post's ID without recreating the hook" is observable behaviour.

Record the relevant inputs, outputs, identity, errors, modes, and cleanup:

| Question | Example for a value-hook redesign |
| --- | --- |
| Consumer outcome | A retained route reads its current params from one stable handle |
| Trigger | Navigate from `/posts/one` to `/posts/two` |
| Input lifetime | Context captured once; dynamic arguments use the chosen live-input contract |
| Output lifetime | Handle identity stays stable; current value changes |
| Read semantics | Template/effect subscribes; event handler reads the latest value |
| Failure | Missing provider fails with an actionable message at setup |
| Ownership | Provider owns engine subscription; value reader has no duplicate subscription |
| Types | Param names, optional values, and readonly handle are preserved |
| Compatibility | Document the return-shape change and migrate maintained callers |

Choose the smallest implementation that proves the case across the relevant
boundaries. Type symmetry, a copied upstream abstraction, and a hypothetical
consumer are insufficient reasons for a new public concept.

## Implement through the owning layers

1. Specify the public contract and any intentional departure from React Router.
2. Change the engine only when routing/data semantics require it.
3. Adapt Svelte context, rendering, or hooks without duplicating engine state.
4. Update public exports and types if the consumer contract changes.
5. Migrate maintained site consumers and examples in the same slice.
6. Add focused behaviour/type evidence and correct the owning documentation.

A return-shape migration includes internal hook call sites, components using those
hooks, test fixtures, JSDoc, and consumer docs. The `.current` migration is now
implemented on this branch but unreleased. Do not restore the old snapshot shape
in an example or retain two APIs merely because the first resembles React.

Sibling applications can supply acceptance cases. Do not edit them, use absolute
local dependencies in the published package, or silently depend on their newer
compiler. If consumer validation uses a temporary local package link, explain
that boundary and keep it out of committed package metadata.

## Resolve Svelte uncertainty with a probe

Use the repository's installed compiler before redesigning around an assumption.
For syntax and generated-code questions, an in-memory probe is sufficient:

```bash
node --input-type=module <<'JS'
import { compile, VERSION } from 'svelte/compiler';

const source = `
<script>
  let { active = false } = $props();
</script>
<span class={['item', { active }]}>Item</span>
`;

const result = compile(source, {
  filename: 'probe.svelte',
  generate: 'client',
  runes: true,
});
console.log(VERSION);
console.log(result.warnings);
console.log(result.js.code);
JS
```

Use an OS temporary directory for a probe that needs files. Keep dependencies
resolved from this checkout; avoid silently downloading the newest tool. If a
runtime probe needs project aliases, use the existing test harness or an isolated
configuration that explicitly resolves the same library/compiler. Do not commit
generated JS, disposable screenshots, or copied package installations.

Compiler acceptance proves syntax only. It does not resolve imports, check all
TypeScript contracts, demonstrate subscriptions, or prove correct cleanup. Use
the browser harness for context lifetime, same-route navigation, events, and
unmount behaviour. Preserve a focused regression test when it protects a real
contract; discard exploratory probes that only restate an implementation.

Compare source clarity and equivalent behaviour before using generated code size
as evidence. A smaller compiled fragment is not useful if it drops a binding,
changes component lifetime, or loses keyboard behaviour.

## Test the consumer's behaviour

The existing Vitest configuration has `client` and `server` projects. Client tests
match `src/**/*.svelte.{test,spec}.{js,ts}` and run in headless Chromium through
`@vitest/browser-playwright`.
Other test/spec files use the node project. The common filename `test:unit` does
not mean all tests are DOM-free.

The inline Svelte plugin uses `// svelte:defs` and `// sd` fences. Follow a current
test such as [`route-hooks.svelte.test.ts`](../src/lib/__tests__/route-hooks.svelte.test.ts)
and its `html`/`scope` usage. Import public entry points through the configured
`svelte-router` alias. Do not invent JSX, private runtime calls, or mock context
state when a small real component can exercise the behaviour.

Use `await render(...)` with `vitest-browser-svelte` 3. Initialization failures
reject that promise, so assert them with `await expect(render(...)).rejects`.
Await rerenders, unmounts and asynchronous assertions as well. Vitest 4 locators
and string `toHaveTextContent` assertions can match partial text. Use `{ exact: true }`
for exact locator labels and anchored patterns or DOM text equality when the
assertion needs the complete content.

Select tests from the actual risk:

- Readers: retain the component, change params/search/state, and read from markup,
  an effect, and a later event handler. Check handle identity where promised.
- Reactive inputs: change the pattern, target, or route ID while mounted and prove
  the selected getter/snapshot contract.
- Context: nest providers, mount sibling routers, and prove reads use the right
  owner. Do not let global fallback state make an isolated test pass by accident.
- Navigation: push, replace, Back/Forward, basename, relative targets, redirects,
  index/splat routes, and encoded values as relevant.
- Rendering: retain shared layouts, replace a leaf, remove a branch, and prove
  teardown. A DOM text assertion alone may miss unwanted remounts.
- Data: use controlled promises to complete an older request after a newer one;
  prove cancellation, loading/data/error transitions, and stale suppression.
- Blockers: blocked/reset/proceed, live predicates, route change cleanup, and the
  relevant browser-history case. Keep native unload tests separate.
- Anchors/forms: keyboard, modifiers, target/download/external behaviour, prevented
  events, submission payloads, and accessible current/pending state.
- Types/exports: compile public consumer imports and inferred generics against the
  emitted package, not only private source aliases.

Avoid arbitrary sleeps when controlled promises or observable state can establish
ordering. Clean up mounted components, created routers, listeners, and timers
according to their ownership. Test both routing modes when their adapters differ;
include mixed descendants when a change affects ambient contexts or navigation.

## Verification commands

Run commands from the repository root using the installed dependencies. The
examples use Bun to invoke existing scripts; `pnpm-lock.yaml` remains the existing
dependency lock. No package-manager migration is implied.

| Scope | Command/evidence |
| --- | --- |
| Focused reactivity/navigation | `bun run test:unit --run src/lib/__tests__/route-hooks.svelte.test.ts` |
| Focused blocker/mixed navigation | `bun run test:unit --run src/lib/__tests__/use-blocker.svelte.test.ts src/lib/__tests__/use-navigate.svelte.test.ts` |
| Source and Svelte type checks | `bun run check` |
| Complete existing test suite | `bun run test:unit --run` |
| Package/declarations and publint | `bun run prepack` |
| Public handle types/inference against the emitted package | `bun run test:types` |
| Production site plus package script | `bun run build` |
| Site dev server | `bun run dev` |

`check` runs SvelteKit synchronization then `svelte-check`. `prepack` runs
synchronization, `svelte-package`, and `publint`. The current `build` script runs
Vite then invokes `npm run prepack` internally. Preserve awareness of those actual
commands; do not claim this repository already has Ridu's orchestration or a fully
migrated Bun dependency workflow.

`test:types` synchronizes and packages the library, then compiles the isolated
`type-tests/consumer.ts` project. Keep it outside SvelteKit's `tests/` include so
source and emitted global declarations do not collide in the application check.
Assertions cover precise keys, generic data inference, absence, readonly handles,
getter inputs, and command/controller shapes. It checks emitted dependencies with
`skipLibCheck: false` and Bundler resolution, matching Svelte package consumers;
it does not replace the source `check`.

Do not run overlapping packaging/build commands that write the same generated
directories. Use the runner's existing project scheduling rather than launching
duplicate suites. Keep full output available when a gate fails; filtered output
or a pipeline's final exit status can hide the real result.

Test mode uses the minimal Svelte compiler/inline-fixture plugins, reusing
preprocessing and compiler options from `svelte.config.js`. `test:unit` first runs
`svelte-kit sync`, generating the tsconfig paths from Kit's aliases and `$lib`
configuration. Vite 8.3 reads those paths with `resolve.tsconfigPaths: true`.
The explicit `tsconfig: "./tsconfig.json"` is important: the inline plugin's
virtual modules have no physical source location for automatic tsconfig discovery.
There is no second alias table or translation bridge in Vite configuration.
Tests do not start the documentation app's SSR/Shiki pipeline.
Production build mode still uses SvelteKit, UnoCSS and the site plugins. This
separates evidence rather than suppressing errors.

The harness was compared with a disposable `sv@0.17.0 create --template library
--types ts --add vitest="usages:unit,component" --no-install` project. It follows
the generated provider-factory, headless-browser, client/server project and
required-assertion setup; the minimal library compiler pipeline is intentional.
Vitest `4.1.11` is the qualified upgrade from `3.2.4`, not `5.0.0`: with the same
Vite `8.3.0`, Playwright `1.63.0` and Svelte renderer `3.1.0`, a plain top-left
`<a href="/bar">Bar</a>` failed to receive a Playwright locator click in the fresh
project on Vitest 5 and passed on Vitest 4. The router's `useMatches` navigation
case catches the same regression. Recheck that reproduction before upgrading;
do not add router-specific event or styling workarounds to bypass it.

The Svelte `5.57.0` upgrade exposed `state_referenced_locally` warnings in existing
adapters. Audit each snapshot's intended
lifetime in a scoped follow-up; do not suppress the category or convert every
initialization into a derivation. The upgrade also required current Svelte checking
and declaration tooling. Probe those tools as well as the compiler when adopting
new syntax: an older transformer can accept markup but emit incorrectly scoped
TypeScript. Tests must not inspect private compiler properties such as `__click`;
exercise DOM interactions or capture a public command from a real mounted fixture.

The client-data pass removes the old source errors by deleting unused copied
framework route-module machinery and defining client-result inference directly.
Source checking has zero errors; existing snapshot warnings in declarative/static
adapters remain a separate lifecycle audit, not permission to hide new warnings.
Use [the case audit](test-parity.md) for current coverage rather than historical
test counts. The retained seven box/context tests continue to protect cached
class-backed handles; see the [context audit](svelte-reactivity.md#shared-projection-and-context-audit).
Test fixtures are excluded from the packed package via `!dist/__tests__/**`.

For changes confined to docs, check links, imports against actual exports, and the
syntax of changed Svelte examples with the installed compiler. Check types or run
a behavioural probe if the example makes a new inference/liveness claim. No new
unit tests are needed just to assert wording or mirror markdown.

## Documentation and correction policy

Use README for currently usable consumer examples, the parity plan for capability
status, and the subsystem guides for implementation rules. Cross-link them rather
than copying long normative sections into several sources.

Modern Svelte conventions apply equally to production code, examples, test
fixtures, and newly edited roadmap snippets. Correct `class:` examples to native
class arrays/objects. Confirm component prop types before widening an example;
compiler syntax acceptance does not validate a `NavLink` prop's TypeScript type.

Complete examples must include imports and distinguish module loaders from their
registration on route objects. Give TypeScript snippets `lang="ts"`. Mark partial
fragments and proposed APIs explicitly. Do not advertise absent APIs such as
`Await` as current exports or claim universal no-JavaScript functionality
from a client-only demo.

Record general findings where the next contributor will look: context and snapshot
rules in `svelte-reactivity.md`, ownership changes in `architecture.md`, and bounded
evidence in the parity plan. Update stale notes when implementation closes a gap.
Do not promote an entire milestone because one happy-path test passes.

## Handoff

A completed slice has one coherent public contract, correct ownership, relevant
behaviour/type evidence, updated examples, and an honest capability description.
Report what changed, why it matters, which checks actually passed, and any
remaining failures. Distinguish a documented design direction from implementation.

Proceed with routine implementation choices in the authorized scope. Resolve a
material missing product/API choice when it cannot be inferred from that scope;
do not use a checklist to introduce redundant confirmation steps. Leave changes
reviewable on the requested branch and do not commit or publish without a request.
