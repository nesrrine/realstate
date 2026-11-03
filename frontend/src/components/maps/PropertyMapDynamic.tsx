'use client';

import dynamic from 'next/dynamic';

// Dynamically import PropertyMap with no SSR to avoid window issues
const PropertyMap = dynamic(
  () => import('./PropertyMap').then((mod) => mod.PropertyMap),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-muted rounded-lg" style={{ height: '400px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    ),
  }
);

export default PropertyMap;
