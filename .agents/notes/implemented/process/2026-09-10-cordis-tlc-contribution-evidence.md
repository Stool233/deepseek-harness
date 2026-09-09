# Agent Note: Cordis TLC contribution evidence

Status: implemented

English | [中文](2026-09-10-cordis-tlc-contribution-evidence.zh.md)

## Problem

Readers need to distinguish an actual defect discovered through TLC from an implementation test that happens to pass. A reading path centered only on passing checks hides the contribution; historical model names can also overstate alignment with the current paper.

## Decision

The [fork guide](../../../../docs/cordis-study.md) leads with TLC-discovered cleanup defects and their fixes. The external study portal owns the exact source lock, captured upstream and fixed traces, models, pinned tools, counterexamples, executable checks, generated reports, and archive. The guide links to that owner rather than duplicating changing counts.

Confirmed contribution means an observed implementation problem connected to a TLC counterexample, a repair, and verification of that repair. Trace replay and fresh source execution have distinct evidence descriptions. Passing behavior tests and artificial negative controls support that chain but do not independently count as discovered bugs. Provider identity remains supporting coverage.

The default branch supplies official source and the reading entry; the portal selects the research implementation. The current paper supplies the cleanup interpretation. Application-wide behavior, arbitrary external effects, and a proof of the complete calculus remain outside the selected evidence.

## Alternatives considered

**Center the guide on passing behavior checks.** This gives a small current-state check set but omits how TLC exposed the defects and why the fixes are contributions. Resource, registry, and identity regressions remain supporting evidence.

**Keep the historical branch matrix in the main guide.** This makes newcomers learn the experiment history before finding the selected source. The archive retains that history and its qualifications while confirmed defect evidence stays in the main path.

**Describe passing model runs as current paper verification.** The frozen models do not encode the full current calculus. The guide states the concrete implementation scope and links the paper interpretation separately.

## Consequences

Readers can follow one source and evidence owner from the observed problem to its repair. The fork guide does not publish historical mismatch totals as independent discoveries. This documentation decision does not modify runtime code or historical research commits.

English and Chinese guides, root entries, and this note are maintained through translation pairing, documentation checks, and lint. A scoped active-note audit found the current-study-scope note fully superseded; this note consolidates its source distinction, ownership rationale, archive alternative, calculus and application coverage gaps, and verification obligations. The superseded triplet is removed and its inbound links point here.
