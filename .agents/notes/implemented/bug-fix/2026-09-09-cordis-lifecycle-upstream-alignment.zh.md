# Agent Note: 上游对齐分支的 Cordis 生命周期顺序

Status: implemented

[English](2026-09-09-cordis-lifecycle-upstream-alignment.md) | 中文

## 问题

异步 consumer 可能在 provider 已回收资源后继续观察该资源。若退休中的 consumer 在 teardown 结束前离开 runtime list，并发退休的 provider 也无法发现该依赖。研究的确定性 probe 在本分支所用的官方 Harness 版本上复现了这些行为。

## 决策

Vendored runtime 保留退休中的 fiber，直到其生命周期工作结束；provider recovery 等待已通知的 dependent，并且仅删除身份匹配的 runtime。同步发布失败会立即移除不完整的 runtime 项。先让 unloading 可观察，再改变不兼容的 epoch；一个延迟激活检查点在执行插件代码前核对捕获的 epoch。

迁移保留 vendored 实现已有的重入 dispose、cleanup join、pending effect 所有权与延迟 config 解析。[Vendor 清单](../../../../vendor/README.md)记录新增差异。[Fork 指南](../../../../docs/cordis-study.zh.md)负责分支选择与复现链接。

当前 [JSONL handle](../../../../packages/session/session-persistence-jsonl/src/storage.ts)负责排空写入并释放所有权。Backend tracker 关闭全部已打开的 handle，没有额外的存储连接。迁移直接使用这些机制，不恢复历史 coordinator 的 teardown 补丁。

## 考虑过的替代方案

**完整复制旧修复。** 当前架构已经没有旧 coordinator。恢复它会引入第二个写入所有者，而不是验证现有 handle 实现。

**串行恢复全部顶层 effect。** 独立 effect 可以并发恢复。所需顺序属于已通知的依赖；全局串行会改变无关行为。

## 影响

Provider teardown 可能等待更久，因为 dependent cleanup 必须先结束。等待期间，退休中的 fiber 在内部保持可发现，公开 disposed 状态则立即生效。依赖顺序以研究中的无环场景为前提；有限证据不能证明任意插件正确。

## 验证

[生命周期回归](../../../../packages/extensions/tool-cordis/tests/cordis-lifecycle.spec.ts)包括异步恢复、并发 root disposal、过期激活、传递激活与独立顶层恢复。前两项在未修改的上游运行时上失败；阻塞的 cleanup 在 finally 中释放。原始独立 probe 还在 Vitest 之外检查历史调度断言。

[JSONL 测试](../../../../packages/session/session-persistence-jsonl/tests/jsonl.spec.ts)覆盖 handle close、晚到的路由写入、最终 drain 失败和 backend teardown。配置重载、HMR 与 AgentLoop 生命周期测试覆盖相邻调用方。门户单独记录插桩副本的形式化证据，并标识精确论文、实现、补丁与工具哈希。
