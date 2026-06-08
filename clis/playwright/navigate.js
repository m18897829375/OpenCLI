// Playwright navigate — 打开 URL 并返回页面基本信息。
//
// Playwright CLI 命令 — `opencli playwright navigate <url>`。
// daemon 模式保持 Chrome 进程常驻，跨命令复用浏览器状态。

import { cli, Strategy } from '@jackwener/opencli/registry';
import { withBrowser } from './utils.js';

cli({
    site: 'playwright',
    name: 'navigate',
    access: 'read',
    description:
        '打开指定 URL 并返回页面标题、URL 和 HTTP 状态码。daemon 模式保持 Chrome 进程常驻，多步流程复用同一浏览器，MCP 工具作为失效备选。',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'url', positional: true, required: true, help: '完整 URL（含协议），如 https://example.com' },
        { name: 'wait-until', default: 'load', choices: ['load', 'domcontentloaded', 'networkidle'], help: '页面加载等待策略，默认 load' },
    ],
    columns: ['url', 'title', 'status'],
    func: async (args) =>
        withBrowser(async (page) => {
            const resp = await page.goto(args.url, {
                waitUntil: args['wait-until'] ?? 'load',
                timeout: 30000,
            });
            return [{ url: page.url(), title: await page.title(), status: resp?.status() ?? null }];
        }),
});
