import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError } from '@jackwener/opencli/errors';
import { isV2rayNRunning, getMode, setMode, adapterStatus, singboxRunning, testNet } from './utils.js';

cli({
  site: 'v2ray', name: 'on', access: 'write',
  description: '开启代理路由（sing-box Clash API 切换为 Rule 模式）。瞬时生效，无需管理员。',
  domain: 'localhost', strategy: Strategy.LOCAL, browser: false, args: [],
  columns: ['action', 'mode', 'adapter', 'singbox', 'net'],
  func: async () => {
    if (process.platform !== 'win32') throw new ConfigError('仅支持 Windows');

    if (!isV2rayNRunning()) {
      throw new CommandExecutionError('v2rayN 未运行', '请先启动 v2rayN');
    }

    const currentMode = await getMode();
    if (currentMode === null) {
      throw new CommandExecutionError('无法连接 sing-box Clash API', '请确认 v2rayN 正在运行且 sing-box 已启动');
    }

    if (currentMode === 'Rule') {
      const net = await testNet('https://www.baidu.com', 5000);
      return [{
        action: 'already_on',
        mode: 'Rule',
        adapter: '—',
        singbox: '—',
        net: net ? 'ok' : 'blocked',
      }];
    }

    await setMode('Rule');

    // 验证
    const newMode = await getMode();
    const ad = adapterStatus();
    const sb = singboxRunning();
    const net = await testNet('https://www.baidu.com', 5000);

    return [{
      action: newMode === 'Rule' ? 'on' : 'on_failed',
      mode: newMode || '?',
      adapter: ad ? `${ad.name}/${ad.status}` : '—',
      singbox: sb ? 'running' : 'stopped',
      net: net ? 'ok' : 'blocked',
    }];
  },
});
