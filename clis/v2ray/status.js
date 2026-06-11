import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError } from '@jackwener/opencli/errors';
import { isV2rayNRunning, getMode, adapterStatus, singboxRunning, testNet } from './utils.js';

cli({
  site: 'v2ray', name: 'status', access: 'read',
  description: '查看代理状态：Clash 路由模式 + 网卡状态 + sing-box 进程 + 网络连通性',
  domain: 'localhost', strategy: Strategy.LOCAL, browser: false, args: [],
  columns: ['mode', 'adapter', 'singbox', 'net', 'v2rayn'],
  func: async () => {
    if (process.platform !== 'win32') throw new ConfigError('仅支持 Windows');

    const running = isV2rayNRunning();
    if (!running) {
      return [{
        mode: 'N/A',
        adapter: 'N/A',
        singbox: 'N/A',
        net: 'N/A',
        v2rayn: 'not running',
      }];
    }

    const mode = await getMode();
    const ad = adapterStatus();
    const sb = singboxRunning();
    const net = await testNet('https://www.baidu.com', 5000);

    return [{
      mode: mode || 'api_error',
      adapter: ad ? `${ad.name}/${ad.status}` : 'not_found',
      singbox: sb ? 'running' : 'stopped',
      net: net ? 'ok' : 'blocked',
      v2rayn: 'running',
    }];
  },
});
