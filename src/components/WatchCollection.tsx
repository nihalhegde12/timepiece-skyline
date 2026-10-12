import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { watches } from '@/lib/watches';
import { WatchScene } from './WatchScene';

export function WatchCollection() {
  return <section className="section dark collection" aria-labelledby="collection-title">
    <h2 id="collection-title">The full collection.</h2>
    <p>Four finishes, one flight.</p>
    <div className="collection-grid">
      {watches.map(watch => <Link to="/watches/$watchId" params={{ watchId: watch.id }} key={watch.id} className="collection-card" data-tone={watch.id} aria-label={`Explore ${watch.name}`}>
        <WatchScene tone={watch.id} interactive zoomable={false} modelScale={1.12} />
        <div className="collection-caption"><span><strong>{watch.name}</strong><small>{watch.finish}</small></span><ArrowUpRight size={20} /></div>
      </Link>)}
    </div>
  </section>;
}
