# Cordis TLC contributions in this fork

English | [中文](cordis-study.zh.md)

## Summary

This fork contains fixes for lifecycle defects found through the [Cordis study's TLC workflow](https://github.com/Stool233/cordis-formal-study/blob/main/docs/contributions.md). The study repository records the counterexamples, source versions, reproduction commands, and verification results.

## Table of Contents

- [Understand the contribution](#understand-the-contribution)
- [Locate the implementation](#locate-the-implementation)
- [Follow the verification](#follow-the-verification)
- [Further Exploration](#further-exploration)
- [Dev Note](#dev-note)

## Understand the contribution

The study found two related defects: provider recovery can start before dependent cleanup finishes, and retirement can hide an unloading consumer from dependency discovery. The [contribution guide](https://github.com/Stool233/cordis-formal-study/blob/main/docs/contributions.md) shows the failing events and their fixes. The [paper guide](https://github.com/Stool233/cordis-formal-study/blob/main/docs/paper.md) explains the corresponding cleanup rules.

## Locate the implementation

The selected [Harness Cordis implementation](https://github.com/Stool233/deepseek-harness/tree/fdcd1ce36a296ab2288bf407fccba4c8fa634963/vendor/cordis/src) is on `codex/upstream-alignment-2026-09-09`. It keeps consumers discoverable until cleanup finishes and waits for notified dependents before provider recovery. The [version lock](https://github.com/Stool233/cordis-formal-study/blob/main/current.lock.json) and [implementation reference](https://github.com/Stool233/cordis-formal-study/blob/main/docs/implementation.md) record the selected source and its official base.

The default `master` branch provides official source and this guide. Verification runs against the selected research commit containing the repairs.

## Follow the verification

The [verification guide](https://github.com/Stool233/cordis-formal-study/blob/main/docs/verification.md) describes TLC replay of captured observations and trace generation from the fixed source. It records rejected upstream traces, accepted fixed traces, and negative controls. Regressions check resources and registry membership directly to confirm the runtime behavior behind the traces.

[Reproduction](https://github.com/Stool233/cordis-formal-study/blob/main/docs/reproduce.md) gives the commands and tool versions. The results cover the recorded scenarios and their declared dependency bindings. Provider identity has a supporting regression test.

## Further Exploration

Read the [Cordis primer](cordis-primer.md) for framework concepts and [Harness architecture](architecture.md) for application composition. The study [archive](https://github.com/Stool233/cordis-formal-study/blob/main/archive/README.md) contains earlier claims, reviews, and experiments.

## Dev Note

The [study decision](../.agents/notes/implemented/process/2026-09-10-cordis-tlc-contribution-evidence.md) explains the documentation structure and the scope of the reported evidence.
