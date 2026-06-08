// Playwright click — 点击页面元素。
//
// Playwright CLI 命令 — `opencli playwright click <url> <selector>`。
// daemon 模式保持 Chrome 进程常驻，跨命令复用浏览器状态。

import { cli, Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import { withBrowser } from './utils.js';

cli({
    site: 'playwright',
    name: 'click',
    access: 'write',
    description: '在页面中点击匹配 CSS 选择器的元素，返回点击前后的页面标题变化。',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'url', positional: true, required: true, help: '页面 URL' },
        { name: 'selector', positional: true, required: true, help: 'CSS 选择器，如 button#submit' },
        { name: 'wait-after', type: 'int', default: 1000, help: '点击后等待毫秒数，默认 1000' },
    ],
    columns: ['clicked', 'selector', 'titleBefore', 'titleAfter', 'urlAfter'],
    func: async (args) =>
        withBrowser(async (page) => {
            await page.goto(args.url, { waitUntil: 'load', timeout: 30000 });
            const titleBefore = await page.title();
            const el = await page.$(args.selector);
            if (!el) throw new EmptyResultError('playwright click', `未找到元素 "${args.selector}"`);
            await el.click();
            await page.waitForTimeout(args['wait-after'] ?? 1000);
            return [{ clicked: true, selector: args.selector, titleBefore, titleAfter: await page.title(), urlAfter: page.url() }];
        }),
});
