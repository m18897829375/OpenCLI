// Playwright adapter — 共享工具函数。
// 每个命令使用动态 import 以避免 playwright 未安装时崩溃。

import { CommandExecutionError } from '@jackwener/opencli/errors';

/**
 * 动态加载 Playwright chromium launcher。
 * 若 playwright 未安装则抛出带安装指引的错误。
 */
export async function getChromium() {
    try {
        const { chromium } = await import('playwright');
        return chromium;
    } catch {
        throw new CommandExecutionError(
            'Playwright 未安装。请运行:\n' +
                '  npm install playwright\n' +
                '  npx playwright install chromium',
            ''
        );
    }
}

/**
 * 启动浏览器、执行操作、确保关闭。
 * @param {Function} fn — async (page) => rows[]
 */
export async function withBrowser(fn) {
    const chromium = await getChromium();
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await (await browser.newContext()).newPage();
        return await fn(page);
    } finally {
        await browser.close();
    }
}
