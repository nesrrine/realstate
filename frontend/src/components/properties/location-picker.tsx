'use client';

import { useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

// Fix des icônes par défaut (problème classique avec Next.js / webpack)
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export type LatLng = { lat: number; lng: number };

interface LocationPickerProps {
  value?: LatLng | null;
  onChange: (value: LatLng) => void;
  height?: number;
}

// Centre par défaut : Tunis
const DEFAULT_CENTER: LatLng = { lat: 36.8065, lng: 10.1815 };

function ClickHandler({ onChange }: { onChange: (v: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPicker({
  value,
  onChange,
  height = 320,
}: LocationPickerProps) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const m = markerRef.current;
        if (m) {
          const { lat, lng } = m.getLatLng();
          onChange({ lat, lng });
        }
      },
    }),
    [onChange],
  );

  const center = value ?? DEFAULT_CENTER;

  return (
    <div className="overflow-hidden rounded-lg border" style={{ height }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={value ? 15 : 11}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {value && (
          <Marker
            draggable
            position={[value.lat, value.lng]}
            icon={markerIcon}
            ref={markerRef}
            eventHandlers={eventHandlers}
          />
        )}
      </MapContainer>
    </div>
  );
}