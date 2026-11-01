import { useState } from 'react';
import { filamentBrands, type Filament, type FilamentBrand, type FilamentRange, type FilamentTriplet } from './filamentPicker';
import { StyledSelect } from './StyledSelect';

interface Props {
  brand: FilamentBrand;
  range: FilamentRange;
  filaments: FilamentTriplet;
  onBrandChange: (brand: FilamentBrand) => void;
  onRangeChange: (range: FilamentRange) => void;
  onFilamentChange: (slot: 0 | 1 | 2, filament: Filament) => void;
}

export function FilamentSelector({ brand, range, filaments, onBrandChange, onRangeChange, onFilamentChange }: Props) {
  const [activeSlot, setActiveSlot] = useState<0 | 1 | 2>(0);
  const [query, setQuery] = useState('');
  const visible = range.colours.filter(({ name }) => name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <div className="filament-selector">
    <div className="filament-selects">
      <StyledSelect label="Brand" value={brand.id} options={filamentBrands.map(({ id, name }) => ({ value: id, label: name }))} onChange={(id) => {
        const next = filamentBrands.find((item) => item.id === id);
        if (next) { onBrandChange(next); setQuery(''); }
      }} />
      <StyledSelect label="PLA range" value={range.id} options={brand.ranges.map(({ id, name }) => ({ value: id, label: name }))} onChange={(id) => {
        const next = brand.ranges.find((item) => item.id === id);
        if (next) { onRangeChange(next); setQuery(''); }
      }} />
    </div>
    <p className="filament-instruction">Your three filaments <span>Click a slot to change it</span></p>
    <div className="filament-slots" role="group" aria-label="Selected filaments">
      {filaments.map((filament, index) => <button key={index} type="button" className={`filament-slot ${activeSlot === index ? 'is-active' : ''}`} aria-pressed={activeSlot === index} onClick={() => { setActiveSlot(index as 0 | 1 | 2); setQuery(''); }}>
        <i aria-hidden="true" style={{ background: filament.hex }} />
        <span><small>Filament {index + 1}</small><strong>{filament.name}</strong></span>
      </button>)}
    </div>
    <label className="filament-search">Choose a colour for filament {activeSlot + 1}<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${range.name} colours`} /></label>
    <div className="filament-colours" role="group" aria-label={`${range.name} colours`}>
      {visible.map((filament) => <button key={filament.name} type="button" className={`filament-colour ${filaments[activeSlot].name === filament.name ? 'is-selected' : ''}`} aria-pressed={filaments[activeSlot].name === filament.name} onClick={() => onFilamentChange(activeSlot, filament)}>
        <i aria-hidden="true" style={{ background: filament.hex }} /><span>{filament.name}</span>
      </button>)}
      {visible.length === 0 && <p className="filament-empty">No colours match “{query}”.</p>}
    </div>
  </div>;
}
