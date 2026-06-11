import { execSync } from 'node:child_process';

// ====== PowerShell 执行器 ======

/** 执行 PowerShell 命令，Base64 编码避免转义问题 */
function ps(cmd) {
  const wrapped = `$ProgressPreference='SilentlyContinue';${cmd}`;
  const enc = Buffer.from(wrapped, 'utf16le').toString('base64');
  return execSync(`powershell -NoProfile -EncodedCommand ${enc}`, {
    encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

// ====== sing-box Clash API ======

const CLASH_API = 'http://127.0.0.1:10814';

/** 通过 sing-box Clash API 获取当前路由模式 */
export async function getMode() {
  try {
    const res = await fetch(`${CLASH_API}/configs`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data.mode || null; // "Rule", "Direct", "Global"
  } catch { return null; }
}

/** 通过 sing-box Clash API 切换路由模式 */
export async function setMode(mode) {
  // mode: "Rule" (走代理规则) | "Direct" (全部直连) | "Global" (全局代理)
  const res = await fetch(`${CLASH_API}/configs`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
}

// ====== v2rayN 进程 ======

/** 检查 v2rayN 进程是否在运行 */
export function isV2rayNRunning() {
  try {
    execSync('tasklist /fi "IMAGENAME eq v2rayN.exe" /nh 2>nul', {
      encoding: 'utf-8', timeout: 5000, stdio: 'pipe',
    });
    return true;
  } catch { return false; }
}

// ====== 网卡状态（诊断用）======

/** 动态检测 TUN 网卡名 */
export function findAdapter() {
  try {
    const name = ps(`
$adapter = Get-NetAdapter | Where-Object { $_.InterfaceDescription -like '*Wintun*' } | Select-Object -First 1
if (-not $adapter) { $adapter = Get-NetAdapter | Where-Object { $_.Name -like '*singbox_tun*' -or $_.Name -like '*xray_tun*' -or $_.Name -like '*v2ray_tun*' } | Select-Object -First 1 }
if (-not $adapter) { $adapter = Get-NetAdapter | Where-Object { $_.Name -like '*tun*' } | Select-Object -First 1 }
if ($adapter) { Write-Output $adapter.Name }
`);
    return name || null;
  } catch { return null; }
}

/** 获取网卡详细状态 */
export function adapterStatus() {
  try {
    const name = findAdapter();
    if (!name) return null;
    const status = ps(`(Get-NetAdapter -Name '${name}' -ErrorAction Stop).Status`);
    const ip = ps(`
$ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias '${name}' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ip) { Write-Output $ip.IPAddress }
`);
    return { name, status, ip: ip || 'N/A' };
  } catch { return null; }
}

// ====== sing-box 进程 ======

/** 检查 sing-box 是否在运行 */
export function singboxRunning() {
  try {
    execSync('tasklist /fi "IMAGENAME eq sing-box.exe" /nh 2>nul', {
      encoding: 'utf-8', timeout: 5000, stdio: 'pipe',
    });
    return true;
  } catch { return false; }
}

// ====== 网络连通性 ======

/** 测试 HTTPS 连通性 */
export async function testNet(url, timeoutMs = 5000) {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    return res.ok;
  } catch { return false; }
}
