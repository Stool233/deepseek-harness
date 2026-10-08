# Agent Note: Authenticated CI bubblewrap archive resolution

Status: implemented

[English](2026-10-08-ci-bubblewrap-archive-resolution.md) | 中文

## 问题

真实 API 工作流运行 [37579435513](https://github.com/Stool233/deepseek-harness/actions/runs/37579435513) 在密钥预检前失败，因为固定的 Ubuntu 软件包池地址 `0.9.0-1ubuntu0.1` 返回 HTTP 404。软件包哈希无法保证已被取代的软件包持续可用。该准备脚本也供无需密钥的 CI 使用。

## 决策

[`prepare-ci-bubblewrap.sh`](../../../../scripts/prepare-ci-bubblewrap.sh) 刷新 APT 元数据，将更新错误视为致命错误，下载运行器发行版的 `bubblewrap:amd64` 候选包，并直接解包，不执行 dpkg 事务或软件包钩子。APT 验证仓库签名元数据，并依据索引中的哈希校验下载内容；未经认证和不安全的仓库仍被禁止。日志记录解析出的版本和软件包 SHA256。运行器配置的 APT 源与信任存储负责软件包选择。

现有的 AppArmor userns 调整和命名空间探测仍是必需的准备步骤；只有探测成功时才允许 sysctl 参数缺失。脚本在探测通过后才将私有二进制目录写入 `GITHUB_PATH`。每次调用使用独立的运行器临时目录。

[无需密钥的准备工作流](../../../../.github/workflows/bubblewrap.yml) 在此准备路径变更时，在托管 Ubuntu 上执行真实软件包获取与已导出的二进制文件。失败场景测试断言更新、下载、解包和探测失败时均不发布二进制文件。[真实 API 工作流](../../../../.github/workflows/e2e.yml) 保留密钥预检、构建、测试与可信事件限制。

## 考虑过的替代方案

**替换固定版本和 SHA256。** 这能修复一个地址，但 Ubuntu 再次移除被取代的软件包时仍会失败，并延迟安全更新。

**通过 APT 安装。** 认证机制合适，但安装会扫描 dpkg 数据库并执行 CI 准备不需要的软件包钩子。

**将旧包固定在快照中。** 这能提供可复现性，但会冻结安全修复，并引入显式的快照维护。运行器发行版持续维护的候选包适合此 CI 依赖。

## 影响

运行器发行版发布更新时软件包版本可能变化；日志提供解析出的版本和哈希，而非可复现的软件包锁定。元数据刷新增加网络开销，并在仓库出错时失败，而非静默使用旧索引。下载或沙箱失败仍会阻止 E2E，准备成功本身不能证明真实 API 测试结果。
