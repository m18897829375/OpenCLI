// Playwright type — 在输入框中输入文本。
//
// Playwright CLI 命令 — `opencli playwright type <url> <selector> <text>`。
// daemon 模式保持 Chrome 进程常驻，跨命令复用浏览器状态。

import { cli, Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import { withBrowser } from './utils.js';

cli({
    site: 'playwright',
    name: 'type',
    access: 'write',
    description: '在页面输入框（CSS 选择器）中输入文本，可选提交（按 Enter）。',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'url', positional: true, required: true, help: '页面 URL' },
        { name: 'selector', positional: true, required: true, help: '输入框 CSS 选择器，如 input[name=q]' },
        { name: 'text', positional: true, required: true, help: '要输入的文本' },
        { name: 'submit', type: 'boolean', default: false, help: '输入后按 Enter 提交' },
    ],
    columns: ['typed', 'selector', 'text', 'submitted', 'urlAfter'],
    func: async (args) =>
        withBrowser(async (page) => {
            await page.goto(args.url, { waitUntil: 'load', timeout: 30000 });
            const el = await page.$(args.selector);
            if (!el) throw new EmptyResultError('playwright type', `未找到输入框 "${args.selector}"`);
            await el.fill(args.text);
            if (args.submit) { await el.press('Enter'); await page.waitForTimeout(2000); }
            return [{ typed: true, selector: args.selector, text: args.text, submitted: args.submit || false, urlAfter: page.url() }];
        }),
});
