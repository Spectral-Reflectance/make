import catalogue from './filaments.json';
import type { Palette, SlotRoleIndex } from './data';

export interface Filament { name: string; hex: string }
export type FilamentTriplet = [Filament, Filament, Filament];
export interface FilamentRange { id: string; name: string; sourceUrl: string; colours: Filament[] }
export interface FilamentBrand { id: string; name: string; defaultRangeId: string; ranges: FilamentRange[] }

export const catalogueReviewed = catalogue.reviewed;
export const filamentBrands: FilamentBrand[] = catalogue.brands.map((brand) => ({
  id: brand.id,
  name: brand.name,
  defaultRangeId: brand.defaultRangeId,
  ranges: brand.ranges.map((range) => ({
    id: range.id,
    name: range.name,
    sourceUrl: range.sourceUrl,
    colours: range.colours.map(([name, hex]) => ({ name, hex: hex.toUpperCase() })),
  })),
}));

function lab(hex: string): [number, number, number] {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;
  const curve = (value: number) => value > 0.008856 ? Math.cbrt(value) : (7.787 * value + 16 / 116);
  const [fx, fy, fz] = [x, y, z].map(curve);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Suggest the nearest distinct published swatches, preserving slot order. */
export function matchFilaments(targets: readonly string[], range: FilamentRange): FilamentTriplet {
  if (targets.length !== 3 || range.colours.length < 3) throw new Error('Three target colours and three filament colours are required.');
  const used = new Set<number>();
  return targets.map((target) => {
    const reference = lab(target);
    let bestIndex = -1;
    let bestDistance = Infinity;
    range.colours.forEach((candidate, index) => {
      if (used.has(index)) return;
      const colour = lab(candidate.hex);
      const distance = colour.reduce((sum, coordinate, axis) => sum + (coordinate - reference[axis]) ** 2, 0);
      if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
    });
    used.add(bestIndex);
    return range.colours[bestIndex];
  }) as FilamentTriplet;
}

export function paletteForFilaments(filaments: FilamentTriplet, roles: SlotRoleIndex, brand: FilamentBrand, range: FilamentRange): Palette {
  const hexes = filaments.map(({ hex }) => hex);
  return {
    name: `${brand.name} · ${range.name}`,
    base: hexes[roles.base],
    rim: hexes[roles.rim],
    primary: hexes[roles.primary],
    accent: hexes[roles.accent],
    filaments,
  };
}
