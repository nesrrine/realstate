import Link from 'next/link';
import { ArrowRight, Building2, Home, LandPlot, Briefcase, TrendingUp } from 'lucide-react';
import { publicService } from '@/services/public.service';
import { formatPrice, getCoverImage, TYPE_LABELS, TRANSACTION_LABELS } from '@/lib/public-constants';
import { CountUp } from '@/components/motion/count-up';

async function getPublishedProperties() {
  try {
    const res = await publicService.getProperties({ limit: 12, sortBy: 'createdAt', sortOrder: 'desc' });
    return res.data;
  } catch {
    return [];
  }
}

export async function HeroSection() {
  const properties = await getPublishedProperties();
  const featured = properties.filter((p) => p.isPublished).slice(0, 3);

  return (
    <section className="relative overflow-hidden bg-slate-950">
      {/* Halos lumineux qui dérivent lentement */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="animate-float absolute -left-32 top-10 h-[28rem] w-[28rem] rounded-full bg-blue-600/30 blur-3xl" />
        <div
          className="animate-float absolute -right-24 top-1/3 h-[24rem] w-[24rem] rounded-full bg-violet-600/25 blur-3xl"
          style={{ animationDelay: '-6s' }}
        />
        <div
          className="animate-float absolute bottom-[-10rem] left-1/3 h-[22rem] w-[22rem] rounded-full bg-fuchsia-500/20 blur-3xl"
          style={{ animationDelay: '-12s' }}
        />
        {/* Quadrillage discret */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          }}
        />
      </div>
      <div className="container relative mx-auto px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="max-w-2xl">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-medium text-slate-200 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-soft absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <TrendingUp className="h-3.5 w-3.5" />
              Plus de 500 biens référencés
            </span>
            <h1
              className="animate-fade-up mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
              style={{ animationDelay: '120ms' }}
            >
              Votre partenaire de confiance{' '}
              <span className="text-gradient-animated">immobilière</span>
            </h1>
            <p
              className="animate-fade-up mt-6 text-lg leading-relaxed text-slate-300"
              style={{ animationDelay: '240ms' }}
            >
              Découvrez notre portefeuille exclusif d'appartements, villas, terrains et locaux
              commerciaux. Accompagnement personnalisé de A à Z pour chaque projet.
            </p>
            <div className="animate-fade-up mt-8 flex flex-wrap gap-4" style={{ animationDelay: '360ms' }}>
              <Link
                href="/biens"
                className="btn-shine group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/30"
              >
                Découvrir les biens
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10"
              >
                Nous contacter
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 sm:gap-8">
              {[
                { icon: Home, label: 'Appartements & Maisons', count: '200+' },
                { icon: LandPlot, label: 'Terrains', count: '80+' },
                { icon: Briefcase, label: 'Locaux pro', count: '50+' },
              ].map(({ icon: Icon, label, count }, i) => (
                <div
                  key={label}
                  className="animate-fade-up flex items-center gap-3"
                  style={{ animationDelay: `${480 + i * 120}ms` }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/10">
                    <Icon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <CountUp value={count} className="text-xl font-bold text-white" />
                    <div className="text-xs text-slate-400">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {featured.slice(0, 4).map((property, i) => (
                <Link
                  href={`/biens/${property.id}`}
                  key={property.id}
                  className={`animate-fade-up group relative overflow-hidden rounded-2xl ring-1 ring-white/10 ${
                    i === 0 ? 'col-span-2 row-span-2' : ''
                  }`}
                  style={{ animationDelay: `${300 + i * 150}ms` }}
                >
                  <div
                    className={`relative h-full overflow-hidden ${i === 0 ? '' : 'animate-float-soft'}`}
                    style={{ animationDelay: `${i * -2}s` }}
                  >
                    <div
                      className={`h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110 ${
                        i === 0 ? 'animate-ken-burns' : ''
                      }`}
                      style={{
                        backgroundImage: `url(${getCoverImage(property.images)})`,
                        minHeight: i === 0 ? '320px' : '160px',
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 transition-transform duration-500 group-hover:-translate-y-1">
                      <div className="text-xs font-medium text-blue-300">
                        {TRANSACTION_LABELS[property.transactionType]} · {TYPE_LABELS[property.type]}
                      </div>
                      <div className="text-sm font-bold text-white">
                        {formatPrice(property.price)}
                      </div>
                      <div className="text-xs text-slate-300">
                        {property.city}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}