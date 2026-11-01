import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { filamentBrands, matchFilaments, paletteForFilaments } from '../src/filamentPicker';
import type { Catalog } from '../src/data';

const catalog = JSON.parse(readFileSync(new URL('../public/assets/catalog.json', import.meta.url), 'utf8')) as Catalog;

describe('filament picker', () => {
  it('has named, sourced colours for two PLA ranges per brand', () => {
    expect(filamentBrands.map(({ name }) => name)).toEqual(['Bambu Lab', 'SUNLU', 'eSUN']);
    for (const brand of filamentBrands) {
      expect(brand.ranges).toHaveLength(2);
      expect(brand.ranges.some(({ id }) => id === brand.defaultRangeId)).toBe(true);
      for (const range of brand.ranges) {
        expect(range.sourceUrl).toMatch(/^https:\/\//);
        expect(range.colours.length).toBeGreaterThan(10);
        expect(new Set(range.colours.map(({ name }) => name)).size).toBe(range.colours.length);
        expect(range.colours.every(({ hex }) => /^#[0-9A-F]{6}$/.test(hex))).toBe(true);
      }
    }
  });

  it.each(['trust-the-agent', 'stac'])('matches original three slots and their feature mapping for %s', (id) => {
    const design = catalog.designs.find((item) => item.id === id)!;
    const original = catalog.palettes[design.paletteIds[0]];
    const bambu = filamentBrands[0];
    const range = bambu.ranges[0];
    const selected = matchFilaments(original.filaments!.map(({ hex }) => hex), range);
    expect(selected.map(({ hex }) => hex)).toEqual(original.filaments!.map(({ hex }) => hex));
    const palette = paletteForFilaments(selected, design.slotRoleIndex, bambu, range);
    for (const role of ['base', 'rim', 'primary', 'accent'] as const) expect(palette[role]).toBe(selected[design.slotRoleIndex[role]].hex);
    expect(palette.filaments).toHaveLength(3);
  });

  it('suggests distinct colours in the selected range when changing manufacturer', () => {
    const range = filamentBrands[1].ranges[0];
    const matched = matchFilaments(['#FFFFFF', '#9D2235', '#FEC600'], range);
    expect(new Set(matched.map(({ name }) => name)).size).toBe(3);
    expect(matched.every((filament) => range.colours.includes(filament))).toBe(true);
  });
});
