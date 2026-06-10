import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError } from '@jackwener/opencli/errors';
import { adapterStatus, singboxRunning, testNet } from './utils.js';

cli({
  site: 'v2ray', name: 'status', access: 'read',
  description: '查看 TUN 状态：网卡状态 + sing-box 进程 + 网络连通性',
  domain: 'localhost', strategy: Strategy.LOCAL, browser: false, args: [],
  columns: ['tun', 'adapter', 'singbox', 'net'],
  func: async () => {
    if (process.platform !== 'win32') throw new ConfigError('仅支持 Windows');

    const ad = adapterStatus();
    const sb = singboxRunning();
    const net = await testNet('https://www.baidu.com', 5000);

    return [{
      tun: ad ? (ad.status === 'Up' ? 'ON' : 'OFF') : 'N/A',
      adapter: ad ? `${ad.name}/${ad.status}` : 'not_found',
      singbox: sb ? 'running' : 'stopped',
      net: net ? 'ok' : 'blocked',
    }];
  },
});
