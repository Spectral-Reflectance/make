import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { recolour3mf } from '../src/recolour3mf';
import { customTriplet, withTripletColor, type Catalog, type Palette } from '../src/data';
import { filamentBrands, matchFilaments, paletteForFilaments } from '../src/filamentPicker';

const assets = new URL('../public/assets/', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('catalog.json', assets), 'utf8')) as Catalog;

describe('custom 3MF colours', () => {
  it.each(['trust-the-agent'])('changes only material swatches for %s', (designId) => {
    const paletteId = catalog.designs.find((design) => design.id === designId)?.templatePaletteId;
    if (!paletteId) throw new Error(`Missing palette for ${designId}`);
    const original = new Uint8Array(readFileSync(new URL(`${designId}-${paletteId}.3mf`, assets)));
    const custom: Palette = {
      name: 'Custom', base: '#123456', rim: '#654321', primary: '#ABCDEF', accent: '#FEDCBA',
    };
    const updated = recolour3mf(original, catalog.palettes[paletteId], custom);
    const before = unzipSync(original);
    const after = unzipSync(updated);
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
    const modelPath = '3D/3dmodel.model';
    for (const path of Object.keys(before)) if (path !== modelPath) expect(after[path]).toEqual(before[path]);
    const beforeXml = strFromU8(before[modelPath]);
    const afterXml = strFromU8(after[modelPath]);
    expect(afterXml.replace(/color="#[0-9A-F]{8}"/g, 'color="SWATCH"'))
      .toBe(beforeXml.replace(/color="#[0-9A-F]{8}"/g, 'color="SWATCH"'));
    for (const color of [custom.base, custom.rim, custom.primary, custom.accent]) {
      expect(afterXml).toContain(`color="${color}FF"`);
    }
  });

  it('rejects incomplete or unexpected colour regions', () => {
    const original = new Uint8Array(readFileSync(new URL('trust-the-agent-trust-original.3mf', assets)));
    const wrongSource = { ...catalog.palettes['trust-original'], accent: '#111111' };
    expect(() => recolour3mf(original, wrongSource, catalog.palettes['white-blue-gold'])).toThrow('Unexpected 3MF colour');
  });

  it('exports a three-colour Trust custom download without a duplicate fourth material', () => {
    const original = new Uint8Array(readFileSync(new URL('trust-the-agent-trust-original.3mf', assets)));
    const roles = catalog.designs.find((design) => design.id === 'trust-the-agent')?.slotRoleIndex;
    if (!roles) throw new Error('Missing Trust colour slots');
    const triplet = customTriplet(catalog.palettes['white-maroon-yellow'], roles);
    const custom = withTripletColor(withTripletColor(triplet, 1, '#0A2989', roles), 2, '#E4BD68', roles);
    expect(custom.swatches).toEqual(['#FFFFFF', '#0A2989', '#E4BD68']);
    expect(custom.primary).toBe(custom.accent);
    const updated = recolour3mf(original, catalog.palettes['trust-original'], custom);
    const model = strFromU8(unzipSync(updated)['3D/3dmodel.model']);
    expect([...model.matchAll(/<m:color color="(#[0-9A-F]{8})"/g)].map((match) => match[1]))
      .toEqual(['#FFFFFFFF', '#0A2989FF', '#E4BD68FF']);
    expect([...model.matchAll(/\b(?:pindex|p[123])="(\d+)"/g)].every((match) => Number(match[1]) < 3)).toBe(true);
    const beforeVertices = strFromU8(unzipSync(original)['3D/3dmodel.model']).match(/<vertices>.*?<\/vertices>/g);
    expect(model.match(/<vertices>.*?<\/vertices>/g)).toEqual(beforeVertices);
  });

  it('keeps STAC custom colours to three material entries too', () => {
    const original = new Uint8Array(readFileSync(new URL('stac-stac-white-blue-gold.3mf', assets)));
    const roles = catalog.designs.find((design) => design.id === 'stac')?.slotRoleIndex;
    if (!roles) throw new Error('Missing STAC colour slots');
    const triplet = customTriplet(catalog.palettes['stac-white-blue-gold'], roles);
    expect(triplet.swatches).toHaveLength(3);
    expect(triplet.primary).toBe(triplet.rim);
    const custom = withTripletColor(triplet, 1, '#123456', roles);
    const model = strFromU8(unzipSync(recolour3mf(original, catalog.palettes['stac-white-blue-gold'], custom))['3D/3dmodel.model']);
    expect([...model.matchAll(/<m:color color="/g)]).toHaveLength(3);
    expect(model).toContain('color="#123456FF"');
  });

  it('embeds three selected filament names without changing tag geometry', () => {
    const design = catalog.designs.find(({ id }) => id === 'trust-the-agent')!;
    const brand = filamentBrands[0];
    const range = brand.ranges[0];
    const filaments = matchFilaments(['#FFFFFF', '#0A2989', '#E4BD68'], range);
    const palette = paletteForFilaments(filaments, design.slotRoleIndex, brand, range);
    const original = new Uint8Array(readFileSync(new URL('trust-the-agent-trust-original.3mf', assets)));
    const beforeXml = strFromU8(unzipSync(original)['3D/3dmodel.model']);
    const afterXml = strFromU8(unzipSync(recolour3mf(original, catalog.palettes[design.templatePaletteId], palette, {
      brand: brand.name, range: range.name, filaments,
    }))['3D/3dmodel.model']);
    expect(afterXml).toContain('<metadata name="Description">Filament colour guide: Bambu Lab PLA Basic; 1. Jade White (#FFFFFF); 2. Blue (#0A2989); 3. Gold (#E4BD68)');
    expect(afterXml.match(/<vertices>.*?<\/vertices>/g)).toEqual(beforeXml.match(/<vertices>.*?<\/vertices>/g));
    expect([...afterXml.matchAll(/<m:color color="/g)]).toHaveLength(3);
  });
});
