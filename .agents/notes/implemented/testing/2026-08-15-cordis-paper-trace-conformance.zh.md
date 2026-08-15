# Agent Note: Cordis 论文轨迹一致性验证

Status: implemented

[English](2026-08-15-cordis-paper-trace-conformance.md) | 中文

## 问题

DeepSeek Harness 交付带有生命周期加固的源码 vendored Cordis，这些加固超出了其固定的上游基线。包测试覆盖单项所有权路径，但不能确立装配后的实现保持论文中的抽象注册表、依赖、退休、效应恢复、顺序、解析、进展和合流性质。若把第二份形式化规格复制到本仓库，两份定义会发生漂移；同时，一次有限且成功的执行不能确立依赖无环或外部效应两两独立等前提。

## 决策

[Cordis 一致性验证工具包](https://github.com/Stool233/cordis/tree/a0f8baa9b9abfee73292c525ebcd46103b175b0d/formal)是唯一的可执行规格。PR（Pull Request）CI 检出该精确提交；本地运行默认使用相邻的 Cordis checkout，也可以用 `CORDIS_FORMAL_ROOT` 指向另一工作树。工具包拥有 TLA+ 模块、定理索引、前提审计、确定性 recorder、共享场景、mutation checks 和固定的 TLA+ 工具链。

vendored 源码只携带实现侧观察机制。`vendor/cordis/src/formal-trace.ts` 在根上下文安装一个同步 sink，并有意不进入公开的 `@deepseek-ai/cordis` barrel。该 hook 观察与论文有关的生命周期、target、committed service、iterator、inverse、provision、retirement 和 removal 变更；工具包分配稳定逻辑 ID，并写出完整的抽象后状态。`vendor/cordis/formal-observation-points.json` 对生命周期、epoch、target、committed store、uid、registry 和 service store 的写入覆盖执行快速失败。

`pnpm test:cordis-paper` 对 vendored 源码运行全部上游核心场景，然后增加重入 dispose、pending fiber effect、异步 cleanup join，以及无网络的 `mountAgentLoopTestDependencies()` 加 `AgentLoop` 装配。每个必需结果都必须为 `pass`，每条 NDJSON 轨迹都必须非空并被 `TraceMatched` 完整消费，四个刻意构造的 mutant 都必须被拒绝。定理前提为假时保持 `not-applicable`，绝不转换成成功证据。report v1 的文件引用相对于 evidence output root，runner 会拒绝序列化证据中的任何 Unix、macOS 或 Windows 绝对路径。

当轨迹比较暴露真实差异时，实现遵循论文。提供方 cleanup 会在启动任何提供方 inverse 前等待依赖 fiber；正在退休的 consumer 会保留在 runtime list 中，直到其 inertia 排空，确保提供方仍能发现并等待它。每个 effect iterator 按串行 LIFO 恢复，而相互独立的顶层 effect 按注册逆序启动并并发 join。因此，需要规定完成顺序的 DSH cleanup 会共用一个 effect iterator；session persistence 会先移除写入入口，等待已有 retirement 尝试，重试保留的事件，然后才关闭 backend。生命周期转换会先于有冲突的 target 或 committed view 变得可观察。trace hook 本身不改变模型可见或产品用户可见输出，因此本次变更没有产品快照。

## 曾考虑的替代方案

- **把 TLA+ 规格复制到 DeepSeek Harness。** 否决：定理映射、模型边界或轨迹 schema 变化时，两份权威模型会发生漂移；固定上游提交既能复现，又不需要复制。
- **用包测试和快照作为一致性结论。** 否决：示例可以断言选定结果，但不能用游标消费每个抽象后状态、拒绝语义 mutation，或区分前提为假与性质已被证明。
- **让 Specula 或公开运行时遥测 API 成为 CI 的组成部分。** 否决：TLC 会直接消费确定性轨迹，Specula 只用于交互式反例调试，而公开 hook 会把测试插桩变成兼容性承诺。
- **放宽规格以匹配实现轨迹。** 否决：论文具有权威性；实现差异会得到最小反例、运行时修正和回归场景。

## 结果

- 影响受观察生命周期的 Cordis 和 DeepSeek Harness 变更必须协调固定的工具包提交、vendored hook、观察 manifest 和共享场景结果。
- PR 证据可复现且具有阻塞性，本地开发则可以在发布前验证一个尚未提交的 Cordis checkout。
- 结论明确限定于固定版本、有限 TLC 配置、声明的前提和已采集轨迹；它不是对任意 JavaScript 插件副作用的无条件数学证明。
- 这份活动 Agent Note 保留为未来 Cordis vendor 同步的更新规则；完整定理定义和失败调试步骤仍位于上游工具包。
