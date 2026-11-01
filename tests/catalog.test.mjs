import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const assets = new URL('../public/assets/', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('catalog.json', assets), 'utf8'));

describe('published maker catalogue', () => {
  it('has one complete, distinct file set for each design and palette', () => {
    expect(catalog.designs.find((design) => design.id === 'stac')?.paletteIds).toEqual([
      'stac-white-blue-gold', 'stac-gold-purple-orange', 'stac-white-maroon-yellow', 'stac-blue-gold-white',
    ]);
    expect(existsSync(new URL('../public/hero-image.png', import.meta.url))).toBe(true);
    const stems = new Set();
    for (const design of catalog.designs) for (const paletteId of design.paletteIds) {
      expect(catalog.palettes[paletteId]).toBeTruthy();
      const stem = `${design.id}-${paletteId}`;
      expect(stems.has(stem)).toBe(false);
      stems.add(stem);
      for (const extension of ['face.json', 'glb', '3mf']) {
        expect(existsSync(new URL(`${stem}.${extension}`, assets))).toBe(true);
      }
      const face = JSON.parse(readFileSync(new URL(`${stem}.face.json`, assets), 'utf8'));
      expect(face.parts.length).toBeGreaterThan(0);
      expect(existsSync(new URL(`${stem}.tag.json`, assets))).toBe(false);
      expect(readFileSync(new URL(`${stem}.glb`, assets)).subarray(0, 4).toString()).toBe('glTF');
      expect(readFileSync(new URL(`${stem}.3mf`, assets)).subarray(0, 2).toString()).toBe('PK');
    }
    for (const design of catalog.designs) expect(existsSync(new URL(`${design.id}.stl`, assets))).toBe(true);
    expect(stems.size).toBe(catalog.designs.reduce((count, design) => count + design.paletteIds.length, 0));
  });
});
