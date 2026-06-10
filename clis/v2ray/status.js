import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError } from '@jackwener/opencli/errors';
import {
  readV2rayNConfig,
  getTunEnabled,
  findTunAdapter,
  testConnectivity,
} from './utils.js';

cli({
  site: 'v2ray',
  name: 'status',
  access: 'read',
  description:
    '查看 v2rayN TUN 模式状态。读取 guiNConfig.json 配置 + 检测虚拟网卡 + 测试网络连通性（facebook.com）',
  domain: 'localhost',
  strategy: Strategy.LOCAL,
  browser: false,
  args: [],
  columns: ['tun_enabled', 'config_path', 'adapter_name', 'adapter_status', 'network_test'],
  func: async () => {
    if (process.platform !== 'win32') {
      throw new ConfigError('v2ray CLI 适配器仅支持 Windows');
    }

    let result;
    try {
      result = readV2rayNConfig();
    } catch (err) {
      throw new CommandExecutionError(
        `读取 v2rayN 配置失败: ${err.message}`,
        err.hint || '请确认 v2rayN 已安装并至少运行过一次'
      );
    }

    const tunEnabled = getTunEnabled(result.config);
    const adapter = findTunAdapter();
    const netTest = testConnectivity('https://www.facebook.com', 5);

    const networkTest = netTest.reachable ? 'facebook_reachable' : 'facebook_blocked';

    return [
      {
        tun_enabled: tunEnabled ? 'true' : 'false',
        config_path: result.path,
        adapter_name: adapter ? adapter.name : 'N/A',
        adapter_status: adapter ? adapter.status : 'not_found',
        network_test: networkTest,
      },
    ];
  },
});
