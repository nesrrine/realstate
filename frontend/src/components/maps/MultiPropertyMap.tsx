'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { fixLeafletDefaultIcon } from '@/lib/leaflet-default-icon';
import L from 'leaflet';
import { formatPrice } from '@/lib/format';
fixLeafletDefaultIcon();

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  price: number;
  transactionType: string;
}

interface MultiPropertyMapProps {
  properties: Property[];
  height?: string;
  zoom?: number;
}

function FitBoundsUpdater({ properties }: { properties: Property[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (properties.length > 0) {
      const bounds = L.latLngBounds(
        properties.map(p => [p.latitude, p.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, properties]);
  
  return null;
}

export function MultiPropertyMap({
  properties,
  height = '500px',
  zoom = 12,
}: MultiPropertyMapProps) {
  if (properties.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-muted rounded-lg"
        style={{ height, width: '100%' }}
      >
        <p className="text-muted-foreground">Aucune propriété avec localisation</p>
      </div>
    );
  }

  const center: [number, number] = properties.length > 0
    ? [properties[0].latitude, properties[0].longitude]
    : [48.8566, 2.3522]; // Paris par défaut

  return (
    <div style={{ height, width: '100%', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {properties.map((property) => (
          <Marker
            key={property.id}
            position={[property.latitude, property.longitude]}
          >
            <Popup>
              <div className="p-2 min-w-[220px]">
                <Link
                  href={`/crm/properties/${property.id}`}
                  className="font-semibold text-primary hover:underline block mb-1"
                >
                  {property.title}
                </Link>
                <p className="text-sm text-gray-600 mb-1">
                  {property.address}, {property.city}
                </p>
                <p className="text-sm font-medium text-primary mb-3">
                  {formatPrice(Number(property.price))}
                  {property.transactionType === 'RENTAL' ? '/mois' : ''}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs text-blue-600 hover:underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 0C6.134 0 3 3.134 3 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5c-1.381 0-2.5-1.119-2.5-2.5S8.619 4.5 10 4.5s2.5 1.119 2.5 2.5S11.381 9.5 10 9.5z"/>
                  </svg>
                  Ouvrir dans Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBoundsUpdater properties={properties} />
      </MapContainer>
    </div>
  );
}
