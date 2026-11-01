import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { FacePreview } from './FacePreview';
import { FilamentSelector } from './FilamentSelector';
import { filamentBrands, matchFilaments, paletteForFilaments, type Filament, type FilamentTriplet, type FilamentBrand, type FilamentRange } from './filamentPicker';
import { assetStem, assetUrl, paletteEntries, type Catalog, type DesignInfo, type Palette } from './data';

const ModelPreview = lazy(async () => ({ default: (await import('./ModelPreview')).ModelPreview }));

class PreviewErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div className="preview-loading" role="alert">3D preview unavailable. Try the 2D view or download the files.</div>
      : this.props.children;
  }
}

function Swatches({ palette }: { palette: Palette }) {
  const colors = palette.filaments?.map((filament) => filament.hex) ?? palette.swatches ?? [...new Set([palette.rim, palette.accent, palette.base, palette.primary])];
  return <span className="swatches" aria-hidden="true">{colors.map((color, index) => <i key={`${color}-${index}`} style={{ background: color }} />)}</span>;
}

function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-image">
        <img src={`${import.meta.env.BASE_URL}hero-image.png`} alt="Printed Spectral Reflectance bag tags and holders on a wooden table" />
      </div>
      <div className="hero-copy">
        <h1 id="hero-title">3D prints<br />for the EO community</h1>
        <p>Choose a bag tag design, try a colour palette or pick your own filaments, and download the files to print it.</p>
        <div className="hero-actions">
          <a className="button button-primary" href="#maker">Start making</a>
          <a className="button button-outline" href="#examples">See printed examples</a>
        </div>
      </div>
    </section>
  );
}

function DesignChoice({ design, selected, palette, onSelect }: { design: DesignInfo; selected: boolean; palette: Palette; onSelect: () => void }) {
  return (
    <button className={`design-choice ${selected ? 'is-selected' : ''}`} type="button" onClick={onSelect} aria-pressed={selected}>
      <span className="choice-marker" aria-hidden="true" />
      <span className="design-choice-art"><FacePreview designId={design.id} paletteId={design.paletteIds[0]} palette={palette} /></span>
      <span className="design-choice-title">{design.title}</span>
    </button>
  );
}

