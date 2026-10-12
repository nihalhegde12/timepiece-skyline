import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, Pause, Play, RotateCcw, Minus, Plus, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WatchScene } from '@/components/WatchScene';
import { WatchAssembly } from '@/components/WatchAssembly';
import { WatchGallery } from '@/components/WatchGallery';
import { VirtualTryOn } from '@/components/VirtualTryOn';
import { watches } from '@/lib/watches';

export const Route = createFileRoute('/watches/$watchId')({
  ssr: false,
  beforeLoad: ({ params }) => { if (!watches.some(w => w.id === params.watchId)) throw notFound(); },
  head: ({ params }) => {
    const watch = watches.find(w => w.id === params.watchId);
    const title = `${watch?.name ?? 'Watch'} — The Collection`;
    const description = `Explore ${watch?.name ?? 'the collection'} in an animated 3D view with precision detailing and polished metal finishes.`;
    return { meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] };
  },
  component: WatchPage,
});

function WatchPage() {
  const { watchId } = Route.useParams();
  const watch = watches.find(w => w.id === watchId);
  const [moving, setMoving] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  if (!watch) return null;
  return <main className="watch-page" data-tone={watch.id}>
    <header className="watch-page-header">
      <Button asChild variant="ghost"><Link to="/"><ArrowLeft />The collection</Link></Button>
      <span className="watch-page-wordmark">THE COLLECTION</span>
      <span className="watch-page-number">0{watches.findIndex(w => w.id === watch.id) + 1} / 04</span>
    </header>
    <div className="watch-page-title"><p>{watch.finish}</p><h1>{watch.name}</h1></div>
    <section className="watch-assembly-intro" aria-label={`${watch.name} assembly animation`}>
      <WatchAssembly key={watch.id} tone={watch.id} />
    </section>
    <WatchScene tone={watch.id} moving={moving} interactive resetKey={resetKey} zoom={zoom} />
    <div className="watch-viewer-toolbar" role="toolbar" aria-label="Watch visualization controls">
      <Button size="icon" variant="ghost" title={moving ? 'Pause animation' : 'Play animation'} aria-label={moving ? 'Pause animation' : 'Play animation'} aria-pressed={!moving} onClick={() => setMoving(v => !v)}>{moving ? <Pause /> : <Play />}</Button>
      <Button size="icon" variant="ghost" title="Zoom out" aria-label="Zoom out" disabled={zoom <= .8} onClick={() => setZoom(v => Math.max(.8, v - .1))}><Minus /></Button>
      <Button size="icon" variant="ghost" title="Zoom in" aria-label="Zoom in" disabled={zoom >= 1.4} onClick={() => setZoom(v => Math.min(1.4, v + .1))}><Plus /></Button>
      <Button size="icon" variant="ghost" title="Reset view" aria-label="Reset view" onClick={() => { setResetKey(v => v + 1); setZoom(1); }}><RotateCcw /></Button>
      <span className="watch-toolbar-divider" aria-hidden="true" />
      <Button variant="ghost" className="watch-try-on-button" onClick={() => setTryOnOpen(true)}><ScanLine />Try on</Button>
    </div>
    <nav className="watch-finish-nav" aria-label="Watch finishes">{watches.map(w => <Button key={w.id} asChild variant="ghost" className={w.id === watch.id ? 'selected' : ''}><Link to="/watches/$watchId" params={{ watchId: w.id }}><span className="watch-swatch" data-tone={w.id} />{w.finish}</Link></Button>)}</nav>
    <WatchGallery key={watch.id} watch={watch} />
    <VirtualTryOn watch={watch} open={tryOnOpen} onClose={() => setTryOnOpen(false)} />
  </main>;
}
