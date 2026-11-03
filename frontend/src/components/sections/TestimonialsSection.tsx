import { Quote, Star } from 'lucide-react';
import { Reveal } from '@/components/motion/reveal';

const TESTIMONIALS = [
  {
    name: 'Sophie Martin',
    role: 'Acheteuse',
    avatar: 'SM',
    text: "Un accompagnement exceptionnel de A à Z. L'agent a su comprendre nos besoins et nous a trouvés la villa de nos rêves en seulement 3 visites. Merci Le Portail Immobilier !",
    rating: 5,
  },
  {
    name: 'Jean-Pierre Dubois',
    role: 'Vendeur',
    avatar: 'JD',
    text: "La vente de notre appartement s'est faite en seulement 6 semaines. Prix honorifique très compétitif et communication de qualité sur le site. Je recommande les yeux fermés.",
    rating: 5,
  },
  {
    name: 'Amira Ben Ali',
    role: 'Locataire',
    avatar: 'AB',
    text: "Trouvé un super appartement au centre-ville. Processus de location simplifié, dossier accepté rapidement. Équipe réactive et à l'écoute. Un grand merci !",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            Témoignages
          </span>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            Ce que disent nos clients
          </h2>
          <p className="mt-4 text-slate-600">
            Des centaines de clients nous ont fait confiance. Découvrez leurs avis.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial, i) => (
            <Reveal key={testimonial.name} variant="blur" delay={i * 150} className="h-full">
              <div className="card-lift group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <Quote className="mt-4 h-8 w-8 text-slate-200 transition-all duration-500 group-hover:-rotate-12 group-hover:text-amber-300" />
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{testimonial.text}</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-xs text-slate-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
