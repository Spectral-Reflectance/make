import { describe, expect, it } from 'vitest';
import { parseHexColour } from '../src/data';

describe('manual colour entry', () => {
  it('accepts common HEX forms and normalizes them for previews and export', () => {
    expect(parseHexColour('#9c1232')).toBe('#9C1232');
    expect(parseHexColour('ffc400')).toBe('#FFC400');
    expect(parseHexColour('#abc')).toBe('#AABBCC');
  });

  it('does not apply incomplete or malformed values', () => {
    expect(parseHexColour('#9C12')).toBeNull();
    expect(parseHexColour('#GGGGGG')).toBeNull();
  });
});
