export interface Palette {
  name: string;
  base: string;
  rim: string;
  primary: string;
  accent: string;
  swatches?: string[];
  filaments?: { name: string; hex: string }[];
}

export type ColorId = 'base' | 'rim' | 'primary' | 'accent';
export const colorIds: ColorId[] = ['base', 'rim', 'primary', 'accent'];
export type TripletSlot = 0 | 1 | 2;
export type SlotRoleIndex = Record<ColorId, TripletSlot>;

/** The visible triplet follows the preset swatch positions, not mesh part names. */
function tripletPalette(swatches: string[], roles: SlotRoleIndex): Palette {
  if (swatches.length !== 3) throw new Error('A custom palette needs three colours.');
  return { name: 'Custom', base: swatches[roles.base], rim: swatches[roles.rim], primary: swatches[roles.primary], accent: swatches[roles.accent], swatches };
}

export function customTriplet(palette: Palette, roles: SlotRoleIndex): Palette {
  const swatches = palette.filaments?.map(({ hex }) => hex) ?? [palette.base, palette.rim, palette.accent];
  return tripletPalette(swatches, roles);
}

export function withTripletColor(palette: Palette, slot: TripletSlot, hex: string, roles: SlotRoleIndex): Palette {
  const swatches = [...(palette.swatches ?? [])];
  swatches[slot] = hex;
  return tripletPalette(swatches, roles);
}

export interface DesignInfo {
  id: string;
  title: string;
  description: string;
  paletteIds: string[];
  templatePaletteId: string;
  slotRoleIndex: SlotRoleIndex;
  meshColorIds: ColorId[];
}

export interface Catalog {
  palettes: Record<string, Palette>;
  designs: DesignInfo[];
}

export interface FaceData {
  base: string;
  frame: string | null;
  styleParts: { id: string; path: string; colorId: ColorId }[];
  parts: { id: string; path: string; colorId: ColorId }[];
  backParts: { id: string; path: string; colorId: ColorId }[];
}

export const assetUrl = (file: string) => `${import.meta.env.BASE_URL}assets/${file}`;
export const assetStem = (designId: string, paletteId: string) => `${designId}-${paletteId}`;

export function paletteEntries(catalog: Catalog, design: DesignInfo): [string, Palette][] {
  return design.paletteIds.map((id) => [id, catalog.palettes[id]]);
}
