import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { ConfigError } from '@jackwener/opencli/errors';

/**
 * 通过多种方式定位 v2rayN 安装目录。
 *
 * 策略：
 * 1. PowerShell Get-Process 获取 v2rayN.exe 路径
 * 2. WMIC 查询进程路径
 * 3. 回退到已知安装路径
 *
 * @returns {string} v2rayN 安装目录的绝对路径
 * @throws {ConfigError} 找不到 v2rayN 安装路径
 */
function getV2rayNPath() {
  // 策略1：通过 PowerShell 查找 v2rayN 进程路径
  try {
    const psScript = `
$ErrorActionPreference = 'Stop';
$proc = Get-Process -Name 'v2rayN' -ErrorAction SilentlyContinue | Select-Object -First 1;
if ($proc) {
  try { Write-Output $proc.Path } catch { }
}
`.trim();
    const output = execSync(
      `powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    if (output && existsSync(output)) {
      return dirname(output);
    }
  } catch {
    // 继续回退
  }

  // 策略2：WMIC 查询（不需要管理员权限）
  try {
    const wmicOut = execSync(
      'wmic process where "name=\'v2rayN.exe\'" get ExecutablePath /format:csv 2>nul',
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    const lines = wmicOut.split('\n').filter(l => l.includes('v2rayN'));
    if (lines.length > 0) {
      const path = lines[0].split(',')[1]?.trim();
      if (path && existsSync(path)) {
        return dirname(path);
      }
    }
  } catch {
    // 继续回退
  }

  // 策略3：回退到已知路径（检查 guiNConfig.json 是否存在）
  const knownPaths = [
    'C:\\Users\\ASUS\\Desktop\\v2rayN-windows-64',
    'C:\\Program Files\\v2rayN',
    join(process.env.USERPROFILE || 'C:\\Users\\ASUS', 'Desktop\\v2rayN-windows-64'),
  ];
  for (const p of knownPaths) {
    if (
      existsSync(join(p, 'guiNConfig.json')) ||
      existsSync(join(p, 'guiConfigs', 'guiNConfig.json'))
    ) {
      return p;
    }
  }

  throw new ConfigError(
    '找不到 v2rayN 安装路径',
    '请确认 v2rayN 已安装，配置文件 guiNConfig.json 存在，且 v2rayN.exe 正在运行'
  );
}

/**
 * 读取 v2rayN 配置文件 guiNConfig.json。
 *
 * @returns {{ config: object, path: string }} 解析后的配置对象和文件路径
 * @throws {ConfigError}
 */
export function readV2rayNConfig() {
  const v2rayNPath = getV2rayNPath();

  // v2rayN 配置文件可能在根目录或 guiConfigs 子目录
  let configPath = join(v2rayNPath, 'guiNConfig.json');
  if (!existsSync(configPath)) {
    const altPath = join(v2rayNPath, 'guiConfigs', 'guiNConfig.json');
    if (existsSync(altPath)) {
      configPath = altPath;
    } else {
      throw new ConfigError(
        `配置文件不存在: ${configPath}`,
        '请确认 v2rayN 已正确安装，且至少运行过一次'
      );
    }
  }

  let raw;
  try {
    raw = readFileSync(configPath, 'utf-8');
  } catch (err) {
    throw new ConfigError(
      `无法读取配置文件: ${configPath}`,
      `读取失败: ${err.message}`
    );
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    throw new ConfigError(
      `JSON 解析失败: ${configPath}`,
      '配置文件可能已损坏'
    );
  }

  return { config, path: configPath };
}

/**
 * 将配置写回 guiNConfig.json。
 *
 * @param {string} configPath - 配置文件路径
 * @param {object} config - 配置对象
 * @throws {ConfigError}
 */
export function writeV2rayNConfig(configPath, config) {
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    throw new ConfigError(
      `无法写入配置文件: ${configPath}`,
      `写入失败: ${err.message}`
    );
  }
}

/**
 * 获取 TUN 启用状态。
 *
 * @param {object} config - guiNConfig.json 对象
 * @returns {boolean}
 */
export function getTunEnabled(config) {
  return config?.TunModeItem?.EnableTun === true;
}

/**
 * 检测 TUN 虚拟网卡（只读，无需管理员权限）。
 *
 * @returns {{ name: string, status: string, ip: string } | null}
 */
export function findTunAdapter() {
  try {
    const psScript = `
$ErrorActionPreference = 'Stop';
$adapter = Get-NetAdapter | Where-Object {
  $_.InterfaceDescription -like '*Wintun*'
} | Select-Object -First 1;
if (-not $adapter) {
  $adapter = Get-NetAdapter | Where-Object {
    $_.Name -like '*singbox_tun*' -or
    $_.Name -like '*xray_tun*' -or
    $_.Name -like '*v2ray_tun*'
  } | Select-Object -First 1;
}
if (-not $adapter) {
  $adapter = Get-NetAdapter | Where-Object {
    $_.Name -like '*tun*'
  } | Select-Object -First 1;
}
if ($adapter) {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $adapter.ifIndex -ErrorAction SilentlyContinue | Select-Object -First 1;
  Write-Output "$($adapter.Name)|$($adapter.Status)|$($ip.IPAddress)";
}
`.trim();
    const output = execSync(
      `powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8', timeout: 10000 }
    ).trim();
    if (!output) return null;
    const [name, status, ip] = output.split('|');
    return { name, status: status || 'Unknown', ip: ip || 'N/A' };
  } catch {
    return null;
  }
}

/**
 * 用 curl 测试网站连通性。
 *
 * @param {string} url - 测试 URL
 * @param {number} timeoutSec - 超时秒数
 * @returns {{ reachable: boolean, error?: string }}
 */
export function testConnectivity(url, timeoutSec = 5) {
  try {
    execSync(`curl -s --max-time ${timeoutSec} -o nul -w "%{http_code}" "${url}"`, {
      encoding: 'utf-8',
      timeout: (timeoutSec + 2) * 1000,
      stdio: 'pipe',
    });
    return { reachable: true };
  } catch (err) {
    return { reachable: false, error: err.message };
  }
}
