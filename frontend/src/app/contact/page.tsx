'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Phone, MapPin, Clock, Send, CheckCircle, Building2, FileText, Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { publicService, type ContactType, type PublicAgency } from '@/services/public.service';
import { getErrorMessage } from '@/lib/errors';

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: 'achat', label: 'Achat' },
  { value: 'location', label: 'Location' },
  { value: 'vente', label: 'Vendre mon bien' },
  { value: 'estimation', label: 'Estimation gratuite' },
  { value: 'autre', label: 'Autre' },
];
const isContactType = (v: string | null): v is ContactType => CONTACT_TYPES.some((t) => t.value === v);

const EMPTY_FORM = { name: '', email: '', phone: '', message: '', type: 'achat' as ContactType, website: '' };

export default function ContactPage() {
  // useSearchParams (?property=…, ?type=estimation) exige un Suspense sur une page statique
  return (
    <Suspense>
      <ContactContent />
    </Suspense>
  );
}

function ContactContent() {
  const params = useSearchParams();
  const propertyId = params.get('property') ?? undefined;
  const typeParam = params.get('type');
  const wantsVisit = params.get('demande') === 'visite';

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    type: isContactType(typeParam) ? typeParam : EMPTY_FORM.type,
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [agency, setAgency] = useState<PublicAgency | null>(null);
  const [propertyTitle, setPropertyTitle] = useState<string | null>(null);

  useEffect(() => {
    publicService
      .getAgency()
      .then(setAgency)
      .catch(() => setAgency(null));
  }, []);

  // Message pré-rempli quand on vient de la fiche d'un bien
  useEffect(() => {
    if (!propertyId) return;
    publicService
      .getPropertyById(propertyId)
      .then((p) => {
        setPropertyTitle(p.title);
        setForm((f) => ({
          ...f,
          type: p.transactionType === 'RENTAL' ? 'location' : 'achat',
          message:
            f.message ||
            (wantsVisit
              ? `Bonjour, je souhaite visiter « ${p.title} » (réf. ${p.reference}). Mes disponibilités : `
              : `Bonjour, je suis intéressé(e) par « ${p.title} » (réf. ${p.reference}). Merci de me recontacter.`),
        }));
      })
      .catch(() => setPropertyTitle(null));
  }, [propertyId, wantsVisit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await publicService.sendContact({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        type: form.type,
        message: form.message,
        propertyId,
        website: form.website,
      });
      setSent(true);
      setForm({ ...EMPTY_FORM, type: form.type });
      toast.success('Message envoyé ! Un conseiller vous rappelle rapidement.', {
        icon: <CheckCircle className="h-5 w-5" />,
      });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Envoi impossible, réessayez ou appelez-nous.'));
    } finally {
      setSending(false);
    }
  };

  const phoneHref = agency?.phone ? `tel:${agency.phone.replace(/[^\d+]/g, '')}` : null;

  return (
    <div className="space-y-16 py-16 sm:py-24">
      <section>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Contact
            </span>
            <h1 className="mt-2 text-4xl font-bold text-slate-900 sm:text-5xl">
              Parlons de votre projet
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Remplissez le formulaire ci-dessous ou contactez-nous directement.
              Notre équipe vous répondra dans les plus brefs délais.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="space-y-8">
              {(agency?.address || agency?.mapsUrl) && (
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{agency.name || 'Notre agence'}</h3>
                    {agency.address && <p className="mt-1 text-slate-600">{agency.address}</p>}
                    {agency.mapsUrl && (
                      <a
                        href={agency.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-sm font-medium text-blue-600 hover:underline"
                      >
                        Voir sur Google Maps
                      </a>
                    )}
                  </div>
                </div>
              )}
              {phoneHref && (
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Téléphone</h3>
                    <p className="mt-1 text-slate-600">
                      <a href={phoneHref} className="hover:text-blue-600">
                        {agency?.phone}
                      </a>
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Horaires d&apos;ouverture</h3>
                  <p className="mt-1 text-slate-600">Lundi - Samedi : 9h00 - 18h00</p>
                </div>
              </div>
            </div>

            <Card className="bg-white shadow-xl">
              <CardContent className="p-6 sm:p-8">
                {sent ? (
                  <div className="py-8 text-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
                    <h2 className="mt-4 text-2xl font-bold text-slate-900">Merci, message bien reçu !</h2>
                    <p className="mt-2 text-slate-600">
                      Un conseiller vous rappelle au numéro indiqué dans les plus brefs délais.
                    </p>
                    <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
                      Envoyer un autre message
                    </Button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-slate-900">Envoyez-nous un message</h2>
                    {propertyTitle && (
                      <p className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
                        <Home className="h-4 w-4 shrink-0" />
                        À propos de : <span className="font-medium">{propertyTitle}</span>
                      </p>
                    )}
                    <form onSubmit={handleSubmit} className="relative mt-6 space-y-5">
                      {/* Champ piège invisible : seuls les robots le remplissent */}
                      <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        className="absolute -left-[9999px] h-0 w-0 opacity-0"
                        value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                      />
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="name">Nom complet *</Label>
                          <Input
                            id="name"
                            required
                            maxLength={100}
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Votre nom"
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Téléphone *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            required
                            pattern="[+0-9][0-9 .()\-]{7,19}"
                            title="Au moins 8 chiffres"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="+216 XX XXX XXX"
                            className="mt-1.5"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="vous@email.com"
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="type">Type de projet</Label>
                          <select
                            id="type"
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value as ContactType })}
                            className="mt-1.5 flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {CONTACT_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          required
                          rows={5}
                          maxLength={2000}
                          value={form.message}
                          onChange={(e) => setForm({ ...form, message: e.target.value })}
                          placeholder="Décrivez votre projet, vos critères de recherche, ou posez votre question..."
                          className="mt-1.5"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={sending}
                        className="w-full bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800"
                      >
                        {sending ? (
                          'Envoi en cours...'
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Envoyer le message
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Estimation
            </span>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Estimez votre bien gratuitement
            </h2>
            <p className="mt-4 text-slate-600">
              Vous souhaitez vendre ou louer votre bien ? Obtenez une estimation professionnelle
              et gratuite en moins de 48h.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { icon: Building2, title: 'Estimation en ligne', desc: 'Remplissez notre formulaire en 2 minutes', steps: '1' },
              { icon: MapPin, title: 'Visite sur place', desc: 'Un expert visite votre bien pour affiner l\'estimation', steps: '2' },
              { icon: FileText, title: 'Rapport détaillé', desc: 'Recevez votre rapport d\'estimation complet', steps: '3' },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-full w-1 bg-blue-600" />
                  <CardContent className="p-6 relative">
                    <div className="absolute top-4 right-4 text-4xl font-bold text-slate-100">{step.steps}</div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-900">{step.title}</h3>
                    <p className="mt-2 text-slate-600">{step.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Button
              size="lg"
              className="bg-slate-900 hover:bg-slate-800"
              onClick={() => {
                // Même page : on bascule le formulaire en « Estimation » et on remonte
                setForm((f) => ({ ...f, type: 'estimation' }));
                setSent(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Demander mon estimation gratuite
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
