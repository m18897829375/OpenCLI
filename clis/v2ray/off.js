import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError } from '@jackwener/opencli/errors';
import { adapterStatus, disableAdapter, testNet } from './utils.js';

cli({
  site: 'v2ray', name: 'off', access: 'write',
  description: '关闭 TUN 模式（禁用虚拟网卡，流量直连）。不重启 v2rayN。需要管理员终端。',
  domain: 'localhost', strategy: Strategy.LOCAL, browser: false, args: [],
  columns: ['action', 'tun', 'adapter', 'net'],
  func: async () => {
    if (process.platform !== 'win32') throw new ConfigError('仅支持 Windows');

    const before = adapterStatus();
    if (!before) throw new CommandExecutionError('未找到 TUN 网卡，TUN 模式可能未开启');
    if (before.status !== 'Up') {
      return [{ action: 'already_off', tun: 'OFF', adapter: `${before.name}/${before.status}`, net: '—' }];
    }

    try { disableAdapter(); } catch (e) {
      throw new CommandExecutionError(`禁用网卡失败: ${e.message}`, '请以管理员身份运行终端');
    }

    const after = adapterStatus();
    const net = await testNet('https://www.baidu.com', 5000);
    return [{
      action: 'off',
      tun: after?.status === 'Up' ? 'ON' : 'OFF',
      adapter: after ? `${after.name}/${after.status}` : 'gone',
      net: net ? 'ok' : 'blocked',
    }];
  },
});
