import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError } from '@jackwener/opencli/errors';
import { getMode, setMode, detectAdapter, testNet } from './utils.js';

cli({
  site: 'v2ray', name: 'off', access: 'write',
  description: '关闭 VPN 代理（切换 sing-box 路由模式为 Direct，所有流量直连）。不重启 v2rayN，即时生效。',
  domain: 'localhost', strategy: Strategy.LOCAL, browser: false, args: [],
  columns: ['action', 'mode', 'adapter', 'net'],
  func: async () => {
    if (process.platform !== 'win32') throw new ConfigError('仅支持 Windows');

    const currentMode = getMode();
    if (!currentMode) throw new CommandExecutionError('无法连接 sing-box Clash API (127.0.0.1:10814)', '请确认 v2rayN 正在运行且 sing-box 核心已启动');

    if (currentMode === 'Direct') {
      const net = testNet('https://www.facebook.com', 5);
      return [{ action: 'already_off', mode: currentMode, adapter: '—', net: net.reachable ? 'ok' : 'blocked' }];
    }

    setMode('Direct');
    const newMode = getMode();
    const ad = detectAdapter();
    const net = testNet('https://www.facebook.com', 5);

    if (newMode === 'Direct') {
      return [{ action: 'off', mode: newMode, adapter: ad ? `${ad.name}/${ad.status}` : 'N/A', net: net.reachable ? 'ok' : 'blocked' }];
    }
    throw new CommandExecutionError(`模式切换失败：当前为 ${newMode || 'unknown'}`);
  },
});
