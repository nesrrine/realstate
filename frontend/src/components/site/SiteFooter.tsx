'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin, Clock, MessageSquare, Camera, Send } from 'lucide-react';
import { usePublicAgency, telHref } from '@/hooks/use-public-agency';

const FOOTER_LINKS = [
  { href: '/biens', label: 'Biens' },
  { href: '/vente', label: 'Vente' },
  { href: '/location', label: 'Location' },
  { href: '/terrains', label: 'Terrains' },
  { href: '/appartements', label: 'Appartements' },
  { href: '/villas', label: 'Villas' },
  { href: '/locaux-commerciaux', label: 'Locaux commerciaux' },
];

const COMPANY_LINKS = [
  { href: '/agence', label: 'À propos' },
  { href: '/agence#equipe', label: 'Notre équipe' },
  { href: '/agence#expertise', label: 'Expertise' },
  { href: '/contact', label: 'Contact' },
];

export function SiteFooter() {
  const { data: agency } = usePublicAgency();
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="container mx-auto px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" className="group flex items-center gap-3">
              <div className="rounded-xl bg-white p-1.5 shadow-lg transition-transform duration-500 group-hover:scale-105">
                <Image
                  src="/logo-portail-immobilier.png"
                  alt="Le Portail Immobilier"
                  width={289}
                  height={366}
                  className="h-14 w-auto"
                />
              </div>
              <div>
                <span className="block text-lg font-bold text-white">Le Portail Immobilier</span>
                <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Agence immobilière
                </span>
              </div>
            </Link>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Votre partenaire de confiance pour l&apos;achat, la vente et la location
              d&apos;immeubles, d&apos;appartements, de villas et de terrains.
            </p>
            <div className="mt-5 flex gap-3">
              {[
                { icon: MessageSquare, label: 'Facebook' },
                { icon: Camera, label: 'Instagram' },
                { icon: Send, label: 'Twitter' },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Biens</h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Entreprise</h3>
            <ul className="space-y-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Contact</h3>
            <ul className="space-y-4">
              {/* Coordonnées réelles : Paramètres du CRM */}
              {(agency?.address || agency?.mapsUrl) && (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  {agency.mapsUrl ? (
                    <a
                      href={agency.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm transition-colors hover:text-white"
                    >
                      {agency.address || 'Voir sur Google Maps'}
                    </a>
                  ) : (
                    <span className="text-sm">{agency.address}</span>
                  )}
                </li>
              )}
              {agency?.phone && (
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-slate-500" />
                  <a href={telHref(agency.phone)} className="text-sm transition-colors hover:text-white">
                    {agency.phone}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-slate-500" />
                <Link href="/contact" className="text-sm transition-colors hover:text-white">
                  Nous écrire
                </Link>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                <span className="text-sm">Lun - Sam : 9h00 - 18h00</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Le Portail Immobilier. Tous droits réservés.
            </p>
            <div className="flex gap-6">
              <Link href="#" className="text-sm text-slate-500 transition-colors hover:text-white">
                Mentions légales
              </Link>
              <Link href="#" className="text-sm text-slate-500 transition-colors hover:text-white">
                Politique de confidentialité
              </Link>
              <Link href="#" className="text-sm text-slate-500 transition-colors hover:text-white">
                CGV
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}