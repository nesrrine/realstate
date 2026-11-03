'use client';

import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { useAuth } from '@/providers/AuthProvider';

/** ?propertyId=… : bien pré-sélectionné depuis sa fiche */
function PrefilledTransactionForm() {
  const propertyId = useSearchParams().get('propertyId') ?? undefined;
  return <TransactionForm defaultPropertyId={propertyId} />;
}

export default function NewTransactionPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role === 'AGENT') {
      router.replace('/crm/transactions');
    }
  }, [user, router]);

  if (!user || user.role === 'AGENT') return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crm/transactions">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouvelle transaction</h1>
          <p className="text-muted-foreground">
            La commission sera calculée selon la configuration agence
          </p>
        </div>
      </div>
      <Suspense>
        <PrefilledTransactionForm />
      </Suspense>
    </div>
  );
}
