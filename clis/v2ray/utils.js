import { execSync } from 'node:child_process';

/** 执行 PowerShell 命令，Base64 编码避免转义问题 */
function ps(cmd) {
  const enc = Buffer.from(cmd, 'utf16le').toString('base64');
  return execSync(`powershell -NoProfile -EncodedCommand ${enc}`, {
    encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

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

/** 启用 TUN 网卡 */
export function enableAdapter() {
  const name = findAdapter();
  if (!name) throw new Error('未找到 TUN 虚拟网卡。请确认 v2rayN 正在运行且 TUN 模式已配置');
  ps(`Enable-NetAdapter -Name '${name}' -Confirm:$false -ErrorAction Stop`);
}

/** 禁用 TUN 网卡 */
export function disableAdapter() {
  const name = findAdapter();
  if (!name) throw new Error('未找到 TUN 虚拟网卡');
  ps(`Disable-NetAdapter -Name '${name}' -Confirm:$false -ErrorAction Stop`);
}

/** 杀 sing-box（v2rayN 会自动重启它） */
export function restartSingbox() {
  ps("Stop-Process -Name 'sing-box' -Force -ErrorAction SilentlyContinue");
}

/** 检查 sing-box 是否在运行 */
export function singboxRunning() {
  try {
    execSync('tasklist /fi "IMAGENAME eq sing-box.exe" /nh 2>nul', {
      encoding: 'utf-8', timeout: 5000, stdio: 'pipe',
    });
    return true;
  } catch { return false; }
}

/** 网络连通性 */
export async function testNet(url, timeoutMs = 5000) {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    return res.ok;
  } catch { return false; }
}
