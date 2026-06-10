import { cli, Strategy } from '@jackwener/opencli/registry';
import { ConfigError, CommandExecutionError } from '@jackwener/opencli/errors';
import { readConfig, writeConfig, isTunOn, setTun, detectAdapter, testNet } from './utils.js';

cli({
  site: 'v2ray', name: 'on', access: 'write',
  description: '开启 v2rayN TUN 模式。修改 guiNConfig.json 设置 EnableTun=true，不退出/重启 v2rayN。',
  domain: 'localhost', strategy: Strategy.LOCAL, browser: false, args: [],
  columns: ['action', 'tun_config', 'adapter', 'net'],
  func: async () => {
    if (process.platform !== 'win32') throw new ConfigError('仅支持 Windows');

    let cfg, path;
    try { const r = readConfig(); cfg = r.config; path = r.path; } catch (e) {
      throw new CommandExecutionError(`读取配置失败: ${e.message}`);
    }

    if (isTunOn(cfg)) {
      const ad = detectAdapter();
      return [{ action: 'already_on', tun_config: 'true', adapter: ad ? `${ad.name}/${ad.status}` : 'N/A', net: '—' }];
    }

    setTun(cfg, true);
    try { writeConfig(path, cfg); } catch (e) {
      throw new CommandExecutionError(`写入配置失败: ${e.message}`);
    }

    const ad = detectAdapter();
    return [{ action: 'on', tun_config: 'true', adapter: ad ? `${ad.name}/${ad.status}` : 'N/A', net: '—' }];
  },
});
