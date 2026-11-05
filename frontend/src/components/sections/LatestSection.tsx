import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { publicService, Property } from '@/services/public.service';
import { formatPrice, formatArea, getCoverImage, TRANSACTION_LABELS } from '@/lib/public-constants';
import { Reveal } from '@/components/motion/reveal';

async function getLatestProperties() {
  try {
    const res = await publicService.getProperties({ limit: 8, sortBy: 'createdAt', sortOrder: 'desc' });
    return res.data;
  } catch {
    return [];
  }
}

export async function LatestSection() {
  const properties = await getLatestProperties();

  if (properties.length === 0) return null;

  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <Reveal className="flex items-end justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600">
              Nouveautés
            </span>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Dernières annonces
            </h2>
            <p className="mt-2 text-slate-600">
              Les biens ajoutés récemment sur notre plateforme
            </p>
          </div>
          <Link
            href="/biens"
            className="group hidden items-center gap-2 text-sm font-semibold text-slate-900 hover:text-purple-600 sm:inline-flex"
          >
            Voir tout
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {properties.slice(0, 4).map((property, i) => (
            <Reveal key={property.id} variant="zoom" delay={i * 110}>
              <LatestCard property={property} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function LatestCard({ property }: { property: Property }) {
  const cover = getCoverImage(property.images);

  return (
    <Link href={`/biens/${property.id}`} className="group block">
      <div className="card-lift overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="relative aspect-[4/3] overflow-hidden">
          <div
            className="h-full w-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
            style={{ backgroundImage: `url(${cover})` }}
          />
          <div className="absolute left-3 top-3">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 backdrop-blur-sm">
              {TRANSACTION_LABELS[property.transactionType]}
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            Ajouté le {new Date(property.createdAt).toLocaleDateString('fr-FR')}
          </div>
          <h3 className="mt-2 line-clamp-1 text-base font-bold text-slate-900 group-hover:text-purple-600">
            {property.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{property.city}</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-slate-900">{formatPrice(property.price)}</div>
              <div className="text-xs text-slate-500">{formatArea(property.surface)}</div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}