function Maker({ catalog, designId, setDesignId }: { catalog: Catalog; designId: string; setDesignId: (id: string) => void }) {
  const initialDesign = catalog.designs.find(({ id }) => id === designId) ?? catalog.designs[0];
  const [paletteId, setPaletteId] = useState(initialDesign.paletteIds[0]);
  const [brand, setBrand] = useState<FilamentBrand>(filamentBrands[0]);
  const [range, setRange] = useState<FilamentRange>(filamentBrands[0].ranges[0]);
  const [filaments, setFilaments] = useState<FilamentTriplet>(() => matchFilaments(catalog.palettes[initialDesign.paletteIds[0]].filaments!.map(({ hex }) => hex), filamentBrands[0].ranges[0]));
  const [view, setView] = useState<'2d' | '3d' | 'plate'>('3d');
  const [faceSide, setFaceSide] = useState<'front' | 'back'>('front');
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const printDialogRef = useRef<HTMLDialogElement>(null);
  const design = catalog.designs.find(({ id }) => id === designId) ?? catalog.designs[0];
  const isCustom = paletteId === 'custom';
  const selectedPaletteId = design.paletteIds.includes(paletteId) ? paletteId : design.paletteIds[0];
  const customPalette = paletteForFilaments(filaments, design.slotRoleIndex, brand, range);
  const palette = isCustom ? customPalette : catalog.palettes[selectedPaletteId];
  const stem = assetStem(design.id, isCustom ? design.templatePaletteId : selectedPaletteId);
  const selectDesign = (next: DesignInfo) => {
    setDesignId(next.id);
    setPaletteId(next.paletteIds[0]);
    setFilaments(matchFilaments(catalog.palettes[next.paletteIds[0]].filaments!.map(({ hex }) => hex), range));
  };
  const selectPreset = (id: string, preset: Palette) => {
    setPaletteId(id);
    setFilaments(matchFilaments(preset.filaments!.map(({ hex }) => hex), range));
    setDownloadError(null);
  };
  const selectCustom = () => {
    if (!isCustom) setFilaments(matchFilaments(catalog.palettes[selectedPaletteId].filaments!.map(({ hex }) => hex), range));
    setPaletteId('custom');
    setDownloadError(null);
  };
  const changeBrand = (next: FilamentBrand) => {
    const nextRange = next.ranges.find(({ id }) => id === next.defaultRangeId) ?? next.ranges[0];
    setFilaments(matchFilaments(filaments.map(({ hex }) => hex), nextRange));
    setBrand(next);
    setRange(nextRange);
  };
  const changeRange = (next: FilamentRange) => {
    setFilaments(matchFilaments(filaments.map(({ hex }) => hex), next));
    setRange(next);
  };
  const changeFilament = (slot: 0 | 1 | 2, filament: Filament) => setFilaments((current) => current.map((item, index) => index === slot ? filament : item) as FilamentTriplet);
  const download3mf = async () => {
    setDownloadBusy(true);
    setDownloadError(null);
    try {
      const response = await fetch(assetUrl(`${stem}.3mf`));
      if (!response.ok) throw new Error('The 3MF template could not be loaded.');
      const { recolour3mf } = await import('./recolour3mf');
      const bytes = recolour3mf(new Uint8Array(await response.arrayBuffer()), catalog.palettes[design.templatePaletteId], customPalette, { brand: brand.name, range: range.name, filaments });
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'model/3mf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${design.id}-${brand.id}-${range.id}.3mf`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setDownloadError(reason instanceof Error ? reason.message : 'The 3MF could not be prepared.');
    } finally {
      setDownloadBusy(false);
    }
  };
  return (
    <section className="maker-section" id="maker" aria-labelledby="maker-title">
      <div className="section-heading maker-heading">
        <div><h2 id="maker-title">Make your own</h2><p>Choose a design, select a palette or your own filaments, preview the tag and download the files.</p></div>
      </div>
      <div className="maker-grid">
        <div className="maker-panel maker-controls">
          <div className="control-group maker-designs">
            <div className="panel-heading"><h3>1. Choose a design</h3></div>
            <div className="design-options">{catalog.designs.map((item) => <DesignChoice key={item.id} design={item} selected={item.id === design.id} palette={catalog.palettes[item.paletteIds[0]]} onSelect={() => selectDesign(item)} />)}</div>
          </div>
          <div className="control-group maker-palettes">
            <div className="panel-heading"><h3>2. Select colours</h3></div>
            <div className="palette-options" role="radiogroup" aria-label="Colour palette">
              {paletteEntries(catalog, design).map(([id, item]) => <label className={`palette-option ${paletteId === id ? 'is-selected' : ''}`} key={id}>
                <input type="radio" name="palette" value={id} checked={paletteId === id} onChange={() => selectPreset(id, item)} />
                <span>{item.name}</span><Swatches palette={item} />
              </label>)}
              <label className={`palette-option ${isCustom ? 'is-selected' : ''}`}>
                <input type="radio" name="palette" value="custom" checked={isCustom} onChange={selectCustom} />
                <span>Choose filaments by brand</span><Swatches palette={customPalette} />
              </label>
            </div>
            {isCustom && <div className="filament-custom-panel"><FilamentSelector brand={brand} range={range} filaments={filaments} onBrandChange={changeBrand} onRangeChange={changeRange} onFilamentChange={changeFilament} /></div>}
            <p className="panel-note">Colours are approximate. Check your filaments in the slicer before printing.</p>
          </div>
        </div>
        <div className="maker-panel maker-preview">
          <div className="panel-heading"><h3>3. Preview</h3></div>
          <div className="view-tabs" role="tablist" aria-label="Preview view">
            <button type="button" role="tab" aria-selected={view === '3d'} className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}>3D view</button>
            <button type="button" role="tab" aria-selected={view === 'plate'} className={view === 'plate' ? 'active' : ''} onClick={() => setView('plate')}>On plate</button>
            <button type="button" role="tab" aria-selected={view === '2d'} className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')}>2D view</button>
          </div>
          <div className="preview-window" role="tabpanel">{view !== '2d' ? <PreviewErrorBoundary key={design.id}><Suspense fallback={<div className="preview-loading" role="status">Loading 3D viewer…</div>}><ModelPreview designId={design.id} paletteId={design.templatePaletteId} palette={palette} meshColorIds={design.meshColorIds} onPlate={view === 'plate'} /></Suspense></PreviewErrorBoundary> : <div className="flat-preview">
            <div className="face-side-switch" role="group" aria-label="2D view side"><button type="button" className={faceSide === 'front' ? 'is-selected' : ''} aria-pressed={faceSide === 'front'} onClick={() => setFaceSide('front')}>Front</button><button type="button" className={faceSide === 'back' ? 'is-selected' : ''} aria-pressed={faceSide === 'back'} onClick={() => setFaceSide('back')}>Back</button></div>
            <FacePreview designId={design.id} paletteId={isCustom ? design.templatePaletteId : selectedPaletteId} palette={palette} side={faceSide} />
          </div>}</div>
        </div>
        <div className="maker-panel maker-download">
          <div className="panel-heading"><h3>4. Download</h3></div>
          <div className="file-summary"><strong>{design.title}</strong><span>{isCustom ? `${brand.name} · ${range.name}` : `${palette.name} palette`}</span><Swatches palette={palette} /></div>
          {isCustom
            ? <button className="button button-primary download-button" type="button" disabled={downloadBusy} onClick={download3mf}><span className="download-arrow" aria-hidden="true">↓</span><span>{downloadBusy ? 'Preparing 3MF…' : 'Download 3MF'}<small>Colours and names saved in file</small></span></button>
            : <a className="button button-primary download-button" href={assetUrl(`${stem}.3mf`)} download={`${stem}.3mf`}><span className="download-arrow" aria-hidden="true">↓</span><span>Download 3MF<small>Colour regions for filament mapping</small></span></a>}
          {downloadError && <p className="download-error" role="alert">{downloadError}</p>}
          <a className="button button-outline download-button" href={assetUrl(`${design.id}.stl`)} download={`${design.id}.stl`}><span className="download-arrow" aria-hidden="true">↓</span><span>Download STL<small>Single-colour solid</small></span></a>
          <button className="print-info-trigger" type="button" aria-haspopup="dialog" aria-controls="print-info" onClick={() => printDialogRef.current?.showModal()}>
            <span className="info-mark" aria-hidden="true">i</span><span className="print-info-label">Before printing</span>
          </button>
          <dialog className="print-dialog" id="print-info" ref={printDialogRef} aria-labelledby="print-dialog-title">
            <h3 id="print-dialog-title">Before printing</h3>
            <p>The 3MF includes separate parts for each colour. Open it in Bambu Studio, assign your filaments, and slice the model.</p>
            <p>Colours are approximate. Check your filaments in the slicer before printing.</p>
            <p>The STL version doesn't include colour information.</p>
            <form method="dialog"><button className="button button-primary" type="submit">Close</button></form>
          </dialog>
          <div className="print-details"><h4>Details</h4><dl><div><dt>Size</dt><dd>60 × 100 × 2 mm</dd></div>{palette.filaments && <div><dt>{isCustom ? `${brand.name} ${range.name}` : 'Bambu PLA Basic colours'}</dt><dd className="filament-list">{palette.filaments.map((filament, index) => <span key={index}><i aria-hidden="true" style={{ background: filament.hex }} />{filament.name}</span>)}</dd></div>}</dl></div>
        </div>
      </div>
    </section>
  );
}

