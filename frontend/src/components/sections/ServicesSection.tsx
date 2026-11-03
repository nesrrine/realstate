import {
  CheckCircle2,
  Home,
  LandPlot,
  Briefcase,
  FileText,
  Shield,
  Headphones,
} from 'lucide-react';
import { Reveal } from '@/components/motion/reveal';

const SERVICES = [
  {
    icon: Home,
    title: 'Achat & Vente',
    description:
      "Accompagnement complet dans votre projet d'achat ou de vente d'un bien immobilier.",
    features: ['Estimation gratuite', 'Visites guidées', 'Négociation', 'Suivi juridique'],
  },
  {
    icon: LandPlot,
    title: 'Location',
    description: 'Trouvez le bien idéal pour votre habitation ou votre activité professionnelle.',
    features: ['Large choix', 'Visites virtuelles', 'Dossier locatif', 'Gestion locative'],
  },
  {
    icon: Briefcase,
    title: "Immobilier d'entreprise",
    description: 'Locaux commerciaux, bureaux, entrepôts pour votre activité.',
    features: ['Emplacement premium', 'Visites 360°', 'Contrats adaptés', 'Suivi après-vente'],
  },
  {
    icon: FileText,
    title: 'Conseil & Expertise',
    description: 'Notre expertise du marché pour des décisions éclairées.',
    features: ['Étude de marché', 'Analyse DPE', 'Diagnostic technique', 'Estimation précise'],
  },
  {
    icon: Shield,
    title: 'Sécurité juridique',
    description: 'Toutes les garanties pour une transaction en toute sérénité.',
    features: ['Garantie légale', 'Assurance habitation', 'Suivi notaire', 'Transparence'],
  },
  {
    icon: Headphones,
    title: 'Accompagnement personnalisé',
    description: 'Un interlocuteur unique tout au long de votre projet.',
    features: ['Conseiller dédié', 'Réactivité', 'Disponible 7j/7', 'Support multilingue'],
  },
];

export function ServicesSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Nos services
          </span>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            Une expertise complète
          </h2>
          <p className="mt-4 text-slate-600">
            De la première visite à la remise des clés, nous vous accompagnons à chaque étape de
            votre projet immobilier.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => {
            const Icon = service.icon;
            return (
              <Reveal key={service.title} delay={(i % 3) * 120} className="h-full">
                <div className="card-lift group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-200">
                  {/* Lueur qui apparaît au survol */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{service.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {service.description}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {service.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
