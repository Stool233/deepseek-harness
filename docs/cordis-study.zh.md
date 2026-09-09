# 本 fork 的 Cordis TLC 贡献

[English](cordis-study.md) | 中文

## 概述

本 fork 承载[通过 Cordis 研究的 TLC 流程发现](https://github.com/Stool233/cordis-formal-study/blob/main/docs/contributions.md)的生命周期缺陷修复。入口仓库维护反例、选定源码、复现命令和证据边界。

## 目录

- [理解贡献](#understand-the-contribution)
- [定位实现](#locate-the-implementation)
- [阅读验证](#follow-the-verification)
- [延伸阅读](#further-exploration)
- [开发说明](#dev-note)

## 理解贡献 <a id="understand-the-contribution"></a>

研究确认两个相关缺陷：依赖方尚未完成清理，provider 就开始恢复；retirement 隐藏了仍在卸载的 consumer，导致依赖发现漏掉它。[贡献指南](https://github.com/Stool233/cordis-formal-study/blob/main/docs/contributions.md)将观测事件与修复对应起来。[论文指南](https://github.com/Stool233/cordis-formal-study/blob/main/docs/paper.md)解释它们与当前论文清理规则的关系。

## 定位实现 <a id="locate-the-implementation"></a>

选定的 [Harness Cordis 实现](https://github.com/Stool233/deepseek-harness/tree/fdcd1ce36a296ab2288bf407fccba4c8fa634963/vendor/cordis/src)位于 `codex/upstream-alignment-2026-09-09`。它在清理结束前保留 consumer 的可发现性，并在 provider 恢复前等待已通知的 dependent。入口仓库的[版本锁](https://github.com/Stool233/cordis-formal-study/blob/main/current.lock.json)和[实现参考](https://github.com/Stool233/cordis-formal-study/blob/main/docs/implementation.md)维护精确源码选择及其上游来源。

默认 `master` 分支提供上游源码和本指南。选定研究源码包含修复；其证据不覆盖整个 Harness 应用。

## 阅读验证 <a id="follow-the-verification"></a>

[验证指南](https://github.com/Stool233/cordis-formal-study/blob/main/docs/verification.md)区分对已有观测运行 TLC 重放，以及从修复源码重新生成轨迹。证据串起被拒绝的上游轨迹、被接受的修复轨迹和负向对照。无插桩资源与 registry 回归是补充；测试通过和人工负向对照不算新的缺陷发现。

[复现说明](https://github.com/Stool233/cordis-formal-study/blob/main/docs/reproduce.md)维护命令和随仓库保存的工具链。证据确认声明依赖下选定实现的问题及修复，不证明整篇论文的完整演算。Provider 身份属于补充回归覆盖，不额外主张独立发现。

## 延伸阅读 <a id="further-exploration"></a>

框架概念见 [Cordis 入门](cordis-primer.zh.md)，应用组合见 [Harness 架构](architecture.zh.md)。范围更广的历史主张和实验过程保存在入口仓库的[归档](https://github.com/Stool233/cordis-formal-study/blob/main/archive/README.md)；确认的 TLC 贡献保留在主阅读路径。

## 开发说明 <a id="dev-note"></a>

[贡献证据决策](../.agents/notes/implemented/process/2026-09-10-cordis-tlc-contribution-evidence.zh.md)记录文档归属和验证边界。