function PrintedExamples() {
  const examples = [
    { title: 'Tags and holders', image: `${import.meta.env.BASE_URL}hero-image.png`, alt: 'Printed Trust the Agent and STAC tags with their holders on a wooden table' },
    { title: 'Trust the Agent', image: `${import.meta.env.BASE_URL}trust-the-agent-bag-tag.jpg`, alt: 'Printed Trust the Agent bag tag hanging from a black backpack', position: 'center 66%', href: '/?design=trust-the-agent#maker' },
    { title: 'STAC or it doesn’t exist', image: null, alt: '', href: '/?design=stac#maker' },
    { title: 'Your print here', image: null, alt: '' },
  ];
  return <section className="examples-section" id="examples" aria-labelledby="examples-title">
    <div className="section-heading"><div><h2 id="examples-title">Printed examples</h2><p>More photos are coming. If you print a tag, send us a pic!</p></div></div>
    <div className="examples-grid">{examples.map((example) => <figure className={`example-card ${example.image ? 'has-photo' : 'is-placeholder'}`} key={example.title}>
      {example.image ? <img src={example.image} alt={example.alt} loading="lazy" style={{ objectPosition: example.position ?? 'center' }} /> : <div className="example-placeholder" aria-label="Photo coming soon"><span>Photo coming soon</span></div>}
      <figcaption>{example.href ? <a href={example.href}>{example.title}</a> : example.title}</figcaption>
    </figure>)}</div>
  </section>;
}

