# Agent Note：Cordis 生命周期退出遵循 provider 依赖顺序

状态：已实现

[English](2026-08-16-cordis-paper-lifecycle-ordering.md) | 中文

## 问题

vendored Cordis 会在异步清理结算前从 runtime list 移除正在退休的 consumer，而 provider 会在自身卸载开始后立即启动全部顶层逆操作。因此，并发退休的 provider 可能在使用该服务的 consumer 清理完成前停止暴露资源。同一转换还会先更新依赖 epoch、再发布 `UNLOADING`，使观察者可能看到新 target 与旧生命周期状态的组合。另一个 reload 检查点还会使传递 consumer 在已等待的 provider 本身结算后仍停留在 `LOADING`。

这些行为与从 Cordis 论文独立总结出的 ordering 和 resolution-coherence 性质不一致。本修复分支不包含轨迹插桩；论文导出的回归用例只使用普通公开生命周期 API。

## 决策

正在退休的 fiber 会保留在 runtime list 中，直至其生命周期 inertia 达到静止。活动 provider 通知 dependents 服务即将离开时，会保留这些 dependent fiber，并在启动 provider 逆操作前等待它们当前的生命周期工作。删除 runtime 时会检查记录身份，避免旧退休过程删除同一 callback 的新 runtime。

生命周期发布先于不兼容的 epoch 变化。激活经过一个延迟的取消检查点，记录其准备加载的 epoch，并在 disposal 使该 epoch 失效时跳过插件执行。`_reload` 内不再增加第二个检查点，因此 provider 转换触发的依赖激活会在已等待的 provider mount 返回前结算。独立顶层 effect 仍并发恢复；单个 effect 自身的 accumulator 仍保持串行 LIFO。

session persistence 将事件接收与后端关闭归入同一个 effect accumulator。这样 listener 逆操作会先于最终 drain 和 close 执行，后端退出也会在重试保留批次前等待进行中的 session retirement。

## 备选方案

- **串行执行全部顶层 effect 逆操作。** 这会凭借偶然的注册顺序让 provider/consumer 示例通过，但论文允许独立 effect 交换，runtime 也已将顶层 effect 视为独立。全局串行会增加延迟，也无法表达真正的 provider 依赖。
- **在清理完成前保持 `uid` 非空。** 这可以保留可发现性，但也会让公开层面已 disposed 的 fiber 看起来仍然存活。runtime-list membership 是更窄的内部 retirement 机制；`uid = null` 可以继续立即标记公开 disposal。
- **将 formal trace sink 与修复一起提交。** 插桩是有用的证据，但不是运行时行为所必需。把它保留在研究分支，可使本分支作为普通上游修复接受审阅。

## 结果

异步 consumer 清理可以继续使用 provider 资源，包括并发 root disposal 期间。fiber 从 runtime list 退休的时间晚于公开的 `uid = null` 标记，但公开 disposed 状态和拒绝行为不变。退出可能等待更久，因为 provider recovery 现在会等待论文 ordering 性质要求的 dependent cleanup。

该分支只包含运行时修复、普通回归测试、vendored 修改说明和本决策记录。它刻意排除 formal trace sink、observation-point manifest、TLA+ runner 和 NDJSON 产物，以便后续在不携带研究插桩的情况下向上游提议这些改动。

## 测试

Cordis 生命周期测试覆盖 provider/consumer 逆序退出、并发 root disposal、disposal 抢先于延迟激活、传递依赖激活，以及独立顶层 effect 的逆序启动与并发恢复。现有 session-persistence 测试覆盖 retirement 重试、进行中 retirement 的等待、detached append 等待和后端关闭顺序。
