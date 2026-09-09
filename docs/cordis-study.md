# Cordis TLC contributions in this fork

English | [中文](cordis-study.zh.md)

## Summary

This fork carries repairs for lifecycle defects found through the [Cordis study's TLC workflow](https://github.com/Stool233/cordis-formal-study/blob/main/docs/contributions.md). The portal owns the counterexamples, selected source, reproduction commands, and evidence limits.

## Table of Contents

- [Understand the contribution](#understand-the-contribution)
- [Locate the implementation](#locate-the-implementation)
- [Follow the verification](#follow-the-verification)
- [Further Exploration](#further-exploration)
- [Dev Note](#dev-note)

## Understand the contribution

The study establishes two related defects: provider recovery can start before dependent cleanup finishes, and retirement can hide an unloading consumer from dependency discovery. The [contribution guide](https://github.com/Stool233/cordis-formal-study/blob/main/docs/contributions.md) connects the observed events to the fixes. The [paper guide](https://github.com/Stool233/cordis-formal-study/blob/main/docs/paper.md) explains their relationship to the current paper's cleanup rules.

## Locate the implementation

The selected [Harness Cordis implementation](https://github.com/Stool233/deepseek-harness/tree/fdcd1ce36a296ab2288bf407fccba4c8fa634963/vendor/cordis/src) is on `codex/upstream-alignment-2026-09-09`. It retains consumer discoverability until cleanup settles and waits for notified dependents before provider recovery. The portal's [current lock](https://github.com/Stool233/cordis-formal-study/blob/main/current.lock.json) and [implementation reference](https://github.com/Stool233/cordis-formal-study/blob/main/docs/implementation.md) own the exact source selection and official ancestry.

The default `master` branch provides official source and this guide. The selected research source contains the repairs; its evidence does not cover the whole Harness application.

## Follow the verification

The [verification guide](https://github.com/Stool233/cordis-formal-study/blob/main/docs/verification.md) distinguishes TLC replay of recorded observations from fresh trace generation on the fixed source. The evidence connects rejected upstream traces, accepted fixed traces, and negative controls. Uninstrumented resource and registry regressions supplement that chain; passing tests and synthetic controls do not count as new defect discoveries.

Use [Reproduction](https://github.com/Stool233/cordis-formal-study/blob/main/docs/reproduce.md) for the commands and bundled toolchain. The evidence establishes the selected implementation problems and their repairs under declared dependencies; it does not prove the complete paper calculus. Provider identity is supporting regression coverage, not an additional claimed discovery.

## Further Exploration

Read the [Cordis primer](cordis-primer.md) for framework concepts and [Harness architecture](architecture.md) for application composition. Broader historical claims and experiment history live in the portal's [archive](https://github.com/Stool233/cordis-formal-study/blob/main/archive/README.md); confirmed TLC contributions remain in the main reading path.

## Dev Note

The [contribution evidence decision](../.agents/notes/implemented/process/2026-09-10-cordis-tlc-contribution-evidence.md) records documentation ownership and the verification boundary.
