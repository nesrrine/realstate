
'use client';

import { useEffect, useState } from 'react';
import { shareLink } from '@/lib/share';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Home,
  LandPlot,
  Briefcase,
  Phone,
  Mail,
  Share2,
  Heart,
  Expand,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  formatPrice,
  formatArea,
  getCoverImage,
  TYPE_LABELS,
  TRANSACTION_LABELS,
  STATUS_LABELS,
  fullName,
} from '@/lib/public-constants';

import { Property } from '@/services/public.service';
import { GalleryModal } from './GalleryModal';
import { getSpecificDetails } from '@/lib/property-specific-details';

interface PropertyDetailProps {
  property: Property;
  agencyPhone?: string;
}

const FAVORITES_KEY = 'immo-favoris';

const readFavorites = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
  } catch {
    return [];
  }
};

export function PropertyDetail({ property, agencyPhone }: PropertyDetailProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    setIsFavorite(readFavorites().includes(String(property.id)));
  }, [property.id]);

  const toggleFavorite = () => {
    const id = String(property.id);

    const next = isFavorite
      ? readFavorites().filter((f) => f !== id)
      : [...readFavorites(), id];

    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // Favori conservé uniquement pendant cette page.
    }

    setIsFavorite(!isFavorite);
  };

  const images = property.images?.length
    ? property.images
    : [{ url: getCoverImage(property.images), isCover: true }];

  const goToPrev = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const handleImageSelect = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <>
      {showGallery && (
        <GalleryModal
          images={images}
          currentIndex={currentImageIndex}
          onClose={() => setShowGallery(false)}
          onPrev={goToPrev}
          onNext={goToNext}
          onSelect={handleImageSelect}
          propertyTitle={property.title}
        />
      )}

      <article className="min-h-screen w-full min-w-0 overflow-x-clip">
        {/* Fil d'Ariane */}
        <nav
          className="sticky top-16 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm"
          aria-label="Fil d'Ariane"
        >
          <div className="container mx-auto flex min-w-0 items-center gap-2 overflow-hidden px-3 py-3 sm:px-6">
            <Link
              href="/"
              className="shrink-0 text-xs text-slate-500 hover:text-slate-700 sm:text-sm"
            >
              Accueil
            </Link>

            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />

            <Link
              href="/biens"
              className="shrink-0 text-xs text-slate-500 hover:text-slate-700 sm:text-sm"
            >
              Biens
            </Link>

            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />

            <Link
              href={`/biens/${property.id}`}
              className="flex min-w-0 items-center gap-1 truncate text-xs font-medium text-slate-900 sm:text-sm"
            >
              {property.reference && (
                <span className="shrink-0 font-mono text-[10px] text-slate-400 sm:text-xs">
                  {property.reference}
                </span>
              )}
              <span className="truncate">{property.title}</span>
            </Link>
          </div>
        </nav>

        <div className="container mx-auto w-full min-w-0 px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            {/* Contenu principal */}
            <div className="min-w-0 animate-fade-up space-y-6 lg:col-span-2 lg:space-y-8">
              {/* Galerie principale */}
              <div className="relative w-full min-w-0 overflow-hidden rounded-xl bg-slate-100 sm:rounded-2xl">
                <div
                  onClick={() => setShowGallery(true)}
                  className="relative aspect-[4/3] w-full cursor-pointer sm:aspect-[16/9]"
                  aria-label="Voir la galerie d'images en plein écran"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowGallery(true);
                    }
                  }}
                >
                  <Image
                    src={images[currentImageIndex].url}
                    alt={property.title}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-[1.02]"
                    priority
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 66vw"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Navigation galerie */}
                  {images.length > 1 && (
                    <div className="absolute inset-0 flex items-center justify-between px-2 sm:px-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          goToPrev();
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur-sm hover:bg-white sm:h-12 sm:w-12"
                        aria-label="Image précédente"
                      >
                        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          goToNext();
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur-sm hover:bg-white sm:h-12 sm:w-12"
                        aria-label="Image suivante"
                      >
                        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>
                    </div>
                  )}

                  {/* Indicateurs images */}
                  {images.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-4">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(i);
                          }}
                          className={`h-2 w-2 rounded-full transition-colors ${
                            i === currentImageIndex
                              ? 'bg-white'
                              : 'bg-white/50 hover:bg-white/75'
                          }`}
                          aria-label={`Image ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Actions galerie */}
                  <div className="absolute right-2 top-2 flex gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowGallery(true);
                      }}
                      className="h-9 w-9 bg-white/90 text-slate-900 backdrop-blur-sm hover:bg-white sm:h-10 sm:w-10"
                      aria-label="Plein écran"
                    >
                      <Expand className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 bg-white/90 text-slate-900 backdrop-blur-sm hover:bg-white sm:h-10 sm:w-10"
                      aria-label="Partager"
                      onClick={(e) => {
                        e.stopPropagation();
                        shareLink(window.location.href, property.title);
                      }}
                    >
                      <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 bg-white/90 text-slate-900 backdrop-blur-sm hover:bg-white sm:h-10 sm:w-10"
                      aria-label={
                        isFavorite
                          ? 'Retirer des favoris'
                          : 'Ajouter aux favoris'
                      }
                      aria-pressed={isFavorite}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite();
                      }}
                    >
                      <Heart
                        className={
                          isFavorite
                            ? 'h-4 w-4 fill-red-500 text-red-500 sm:h-5 sm:w-5'
                            : 'h-4 w-4 sm:h-5 sm:w-5'
                        }
                      />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Miniatures */}
              {images.length > 1 && (
                <div className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-2 sm:gap-3">
                  {images.map((image, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-20 sm:w-28 sm:rounded-xl ${
                        i === currentImageIndex
                          ? 'border-blue-500'
                          : 'border-transparent hover:border-slate-300'
                      }`}
                      aria-label={`Voir l'image ${i + 1}`}
                      aria-current={i === currentImageIndex ? 'true' : 'false'}
                    >
                      <Image
                        src={image.url}
                        alt={`${property.title} - Image ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Titre, badges et prix */}
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs sm:text-sm">
                      {TRANSACTION_LABELS[property.transactionType]}
                    </Badge>

                    <Badge variant="secondary" className="text-xs sm:text-sm">
                      {TYPE_LABELS[property.type]}
                    </Badge>

                    <Badge
                      variant={
                        property.status === 'AVAILABLE'
                          ? 'default'
                          : property.status === 'SOLD' ||
                              property.status === 'RENTED'
                            ? 'destructive'
                            : 'outline'
                      }
                      className="text-xs sm:text-sm"
                    >
                      {STATUS_LABELS[property.status] || property.status}
                    </Badge>
                  </div>

                  <h1 className="mt-3 break-words text-2xl font-bold leading-tight text-slate-900 sm:text-4xl">
                    {property.title}
                  </h1>

                  {property.reference && (
                    <p className="mt-1 break-all text-xs text-slate-500 sm:text-sm">
                      Référence : {property.reference}
                    </p>
                  )}
                </div>

                <div className="min-w-0 text-left sm:shrink-0 sm:text-right">
                  <div className="break-words text-2xl font-bold text-slate-900 sm:text-4xl">
                    {formatPrice(property.price)}
                    {property.transactionType === 'RENTAL' && (
                      <span className="text-base font-normal text-slate-500 sm:text-lg">
                        /mois
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Localisation */}
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                <div className="flex min-w-0 items-center gap-1">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="break-words">
                    {property.city}
                    {property.district ? `, ${property.district}` : ''}
                  </span>
                </div>

                {property.address && (
                  <div className="min-w-0 break-words">
                    {property.address}
                  </div>
                )}

                {property.zipCode && (
                  <div className="break-words">{property.zipCode}</div>
                )}
              </div>

              <Separator />

              {/* Caractéristiques */}
              <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3 sm:p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Home className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Surface</p>
                    <p className="break-words font-semibold text-slate-900">
                      {formatArea(property.surface)}
                    </p>
                  </div>
                </div>

                {property.rooms && (
                  <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3 sm:p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Pièces</p>
                      <p className="font-semibold text-slate-900">
                        {property.rooms}
                      </p>
                    </div>
                  </div>
                )}

                {property.bedrooms && (
                  <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3 sm:p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <LandPlot className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Chambres</p>
                      <p className="font-semibold text-slate-900">
                        {property.bedrooms}
                      </p>
                    </div>
                  </div>
                )}

                {property.bathrooms && (
                  <div className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3 sm:p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Salles de bain</p>
                      <p className="font-semibold text-slate-900">
                        {property.bathrooms}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Description */}
              <div className="prose prose-slate max-w-none min-w-0">
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Description
                </h2>

                <p className="mt-4 break-words whitespace-pre-wrap text-sm leading-relaxed text-slate-600 sm:text-base">
                  {property.description ||
                    'Aucune description disponible pour ce bien.'}
                </p>
              </div>

              {/* Équipements */}
              {(property.parking ||
                property.furnished ||
                property.elevator ||
                property.balcony ||
                property.garden ||
                property.cellar) && (
                <>
                  <Separator />

                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    Équipements
                  </h2>

                  <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
                    {property.parking && (
                      <Badge variant="secondary" className="gap-1">
                        <Home className="h-3 w-3" />
                        Parking
                      </Badge>
                    )}

                    {property.furnished && (
                      <Badge variant="secondary" className="gap-1">
                        <LandPlot className="h-3 w-3" />
                        Meublé
                      </Badge>
                    )}

                    {property.elevator && (
                      <Badge variant="secondary" className="gap-1">
                        <Briefcase className="h-3 w-3" />
                        Ascenseur
                      </Badge>
                    )}

                    {property.balcony && (
                      <Badge variant="secondary" className="gap-1">
                        <LandPlot className="h-3 w-3" />
                        Balcon
                      </Badge>
                    )}

                    {property.garden && (
                      <Badge variant="secondary" className="gap-1">
                        <LandPlot className="h-3 w-3" />
                        Jardin
                      </Badge>
                    )}

                    {property.cellar && (
                      <Badge variant="secondary" className="gap-1">
                        <Briefcase className="h-3 w-3" />
                        Cave
                      </Badge>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Contact agent */}
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/60 p-4 transition-shadow duration-500 hover:shadow-lg sm:p-6">
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Contactez l&apos;agent
                </h2>

                <p className="mt-2 break-words text-sm text-slate-600 sm:text-base">
                  {property.fieldAgent?.user
                    ? fullName(property.fieldAgent.user)
                    : 'Notre équipe'}
                  {agencyPhone && ` · ${agencyPhone}`}
                </p>

                <div className="mt-4 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
                  {agencyPhone && (
                    <Button
                      asChild
                      className="w-full bg-slate-900 hover:bg-slate-800 min-[420px]:w-auto"
                    >
                      <a href={`tel:${agencyPhone.replace(/[^\d+]/g, '')}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        Appeler
                      </a>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    asChild
                    className="w-full min-[420px]:w-auto"
                  >
                    <Link href={`/contact?property=${property.id}`}>
                      <Mail className="mr-2 h-4 w-4" />
                      Envoyer un message
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Colonne informations */}
            <aside
              className="min-w-0 animate-fade-up lg:col-span-1"
              style={{ animationDelay: '200ms' }}
            >
              <Card className="min-w-0 lg:sticky lg:top-24">
                <CardContent className="p-4 sm:p-6">
                  <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                    Informations clés
                  </h2>

                  <dl className="mt-4 space-y-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <dt className="shrink-0 text-sm text-slate-600">
                        Référence
                      </dt>
                      <dd className="min-w-0 break-all text-right font-mono text-xs font-medium text-slate-900 sm:text-sm">
                        {property.reference || '-'}
                      </dd>
                    </div>

                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <dt className="shrink-0 text-sm text-slate-600">
                        Type
                      </dt>
                      <dd className="min-w-0 break-words text-right text-sm font-medium text-slate-900">
                        {TYPE_LABELS[property.type]}
                      </dd>
                    </div>

                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <dt className="shrink-0 text-sm text-slate-600">
                        Transaction
                      </dt>
                      <dd className="min-w-0 break-words text-right text-sm font-medium text-slate-900">
                        {TRANSACTION_LABELS[property.transactionType]}
                      </dd>
                    </div>

                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <dt className="shrink-0 text-sm text-slate-600">
                        Statut
                      </dt>
                      <dd className="min-w-0 break-words text-right text-sm font-medium text-slate-900">
                        {STATUS_LABELS[property.status] || property.status}
                      </dd>
                    </div>

                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <dt className="shrink-0 text-sm text-slate-600">
                        Surface
                      </dt>
                      <dd className="min-w-0 break-words text-right text-sm font-medium text-slate-900">
                        {formatArea(property.surface)}
                      </dd>
                    </div>

                    {property.rooms && (
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <dt className="shrink-0 text-sm text-slate-600">
                          Pièces
                        </dt>
                        <dd className="min-w-0 text-right text-sm font-medium text-slate-900">
                          {property.rooms}
                        </dd>
                      </div>
                    )}

                    {property.bedrooms && (
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <dt className="shrink-0 text-sm text-slate-600">
                          Chambres
                        </dt>
                        <dd className="min-w-0 text-right text-sm font-medium text-slate-900">
                          {property.bedrooms}
                        </dd>
                      </div>
                    )}

                    {property.bathrooms && (
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <dt className="shrink-0 text-sm text-slate-600">
                          Salles de bain
                        </dt>
                        <dd className="min-w-0 text-right text-sm font-medium text-slate-900">
                          {property.bathrooms}
                        </dd>
                      </div>
                    )}

                    {property.floor && (
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <dt className="shrink-0 text-sm text-slate-600">
                          Étage
                        </dt>
                        <dd className="min-w-0 text-right text-sm font-medium text-slate-900">
                          {property.floor}
                          {property.totalFloors
                            ? ` / ${property.totalFloors}`
                            : ''}
                        </dd>
                      </div>
                    )}

                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <dt className="shrink-0 text-sm text-slate-600">
                        Prix
                      </dt>
                      <dd className="min-w-0 break-words text-right text-base font-bold text-slate-900 sm:text-lg">
                        {formatPrice(property.price)}
                        {property.transactionType === 'RENTAL' && (
                          <span className="text-sm font-normal text-slate-500">
                            /mois
                          </span>
                        )}
                      </dd>
                    </div>

                    {property.charges && (
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <dt className="shrink-0 text-sm text-slate-600">
                          Charges
                        </dt>
                        <dd className="min-w-0 break-words text-right text-sm font-medium text-slate-900">
                          {formatPrice(property.charges)}/mois
                        </dd>
                      </div>
                    )}

                    {property.deposit && (
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <dt className="shrink-0 text-sm text-slate-600">
                          Dépôt de garantie
                        </dt>
                        <dd className="min-w-0 break-words text-right text-sm font-medium text-slate-900">
                          {formatPrice(property.deposit)}
                        </dd>
                      </div>
                    )}

                    {getSpecificDetails(property).map((row) => (
                      <div
                        key={row.label}
                        className="flex min-w-0 items-start justify-between gap-3"
                      >
                        <dt className="min-w-0 break-words text-sm text-slate-600">
                          {row.label}
                        </dt>
                        <dd className="min-w-0 break-words text-right text-sm font-medium text-slate-900">
                          {row.value}
                        </dd>
                      </div>
                    ))}

                    <div className="flex min-w-0 items-start justify-between gap-3 border-t border-slate-200 pt-4">
                      <dt className="shrink-0 text-sm text-slate-600">
                        Date d&apos;ajout
                      </dt>
                      <dd className="min-w-0 text-right text-sm font-medium text-slate-900">
                        {new Date(property.createdAt).toLocaleDateString(
                          'fr-FR'
                        )}
                      </dd>
                    </div>
                  </dl>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <Button
                      asChild
                      className="w-full bg-slate-900 py-3 hover:bg-slate-800"
                    >
                      <Link href={`/contact?property=${property.id}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        Contacter l&apos;agence
                      </Link>
                    </Button>

                    <Button
                      variant="outline"
                      asChild
                      className="w-full py-3"
                    >
                      <Link
                        href={`/contact?property=${property.id}&demande=visite`}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Demander une visite
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
