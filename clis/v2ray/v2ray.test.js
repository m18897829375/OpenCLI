import { describe, it, expect } from 'vitest';
import { isV2rayNRunning, getMode, setMode, findAdapter, adapterStatus, singboxRunning } from './utils.js';

describe('v2ray utils — Clash API mode', () => {
  it('isV2rayNRunning returns boolean', () => {
    const result = isV2rayNRunning();
    expect(typeof result).toBe('boolean');
  });

  it('getMode returns string when v2rayN is running', async () => {
    if (isV2rayNRunning()) {
      const mode = await getMode();
      expect(['Rule', 'Direct', 'Global']).toContain(mode);
    }
  });

  it('setMode switches between Rule and Direct', async () => {
    if (!isV2rayNRunning()) return;
    const before = await getMode();
    if (!before) return;

    // Switch to opposite mode
    const target = before === 'Rule' ? 'Direct' : 'Rule';
    await setMode(target);
    const after = await getMode();
    expect(after).toBe(target);

    // Restore original
    await setMode(before);
  }, 15000);

  it('findAdapter returns string or null', () => {
    const ad = findAdapter();
    if (ad !== null) expect(typeof ad).toBe('string');
  });

  it('adapterStatus returns object or null', () => {
    const status = adapterStatus();
    if (status !== null) {
      expect(status).toHaveProperty('name');
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('ip');
    }
  });

  it('singboxRunning returns boolean', () => {
    const result = singboxRunning();
    expect(typeof result).toBe('boolean');
  });
});
