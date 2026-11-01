import { describe, expect, it } from 'vitest';
import { parseConsentRecord } from '../src/analyticsConsent';

const day = 24 * 60 * 60 * 1000;
const now = 1_800_000_000_000;

describe('saved analytics choice', () => {
  it('remembers an explicit choice but asks again after six months', () => {
    expect(parseConsentRecord(JSON.stringify({ choice: 'deny', decidedAt: now - 179 * day }), now)).toBe('deny');
    expect(parseConsentRecord(JSON.stringify({ choice: 'allow', decidedAt: now - 180 * day }), now)).toBeNull();
  });

  it('never treats malformed or future values as consent', () => {
    expect(parseConsentRecord('{', now)).toBeNull();
    expect(parseConsentRecord(JSON.stringify({ choice: 'allow', decidedAt: now + 1 }), now)).toBeNull();
    expect(parseConsentRecord(JSON.stringify({ choice: 'yes', decidedAt: now }), now)).toBeNull();
  });
});
