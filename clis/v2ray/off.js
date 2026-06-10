import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError } from '@jackwener/opencli/errors';
import { getMode, setMode, detectAdapter, testNet } from './utils.js';

cli({
  site: 'v2ray', name: 'off', access: 'write',
  description: '关闭 VPN 代理（sing-box 路由模式 → Direct，所有流量直连）。不重启 v2rayN，即时生效。',
  domain: 'localhost', strategy: Strategy.LOCAL, browser: false, args: [],
  columns: ['action', 'mode', 'adapter', 'net'],
  func: async () => {
    if (process.platform !== 'win32') throw new ConfigError('仅支持 Windows');
    const current = await getMode();
    if (!current) throw new CommandExecutionError('无法连接 sing-box API (127.0.0.1:10814)', '请确认 v2rayN 正在运行且 sing-box 核心已启动');
    if (current === 'Direct') {
      const net = await testNet('https://www.baidu.com', 5000);
      return [{ action: 'already_off', mode: current, adapter: '—', net: net.reachable ? 'ok' : 'blocked' }];
    }
    await setMode('Direct');
    const next = await getMode();
    const ad = detectAdapter();
    const net = await testNet('https://www.baidu.com', 5000);
    return [{ action: next === 'Direct' ? 'off' : 'off_failed', mode: next || '?', adapter: ad ? `${ad.name}/${ad.status}` : 'N/A', net: net.reachable ? 'ok' : 'blocked' }];
  },
});
