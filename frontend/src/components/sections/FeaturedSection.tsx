import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { publicService, Property } from '@/services/public.service';
import { formatPrice, formatArea, getCoverImage, TYPE_LABELS, TRANSACTION_LABELS } from '@/lib/public-constants';
import { Reveal } from '@/components/motion/reveal';

async function getFeaturedProperties() {
  try {
    const res = await publicService.getProperties({
      limit: 6,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    return res.data;
  } catch {
    return [];
  }
}

export async function FeaturedSection() {
  const properties = await getFeaturedProperties();

  if (properties.length === 0) return null;

  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <Reveal className="flex items-end justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Sélection
            </span>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Biens à la une
            </h2>
            <p className="mt-2 text-slate-600">
              Les dernières opportunités immobilières ajoutées
            </p>
          </div>
          <Link
            href="/biens"
            className="group hidden items-center gap-2 text-sm font-semibold text-slate-900 hover:text-blue-600 sm:inline-flex"
          >
            Voir tout
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property, i) => (
            <Reveal key={property.id} delay={(i % 3) * 120}>
              <PropertyCard property={property} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PropertyCard({ property }: { property: Property }) {
  const cover = getCoverImage(property.images);

  return (
    <Link href={`/biens/${property.id}`} className="group block">
      <div className="card-lift relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
        <div className="relative overflow-hidden">
          <div
            className="aspect-[4/3] w-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
            style={{ backgroundImage: `url(${cover})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-500 group-hover:opacity-80" />
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 backdrop-blur-sm">
              {TRANSACTION_LABELS[property.transactionType]}
            </span>
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-900 backdrop-blur-sm">
              {TYPE_LABELS[property.type]}
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="line-clamp-1 text-lg font-bold text-slate-900 group-hover:text-blue-600">
                {property.title}
              </h3>
              <p className="mt-1 flex items-center text-sm text-slate-500">
                <MapPin className="mr-1 h-3.5 w-3.5" />
                {property.city}
                {property.district ? `, ${property.district}` : ''}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <div>
              <div className="text-xl font-bold text-slate-900">
                {formatPrice(property.price)}
                {property.transactionType === 'RENTAL' && (
                  <span className="ml-1 text-xs font-normal text-slate-500">/mois</span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {formatArea(property.surface)}
                {property.rooms ? ` · ${property.rooms} pièces` : ''}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}