# Agent Note: Cordis paper trace baseline

Status: implemented

English | [中文](2026-08-16-cordis-paper-trace-baseline.zh.md)

## Problem

DeepSeek Harness ships a source-vendored Cordis with local lifecycle hardening beyond its pinned upstream baseline. A conformance study must distinguish evidence gathered from the existing implementation from evidence gathered after paper-driven runtime fixes. Mixing instrumentation and fixes in one commit prevents reviewers from determining whether a counterexample existed before the study changed the behavior.

## Decision

The `research/paper-trace-baseline` branch preserves the runtime behavior of DeepSeek Harness `47f943859b` and adds only implementation observations, deterministic scenarios, expected-failure validation, CI wiring, and documentation. The [Cordis trace-baseline kit](https://github.com/Stool233/cordis/tree/66266245a8dbbaf26f0b9ace45d320edce700eda/formal) remains the sole executable specification; this repository does not copy its TLA+ modules.

`vendor/cordis/src/formal-trace.ts` installs one synchronous sink on a root context and remains absent from the public `@deepseek-ai/cordis` barrel. The hook records lifecycle, target, committed-service, iterator, inverse, provision, retirement, and removal observations. `vendor/cordis/formal-observation-points.json` makes relevant source writes fail closed when they bypass the observation mapping.

`pnpm test:cordis-paper` runs ordinary behavior probes, the shared core scenarios, vendored reentrant and pending-effect scenarios, and the network-free AgentLoop assembly. The command succeeds only when three ordinary paper expectations and ten TLC traces reproduce their exact `expected-fail` results, all other traces retain their expected passes, every trace is non-empty, prerequisite failures remain `not-applicable`, and serialized evidence contains no machine-local path. An unexpectedly passing baseline fails because it means the locked evidence no longer describes this revision.

Runtime corrections live on `research/paper-conformance`, where the same traces must pass. The trace-free logic and ordinary regression tests live on `fix/paper-conformance` for an upstream-oriented PR. This baseline branch does not change session persistence ordering or vendored Cordis lifecycle behavior, and its source-only hook creates no model-visible or product-user-visible output.

## Alternatives considered

- **Apply paper-driven fixes while adding the trace hook.** Rejected because the original counterexamples would no longer be independently reproducible.
- **Treat expected TLC rejection as a successful conformance result.** Rejected because `expected-fail` records a mismatch; only exact reproduction makes the diagnostic command succeed.
- **Copy the TLA+ specification into DeepSeek Harness.** Rejected because two executable authorities would drift; a fixed Cordis commit supplies reproducibility without duplication.
- **Expose the trace sink as public telemetry.** Rejected because test instrumentation must not become a compatibility promise or user-visible event stream.

## Consequences

- CI on this branch verifies stable counterexamples rather than claiming implementation conformance.
- Reviewers can compare the trace-only, trace-plus-fix, and trace-free-fix branches against the same source baselines.
- Any change to the baseline mismatch set requires an explicit revision or instrumentation explanation; it cannot silently become a pass.
