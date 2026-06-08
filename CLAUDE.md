# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

OpenCLI 是一个 Node.js CLI 工具，将任意网站转化为命令行接口。通过 Chrome 扩展 + 本地守护进程连接到用户已登录的浏览器，或通过声明式 Pipeline 直接调用 API，实现 `opencli <site> <command>` 式的数据获取与浏览器自动化。

## 内置浏览器工具

浏览器自动化**优先使用 Playwright CLI**，仅在需要登录态 Cookie 时回退到 OpenCLI 浏览器：

| 优先级 | 工具 | 方式 | 需 Chrome 扩展 | 适用场景 |
|:------:|------|------|:---:|------|
| ⭐ 首选 | `playwright` CLI | `opencli playwright navigate/snapshot/click/type/evaluate/screenshot` | ❌ | 页面巡检、DOM 快照、表单填写、截图、原型验证 |
| 备选 | `opencli browser *` | Chrome 扩展 + daemon（selector-first 合约） | ✅ | 需已登录 Cookie 的复杂 DOM 交互 |

Playwright 同时提供 MCP 内置工具（`browser_navigate`, `browser_snapshot` 等），可在 Claude Code 会话内直接调用进行多步交互。

> ⚠️ **禁止编写脚本调用 Playwright**。必须使用 `opencli playwright <command>` CLI 命令，不得创建 `.js`/`.py`/`.sh` 等临时脚本。CLI 工具失效时可使用 MCP 工具（`mcp__playwright__browser_navigate` 等）作为备选。

## 常用命令

```bash
# 开发运行（直接执行 TS 源码，无需编译）
npm run dev          # tsx src/main.ts
npm run dev:bun      # bun src/main.ts

# 构建
npm run build        # tsc 编译 + 复制 YAML + 生成 cli-manifest.json

# 类型检查
npm run typecheck    # tsc --noEmit

# 测试
npm test             # 默认门禁：unit + extension + adapter
npm run test:adapter # 仅 adapter 项目（迭代适配器时使用）
npm run test:all     # 全部项目（含 e2e、smoke）
npm run test:e2e     # 仅 e2e 项目
npm run test:bun     # 使用 bun 运行默认测试

# 文档
npm run docs:dev     # 启动 VitePress 文档开发服务器
npm run docs:build   # 构建文档

# 全局链接测试
npm link             # 链接后可全局使用 opencli 命令测试

# 校验与检查
opencli validate                # 校验所有适配器
npx tsx src/build-manifest.ts   # 手动重新生成 manifest
```

## 核心架构

### 启动流程 (`src/main.ts`)

1. **快速路径**：`--version`、`completion <shell>`、`--get-completions` 直接从预编译的 `cli-manifest.json` 响应，跳过完整发现流程
2. **完整启动**：并行执行内置 CLI 发现 + 用户目录初始化 → 用户 CLI 发现 → 插件发现 → 注册退出钩子 → 启动 Commander

### 命令注册与发现 (`src/discovery.ts`)

- **快速路径（生产模式）**：从预编译的 `cli-manifest.json` 读取所有命令元数据，JS 模块延迟加载（仅在命令实际执行时才 `import`）
- **回退路径（开发模式）**：运行时扫描 `clis/` 目录下的 JS 文件
- 用户适配器目录：`~/.opencli/clis/`，优先级高于内置适配器
- 插件目录：`~/.opencli/plugins/`，优先级最高

### Registry（`src/registry.ts`）

全局命令注册表，基于 `globalThis.__opencli_registry__` 单例模式。核心概念：

- **Strategy 枚举**：`PUBLIC`（无需登录）、`COOKIE`（需要浏览器 Cookie）、`LOCAL`、`INTERCEPT`、`UI`
- **`cli()` 函数**：适配器的唯一注册入口，定义 site、name、args、columns、pipeline 或 func
- **`registerCommand()`**：底层注册方法

### Pipeline 引擎（`src/pipeline/`）

声明式数据处理管道，适配器通过在 `cli()` 中定义 `pipeline` 数组来声明数据流：

