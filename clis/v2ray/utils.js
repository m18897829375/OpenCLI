import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const API = 'http://127.0.0.1:10814';
const DIR = join(homedir(), '.opencli', 'v2ray');
const DETECT_PS1 = join(DIR, 'detect.ps1');

// 确保检测脚本存在
function ensureDetectScript() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  if (!existsSync(DETECT_PS1)) {
    writeFileSync(DETECT_PS1, `
$adapter = Get-NetAdapter | Where-Object { $_.InterfaceDescription -like '*Wintun*' } | Select-Object -First 1
if (-not $adapter) { $adapter = Get-NetAdapter | Where-Object { $_.Name -like '*singbox_tun*' -or $_.Name -like '*xray_tun*' -or $_.Name -like '*v2ray_tun*' } | Select-Object -First 1 }
if (-not $adapter) { $adapter = Get-NetAdapter | Where-Object { $_.Name -like '*tun*' } | Select-Object -First 1 }
if ($adapter) { Write-Output "$($adapter.Name)|$($adapter.Status)" }
`.trim(), 'utf-8');
  }
}

/** 调用 Clash API */
function clashAPI(endpoint, method = 'GET', body = null) {
  const url = `${API}${endpoint}`;
  let cmd;
  if (body) {
    const json = JSON.stringify(body).replace(/"/g, '\\"');
    cmd = `curl -s -X ${method} "${url}" -H "Content-Type: application/json" -d "${json}"`;
  } else {
    cmd = `curl -s -X ${method} "${url}"`;
  }
  const out = execSync(cmd, {
    encoding: 'utf-8', timeout: 10000, stdio: 'pipe',
  }).trim();
  try { return JSON.parse(out); } catch { return null; }
}

/** 获取当前路由模式 */
export function getMode() {
  const data = clashAPI('/configs');
  return data?.mode || null;
}

/** 设置路由模式 */
export function setMode(mode) {
  clashAPI('/configs', 'PATCH', { mode });
}

/** 检测 TUN 网卡 */
export function detectAdapter() {
  try {
    ensureDetectScript();
    const out = execSync(`powershell -NoProfile -File "${DETECT_PS1}"`, {
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
  } catch { return { reachable: false }; }
}
