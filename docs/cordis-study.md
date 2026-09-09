# Cordis paper and implementation in this fork

English | [中文](cordis-study.zh.md)

## Summary

Use the [study portal](https://github.com/Stool233/cordis-formal-study) to read the current Cordis paper and check selected lifecycle behavior in this fork. This page locates the Harness implementation and its verification scope.

## Table of Contents

- [Read the paper](#read-the-paper)
- [Locate the implementation](#locate-the-implementation)
- [Understand the verification](#understand-the-verification)
- [Further Exploration](#further-exploration)
- [Dev Note](#dev-note)

## Read the paper

The source is [A Programming Paradigm for Spatiotemporal Composability, arXiv v1](https://arxiv.org/abs/2608.25512v1). The [paper guide](https://github.com/Stool233/cordis-formal-study/blob/main/docs/paper.md) explains dependency cleanup order, retirement, and provider identity.

## Locate the implementation

The study selects [the fixed Harness implementation at fdcd1ce](https://github.com/Stool233/deepseek-harness/tree/fdcd1ce36a296ab2288bf407fccba4c8fa634963/vendor/cordis/src), based on official Harness `5dda764`. Its branch is `codex/upstream-alignment-2026-09-09`; the portal's [current lock](https://github.com/Stool233/cordis-formal-study/blob/main/current.lock.json) records the full commit and source trees.

The default `master` branch provides official source and this guide. The checked fork keeps consumers discoverable during cleanup, waits for bound dependents before provider recovery, and preserves provider identity in service bindings. The [implementation reference](https://github.com/Stool233/cordis-formal-study/blob/main/docs/implementation.md) owns the exact source selection.

## Understand the verification

The portal exports the selected Cordis and vendored Cosmokit source from the same Harness commit. It runs the same three direct behavior checks against this implementation and the Cordis fork, without changing runtime source or adding trace instrumentation.

The [verification guide](https://github.com/Stool233/cordis-formal-study/blob/main/docs/verification.md) defines the assertions and evidence. The [reproduction guide](https://github.com/Stool233/cordis-formal-study/blob/main/docs/reproduce.md) owns the commands. These results cover the selected lifecycle scenarios; they do not establish the whole Harness application's behavior or prove the complete paper calculus.

## Further Exploration

Read the [Cordis primer](cordis-primer.md) for framework concepts and [Harness architecture](architecture.md) for application composition. The portal keeps earlier study material in a separate [archive](https://github.com/Stool233/cordis-formal-study/blob/main/archive/README.md).

## Dev Note

The [scope decision](../.agents/notes/implemented/process/2026-09-10-current-cordis-study-scope.md) records documentation ownership and the verification boundary.
