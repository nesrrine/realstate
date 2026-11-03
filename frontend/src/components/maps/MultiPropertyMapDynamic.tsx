'use client';

import dynamic from 'next/dynamic';

// Dynamically import MultiPropertyMap with no SSR
const MultiPropertyMap = dynamic(
  () => import('./MultiPropertyMap').then((mod) => mod.MultiPropertyMap),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-muted rounded-lg" style={{ height: '500px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    ),
  }
);

export default MultiPropertyMap;
