# Cordis study in this fork

English | [中文](cordis-study.zh.md)

## Summary

Use this fork to inspect how Cordis lifecycle fixes behave inside DeepSeek Harness. The [study portal](https://github.com/Stool233/cordis-formal-study) explains the findings and reproduces the shared models and traces. This page is a branch and verification reference for Harness readers.

## Table of Contents

- [Choose a branch](#choose-a-branch)
- [Understand the fix](#understand-the-fix)
- [Verify the implementation](#verify-the-implementation)
- [Further exploration](#further-exploration)
- [Dev Note](#dev-note)

## Choose a branch

Select the branch by the question you want to answer. The portal records exact revisions; moving branch names do not identify evidence.

| Branch | Purpose |
| --- | --- |
| `master` | Official Harness code with this fork's documentation. |
| `codex/upstream-alignment-2026-09-09` | Lifecycle fixes adapted to upstream `5dda764`, with ordinary regressions. |
| `research/paper-trace-baseline` | Original experiment: reproduce the exact known mismatches. |
| `research/paper-conformance` | Original experiment: test the corrected implementation against the shared Cordis kit. |
| `fix/paper-conformance` | Original experiment: review the historical fix without trace instrumentation. |

The [alignment report](https://github.com/Stool233/cordis-formal-study/blob/main/docs/upstream-alignment.md) owns the current migration results. The historical branches remain pinned snapshots of a separate experiment.

## Understand the fix

A consumer can need its provider while asynchronous cleanup is running. On the migration branch, the runtime retains retiring consumers until cleanup settles and waits for notified dependents before recovering provider effects. It also orders lifecycle publication before dependency-epoch changes and uses one deferred activation checkpoint.

Harness retains its existing reentrant-disposal, pending-effect, asynchronous-cleanup, and lazy-config behavior. The patch is recorded in the [vendored modification log](../vendor/README.md); ordinary regressions live in [cordis-lifecycle.spec.ts](../packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts). Open code links on the migration branch to see the fixes.

Session persistence uses per-session handles. Their close operation drains buffered writes before releasing ownership, and backend teardown closes all tracked handles. The migration uses that implementation directly; it does not restore the historical coordinator. The owning references are [Session persistence](../packages/session/session-persistence/README.md) and [JSONL persistence](../packages/session/session-persistence-jsonl/README.md).

## Verify the implementation

Use Node.js 24 and the pnpm version in [package.json](../package.json). In an installed migration checkout, these commands exercise lifecycle behavior and the persistence path:

```sh
corepack pnpm run build:native-system
corepack pnpm exec vitest run packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts packages/session/session-persistence/tests/storage-contract.spec.ts packages/session/session-persistence-jsonl/tests/jsonl.spec.ts packages/boot/app-boot/tests/config-reload.spec.ts packages/boot/app-boot/tests/hmr-config.spec.ts packages/core/agent-loop/tests/scope-lifecycle.spec.ts
corepack pnpm run build
```

The native build prepares the local POSIX lock addon used by JSONL tests. These tests require no model API key. [The portal reproduction guide](https://github.com/Stool233/cordis-formal-study/blob/main/docs/reproduce.md) owns the formal procedure: instrumented copies run the shared core scenarios plus Harness-specific cleanup and offline AgentLoop scenarios.

Ordinary test success alone is not formal conformance. Formal results use the historical paper-derived kit and explicitly record the current TLC hash; they do not establish every theorem in the newer arXiv paper or arbitrary plugin behavior.

## Further exploration

Read the [study results](https://github.com/Stool233/cordis-formal-study/blob/main/docs/results.md) for counterexamples, the [Cordis primer](cordis-primer.md) for framework concepts, or [Harness architecture](architecture.md) for application composition.

## Dev Note

None.
