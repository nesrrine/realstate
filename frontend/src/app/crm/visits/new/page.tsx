'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VisitForm } from '@/components/visits/visit-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/** ?clientId=…&propertyIds=a,b : revisite pré-remplie depuis une visite ou une fiche client. */
function PrefilledVisitForm() {
  const params = useSearchParams();
  const clientId = params.get('clientId') ?? undefined;
  const propertyIds = params.get('propertyIds')?.split(',').filter(Boolean);
  // ?date=2026-11-05T10:00 : créneau cliqué dans l'agenda
  const date = params.get('date');
  const scheduledAt = date && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date) ? date : undefined;
  return <VisitForm mode="create" prefill={{ clientId, propertyIds, scheduledAt }} />;
}

export default function NewVisitPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crm/visits">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouvelle visite</h1>
          <p className="text-muted-foreground">
            Planifiez une visite ou une revisite de bien immobilier
          </p>
        </div>
      </div>

      <Suspense>
        <PrefilledVisitForm />
      </Suspense>
    </div>
  );
}
