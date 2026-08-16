# Agent Note: Cordis lifecycle teardown follows provider dependency order

Status: implemented

English | [中文](2026-08-16-cordis-paper-lifecycle-ordering.zh.md)

## Problem

Vendored Cordis removed a retiring consumer from its runtime list before asynchronous cleanup settled, while a provider started all of its top-level inverses as soon as its own unload began. A concurrently retiring provider could therefore stop exposing a service before the consumer cleanup that used the service completed. The same transition updated the dependency epoch before publishing `UNLOADING`, so observers could see a new target paired with the previous lifecycle state. A separate reload checkpoint also left transitive consumers in `LOADING` after an awaited provider had otherwise settled.

These behaviors conflict with the ordering and resolution-coherence properties derived independently from the Cordis paper. Trace instrumentation is not part of this fix branch; the paper-derived regressions exercise the ordinary public lifecycle API.

## Decision

A retiring fiber remains in its runtime list until its lifecycle inertia reaches quiescence. When an active provider notifies dependents that its service is leaving, it retains those dependent fibers and awaits their current lifecycle work before starting provider inverses. Runtime deletion checks record identity so a newer runtime for the same callback cannot be removed by an older retirement.

Lifecycle publication precedes incompatible epoch changes. Activation is deferred by one cancellation checkpoint, records the epoch it intends to load, and skips plugin execution when disposal invalidates that epoch. There is no second checkpoint inside `_reload`, so dependency activation scheduled by a provider transition settles before the provider's awaited mount returns. Independent top-level effects still recover concurrently; one effect's own accumulator remains serial and LIFO.

Session persistence groups event admission and backend closure into one effect accumulator. Listener inverses therefore run before the final drain and close, and backend teardown waits for any in-flight session retirements before retrying retained batches.

## Alternatives considered

- **Serializing every top-level effect inverse.** This would make the provider/consumer example pass by incidental registration order, but the paper permits independent effects to commute and the runtime already treats top-level effects as independent. Global serialization would add latency and would not express the actual provider dependency.
- **Keeping `uid` non-null until cleanup finishes.** This would preserve discoverability, but it would also make a publicly disposed fiber appear live. Runtime-list membership is the narrower internal retirement mechanism; `uid = null` can continue to mark public disposal immediately.
- **Shipping the formal trace sink with the fix.** The instrumentation is useful evidence but is not required for the runtime behavior. Keeping it on the research branches leaves this branch reviewable as an ordinary upstream fix.

## Consequences

Asynchronous consumer cleanup can continue to use its provider resource, including during concurrent root disposal. A fiber's runtime-list retirement is later than its public `uid = null` marker, but the public disposed state and rejection behavior are unchanged. Teardown may wait longer because provider recovery now joins the dependent cleanup required by the paper ordering property.

The branch contains only runtime fixes, ordinary regression tests, vendored-modification documentation, and this decision record. It deliberately excludes the formal trace sink, observation-point manifest, TLA+ runner, and NDJSON artifacts so the changes can be proposed upstream without research instrumentation.

## Testing

The Cordis lifecycle suite covers provider/consumer reverse exit, concurrent root disposal, disposal winning deferred activation, transitive dependency activation, and reverse-start concurrent recovery of independent top-level effects. Existing session-persistence tests cover retirement retry, in-flight retirement joining, detached append joining, and backend close ordering.
