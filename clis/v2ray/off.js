import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError } from '@jackwener/opencli/errors';
import {
  readV2rayNConfig,
  writeV2rayNConfig,
  getTunEnabled,
  findTunAdapter,
  testConnectivity,
} from './utils.js';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

cli({
  site: 'v2ray',
  name: 'off',
  access: 'write',
  description:
    '关闭 v2rayN TUN 模式。修改 guiNConfig.json 设置 EnableTun=false，不重启 v2rayN。v2rayN 检测到配置变更后自动停止 TUN 核心，恢复直连。',
  domain: 'localhost',
  strategy: Strategy.LOCAL,
  browser: false,
  args: [],
  columns: ['action', 'tun_enabled', 'adapter_name', 'adapter_status', 'network_test'],
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

    const { config, path: configPath } = result;

    if (!getTunEnabled(config)) {
      const adapter = findTunAdapter();
      const netTest = testConnectivity('https://www.facebook.com', 5);
      return [
        {
          action: 'already_off',
          tun_enabled: 'false',
          adapter_name: adapter ? adapter.name : 'N/A',
          adapter_status: adapter ? adapter.status : 'not_found',
          network_test: netTest.reachable ? 'facebook_reachable' : 'facebook_blocked',
        },
      ];
    }

    // 设置 EnableTun = false
    if (!config.TunModeItem) {
      config.TunModeItem = {};
    }
    config.TunModeItem.EnableTun = false;

    try {
      writeV2rayNConfig(configPath, config);
    } catch (err) {
      throw new CommandExecutionError(
        `写入配置失败: ${err.message}`,
        '请确认当前用户有写入权限'
      );
    }

    // 等待 v2rayN 检测变更并停止 TUN 核心
    await sleep(3000);

    let adapter = findTunAdapter();
    let netTest = testConnectivity('https://www.facebook.com', 5);

    const tunOff = !adapter || adapter.status === 'Disabled' || adapter.status === 'Down';
    if (tunOff || netTest.reachable) {
      return [
        {
          action: 'off',
          tun_enabled: 'false',
          adapter_name: adapter ? adapter.name : 'N/A',
          adapter_status: adapter ? adapter.status : 'not_found',
          network_test: netTest.reachable ? 'facebook_reachable' : 'facebook_blocked',
        },
      ];
    }

    // 再等 3 秒重试
    await sleep(3000);
    adapter = findTunAdapter();
    netTest = testConnectivity('https://www.facebook.com', 5);

    const tunOff2 = !adapter || adapter.status === 'Disabled' || adapter.status === 'Down';
    if (tunOff2 || netTest.reachable) {
      return [
        {
          action: 'off',
          tun_enabled: 'false',
          adapter_name: adapter ? adapter.name : 'N/A',
          adapter_status: adapter ? adapter.status : 'not_found',
          network_test: netTest.reachable ? 'facebook_reachable' : 'facebook_blocked',
        },
      ];
    }

    return [
      {
        action: 'off_config_written',
        tun_enabled: 'false',
        adapter_name: adapter ? adapter.name : 'N/A',
        adapter_status: adapter ? adapter.status : 'still_up',
        network_test: netTest.reachable ? 'facebook_reachable' : 'facebook_blocked',
      },
    ];
  },
});
