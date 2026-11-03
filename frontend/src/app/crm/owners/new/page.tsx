import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OwnerForm } from '@/components/owners/owner-form';

export default function NewOwnerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/crm/owners">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nouveau propriétaire</h1>
          <p className="text-muted-foreground">Ajouter une personne qui vous confie un bien</p>
        </div>
      </div>
      <OwnerForm />
    </div>
  );
}
