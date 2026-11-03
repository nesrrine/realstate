'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Phone, ChevronDown, Home, LandPlot, Briefcase, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/biens', label: 'Nos biens' },
  { href: '/agence', label: 'L\'agence' },
  { href: '/contact', label: 'Contact' },
];

const PROPERTY_TYPES = [
  { href: '/vente', label: 'À vendre', icon: Home },
  { href: '/location', label: 'À louer', icon: Home },
  { href: '/terrains', label: 'Terrains', icon: LandPlot },
  { href: '/appartements', label: 'Appartements', icon: Home },
  { href: '/villas', label: 'Villas', icon: MapPin },
  { href: '/locaux-commerciaux', label: 'Locaux commerciaux', icon: Briefcase },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // En-tête « verre dépoli » plus compact dès qu'on fait défiler la page
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (href: string) => pathname === href;
  const isDropdownActive = () => PROPERTY_TYPES.some((p) => pathname === p.href);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-500 ${
        scrolled
          ? 'border-slate-200/60 bg-white/70 shadow-lg shadow-slate-900/5 backdrop-blur-xl'
          : 'border-transparent bg-white/95 backdrop-blur-md'
      }`}
    >
      <div
        className={`container mx-auto flex items-center justify-between px-4 transition-all duration-500 sm:px-6 ${
          scrolled ? 'h-14 sm:h-16' : 'h-16 sm:h-20'
        }`}
      >
        <Link href="/" className="group flex items-center gap-3" aria-label="Le Portail Immobilier - Accueil">
          <Image
            src="/logo-portail-immobilier.png"
            alt="Le Portail Immobilier"
            width={289}
            height={366}
            priority
            className={`w-auto transition-all duration-500 group-hover:scale-105 ${scrolled ? 'h-10 sm:h-12' : 'h-12 sm:h-16'}`}
          />
          <div className="leading-tight hidden sm:block">
            <span className="block text-lg font-bold tracking-tight text-[#1e2a4a]">Le Portail Immobilier</span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-sky-600">
              Agence immobilière
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                isActive(link.href)
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="relative" onMouseEnter={() => setDropdownOpen(true)} onMouseLeave={() => setDropdownOpen(false)}>
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                isDropdownActive()
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              aria-label="Types de biens"
            >
              <span>Biens</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
                {PROPERTY_TYPES.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isActive(item.href)
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline-flex"
          >
            Espace agent
          </Link>
          <Link
            href="/contact"
            className="hidden items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 sm:inline-flex"
          >
            <Phone className="h-4 w-4" />
            Contact
          </Link>
          <button
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden animate-in slide-in-from-top-2 duration-200">
          <nav className="container mx-auto flex flex-col gap-1 px-4 py-4" aria-label="Menu mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-3 border-slate-200" />
            <div className="space-y-1">
              {PROPERTY_TYPES.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    isActive(item.href)
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-slate-500" />
                  {item.label}
                </Link>
              ))}
            </div>
            <hr className="my-3 border-slate-200" />
            <Link
              href="/contact"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <Phone className="h-4 w-4" />
              Contact
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Espace agent
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}