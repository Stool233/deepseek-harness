# 本 fork 的 Cordis TLC 贡献

[English](cordis-study.md) | 中文

## 概述

本 fork 包含[通过 Cordis 研究的 TLC 流程发现](https://github.com/Stool233/cordis-formal-study/blob/main/docs/contributions.md)的生命周期缺陷修复。研究仓库记录反例、源码版本、复现命令和验证结果。

## 目录

- [理解贡献](#understand-the-contribution)
- [定位实现](#locate-the-implementation)
- [阅读验证](#follow-the-verification)
- [延伸阅读](#further-exploration)
- [开发说明](#dev-note)

## 理解贡献 <a id="understand-the-contribution"></a>

研究发现两个相关缺陷：依赖方尚未完成清理，provider 就开始恢复；retirement 隐藏了仍在卸载的 consumer，导致依赖发现漏掉它。[贡献指南](https://github.com/Stool233/cordis-formal-study/blob/main/docs/contributions.md)展示违规事件及其修复。[论文指南](https://github.com/Stool233/cordis-formal-study/blob/main/docs/paper.md)解释对应的清理规则。

## 定位实现 <a id="locate-the-implementation"></a>

选定的 [Harness Cordis 实现](https://github.com/Stool233/deepseek-harness/tree/fdcd1ce36a296ab2288bf407fccba4c8fa634963/vendor/cordis/src)位于 `codex/upstream-alignment-2026-09-09`。它在清理结束前保持 consumer 的可发现性，并在 provider 恢复前等待已通知的 dependent。[版本锁](https://github.com/Stool233/cordis-formal-study/blob/main/current.lock.json)和[实现参考](https://github.com/Stool233/cordis-formal-study/blob/main/docs/implementation.md)记录选定源码及其官方基线。

默认 `master` 分支提供上游源码和本指南。验证针对包含修复的选定研究提交执行。

## 阅读验证 <a id="follow-the-verification"></a>

[验证指南](https://github.com/Stool233/cordis-formal-study/blob/main/docs/verification.md)说明如何用 TLC 重放已采集观测，以及从修复源码生成轨迹。它记录被拒绝的上游轨迹、被接受的修复轨迹和负向对照。回归测试直接检查资源和 registry 成员身份，确认轨迹对应的运行时行为。

[复现说明](https://github.com/Stool233/cordis-formal-study/blob/main/docs/reproduce.md)给出命令和工具版本。结果覆盖记录的场景及其声明的依赖绑定。Provider 身份有一项补充回归测试。

## 延伸阅读 <a id="further-exploration"></a>

框架概念见 [Cordis 入门](cordis-primer.zh.md)，应用组合见 [Harness 架构](architecture.zh.md)。研究[归档](https://github.com/Stool233/cordis-formal-study/blob/main/archive/README.md)保存此前的主张、审阅和实验。

## 开发说明 <a id="dev-note"></a>

[研究决策](../.agents/notes/implemented/process/2026-09-10-cordis-tlc-contribution-evidence.zh.md)说明文档结构和报告中证据的适用范围。
