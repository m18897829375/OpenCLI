import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

const SCRIPTS = join(homedir(), '.opencli', 'v2ray');

// 确保脚本目录和文件存在
function ensureScripts() {
  if (!existsSync(SCRIPTS)) mkdirSync(SCRIPTS, { recursive: true });
  const detectPs = `
$adapter = Get-NetAdapter | Where-Object { $_.InterfaceDescription -like '*Wintun*' } | Select-Object -First 1
if (-not $adapter) { $adapter = Get-NetAdapter | Where-Object { $_.Name -like '*singbox_tun*' -or $_.Name -like '*xray_tun*' -or $_.Name -like '*v2ray_tun*' } | Select-Object -First 1 }
if (-not $adapter) { $adapter = Get-NetAdapter | Where-Object { $_.Name -like '*tun*' } | Select-Object -First 1 }
if ($adapter) { Write-Output "$($adapter.Name)|$($adapter.Status)" }
`.trim();
  writeFileSync(join(SCRIPTS, 'detect.ps1'), detectPs, 'utf-8');
}

/**
 * 定位 v2rayN 配置文件 guiNConfig.json
 */
function findConfigPath() {
  const knownDirs = [
    'C:\\Users\\ASUS\\Desktop\\v2rayN-windows-64',
    join(process.env.USERPROFILE || 'C:\\Users\\ASUS', 'Desktop\\v2rayN-windows-64'),
    'C:\\Program Files\\v2rayN',
  ];
  for (const dir of knownDirs) {
    for (const sub of ['', 'guiConfigs']) {
      const p = join(dir, sub, 'guiNConfig.json');
      if (existsSync(p)) return p;
    }
  }

  // 从进程路径推断
  try {
    const out = execSync('wmic process where "name=\'v2rayN.exe\'" get ExecutablePath /format:csv 2>nul', {
      encoding: 'utf-8', timeout: 5000, stdio: 'pipe',
    }).trim();
    const lines = out.split('\n').filter(l => l.includes('v2rayN'));
    if (lines.length > 0) {
      const exePath = lines[0].split(',')[1]?.trim();
      if (exePath) {
        const root = dirname(exePath);
        for (const sub of ['', 'guiConfigs']) {
          const p = join(root, sub, 'guiNConfig.json');
          if (existsSync(p)) return p;
        }
      }
    }
  } catch {}

  throw new Error('找不到 guiNConfig.json。请确认 v2rayN 已安装并至少运行过一次');
}

/** 读取配置 */
export function readConfig() {
  const path = findConfigPath();
  const raw = readFileSync(path, 'utf-8');
  return { config: JSON.parse(raw), path };
}

/** 写入配置 */
export function writeConfig(path, config) {
  writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8');
}

/** TUN 是否启用 */
export function isTunOn(config) {
  return config?.TunModeItem?.EnableTun === true;
}

/** 设置 TUN 状态 */
export function setTun(config, enabled) {
  if (!config.TunModeItem) config.TunModeItem = {};
  config.TunModeItem.EnableTun = enabled;
}

/** 检测 TUN 网卡 */
export function detectAdapter() {
  try {
    ensureScripts();
    const out = execSync(`powershell -NoProfile -File "${join(SCRIPTS, 'detect.ps1')}"`, {
      encoding: 'utf-8', timeout: 10000, stdio: 'pipe',
    }).trim();
    if (!out) return null;
    const [name, status] = out.split('|');
    return { name, status };
  } catch { return null; }
}

/** 网络连通性测试 */
export function testNet(url, timeoutSec = 5) {
  try {
    execSync(`curl -s --max-time ${timeoutSec} -o nul -w "%{http_code}" "${url}"`, {
      encoding: 'utf-8', timeout: (timeoutSec + 2) * 1000, stdio: 'pipe',
    });
    return { reachable: true };
  } catch (e) { return { reachable: false }; }
}
