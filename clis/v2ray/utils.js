import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const API = 'http://127.0.0.1:10814';
const DIR = join(homedir(), '.opencli', 'v2ray');
const DETECT_PS1 = join(DIR, 'detect.ps1');

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

/** 调用 Clash API（用 fetch，无外部依赖） */
async function clashAPI(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(`${API}${endpoint}`, opts);
    return await res.json();
  } catch { return null; }
}

export async function getMode() {
  const data = await clashAPI('/configs');
  return data?.mode || null;
}

export async function setMode(mode) {
  await clashAPI('/configs', 'PATCH', { mode });
}

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

export async function testNet(url, timeoutMs = 5000) {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), timeoutMs);
    await fetch(url, { signal: ctrl.signal });
    return { reachable: true };
  } catch { return { reachable: false }; }
}