- **Steps**：`navigate`、`fetch`、`select`、`map`、`filter`、`sort`、`limit`、`click`、`type`、`fill`、`wait`、`press`、`snapshot`、`evaluate`、`intercept`、`tap`、`download`
- **模板语法**：`${{ expression }}` 支持在 pipeline 步骤中引用 args、item、index 等上下文变量
- **可扩展**：插件可通过 `registerStep(name, handler)` 注册自定义步骤

### 浏览器模块（`src/browser/`）

- **Bridge 模式**：`BrowserBridge`（通过 Chrome 扩展 + WebSocket 守护进程）和 `CDPBridge`（直接 CDP 连接，用于 Electron 应用）
- **守护进程**（`src/daemon.ts`、`src/browser/daemon-client.ts`）：管理 Chrome 扩展的 WebSocket 连接生命周期
- **Page API**（`src/browser/page.ts`）：类似 Playwright 的页面操作接口（goto、click、type、evaluate、screenshot 等）
- **扩展**（`extension/`）：Chrome 浏览器扩展，作为 CLI 与浏览器之间的桥接

### 命令执行（`src/execution.ts`）

所有命令执行的统一入口：
1. 参数验证与类型强制转换
2. 浏览器会话生命周期管理（按需启动/复用/关闭）
3. Cookie 策略的域名预导航
4. 超时强制（默认 60s，可通过 `--timeout` 或 `OPENCLI_BROWSER_COMMAND_TIMEOUT` 环境变量覆盖）
5. 生命周期钩子（`onBeforeExecute` / `onAfterExecute`）

### 适配器结构（`clis/`）

每个站点一个目录，每个命令一个 JS 文件：

- **Pipeline 适配器**（推荐）：纯声明式，设置 `pipeline` 数组，`browser: false`
- **func() 适配器**：用于复杂浏览器交互，设置 `browser: true` 并提供 `func: async (page, kwargs) => {...}`
- 适配器通过 `import { cli, Strategy } from '@jackwener/opencli/registry'` 注册

### 错误体系（`src/errors.ts`）

统一的错误类型层次，遵循 Unix `sysexits.h` 退出码约定：
- `CliError`（基类）→ `BrowserConnectError`、`CommandExecutionError`、`ConfigError`、`AuthRequiredError`、`TimeoutError`、`ArgumentError`、`EmptyResultError`、`LoginWallError`
- 每个错误携带 `code`（机器可读）、`hint`（人类可读的修复建议）、`exitCode`

### 关键导出（`package.json` exports）

- `@jackwener/opencli` → `src/main.ts`
- `@jackwener/opencli/registry` → `src/registry-api.ts`（插件/适配器使用的公共 API）
- `@jackwener/opencli/errors` → `src/errors.ts`
- `@jackwener/opencli/pipeline` → `src/pipeline/index.ts`
- `@jackwener/opencli/browser/cdp`、`/page`、`/utils`
- `@jackwener/opencli/download` 系列

## 测试结构

使用 Vitest，在 `vitest.config.ts` 中定义多项目配置：

| 项目 | 匹配模式 | 说明 |
|------|---------|------|
| `unit` | `src/**/*.test.ts` | 核心单元测试 |
| `extension` | `extension/src/**/*.test.ts` | 扩展测试 |
| `adapter` | `clis/**/*.test.{ts,js}` | 适配器测试 |
| `e2e` | `tests/e2e/*.test.ts` | 端到端测试（需浏览器） |
| `smoke` | `tests/smoke/**/*.test.ts` | 冒烟测试 |

E2E 扩展测试通过环境变量控制：`OPENCLI_E2E=1` 启用扩展浏览器测试，`OPENCLI_AX_E2E=1` 启用 AX Chrome 测试。

## 代码规范

- **TypeScript strict 模式**，避免 `any`
- **ES Modules**，import 使用 `.js` 扩展名
- **命名**：文件 `kebab-case`，变量/函数 `camelCase`，类型/类 `PascalCase`
- **禁止 default export**，使用命名导出
- **Commit 规范**：Conventional Commits（`feat(site):`、`fix(browser):`、`docs:`、`test(site):`、`chore:`）
- **参数设计**：主要目标参数（query、symbol、id、url）使用 `positional: true`；配置参数（limit、format、sort）使用命名 `--flag`
