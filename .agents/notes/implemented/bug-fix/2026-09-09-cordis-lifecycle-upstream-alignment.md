# Agent Note: Cordis lifecycle ordering on the upstream-alignment branch

Status: implemented

English | [中文](2026-09-09-cordis-lifecycle-upstream-alignment.zh.md)

## Problem

An asynchronous consumer can observe a provider resource after the provider has recovered it. Removing a retiring consumer from its runtime list before teardown settles also prevents a concurrently retiring provider from discovering that dependency. The study's deterministic probes reproduce these behaviors on the official Harness revision used by this branch.

## Decision

The vendored runtime retains a retiring fiber until its lifecycle work settles, waits for notified dependents before provider recovery, and deletes only the matching runtime identity. Synchronous publication failure removes its incomplete runtime entry immediately. Unloading becomes observable before an incompatible epoch change; one deferred activation checkpoint checks the captured epoch before executing plugin code.

The port keeps the vendored implementation's existing reentrant disposal, cleanup joining, pending-effect ownership, and lazy config resolution. The [vendor log](../../../../vendor/README.md) records the additional divergence. [The fork guide](../../../../docs/cordis-study.md) owns branch selection and reproduction links.

The current [JSONL handle](../../../../packages/session/session-persistence-jsonl/src/storage.ts) owns write draining and ownership release. The backend tracker closes every open handle and owns no separate storage connection. The migration uses these mechanisms directly instead of restoring the historical coordinator's teardown patch.

## Alternatives considered

**Copy the old fix wholesale.** The old coordinator is absent from the current architecture. Restoring it would introduce a second write owner instead of validating the existing handle implementation.

**Serialize all top-level effect recovery.** Independent effects can recover concurrently. The required ordering belongs to notified dependencies; imposing a global sequence would change unrelated behavior.

## Consequences

Provider teardown can wait longer because dependent cleanup must settle first. Retiring fibers remain internally discoverable during that wait, while their public disposed state is immediate. The dependency ordering relies on the study's acyclic scenarios; finite evidence does not establish arbitrary plugin correctness.

## Verification

The [lifecycle regressions](../../../../packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts) include asynchronous recovery, concurrent root disposal, stale activation, transitive activation, and independent top-level recovery. The first two fail on the unmodified upstream runtime; blocked cleanup is released in a finally clause. The original standalone probes also exercise the historical scheduling assertion outside Vitest.

The [JSONL tests](../../../../packages/session/session-persistence-jsonl/tests/jsonl.spec.ts) cover handle close, late routed writes, final drain failures, and backend teardown. Configuration reload, HMR, and AgentLoop lifecycle tests cover adjacent consumers. The portal records formal evidence separately for instrumented copies and identifies the exact paper, implementation, patch, and tool hashes.
