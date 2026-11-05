import { Users, Award, TrendingUp, Shield } from 'lucide-react';
import { Reveal } from '@/components/motion/reveal';
import { CountUp } from '@/components/motion/count-up';

const VALUES = [
  {
    icon: Shield,
    title: 'Confidentialité',
    description: 'Vos données et votre projet sont traités dans la plus stricte confidentialité.',
  },
  {
    icon: TrendingUp,
    title: 'Transparence',
    description: 'Prix, honoraires et conditions sont communiqués clairement dès le départ.',
  },
  {
    icon: Users,
    title: 'Écoute',
    description: 'Chaque client est unique. Nous adaptons notre accompagnement à vos besoins.',
  },
  {
    icon: Award,
    title: 'Excellence',
    description: "Plus de 15 ans d'expérience et des milliers de transactions réussies.",
  },
];

export function AgencySection() {
  return (
    <section
      className="relative overflow-hidden bg-slate-900 py-16 sm:py-20 text-white"
      id="agence"
    >
      <div
        aria-hidden="true"
        className="animate-float pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl"
      />
      <div className="container relative mx-auto px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal variant="left">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              À propos de nous
            </span>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              Le Portail Immobilier, votre agence de confiance
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Fondée il y a plus de 15 ans, Le Portail Immobilier est devenu une référence sur le marché
              immobilier. Notre équipe d&apos;experts vous accompagne dans tous vos projets : achat,
              vente, location et investissement.
            </p>
            <p className="mt-3 text-base leading-relaxed text-slate-300">
              Nous mettons notre connaissance du marché, notre réseau d&apos;experts et notre sens du
              relationnel au service de votre projet pour obtenir les meilleurs résultats.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-6">
              {[
                { value: '500+', label: 'Biens référencés' },
                { value: '15+', label: "Ans d&apos;expérience" },
                { value: '20+', label: 'Experts dédiés' },
                { value: '98%', label: 'Clients satisfaits' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors duration-300 hover:bg-white/10"
                >
                  <CountUp value={stat.value} className="block text-3xl font-bold text-white" />
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal variant="right" delay={150} className="relative">
            <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-8">
              <h3 className="text-xl font-bold">Nos valeurs</h3>
              <div className="mt-6 space-y-5">
                {VALUES.map((value) => {
                  const Icon = value.icon;
                  return (
                    <div key={value.title} className="group flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{value.title}</div>
                        <div className="text-sm text-slate-400">{value.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
