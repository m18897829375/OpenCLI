import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError } from '@jackwener/opencli/errors';
import { readConfig, isTunOn, detectAdapter, testNet } from './utils.js';

cli({
  site: 'v2ray', name: 'status', access: 'read',
  description: '查看 TUN 模式状态：guiNConfig.json 配置 + 虚拟网卡 + 网络连通性',
  domain: 'localhost', strategy: Strategy.LOCAL, browser: false, args: [],
  columns: ['tun_config', 'adapter', 'net'],
  func: async () => {
    if (process.platform !== 'win32') throw new ConfigError('仅支持 Windows');

    let cfg;
    try { cfg = readConfig().config; } catch (e) {
      throw new CommandExecutionError(`读取配置失败: ${e.message}`);
    }

    const tunOn = isTunOn(cfg);
    const ad = detectAdapter();
    const net = testNet('https://www.facebook.com', 5);

    return [{
      tun_config: tunOn ? 'true' : 'false',
      adapter: ad ? `${ad.name}/${ad.status}` : 'N/A',
      net: net.reachable ? 'ok' : 'blocked',
    }];
  },
});
