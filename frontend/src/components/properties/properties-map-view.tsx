'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { type Property } from '@/services/properties.service';

const MultiPropertyMapDynamic = dynamic(
  () => import('@/components/maps/MultiPropertyMapDynamic'),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center bg-muted rounded-lg"
        style={{ height: '600px' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    ),
  },
);

interface PropertiesMapViewProps {
  items: Property[];
}

export function PropertiesMapView({ items }: PropertiesMapViewProps) {
  const propertiesWithLocation = useMemo(
    () =>
      items
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => ({
          id: p.id,
          title: p.title,
          address: p.address,
          city: p.city,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          price: Number(p.price),
          transactionType: p.transactionType,
        })),
    [items],
  );

  if (propertiesWithLocation.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center bg-muted rounded-lg p-12">
        <p className="text-muted-foreground mb-2">
          Aucune propriété avec localisation GPS
        </p>
        <p className="text-sm text-muted-foreground">
          Ajoutez des coordonnées géographiques à vos biens pour les voir sur la carte
        </p>
      </div>
    );
  }

  return (
    <MultiPropertyMapDynamic
      properties={propertiesWithLocation}
      height="600px"
    />
  );
}