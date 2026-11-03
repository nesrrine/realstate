import { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2,
  Home,
  Users,
  Award,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  Shield,
  CheckCircle2,
  FileText,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Reveal } from '@/components/motion/reveal';
import { CountUp } from '@/components/motion/count-up';

export const metadata: Metadata = {
  title: 'À propos - Le Portail Immobilier',
  description:
    "Le Portail Immobilier, votre agence immobilière de confiance. Plus de 15 ans d'expérience dans l'achat, la vente et la location de biens immobiliers.",
};

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

const TEAM = [
  {
    name: 'Jean Dupont',
    role: 'Directeur Général',
    initials: 'JD',
    description: 'Expert en immobilier résidentiel et commercial depuis 20 ans.',
  },
  {
    name: 'Marie Martin',
    role: 'Directrice Commerciale',
    initials: 'MM',
    description: 'Spécialiste en vente de villas et appartements de standing.',
  },
  {
    name: 'Pierre Durand',
    role: 'Responsable Location',
    initials: 'PD',
    description: 'Expert en gestion locative et investissement locatif.',
  },
  {
    name: 'Sophie Leroy',
    role: 'Conseillère Senior',
    initials: 'SL',
    description: 'Spécialiste en terrains et locaux commerciaux.',
  },
];

const STATS = [
  { value: '500+', label: 'Biens référencés' },
  { value: '15+', label: "Ans d'expérience" },
  { value: '20+', label: 'Experts dédiés' },
  { value: '98%', label: 'Clients satisfaits' },
];

export default function AgencePage() {
  return (
    <div className="space-y-20 py-16 sm:py-24">
      <section className="relative overflow-hidden bg-slate-900 text-white" id="a-propos">
        <div
          aria-hidden="true"
          className="animate-float pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl"
        />
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-up">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                À propos de nous
              </span>
              <h1 className="mt-2 text-4xl font-bold sm:text-5xl lg:text-6xl">
                Le Portail Immobilier, votre agence de confiance
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-300">
                Fondée il y a plus de 15 ans, Le Portail Immobilier est devenu une référence sur le marché
                immobilier. Notre équipe d'experts vous accompagne dans tous vos projets : achat,
                vente, location et investissement.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-slate-300">
                Nous mettons notre connaissance du marché, notre réseau d'experts et notre sens du
                relationnel au service de votre projet pour obtenir les meilleurs résultats.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-6">
                {STATS.map((stat) => (
                  <div key={stat.label}>
                    <CountUp value={stat.value} className="block text-4xl font-bold text-white" />
                    <div className="text-sm text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-fade-up relative" style={{ animationDelay: '200ms' }}>
              <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-8 sm:p-12">
                <h2 className="text-2xl font-bold">Nos valeurs</h2>
                <div className="mt-8 space-y-6">
                  {VALUES.map((value) => {
                    const Icon = value.icon;
                    return (
                      <div key={value.title} className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-lg">{value.title}</h3>
                          <p className="mt-1 text-slate-400">{value.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="equipe">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Notre équipe
            </span>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Des experts à votre service
            </h2>
            <p className="mt-4 text-slate-600">
              Une équipe passionnée et expérimentée pour vous accompagner dans tous vos projets
              immobiliers.
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((member, i) => (
              <Reveal key={member.name} variant="zoom" delay={i * 110} className="h-full">
                <Card className="card-lift group h-full text-center">
                  <CardContent className="p-6">
                    <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-violet-100 text-2xl font-bold text-blue-600 transition-transform duration-500 group-hover:scale-110">
                      {member.initials}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{member.name}</h3>
                    <p className="text-sm text-blue-600">{member.role}</p>
                    <p className="mt-3 text-sm text-slate-600">{member.description}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50" id="expertise">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Notre expertise
            </span>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Une gamme complète de services
            </h2>
            <p className="mt-4 text-slate-600">
              De l'estimation à la signature, nous vous accompagnons à chaque étape.
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Home,
                title: 'Achat & Vente',
                desc: "Accompagnement complet dans votre projet d'achat ou de vente.",
                features: [
                  'Estimation gratuite',
                  'Visites guidées',
                  'Négociation',
                  'Suivi juridique',
                ],
              },
              {
                icon: Building2,
                title: 'Location',
                desc: 'Trouvez le bien idéal pour votre habitation ou votre activité.',
                features: [
                  'Large choix',
                  'Visites virtuelles',
                  'Dossier locatif',
                  'Gestion locative',
                ],
              },
              {
                icon: Briefcase,
                title: "Immobilier d'entreprise",
                desc: 'Locaux commerciaux, bureaux, entrepôts pour votre activité.',
                features: [
                  'Emplacement premium',
                  'Visites 360°',
                  'Contrats adaptés',
                  'Suivi après-vente',
                ],
              },
              {
                icon: FileText,
                title: 'Conseil & Expertise',
                desc: 'Notre expertise du marché pour des décisions éclairées.',
                features: [
                  'Étude de marché',
                  'Analyse DPE',
                  'Diagnostic technique',
                  'Estimation précise',
                ],
              },
              {
                icon: Shield,
                title: 'Sécurité juridique',
                desc: 'Toutes les garanties pour une transaction en toute sérénité.',
                features: [
                  'Garantie légale',
                  'Assurance habitation',
                  'Suivi notaire',
                  'Transparence',
                ],
              },
              {
                icon: Users,
                title: 'Accompagnement personnalisé',
                desc: 'Un interlocuteur unique tout au long de votre projet.',
                features: [
                  'Conseiller dédié',
                  'Réactivité',
                  'Disponible 7j/7',
                  'Support multilingue',
                ],
              },
            ].map((service, i) => {
              const Icon = service.icon;
              return (
                <Reveal key={service.title} delay={(i % 3) * 120} className="h-full">
                  <Card className="card-lift group h-full">
                    <CardContent className="p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-slate-900">{service.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{service.desc}</p>
                      <ul className="mt-4 space-y-2">
                        {service.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Reveal variant="zoom" className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Prêt à concrétiser votre projet ?</h2>
            <p className="mt-4 text-lg text-slate-300">
              Contactez-nous dès aujourd'hui pour une estimation gratuite ou pour discuter de votre
              projet immobilier.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="btn-shine w-full sm:w-auto">
                <Link href="/contact">
                  <Phone className="mr-2 h-5 w-5" />
                  Nous contacter
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white text-white hover:bg-white/10"
              >
                <Link href="/biens">Voir nos biens</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
