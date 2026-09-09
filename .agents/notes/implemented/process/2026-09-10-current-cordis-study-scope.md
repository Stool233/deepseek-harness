# Agent Note: Current Cordis study scope

Status: implemented

English | [中文](2026-09-10-current-cordis-study-scope.zh.md)

## Problem

The fork reading path needs to identify which implementation and claims a reader can verify. Mixing historical model results with current paper terminology makes the meaning of a pass unclear.

## Decision

The [fork guide](../../../../docs/cordis-study.md) directs readers through the current paper, selected fork source, and concrete lifecycle checks. The external study portal owns the exact version lock, shared executable checks, generated report, and archived study snapshot.

The guide distinguishes the default official-source branch from the pinned fork implementation. It describes the checked dependency cleanup, retirement discoverability, and provider identity behaviors, with an explicit limit to those scenarios. Application-wide behavior and a proof of the complete calculus are outside these results.

## Alternatives considered

**Keep the historical branch matrix in the main guide.** This requires newcomers to understand experiment history before locating the current source. The portal archive retains that history with its qualifications.

**Describe the passing model runs as current paper verification.** The historical executable models do not encode the full current calculus. Direct implementation checks support the narrower statements the guide makes.

## Consequences

The reader has one version and evidence owner to follow. The Harness guide links to that owner without duplicating counts or publishing historical mismatches as current claims. The fork's runtime and historical research commits are unaffected by this documentation change.

The English and Chinese guide and root entry are maintained together through translation pairing and repository documentation checks. A scoped review of active notes found no earlier owner of this fork reading decision to supersede.
