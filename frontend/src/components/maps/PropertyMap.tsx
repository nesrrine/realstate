'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fixLeafletDefaultIcon } from '@/lib/leaflet-default-icon';

fixLeafletDefaultIcon();

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  title?: string;
  height?: string;
  zoom?: number;
  interactive?: boolean;
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
}

export function PropertyMap({
  latitude,
  longitude,
  address,
  title,
  height = '400px',
  zoom = 15,
  interactive = true,
}: PropertyMapProps) {
  const position: [number, number] = [latitude, longitude];

  return (
    <div style={{ height, width: '100%', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <MapContainer
        center={position}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        zoomControl={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <div className="min-w-[200px]">
              {title && <strong className="block mb-2">{title}</strong>}
              {address && <span className="text-sm block mb-3">{address}</span>}
              <a
                href={`https://www.google.com/maps?q=${position[0]},${position[1]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-primary hover:underline font-medium"
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 0C6.134 0 3 3.134 3 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5c-1.381 0-2.5-1.119-2.5-2.5S8.619 4.5 10 4.5s2.5 1.119 2.5 2.5S11.381 9.5 10 9.5z"/>
                </svg>
                Ouvrir dans Google Maps
              </a>
            </div>
          </Popup>
        </Marker>
        <MapUpdater center={position} zoom={zoom} />
      </MapContainer>
    </div>
  );
}
