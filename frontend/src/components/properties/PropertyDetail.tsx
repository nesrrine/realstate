'use client';

import { useEffect, useState } from 'react';
import { shareLink } from '@/lib/share';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, MapPin, Home, LandPlot, Briefcase, Calendar, Phone, Mail, Share2, Heart, ArrowLeft, Expand, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatPrice, formatArea, getCoverImage, TYPE_LABELS, TRANSACTION_LABELS, STATUS_LABELS, fullName } from '@/lib/public-constants';
import { Property } from '@/services/public.service';
import { GalleryModal } from './GalleryModal';
import { getSpecificDetails } from '@/lib/property-specific-details';

interface PropertyDetailProps {
  property: Property;
  /** Téléphone de l'agence (Paramètres) : bouton « Appeler » */
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
  // Favoris du visiteur, gardés dans son navigateur
  const [isFavorite, setIsFavorite] = useState(false);
  useEffect(() => setIsFavorite(readFavorites().includes(String(property.id))), [property.id]);
  const toggleFavorite = () => {
    const id = String(property.id);
    const next = isFavorite ? readFavorites().filter((f) => f !== id) : [...readFavorites(), id];
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {
      // stockage indisponible (navigation privée) : favori pour cette page seulement
    }
    setIsFavorite(!isFavorite);
  };

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);

  const images = property.images?.length ? property.images : [{ url: getCoverImage(property.images), isCover: true }];

  const goToPrev = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleImageSelect = (index: number) => {
    setCurrentImageIndex(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrev();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') setShowGallery(false);
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

      <article className="min-h-screen">
        <nav className="sticky top-16 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm" aria-label="Fil d'Ariane">
          <div className="container mx-auto flex items-center gap-2 px-4 py-3 sm:px-6">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">Accueil</Link>
            <ChevronRight className="h-4 w-4 text-slate-400" />
            <Link href="/biens" className="text-sm text-slate-500 hover:text-slate-700">Biens</Link>
            <ChevronRight className="h-4 w-4 text-slate-400" />
            <Link href={`/biens/${property.id}`} className="text-sm font-medium text-slate-900 truncate max-w-[200px] flex items-center gap-1">
              <span className="text-xs text-slate-400 font-mono">{property.reference}</span>
              {property.title}
            </Link>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="animate-fade-up lg:col-span-2 space-y-8">
              <div className="relative rounded-2xl overflow-hidden bg-slate-100">
                <div
                  onClick={() => setShowGallery(true)}
                  className="relative aspect-[16/9] w-full cursor-pointer"
                  aria-label="Voir la galerie d'images en plein écran"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowGallery(true); } }}
                >
                  <Image
                    src={images[currentImageIndex].url}
                    alt={property.title}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-[1.02]"
                    priority
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-between px-4">
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur-sm hover:bg-white"
                          aria-label="Image précédente"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); goToNext(); }}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur-sm hover:bg-white"
                          aria-label="Image suivante"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i); }}
                        className={`h-2 w-2 rounded-full transition-colors ${
                          i === currentImageIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
                        }`}
                        aria-label={`Image ${i + 1}`}
                      />
                    ))}
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowGallery(true)}
                      className="bg-white/90 text-slate-900 backdrop-blur-sm"
                      aria-label="Plein écran"
                    >
                      <Expand className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-white/90 text-slate-900 backdrop-blur-sm"
                      aria-label="Partager"
                      onClick={() => shareLink(window.location.href, property.title)}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="bg-white/90 text-slate-900 backdrop-blur-sm"
                      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      aria-pressed={isFavorite}
                      onClick={toggleFavorite}
                    >
                      <Heart className={isFavorite ? 'h-5 w-5 fill-red-500 text-red-500' : 'h-5 w-5'} />
                    </Button>
                  </div>
                </div>
              </div>

              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                  {images.map((image, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`relative flex-shrink-0 h-20 w-28 rounded-xl overflow-hidden border-2 transition-all ${
                        i === currentImageIndex ? 'border-blue-500' : 'border-transparent hover:border-slate-300'
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

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-sm">
                      {TRANSACTION_LABELS[property.transactionType]}
                    </Badge>
                    <Badge variant="secondary" className="text-sm">
                      {TYPE_LABELS[property.type]}
                    </Badge>
                    <Badge variant={property.status === 'AVAILABLE' ? 'default' : property.status === 'SOLD' || property.status === 'RENTED' ? 'destructive' : 'outline'} className="text-sm">
                      {STATUS_LABELS[property.status] || property.status}
                    </Badge>
                  </div>
                  <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                    {property.title}
                  </h1>
                  {property.reference && (
                    <p className="mt-1 text-sm text-slate-500">Référence : {property.reference}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-slate-900 sm:text-4xl">
                    {formatPrice(property.price)}
                    {property.transactionType === 'RENTAL' && (
                      <span className="text-lg font-normal text-slate-500">/mois</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{property.city}{property.district ? `, ${property.district}` : ''}</span>
                </div>
                {property.address && (
                  <div className="flex items-center gap-1">
                    <span>{property.address}</span>
                  </div>
                )}
                {property.zipCode && (
                  <div className="flex items-center gap-1">
                    <span>{property.zipCode}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Home className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Surface</p>
                    <p className="font-semibold text-slate-900">{formatArea(property.surface)}</p>
                  </div>
                </div>
                {property.rooms && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pièces</p>
                      <p className="font-semibold text-slate-900">{property.rooms}</p>
                    </div>
                  </div>
                )}
                {property.bedrooms && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <LandPlot className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Chambres</p>
                      <p className="font-semibold text-slate-900">{property.bedrooms}</p>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Salles de bain</p>
                      <p className="font-semibold text-slate-900">{property.bathrooms}</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="prose prose-slate max-w-none">
                <h2 className="text-2xl font-bold text-slate-900">Description</h2>
                <p className="mt-4 text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {property.description || 'Aucune description disponible pour ce bien.'}
                </p>
              </div>

              {(property.parking || property.furnished || property.elevator || property.balcony || property.garden || property.cellar) && (
                <>
                  <Separator />
                  <h2 className="text-2xl font-bold text-slate-900">Équipements</h2>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {property.parking && <Badge variant="secondary" className="gap-1"><Home className="h-3 w-3" /> Parking</Badge>}
                    {property.furnished && <Badge variant="secondary" className="gap-1"><LandPlot className="h-3 w-3" /> Meublé</Badge>}
                    {property.elevator && <Badge variant="secondary" className="gap-1"><Briefcase className="h-3 w-3" /> Ascenseur</Badge>}
                    {property.balcony && <Badge variant="secondary" className="gap-1"><LandPlot className="h-3 w-3" /> Balcon</Badge>}
                    {property.garden && <Badge variant="secondary" className="gap-1"><LandPlot className="h-3 w-3" /> Jardin</Badge>}
                    {property.cellar && <Badge variant="secondary" className="gap-1"><Briefcase className="h-3 w-3" /> Cave</Badge>}
                  </div>
                </>
              )}

              <Separator />

              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/60 p-6 transition-shadow duration-500 hover:shadow-lg">
                <h2 className="text-xl font-bold text-slate-900">Contactez l'agent</h2>
                <p className="mt-2 text-slate-600">
                  {property.fieldAgent?.user ? fullName(property.fieldAgent.user) : 'Notre équipe'}
                  {agencyPhone && ` · ${agencyPhone}`}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {agencyPhone && (
                    <Button asChild className="bg-slate-900 hover:bg-slate-800">
                      <a href={`tel:${agencyPhone.replace(/[^\d+]/g, '')}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        Appeler
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <Link href={`/contact?property=${property.id}`}>
                      <Mail className="mr-2 h-4 w-4" />
                      Envoyer un message
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <aside className="animate-fade-up lg:col-span-1" style={{ animationDelay: '200ms' }}>
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold text-slate-900">Informations clés</h2>
                  <dl className="mt-4 space-y-4">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Référence</dt>
                      <dd className="font-medium text-slate-900 font-mono text-sm">{property.reference}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Type</dt>
                      <dd className="font-medium text-slate-900">{TYPE_LABELS[property.type]}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Transaction</dt>
                      <dd className="font-medium text-slate-900">{TRANSACTION_LABELS[property.transactionType]}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Statut</dt>
                      <dd className="font-medium text-slate-900">{STATUS_LABELS[property.status] || property.status}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Surface</dt>
                      <dd className="font-medium text-slate-900">{formatArea(property.surface)}</dd>
                    </div>
                    {property.rooms && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Pièces</dt>
                        <dd className="font-medium text-slate-900">{property.rooms}</dd>
                      </div>
                    )}
                    {property.bedrooms && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Chambres</dt>
                        <dd className="font-medium text-slate-900">{property.bedrooms}</dd>
                      </div>
                    )}
                    {property.bathrooms && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Salles de bain</dt>
                        <dd className="font-medium text-slate-900">{property.bathrooms}</dd>
                      </div>
                    )}
                    {property.floor && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Étage</dt>
                        <dd className="font-medium text-slate-900">{property.floor}{property.totalFloors ? ` / ${property.totalFloors}` : ''}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Prix</dt>
                      <dd className="font-bold text-slate-900 text-lg">{formatPrice(property.price)}{property.transactionType === 'RENTAL' && <span className="text-base font-normal text-slate-500">/mois</span>}</dd>
                    </div>
                    {property.charges && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Charges</dt>
                        <dd className="font-medium text-slate-900">{formatPrice(property.charges)}/mois</dd>
                      </div>
                    )}
                    {property.deposit && (
                      <div className="flex justify-between">
                        <dt className="text-slate-600">Dépôt de garantie</dt>
                        <dd className="font-medium text-slate-900">{formatPrice(property.deposit)}</dd>
                      </div>
                    )}
                    {getSpecificDetails(property).map((row) => (
                      <div key={row.label} className="flex justify-between gap-4">
                        <dt className="text-slate-600">{row.label}</dt>
                        <dd className="text-right font-medium text-slate-900">{row.value}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between pt-4 border-t border-slate-200">
                      <dt className="text-slate-600">Date d'ajout</dt>
                      <dd className="font-medium text-slate-900">{new Date(property.createdAt).toLocaleDateString('fr-FR')}</dd>
                    </div>
                  </dl>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 py-3">
                      <Link href={`/contact?property=${property.id}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        Contacter l'agence
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full py-3">
                      <Link href={`/contact?property=${property.id}&demande=visite`}>
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