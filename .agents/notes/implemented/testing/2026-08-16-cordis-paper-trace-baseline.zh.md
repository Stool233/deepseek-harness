# Agent Note: Cordis 论文轨迹基线

Status: implemented

[English](2026-08-16-cordis-paper-trace-baseline.md) | 中文

## 问题

DeepSeek Harness 交付源码 vendored Cordis，其中包含超出固定上游基线的本地生命周期加固。一项一致性研究必须区分从既有实现采集的证据与论文驱动的运行时修复之后采集的证据。如果在同一个提交中混合插桩和修复，审阅者便无法判断反例是否在研究改变行为之前已经存在。

## 决策

`research/paper-trace-baseline` 分支是本研究的发现阶段。它保留 DeepSeek Harness `47f943859b` 的运行时行为，只加入实现观测、确定性场景、预期失败验证、CI 接入和文档。[Cordis 轨迹基线工具包](https://github.com/Stool233/cordis/tree/48c4604005b80b4e4fd7706088f5b721a16ea8de/formal)仍是唯一的可执行规格；本仓库不复制其中的 TLA+ 模块。

`vendor/cordis/src/formal-trace.ts` 在根上下文安装一个同步 sink，并且不进入公开的 `@deepseek-ai/cordis` barrel。该 hook 记录生命周期、target、committed service、iterator、inverse、provision、retirement 和 removal 观测。`vendor/cordis/formal-observation-points.json` 对相关源码写入执行快速失败，防止它们绕过观测映射。

`pnpm test:cordis-paper` 运行普通行为探针、共享核心场景、vendored 重入与 pending effect 场景，以及无网络的 AgentLoop 装配。只有在 3 项普通论文预期和 10 条 TLC 轨迹精确复现各自的 `expected-fail` 结果、其他轨迹保持预期通过、每条轨迹非空、前提失败保持 `not-applicable`，并且序列化证据不含本机路径时，该命令才成功。基线若意外通过，检查会失败，因为这表示固定证据已不能描述该 revision。

运行时修复位于本研究的修复验证阶段 `research/paper-conformance`，同一批轨迹必须在该分支通过。不含轨迹插桩的逻辑修复与普通回归测试位于上游提案阶段 `fix/paper-conformance`。本基线分支不改变 session persistence 顺序或 vendored Cordis 生命周期行为，其仅供源码使用的 hook 不产生模型可见或产品用户可见输出。研究门户使用 `npm run reproduce:baseline` 复现本阶段，使用 `npm run reproduce:study` 复现完整研究过程。

## 曾考虑的替代方案

- **在加入 trace hook 时同时应用论文驱动的修复。** 否决：原始反例将无法再独立复现。
- **把预期的 TLC 拒绝视为成功的一致性结果。** 否决：`expected-fail` 记录的是 mismatch；只有精确复现才能让诊断命令成功。
- **把 TLA+ 规格复制到 DeepSeek Harness。** 否决：两项可执行权威会发生漂移；固定 Cordis 提交无需复制即可提供可复现性。
- **把 trace sink 暴露为公开遥测。** 否决：测试插桩不得成为兼容性承诺或用户可见事件流。

## 结果

- 本分支的 CI 验证稳定反例，而不是声称实现符合规格。
- 审阅者可以基于相同源码基线，对比只含轨迹、包含轨迹与修复，以及只含修复的 3 个分支。
- 基线 mismatch 集合的任何变化都必须明确说明 revision 或插桩变化，不能静默转换成通过。