function SupportCard() {
  return <div className="support-wrap"><section className="support-card" aria-labelledby="support-title">
    <h2 className="support-heading" id="support-title"><img src={`${import.meta.env.BASE_URL}landsat-latte.webp`} alt="Buy me a Landsat Latte" width="848" height="205" loading="lazy" decoding="async" /></h2>
    <div className="support-copy">
      <p>Enjoyed the designs? If you’d like to support this little maker project, you can buy me a coffee.</p>
      <a className="button button-primary support-button" href="https://buymeacoffee.com/xen0f0n" target="_blank" rel="noopener noreferrer" aria-label="Buy me a coffee (opens in a new tab)">Buy me a coffee <span aria-hidden="true">↗</span></a>
    </div>
  </section></div>;
}

export function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [designId, setDesignId] = useState(() => new URLSearchParams(window.location.search).get('design') === 'stac' ? 'stac' : 'trust-the-agent');
  const selectDesign = (id: string) => {
    setDesignId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('design', id);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };
  useEffect(() => {
    fetch(assetUrl('catalog.json'))
      .then((response) => { if (!response.ok) throw new Error('Design catalogue unavailable.'); return response.json() as Promise<Catalog>; })
      .then(setCatalog)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Design catalogue unavailable.'));
  }, []);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="header-inner"><a className="brand" href="#top" aria-label="Spectral Reflectance make, home"><strong>Spectral Reflectance</strong><span className="brand-divider" aria-hidden="true">//</span><span className="brand-make">make</span></a><nav aria-label="Main navigation"><a href="#about">About</a><a href="https://www.spectralreflectance.space/" target="_blank" rel="noopener noreferrer" aria-label="Spectral Reflectance (opens in a new tab)">Spectral Reflectance <span aria-hidden="true">↗</span></a></nav></div></header>
    <main id="main"><div id="top" />{error && <div className="load-error" role="alert">{error}</div>}{!catalog && !error && <div className="initial-loading" role="status">Loading the collection…</div>}{catalog && <><Hero /><div className="content-wrap"><Maker catalog={catalog} designId={designId} setDesignId={selectDesign} /><PrintedExamples /></div></>}
      <section className="about-section" id="about" aria-labelledby="about-title"><div className="about-inner">
        <article className="about-card">
          <h2 id="about-title">About Spectral Reflectance <code className="about-mark">// make</code></h2>
          <p>I originally designed these tags as giveaways for the Agentic AI for EO workshop in Berlin. They turned out to be more popular than I expected!</p>
          <p>The ones I handed out had NFC chips linking to <a href="https://www.spectralreflectance.space/" target="_blank" rel="noopener noreferrer">Spectral Reflectance</a>.</p>
          <p>Here you'll find NFC-free versions to customise, download and 3D print. Pick your colours and have fun with them! :)</p>
        </article>
        <article className="licence-card">
          <h2>Licence &amp; credits</h2>
          <p>The designs are shared under <strong>CC BY-NC 4.0</strong> for non-commercial use, with attribution to Spectral Reflectance. Please keep the Spectral Reflectance credit on the back.</p>
          <a href={`${import.meta.env.BASE_URL}licence/`}>Read the full licence &amp; artwork credits <span aria-hidden="true">→</span></a>
        </article>
      </div><SupportCard /></section>
    </main>
    <footer className="site-footer"><span>© Spectral Reflectance</span><a href="https://www.spectralreflectance.space/" target="_blank" rel="noopener noreferrer">spectralreflectance.space ↗</a><a href={`${import.meta.env.BASE_URL}licence/`}>Licence &amp; credits</a><a href="#top">Back to top ↑</a></footer>
  </>;
}
