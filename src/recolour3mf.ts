import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { colorIds, type Palette } from './data';
import type { FilamentTriplet } from './filamentPicker';

const modelPath = '3D/3dmodel.model';

export interface FilamentSelection {
  brand: string;
  range: string;
  filaments: FilamentTriplet;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Change 3MF material colours and references; keep every solid and mesh intact. */
export function recolour3mf(template: Uint8Array, source: Palette, target: Palette, selection?: FilamentSelection): Uint8Array {
  const files = unzipSync(template);
  const model = files[modelPath];
  if (!model) throw new Error('The 3MF has no model data.');

  const replacements = new Map<string, string>();
  for (const id of colorIds) {
    const oldColor = `${source[id].toUpperCase()}FF`;
    const newColor = `${target[id].toUpperCase()}FF`;
    if (replacements.has(oldColor) && replacements.get(oldColor) !== newColor) {
      throw new Error('One source colour cannot map to two custom colours.');
    }
    replacements.set(oldColor, newColor);
  }

  const seen = new Set<string>();
  let xml = strFromU8(model).replace(/\bcolor="(#[0-9A-Fa-f]{8})"/g, (_match, color: string) => {
    const key = color.toUpperCase();
    const replacement = replacements.get(key);
    if (!replacement) throw new Error(`Unexpected 3MF colour: ${color}`);
    seen.add(key);
    return `color="${replacement}"`;
  });
  if (seen.size !== replacements.size) throw new Error('The 3MF colour regions are incomplete.');

  // A triplet can map two source artwork regions to one colour. Remove the
  // duplicate material entry and update object/triangle property indices.
  const group = xml.match(/<m:colorgroup\b[^>]*>([\s\S]*?)<\/m:colorgroup>/);
  if (!group) throw new Error('The 3MF has no colour group.');
  const colorTag = /<m:color\b[^>]*\bcolor="(#[0-9A-Fa-f]{8})"[^>]*\/>/g;
  const entries = [...group[1].matchAll(colorTag)].map((match) => match[1].toUpperCase());
  if (entries.length === 0 || group[1].replace(colorTag, '').trim()) throw new Error('The 3MF colour group is unsupported.');
  const unique = [...new Set(entries)];
  if (unique.length < entries.length) {
    const indices = entries.map((color) => unique.indexOf(color));
    xml = xml.replace(group[0], group[0].replace(group[1], unique.map((color) => `<m:color color="${color}" />`).join('')));
    xml = xml.replace(/\b(pindex|p[123])="(\d+)"/g, (_match, key: string, index: string) => {
      const next = indices[Number(index)];
      if (next === undefined) throw new Error('The 3MF uses an unknown colour index.');
      return `${key}="${next}"`;
    });
  }
  if (selection) {
    const description = `Filament colour guide: ${selection.brand} ${selection.range}; ${selection.filaments.map((filament, index) => `${index + 1}. ${filament.name} (${filament.hex})`).join('; ')}. Confirm filament profiles and AMS mapping in the slicer.`;
    if (!xml.includes('<resources>')) throw new Error('The 3MF model has no resources element.');
    xml = xml.replace('<resources>', `<metadata name="Description">${escapeXml(description)}</metadata><resources>`);
  }
  files[modelPath] = strToU8(xml);
  return zipSync(files, { level: 6 });
}
