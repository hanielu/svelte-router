# Ridu adoption assessment

Scope: the router `0.1.0` contract (Svelte 5.57), compared with Ridu checkout
`c8c0089c` on 2026-09-13. This is an adoption assessment, not a production Ridu
migration or a claim that the new APIs exist in published router `0.0.6`.

## What is now useful

1. Link correctness and native route error containment can benefit the existing
   mixed routing architecture without moving SDK data into loaders/actions.
2. Element-aware, readiness-gated scroll restoration fits list→document→Back.
   Ridu's shell main, document viewport, mobile window and preview pane are not
   interchangeable. The integration must identify one active primary scroller and
   supply readiness for the current location/request; the sidebar stays independent.
3. Fetchers can remove generic request scheduling for new engine-owned data routes.
   They are not a replacement for the admin's domain form controller.

## Evidence from the actual consumer

Ridu's `admin/src/app.svelte` creates one `*` data route around `AdminRouterRoot`.
`admin-routes.svelte` contains auth-dependent declarative descendants. The data
provider is needed for dirty-editor blockers, not because those descendants use
loaders/actions. Inner Route props do not add routes to the engine.

`features/collections/collection-list-controller.svelte.ts` owns more than one
list request: list/count/access fan-out, per-document capabilities, selection
query identity, preserved selected-row access, pending row/bulk operations,
notifications and refresh. Its abort/generation bookkeeping is generic, but the
fan-out and selected-row reconciliation are domain policy and remain necessary.

The document/form controllers additionally own draft versus published behavior,
revision/submission snapshots, precise issue mapping against subsequent edits,
locale/access/upload handling, canonical redirects, and autosave scheduling.
Fetcher pending state cannot replace those guarantees. A request abort also does
not undo an already-committed server mutation.

## Bounded SDK integration probe

A disposable Chromium probe imported Ridu's actual `@riducms/sdk` and protocol
source with its `AdminConfig` type, plus this router's engine. Only the SDK Fetch
transport was controlled; it sent no network requests and changed no Ridu files.
It proved:

- a collection loader forwards the router request signal through `client.list`;
- replacing a slow query aborts its request and ignores a deliberately late result;
- an inline keyed `restoreDeleted` action preserves location identity and
  revalidates the current collection loader;
- an expected `RiduError` can be returned as a structured inline action outcome
  without triggering a route error boundary.

The probe passed. It is **engine/SDK integration evidence**, not a port of the
production collection controller, real-server authorization evidence, or a
built-admin E2E test. Maintained browser/hash tests independently cover the Svelte
fetcher adapter. No absolute sibling source alias was added to package metadata.

The trade-off is now concrete: an engine-owned collection route could remove its
manual AbortController/generation/pending plumbing and refresh dispatch. In the
current mixed application it would first add route-object registration, runtime
dependency capture, URL-to-domain request decoding, structured action outcomes,
and a bridge for existing selection/access/notification policy. Calling the old
controller from a fetcher action would retain both lifecycles instead of removing
one. **Do not migrate existing collection/document controllers wholesale on the
strength of fetcher availability.** Use a genuinely engine-owned isolated feature
as the first production data-route experiment if that architecture is desired.

## Release and integration boundary

At the assessed checkout, Ridu declares router `^0.0.6` and Svelte `^5.56.8`.
The `0.1.0` live handles are breaking and require Svelte 5.57. Changing Ridu call
sites while leaving those dependencies intact would make its checkout inconsistent.
Ridu adoption remains a separate explicit decision from router publication.

After selecting the published artifact, make one coherent Ridu integration change:

1. Update the router and Svelte requirements/lock together; migrate reader calls
   from `$derived(useLocation())` to setup-once handles with `.current`. Keep
   `.current` at the router boundary, not in unrelated domain controller APIs.
2. Correct Ridu's routing guide: it currently teaches BrowserRouter at the root
   despite the actual data provider. Client data routing needs no JavaScript server.
3. Give the root-created engine explicit disposal; preserve subscription versus
   engine ownership. Add Ridu-owned unexpected-error UI, distinct from domain
   failures and failed-chunk reload recovery.
4. Integrate one scroll owner with real viewport/readiness handoff. Exercise list
   query→document→Back/Forward, slow content, responsive layouts and preview/sidebar
   independence against the built admin.
5. Run the admin check, embedded-assets check, focused browser tests and Ridu's
   full cross-package gate. Do not describe router fixture tests as those results.

Ridu production code and dependency metadata were intentionally left unchanged
in this router implementation pass.
