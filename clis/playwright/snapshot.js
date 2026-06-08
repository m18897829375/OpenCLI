// Playwright snapshot — 获取页面无障碍快照。
//
// Playwright CLI 命令 — `opencli playwright snapshot <url>`。
// daemon 模式保持 Chrome 进程常驻，跨命令复用浏览器状态。

import { cli, Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import { withBrowser } from './utils.js';

const formatA11y = (node, depth = 0) => {
    if (!node) return '';
    const indent = '  '.repeat(depth);
    let out = `${indent}- ${node.role}${node.name ? ` "${node.name}"` : ''}\n`;
    if (node.children) for (const c of node.children) out += formatA11y(c, depth + 1);
    return out;
};

cli({
    site: 'playwright',
    name: 'snapshot',
    access: 'read',
    description: '获取指定 URL 页面的无障碍快照（YAML 树结构），可选 CSS 选择器限定范围。',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'url', positional: true, required: true, help: '页面 URL' },
        { name: 'selector', help: 'CSS 选择器，仅截取匹配元素（可选）' },
    ],
    columns: ['url', 'snapshot'],
    func: async (args) =>
        withBrowser(async (page) => {
            await page.goto(args.url, { waitUntil: 'load', timeout: 30000 });
            let snapshot;
            if (args.selector) {
                const el = await page.$(args.selector);
                if (!el) throw new EmptyResultError('playwright snapshot', `未找到选择器 "${args.selector}"`);
                snapshot = await el.accessibilitySnapshot({ interestingOnly: true });
            } else {
                snapshot = await page.accessibility.snapshot({ interestingOnly: true });
            }
            return [{ url: page.url(), snapshot: formatA11y(snapshot).trim() || '(empty page)' }];
        }),
});
