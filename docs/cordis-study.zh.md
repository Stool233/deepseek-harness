# 本 fork 中的 Cordis 研究

[English](cordis-study.md) | 中文

## 概述

本 fork 用于查看 Cordis 生命周期修复在 DeepSeek Harness 中的表现。[研究门户](https://github.com/Stool233/cordis-formal-study)解释发现，并复现共用的模型与轨迹。本文为 Harness 读者提供分支选择和验证参考。

## 目录

- [选择分支](#choose-a-branch)
- [理解修复](#understand-the-fix)
- [验证实现](#verify-the-implementation)
- [继续阅读](#further-exploration)
- [开发备注](#dev-note)

## 选择分支 <a id="choose-a-branch"></a>

根据想回答的问题选择分支。门户记录精确版本；会移动的分支名不能标识证据。

| 分支 | 用途 |
| --- | --- |
| `master` | 官方 Harness 代码与本 fork 的文档。 |
| `codex/upstream-alignment-2026-09-09` | 适配上游 `5dda764` 的生命周期修复与普通回归。 |
| `research/paper-trace-baseline` | 原始实验：精确复现已知不一致。 |
| `research/paper-conformance` | 原始实验：使用共用的 Cordis kit 检查修复后的实现。 |
| `fix/paper-conformance` | 原始实验：查看不含轨迹插桩的历史修复。 |

[对齐报告](https://github.com/Stool233/cordis-formal-study/blob/main/docs/upstream-alignment.md)负责本次迁移结果。历史分支继续作为另一组实验的固定快照。

## 理解修复 <a id="understand-the-fix"></a>

Consumer 的异步清理可能仍需使用 provider。迁移分支将退休中的 consumer 保留到清理结束，并等待已通知的 dependent，再恢复 provider effect。它还会先发布生命周期状态，再改变依赖 epoch，并使用一个延迟激活检查点。

Harness 保留已有的重入 dispose、pending effect、异步 cleanup 与延迟 config 解析行为。补丁记录在 [vendored 修改清单](../vendor/README.md)，普通回归位于 [cordis-lifecycle.spec.ts](../packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts)。请在迁移分支打开代码链接查看修复。

Session persistence 使用每个 session 独立的 handle。其 close 操作先排空写入缓冲，再释放所有权；backend teardown 关闭所有已登记的 handle。迁移直接使用这一实现，不恢复历史 coordinator。详见 [Session persistence](../packages/session/session-persistence/README.zh.md) 与 [JSONL persistence](../packages/session/session-persistence-jsonl/README.zh.md)。

## 验证实现 <a id="verify-the-implementation"></a>

使用 Node.js 24，以及 [package.json](../package.json) 指定的 pnpm 版本。在已安装依赖的迁移 checkout 中，以下命令检查生命周期与 persistence 路径：

```sh
corepack pnpm run build:native-system
corepack pnpm exec vitest run packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts packages/session/session-persistence/tests/storage-contract.spec.ts packages/session/session-persistence-jsonl/tests/jsonl.spec.ts packages/boot/app-boot/tests/config-reload.spec.ts packages/boot/app-boot/tests/hmr-config.spec.ts packages/core/agent-loop/tests/scope-lifecycle.spec.ts
corepack pnpm run build
```

原生构建准备 JSONL 测试所需的本机 POSIX 锁模块。这些测试不需要模型 API key。[门户复现指南](https://github.com/Stool233/cordis-formal-study/blob/main/docs/reproduce.md)负责形式化流程：插桩副本运行共用核心场景，以及 Harness 的 cleanup 与离线 AgentLoop 场景。

仅普通测试通过不能推出形式化一致性。形式化结果使用历史论文导出的 kit，并显式记录当前 TLC 哈希；它们不能证明新版 arXiv 论文的全部定理或任意插件行为。

## 继续阅读 <a id="further-exploration"></a>

查看[研究结果](https://github.com/Stool233/cordis-formal-study/blob/main/docs/results.md)了解反例，阅读 [Cordis primer](cordis-primer.zh.md)学习框架概念，或从 [Harness 架构](architecture.zh.md)了解应用装配。

## 开发备注 <a id="dev-note"></a>

无。
