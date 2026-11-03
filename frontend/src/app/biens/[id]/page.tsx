import { notFound } from 'next/navigation';
import { PropertyDetail } from '@/components/properties/PropertyDetail';
import { publicService } from '@/services/public.service';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const property = await publicService.getPropertyById(id);
    return {
      title: `${property.title} | Le Portail Immobilier`,
      description: property.description?.slice(0, 160) || 'Détails du bien immobilier',
      openGraph: {
        title: property.title,
        description: property.description?.slice(0, 160) || 'Détails du bien immobilier',
        images: property.images?.[0]?.url ? [property.images[0].url] : [],
        type: 'website',
      },
    };
  } catch {
    return {
      title: 'Bien non trouvé | Le Portail Immobilier',
    };
  }
}

export default async function PropertyPage({ params }: Props) {
  const { id } = await params;

  let property;
  try {
    property = await publicService.getPropertyById(id);
  } catch {
    notFound();
  }
  // Téléphone de l'agence (Paramètres) pour le bouton « Appeler »
  const agencyPhone = await publicService
    .getAgency()
    .then((a) => a.phone)
    .catch(() => '');
  return <PropertyDetail property={property} agencyPhone={agencyPhone} />;
}