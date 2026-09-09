# 本 fork 中的 Cordis 论文与实现

[English](cordis-study.md) | 中文

## 概述

通过[研究门户](https://github.com/Stool233/cordis-formal-study)阅读当前 Cordis 论文，并检查本 fork 中选定的生命周期行为。本页帮助读者定位 Harness 实现及其验证范围。

## 目录

- [阅读论文](#read-the-paper)
- [定位实现](#locate-the-implementation)
- [理解验证](#understand-the-verification)
- [继续阅读](#further-exploration)
- [开发备注](#dev-note)

## 阅读论文 <a id="read-the-paper"></a>

阅读来源是 [A Programming Paradigm for Spatiotemporal Composability，arXiv v1](https://arxiv.org/abs/2608.25512v1)。[论文指南](https://github.com/Stool233/cordis-formal-study/blob/main/docs/paper.md)解释依赖清理顺序、退休和提供方身份。

## 定位实现 <a id="locate-the-implementation"></a>

研究选定 [fdcd1ce 中包含修复的 Harness 实现](https://github.com/Stool233/deepseek-harness/tree/fdcd1ce36a296ab2288bf407fccba4c8fa634963/vendor/cordis/src)，基于官方 Harness `5dda764`。分支为 `codex/upstream-alignment-2026-09-09`；门户的[当前版本锁](https://github.com/Stool233/cordis-formal-study/blob/main/current.lock.json)记录完整提交和源码 tree。

默认 `master` 分支提供官方源码与本指南。被检查的 fork 在清理期间保留消费方的可发现性，在提供方恢复前等待已绑定的依赖方，并在服务绑定中保留提供方身份。[实现参考](https://github.com/Stool233/cordis-formal-study/blob/main/docs/implementation.md)负责精确源码选择。

## 理解验证 <a id="understand-the-verification"></a>

门户从同一个 Harness 提交中导出选定的 Cordis 与 vendored Cosmokit 源码。它对这份实现和 Cordis fork 执行相同的三项直接行为检查，不修改运行时源码或添加轨迹插桩。

[验证指南](https://github.com/Stool233/cordis-formal-study/blob/main/docs/verification.md)定义断言与证据，[复现指南](https://github.com/Stool233/cordis-formal-study/blob/main/docs/reproduce.md)负责命令。这些结果覆盖选定的生命周期场景，不代表整个 Harness 应用的行为已获验证，也不是完整论文演算的证明。

## 继续阅读 <a id="further-exploration"></a>

阅读 [Cordis primer](cordis-primer.zh.md)了解框架概念，阅读 [Harness 架构](architecture.zh.md)了解应用装配。此前的研究材料保存在门户独立的[归档](https://github.com/Stool233/cordis-formal-study/blob/main/archive/README.md)中。

## 开发备注 <a id="dev-note"></a>

[范围决策](../.agents/notes/implemented/process/2026-09-10-current-cordis-study-scope.zh.md)记录文档归属和验证边界。
