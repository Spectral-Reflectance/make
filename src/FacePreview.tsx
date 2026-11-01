import { useEffect, useState } from 'react';
import { assetStem, assetUrl, type FaceData, type Palette } from './data';

const cache = new Map<string, FaceData>();

export function useFace(designId: string, paletteId: string) {
  const stem = assetStem(designId, paletteId);
  const [state, setState] = useState<{ stem: string; face: FaceData | null; error: string | null }>(() => ({
    stem, face: cache.get(stem) ?? null, error: null,
  }));
  useEffect(() => {
    let active = true;
    if (cache.has(stem)) return;
    fetch(assetUrl(`${stem}.face.json`))
      .then((response) => {
        if (!response.ok) throw new Error('Preview artwork could not be loaded.');
        return response.json() as Promise<FaceData>;
      })
      .then((face) => { cache.set(stem, face); if (active) setState({ stem, face, error: null }); })
      .catch((error: unknown) => { if (active) setState({ stem, face: null, error: error instanceof Error ? error.message : 'Preview unavailable.' }); });
    return () => { active = false; };
  }, [stem]);
  if (state.stem !== stem) return { face: cache.get(stem) ?? null, error: null };
  return { face: state.face, error: state.error };
}

export function FacePreview({ designId, paletteId, palette, side = 'front', className = '' }: {
  designId: string;
  paletteId: string;
  palette: Palette;
  side?: 'front' | 'back';
  className?: string;
}) {
  const { face, error } = useFace(designId, paletteId);
  if (error) return <div className={`tag-face tag-face-status ${className}`} role="status">{error}</div>;
  if (!face) return <div className={`tag-face tag-face-status ${className}`} role="status">Loading design…</div>;
  return (
    <svg className={`tag-face ${className}`} viewBox="-32 -52 64 104" role="img" aria-label={`${designId === 'stac' ? 'STAC' : 'Trust the Agent'} tag, ${side} 2D view`}>
      <g transform={side === 'back' ? 'scale(-1,-1)' : 'scale(1,-1)'}>
        <path d={face.base} fill={palette.base} fillRule="evenodd" />
        {face.frame && <path d={face.frame} fill={palette.rim} fillRule="evenodd" />}
        {side === 'front' && face.styleParts.map((part) => <path key={part.id} d={part.path} fill={palette[part.colorId]} fillRule="evenodd" />)}
        {(side === 'front' ? face.parts : face.backParts).map((part, index) => <path key={`${part.id}-${index}`} d={part.path} fill={palette[part.colorId]} fillRule="evenodd" />)}
      </g>
    </svg>
  );
}
