import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PropertyForm } from '@/components/properties/property-form';

export default function NewPropertyPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/crm/properties"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Retour à la liste
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Nouveau bien</h1>
      </div>

      <PropertyForm mode="create" />
    </div>
  );
}