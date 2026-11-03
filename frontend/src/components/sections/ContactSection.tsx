'use client';

import { useState } from 'react';
import { Phone, MapPin, Clock, Send, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { publicService, type ContactType } from '@/services/public.service';
import { getErrorMessage } from '@/lib/errors';
import { usePublicAgency, telHref } from '@/hooks/use-public-agency';
import { Reveal } from '@/components/motion/reveal';

const EMPTY_FORM = { name: '', email: '', phone: '', message: '', type: 'achat' as ContactType, website: '' };

export function ContactSection() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const { data: agency } = usePublicAgency();

  // Même envoi que la page Contact : lead dans le CRM, l'agent est notifié
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
        website: form.website,
      });
      toast.success('Message envoyé ! Un conseiller vous rappelle rapidement.', {
        icon: <CheckCircle className="h-5 w-5" />,
      });
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Envoi impossible, réessayez ou appelez-nous.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="bg-slate-50 py-16 sm:py-20" id="contact">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal variant="left">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Contact
            </span>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Parlons de votre projet
            </h2>
            <p className="mt-4 text-slate-600">
              Remplissez le formulaire ci-dessous ou contactez-nous directement.
              Notre équipe vous répondra dans les plus brefs délais.
            </p>

            <div className="mt-8 space-y-5">
              {(agency?.address || agency?.mapsUrl) && (
                <div className="group flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Adresse</div>
                    {agency.address && <div className="text-sm text-slate-600">{agency.address}</div>}
                    {agency.mapsUrl && (
                      <a
                        href={agency.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        Voir sur Google Maps
                      </a>
                    )}
                  </div>
                </div>
              )}
              {agency?.phone && (
                <div className="group flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Téléphone</div>
                    <a href={telHref(agency.phone)} className="text-sm text-slate-600 hover:text-blue-600">
                      {agency.phone}
                    </a>
                  </div>
                </div>
              )}
              <div className="group flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">Horaires</div>
                  <div className="text-sm text-slate-600">Lundi - Samedi : 9h00 - 18h00</div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal variant="right" delay={150} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="relative space-y-5">
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
                  <Label htmlFor="home-name">Nom complet *</Label>
                  <Input
                    id="home-name"
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Votre nom"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="home-phone">Téléphone *</Label>
                  <Input
                    id="home-phone"
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
                  <Label htmlFor="home-email">Email</Label>
                  <Input
                    id="home-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="vous@email.com"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="home-type">Type de projet</Label>
                  <select
                    id="home-type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as ContactType })}
                    className="mt-1.5 flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="achat">Achat</option>
                    <option value="location">Location</option>
                    <option value="vente">Vendre mon bien</option>
                    <option value="estimation">Estimation gratuite</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="home-message">Message *</Label>
                <Textarea
                  id="home-message"
                  required
                  rows={4}
                  maxLength={2000}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Décrivez votre projet..."
                  className="mt-1.5"
                />
              </div>
              <Button
                type="submit"
                disabled={sending}
                className="btn-shine w-full bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800"
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
          </Reveal>
        </div>
      </div>
    </section>
  );
}
