'use client';

import { ClientForm } from '@/components/clients/client-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/crm/clients">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouveau client</h1>
          <p className="text-muted-foreground">
            Ajoutez un nouveau client à votre base
          </p>
        </div>
      </div>

      <ClientForm mode="create" />
    </div>
  );
}
