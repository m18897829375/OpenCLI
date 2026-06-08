---
name: opencli-toagent
description: |
  为任意网站或 MCP 工具构建 AI agent 可用的命令行查询工具。
  当用户要求「做一个 CLI 工具」「把网站变成 CLI」「把 MCP 转成 CLI」「用命令行查某网站数据」「为 XX 网站生成命令行接口」时触发。
  覆盖三层难度：公开 API 网站、需登录/反爬的复杂网站、MCP 工具转 CLI。
  也适用于基于 OpenCLI 框架或 pwc daemon 架构构建数据查询/浏览器自动化工具的场景。
---

# 网站/MCP → CLI 工具构建规范

## 核心原则

构建的 CLI 工具**面向 AI agent 消费**，不是面向人类终端用户。所有设计决策从「AI agent 如何高效提取信息」出发。

## 十项规则

### 一、硬规则（1-3）：输出质量

#### 1. 默认输出机器可读格式

默认输出**紧凑 JSON**（一行），AI agent 可以直接 `JSON.parse()` 或管道给 `jq` / `ConvertFrom-Json` 处理。

人类可读的表格/彩色输出通过 `--raw` 开关提供，**不做为默认行为**。

**额外输出选项**（全部可选）：
- `--pretty` — 缩进格式化 JSON（调试用）
- `--raw` — ASCII 彩色表格（人类阅读用）
- `--fields` — 只输出指定字段，减少噪音

#### 2. 精准输出，零冗余

每个 flag 只输出 flag 对应的数据，不夹杂其他字段。精确查询模式只查需要的 API，只输出对应的结果。扩展数据的 API 调用延迟到需要时才发起（按需加载）。`--full` 是唯一输出全部字段的路径。

#### 3. 功能覆盖自查

CLI 实现完成后，**必须**执行以下自查流程：

1. **列出所有已实现的命令和子命令**
2. **对比网站的实际功能**，逐项检查是否有遗漏
3. **明确告知**：已实现 / 未覆盖 / 不可覆盖

**自查报告格式**：
```
## CLI 功能覆盖报告
### 已实现
| 命令 | 功能 | 数据源 |
### 未覆盖（网站有，CLI 暂无）
- ...
### 不可覆盖
- 用户登录相关功能（需认证）
```

---

### 二、流程规则（4-8）：开发流程

#### 4. 登录检测（Plan + 执行双重）

**Plan 阶段**：分析网站/API 时主动检测是否需要登录态。检查 API 返回 401/403 或页面重定向到登录页就判定需要登录。如需登录，在 Plan 报告中标注「需要登录」，并告知用户先在浏览器中登录目标网站。

**执行阶段**：即使 Plan 预判不需要登录，执行中遇到意外的登录墙/401/403 也要立即暂停任务，提示用户：
> ⚠️ 目标网站要求登录。请在 Chrome 中登录 https://xxx.com 后告诉我继续。

#### 5. 优先使用 OpenCLI 内置 CLI

在创建新 CLI 工具之前，**必须先检查**目标网站/MCP 是否已有内置 CLI 工具：

1. 在 `references/builtin-tools.md` 中搜索目标站点名 → 判断「有没有」
2. 有 → 运行 `opencli list` 或 `opencli <site>` 查看可用命令（不要读整个 builtin-tools.md）
3. 有 → 直接用，不要重建
4. 没有 → 进入 Plan 模式新建

**为什么**：避免为同一网站创建重复的 CLI 工具。`references/builtin-tools.md` 是极简索引（~60 行），具体命令通过 `opencli list` 动态获取。

#### 6. 不修改 OpenCLI 源码

生成的 CLI 工具放在独立目录（如 `~/Desktop/<name>-cli/` 或 `~/.opencli/clis/`）。**绝对禁止**修改 OpenCLI 项目的 `clis/`、`src/` 等源码目录。

#### 7. Plan 模式先行

**任何新的 CLI 工具必须先进入 Plan 模式分析后再实现代码**。流程：

```
用户需求 → Plan 模式 → 分析网站/MCP → 设计命令结构 → 用户批准 → 实现代码
```

