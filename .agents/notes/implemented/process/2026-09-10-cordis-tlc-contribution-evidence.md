# Agent Note: Cordis TLC contribution evidence

Status: implemented

English | [中文](2026-09-10-cordis-tlc-contribution-evidence.zh.md)

## Problem

Readers need the observed failure, its TLC counterexample, the repair, and verification of that repair to assess a contribution. Historical model names and passing test totals can obscure which defect the study established.

## Decision

The [fork guide](../../../../docs/cordis-study.md) starts with the cleanup defects found through TLC and their fixes. The study repository contains the source lock, traces before and after the fixes, models, tool files, counterexamples, executable checks, reports, and archive. The guide links to those records for versions and counts.

A confirmed contribution requires an observed implementation problem, a TLC counterexample, a repair, and verification of that repair. The verification guide states which commands replay captured observations and which execute source to generate traces. Behavior tests check the implementation directly; synthetic controls check the model's ability to reject a defect. Provider identity has a supporting regression test.

The default branch provides official source and the guide. The study repository selects the research implementation and relates the cleanup rules to the current paper. Its results cover the recorded scenarios and declared bindings. Claims about the whole application, arbitrary external effects, or the complete calculus require additional evidence.

## Alternatives considered

**Organize the guide around passing behavior tests.** Test results describe how the implementation behaves in given scenarios. Assessing the contribution also requires the failing traces and the reason for each repair.

**Include the historical branch matrix in the main guide.** This requires newcomers to learn the experiment history before locating the source. The archive provides that history and its review qualifications for readers tracing earlier work.

**Present passing model runs as verification of the current paper.** Each model result applies to the checked definitions and traces. The guide states that scope and links to the correspondence with paper rules.

## Consequences

Readers can inspect the observed defect, source repair, and verification report through the study repository. The two defects define the contribution count; scenarios and mutations provide evidence for them.

English and Chinese guides, root entries, and this note use translation pairing, documentation checks, and lint. This note consolidates the superseded `current-study-scope` note's source selection, documentation responsibilities, archive rationale, coverage limits, and verification requirements. Links to that decision point here.
