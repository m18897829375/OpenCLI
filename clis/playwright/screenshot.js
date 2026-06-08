// Playwright screenshot — 截取页面截图。
//
// Playwright CLI 命令 — `opencli playwright screenshot <url>`。
// daemon 模式保持 Chrome 进程常驻，跨命令复用浏览器状态。

import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { withBrowser } from './utils.js';
import * as path from 'node:path';

cli({
    site: 'playwright',
    name: 'screenshot',
    access: 'read',
    description: '截取页面截图保存为 PNG，支持全页和元素级截图。',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'url', positional: true, required: true, help: '页面 URL' },
        { name: 'output', help: '输出路径，默认 ./screenshot-<timestamp>.png' },
        { name: 'full-page', type: 'boolean', default: false, help: '截取整页（含滚动区域）' },
        { name: 'selector', help: 'CSS 选择器，仅截取匹配元素' },
    ],
    columns: ['url', 'title', 'file', 'width', 'height'],
    func: async (args) =>
        withBrowser(async (page) => {
            await page.goto(args.url, { waitUntil: 'load', timeout: 30000 });
            const outPath = args.output || path.resolve(process.cwd(), `screenshot-${Date.now()}.png`);
            const opts = { path: outPath, fullPage: args['full-page'] || false };
            if (args.selector) {
                const el = await page.$(args.selector);
                if (!el) throw new CommandExecutionError(`未找到元素 "${args.selector}"`, '');
                await el.screenshot(opts);
            } else {
                await page.screenshot(opts);
            }
            const vp = page.viewportSize();
            return [{ url: page.url(), title: await page.title(), file: outPath, width: vp?.width ?? null, height: vp?.height ?? null }];
        }),
});
