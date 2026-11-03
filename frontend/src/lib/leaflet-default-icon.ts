import L from 'leaflet';

/** Supprime l’icône par défaut Leaflet (incompatible avec le bundler Next.js). */
export function fixLeafletDefaultIcon(): void {
  const proto = L.Icon.Default.prototype as L.Icon.Default & {
    _getIconUrl?: () => string;
  };
  delete proto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}
