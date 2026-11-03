'use client';

import dynamic from 'next/dynamic';

export const LocationPickerDynamic = dynamic(
  () => import('./location-picker').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] animate-pulse rounded-lg border border-border bg-muted" />
    ),
  },
);