不能跳过分析直接写代码。Plan 内容至少包含：API 端点、参数设计、命令列表、输出格式。

#### 8. 全局注册

每个新 CLI 工具完成后必须 `npm link` 全局注册，并验证全局可用：

```bash
cd <cli-project> && npm link --force
which <cli-name>  # 验证
```

---

### 三、执行规则（9-10）：使用方式

#### 9. 禁止编写脚本

使用 CLI 工具时，**只用已有的命令行工具**（`pwc`、`opencli`、系统命令）完成任务。**不创建临时脚本文件**，不写 `.js`/`.py`/`.sh` 等辅助脚本。

如果 CLI 工具本身的命令无法完成任务，说明工具设计有缺陷，需要改进工具。

#### 10. Daemon 模式（仅浏览器自动化工具）

**需要浏览器（Playwright/CDP）的 CLI 工具必须使用 daemon 架构**，禁止每个命令启动一个朝生暮死的浏览器进程。

- ✅ pwc daemon 模式：`pwc daemon start` → 多次命令 → `pwc daemon stop`
- ❌ 每个命令独立启动/关闭浏览器

**纯 API 调用工具（HTTP fetch）不需要 daemon**，可以单次进程执行。

---

## 三层分类决策树

收到「为 XX 做 CLI 工具」请求后，先分类再行动：

```
目标是什么？
  ├─ 公开 API 网站？
  │   └─ L1 简单 CLI
  │       技术栈: Node.js + Commander + fetch
  │       模式: 单次进程（无需 daemon）
  │       示例: hackernews, npm, wttr, arxiv
  │
  ├─ 需要登录态/反爬的网站？
  │   └─ L2 复杂 CLI
  │       技术栈: Node.js + Playwright + daemon
  │       模式: daemon 常驻浏览器
  │       示例: bilibili, taobao, twitter
  │       前置条件: 用户先在 Chrome 登录目标网站
  │
  └─ 目标是 MCP 工具？
      └─ L3 MCP → CLI
          技术栈: 取决于 MCP 工具性质
          - 浏览器类 MCP → daemon 模式（如 pwc）
          - API 类 MCP → 单次进程（如 search-mcp → cli）
          方法: 分析 MCP 工具列表 → 映射为 CLI 子命令
          示例: Playwright MCP → pwc
```

## 项目结构模式

### L1 简单 CLI（纯 fetch，无浏览器）

```
<name>-cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts              # Commander 入口
│   ├── types.ts             # TypeScript 接口
│   ├── api.ts               # HTTP 客户端（超时/重试/限流）
│   ├── commands/            # 每个命令一个文件
│   └── format/
│       ├── json.ts          # JSON 输出
│       └── table.ts         # ASCII 表格（--raw）
```

### L2/L3 复杂 CLI（浏览器/daemon）

```
<name>-cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts              # Commander 入口 + daemon 管理
│   ├── client.ts            # HTTP 瘦客户端 → daemon
│   ├── daemon.ts            # 常驻 daemon 进程（浏览器宿主）
│   ├── commands/            # 每个命令一个文件（瘦封装）
│   └── utils/
│       ├── output.ts        # 输出格式化
│       └── selector.ts      # 选择器解析
```

## 验证清单

CLI 实现完成后，逐项检查：

- [ ] 所有命令默认输出紧凑 JSON
- [ ] `--pretty` / `--raw` / `--fields` 选项可用
- [ ] 精准查询 flag 只输出对应数据，不混杂其他字段
- [ ] `--full` 是唯一输出全部字段的路径
- [ ] 网络错误有中文提示，退出码区分（0=成功, 1=未找到, 2=API错误）
- [ ] 所有 API 调用有超时（≤15s）和限流（≥100ms 间隔）
- [ ] 已完成功能覆盖自查并输出报告
- [ ] 登录检测：Plan 阶段预判 + 执行阶段兜底
- [ ] Plan 模式先行（不能跳过分析直接写代码）
- [ ] 浏览器类工具使用 daemon 模式（非朝生暮死进程）
- [ ] `npm link` 全局注册验证通过
