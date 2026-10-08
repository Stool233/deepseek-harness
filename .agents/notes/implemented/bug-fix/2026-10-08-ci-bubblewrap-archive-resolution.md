# Agent Note: Authenticated CI bubblewrap archive resolution

Status: implemented

English | [中文](2026-10-08-ci-bubblewrap-archive-resolution.zh.md)

## Problem

The real-API workflow run [37579435513](https://github.com/Stool233/deepseek-harness/actions/runs/37579435513) fails before key preflight because the fixed Ubuntu pool URL for `0.9.0-1ubuntu0.1` returns HTTP 404. A payload hash cannot keep a superseded archive available. The preparation script also serves keyless CI.

## Decision

[`prepare-ci-bubblewrap.sh`](../../../../scripts/prepare-ci-bubblewrap.sh) refreshes APT metadata with update errors treated as fatal, downloads the runner distribution's `bubblewrap:amd64` candidate, and extracts it without a dpkg transaction or package hooks. APT authenticates signed repository metadata and checks the downloaded payload against its indexed hash; unauthenticated and insecure repositories remain disallowed. The log records the resolved version and payload SHA256. The runner's configured APT sources and trust store own package selection.

The existing AppArmor userns adjustment and namespace probe remain mandatory preparation steps; a missing sysctl knob is tolerated only when the probe succeeds. The script exports the private binary directory to `GITHUB_PATH` only after the probe passes. Each invocation owns a fresh runner-temporary directory.

The [keyless preparation workflow](../../../../.github/workflows/bubblewrap.yml) exercises real package acquisition and the exported binary on hosted Ubuntu for changes to this preparation path. Its failure-case tests assert that update, download, extraction, and probe failures never publish a binary. The [real-API workflow](../../../../.github/workflows/e2e.yml) retains its key preflight, build, tests, and trusted-event restrictions.

## Alternatives considered

**Replace the fixed version and SHA256.** This repairs one URL but repeats the failure when Ubuntu removes another superseded payload and delays security updates.

**Install through APT.** Authentication is suitable, but installation scans the dpkg database and executes package hooks that CI preparation does not need.

**Keep the old package in a snapshot.** This provides reproducibility but freezes security fixes and adds explicit snapshot maintenance. The runner's maintained distribution candidate suits this CI dependency.

## Consequences

Package versions may change as the runner distribution publishes updates; logs provide the resolved version and hash rather than a reproducible package lock. Metadata refresh adds network work and fails on repository errors instead of silently using stale indexes. Download or sandbox failures continue to block E2E, and preparation success alone does not establish a real-API test result.
