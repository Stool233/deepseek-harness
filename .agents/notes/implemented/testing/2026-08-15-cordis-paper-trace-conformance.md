# Agent Note: Cordis paper trace conformance

Status: implemented

English | [中文](2026-08-15-cordis-paper-trace-conformance.zh.md)

## Problem

DeepSeek Harness ships a source-vendored Cordis with lifecycle hardening beyond its pinned upstream baseline. Package tests cover individual ownership paths, but they do not establish that the assembled implementation preserves the paper's abstract registry, dependency, retirement, effect-recovery, ordering, resolution, progress, and confluence properties. Copying a second formal specification into this repository would let the two definitions drift, while a finite successful execution cannot establish assumptions such as acyclic dependencies or pairwise-independent external effects.

## Decision

The [Cordis conformance kit](https://github.com/Stool233/cordis/tree/112f71c2ecba8dc3b39d7e3f4c25834f0ef9337b/formal) is the sole executable specification. Pull-request CI checks out that exact commit; local runs use the sibling Cordis checkout by default and may set `CORDIS_FORMAL_ROOT` to another working tree. The kit owns the TLA+ modules, theorem index, prerequisite audits, deterministic recorder, shared scenarios, mutation checks, and pinned TLA+ toolchain.

The vendored source carries only the implementation-side observation mechanism. `vendor/cordis/src/formal-trace.ts` installs one synchronous sink on a root context and is intentionally absent from the public `@deepseek-ai/cordis` barrel. The hook observes paper-relevant lifecycle, target, committed-service, iterator, inverse, provision, retirement, and removal mutations; the kit assigns stable logical IDs and writes complete abstract post-states. `vendor/cordis/formal-observation-points.json` makes lifecycle, epoch, target, committed store, uid, registry, and service-store write coverage fail closed.

`pnpm test:cordis-paper` runs every upstream core scenario against the vendored source, then adds reentrant disposal, pending-fiber effects, asynchronous cleanup joining, and a network-free `mountAgentLoopTestDependencies()` plus `AgentLoop` assembly. Every required result must be `pass`, every NDJSON trace must be non-empty and fully consumed by `TraceMatched`, and all four deliberate mutants must be rejected. False theorem prerequisites remain `not-applicable`; they are never converted into successful evidence. Report v1 file references are relative to the evidence output root, and the runner rejects Unix, macOS, or Windows absolute paths anywhere in serialized evidence.

The implementation follows the paper where trace comparison exposes a real mismatch. Provider cleanup waits for dependent fibers before starting any provider inverse, and retiring consumers remain discoverable in their runtime list until their inertia drains. Each effect iterator recovers serially in LIFO order, while independent top-level effects start in reverse registration order and join concurrently. DSH cleanup operations that require completion order therefore share one effect iterator; session persistence removes write admission, waits an existing retirement attempt, retries retained events, and only then closes its backend. Lifecycle transitions land before a conflicting target or committed view becomes observable. The trace hook itself does not change model-visible or product-user-visible output, so this change has no product snapshot.

This branch is the correction-and-validation stage of the study. The discovery stage on `research/paper-trace-baseline` retains the same observation mechanism over unmodified runtime behavior and treats the known mismatches as expected failures. The upstream-proposal stage on `fix/paper-conformance` contains the runtime corrections and ordinary regression tests without the trace sink or formal runner. The study portal reproduces this stage with `npm run reproduce:conformance` and the complete journey with `npm run reproduce:study`.

## Alternatives considered

- **Copy the TLA+ specification into DeepSeek Harness.** Rejected because two authoritative models would drift whenever a theorem mapping, model bound, or trace schema changes; a fixed upstream commit provides reproducibility without duplication.
- **Use package tests and snapshots as the conformance claim.** Rejected because examples can assert selected outcomes but cannot cursor-consume every abstract post-state, reject semantic mutations, or distinguish a false prerequisite from a proved property.
- **Make Specula or a public runtime telemetry API part of CI.** Rejected because TLC consumes the deterministic trace directly, Specula remains useful only for interactive counterexample debugging, and a public hook would turn test instrumentation into a compatibility promise.
- **Relax the specification to match an implementation trace.** Rejected because the paper is authoritative; an implementation mismatch gets a minimal counterexample, a runtime correction, and a regression scenario.

## Consequences

- Cordis and DeepSeek Harness changes that affect the observed lifecycle must coordinate the fixed kit commit, vendored hook, observation manifest, and shared scenario result.
- Pull-request evidence is reproducible and blocking, while local development can validate an uncommitted Cordis checkout without publishing it first.
- The conclusion is deliberately bounded to the pinned revisions, finite TLC configurations, declared prerequisites, and captured traces. It is not an unconditional mathematical proof of arbitrary JavaScript plugin side effects.
- The active Agent Note remains the update rule for future Cordis vendor syncs; the full theorem definitions and failure-debugging procedure stay in the upstream kit.
