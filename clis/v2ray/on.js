import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError } from '@jackwener/opencli/errors';
import { getMode, setMode, detectAdapter } from './utils.js';

cli({
  site: 'v2ray', name: 'on', access: 'write',
  description: '开启 VPN 代理（sing-box 路由模式 → Rule）。不重启 v2rayN，即时生效。',
  domain: 'localhost', strategy: Strategy.LOCAL, browser: false, args: [],
  columns: ['action', 'mode', 'adapter'],
  func: async () => {
    if (process.platform !== 'win32') throw new ConfigError('仅支持 Windows');
    const current = await getMode();
    if (!current) throw new CommandExecutionError('无法连接 sing-box API (127.0.0.1:10814)', '请确认 v2rayN 正在运行且 sing-box 核心已启动');
    if (current !== 'Direct') return [{ action: 'already_on', mode: current, adapter: '—' }];
    await setMode('Rule');
    const next = await getMode();
    return [{ action: next === 'Rule' ? 'on' : 'on_failed', mode: next || '?', adapter: '—' }];
  },
});
