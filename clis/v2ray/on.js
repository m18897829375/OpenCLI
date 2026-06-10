import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError } from '@jackwener/opencli/errors';
import { adapterStatus, enableAdapter, restartSingbox, testNet } from './utils.js';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

cli({
  site: 'v2ray', name: 'on', access: 'write',
  description: '开启 TUN 模式（启用虚拟网卡 + 重启 sing-box 恢复路由）。不退出 v2rayN。需要管理员终端。',
  domain: 'localhost', strategy: Strategy.LOCAL, browser: false, args: [],
  columns: ['action', 'tun', 'adapter', 'net'],
  func: async () => {
    if (process.platform !== 'win32') throw new ConfigError('仅支持 Windows');

    const before = adapterStatus();
    if (!before) throw new CommandExecutionError('未找到 TUN 网卡，请确认 v2rayN 正在运行且 TUN 已配置');

    if (before.status === 'Up') {
      return [{ action: 'already_on', tun: 'ON', adapter: `${before.name}/Up`, net: '—' }];
    }

    // 1. 启用网卡
    try { enableAdapter(); } catch (e) {
      throw new CommandExecutionError(`启用网卡失败: ${e.message}`, '请以管理员身份运行终端');
    }

    // 2. 杀 sing-box 让它重新初始化路由
    restartSingbox();

    // 3. 等 v2rayN 重启 sing-box
    await sleep(5000);

    // 4. 验证
    const after = adapterStatus();
    const net = await testNet('https://www.baidu.com', 5000);
    return [{
      action: after?.status === 'Up' ? 'on' : 'on_partial',
      tun: after?.status === 'Up' ? 'ON' : '?',
      adapter: after ? `${after.name}/${after.status}` : 'N/A',
      net: net ? 'ok' : 'blocked',
    }];
  },
});
