import { useEffect, useState } from 'react';
import { parseHexColour, type Palette, type TripletSlot } from './data';

function ColourField({ slot, hex, onChange }: { slot: TripletSlot; hex: string; onChange: (slot: TripletSlot, hex: string) => void }) {
  const [draft, setDraft] = useState(hex);
  const [showError, setShowError] = useState(false);
  useEffect(() => { setDraft(hex); setShowError(false); }, [hex]);
  const valid = parseHexColour(draft);
  return <div className="manual-colour-row">
    <span>Colour {slot + 1}</span>
    <input type="color" aria-label={`Pick colour ${slot + 1}`} value={hex} onChange={(event) => onChange(slot, event.target.value.toUpperCase())} />
    <div className="manual-hex-wrap">
      <input type="text" aria-label={`Colour ${slot + 1} HEX value`} aria-invalid={showError && !valid} aria-describedby={showError && !valid ? `hex-error-${slot}` : undefined} value={draft} maxLength={7} autoComplete="off" spellCheck={false} onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        const normalized = parseHexColour(next);
        if (normalized) { onChange(slot, normalized); setShowError(false); }
      }} onBlur={() => setShowError(!parseHexColour(draft))} />
      {showError && !valid && <small id={`hex-error-${slot}`} role="alert">Enter a 3 or 6 digit HEX colour.</small>}
    </div>
  </div>;
}

export function ManualColourSelector({ palette, onChange }: { palette: Palette; onChange: (slot: TripletSlot, hex: string) => void }) {
  return <div className="manual-colours">
    {([0, 1, 2] as const).map((slot) => <ColourField key={slot} slot={slot} hex={palette.swatches![slot]} onChange={onChange} />)}
    <p>Use the colour picker or enter a HEX value.</p>
  </div>;
}
