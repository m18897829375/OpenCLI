// Playwright evaluate — 在页面中执行 JavaScript。
//
// Playwright CLI 命令 — `opencli playwright evaluate <url> <code>`。
// daemon 模式保持 Chrome 进程常驻，跨命令复用浏览器状态。

import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { withBrowser } from './utils.js';

function wrapExpression(code) {
    if (/^\s*\(?\s*async?\s*\(/.test(code) || code.includes('=>')) return code;
    return `(() => (${code}))()`;
}

cli({
    site: 'playwright',
    name: 'evaluate',
    access: 'read',
    description: '在页面中执行 JavaScript 表达式（支持箭头函数），返回执行结果。',
    domain: 'localhost',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'url', positional: true, required: true, help: '页面 URL' },
        { name: 'code', positional: true, required: true, help: 'JS 表达式，如 document.title 或 () => ({...})' },
    ],
    columns: ['url', 'result'],
    func: async (args) =>
        withBrowser(async (page) => {
            await page.goto(args.url, { waitUntil: 'load', timeout: 30000 });
            let result;
            try { result = await page.evaluate(wrapExpression(args.code)); } catch (e) {
                throw new CommandExecutionError(`evaluate 执行失败: ${e.message}`, '');
            }
            return [{ url: page.url(), result: typeof result === 'object' ? JSON.stringify(result) : String(result) }];
        }),
});
