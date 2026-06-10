import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError } from '@jackwener/opencli/errors';
import { getMode, detectAdapter, testNet } from './utils.js';

cli({
  site: 'v2ray', name: 'status', access: 'read',
  description: '查看 VPN 状态：sing-box 路由模式 + TUN 网卡 + facebook 连通性',
  domain: 'localhost', strategy: Strategy.LOCAL, browser: false, args: [],
  columns: ['mode', 'adapter', 'net'],
  func: async () => {
    if (process.platform !== 'win32') throw new ConfigError('仅支持 Windows');

    const mode = getMode();
    if (!mode) throw new CommandExecutionError('无法连接 sing-box Clash API (127.0.0.1:10814)', '请确认 v2rayN 正在运行且 sing-box 核心已启动');

    const ad = detectAdapter();
    const net = testNet('https://www.facebook.com', 5);

    return [{
      mode,
      adapter: ad ? `${ad.name}/${ad.status}` : 'N/A',
      net: net.reachable ? 'ok' : 'blocked',
    }];
  },
});
