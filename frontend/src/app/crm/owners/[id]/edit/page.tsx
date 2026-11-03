'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { OwnerForm } from '@/components/owners/owner-form';
import { ownersService } from '@/services/owners.service';
import { queryKeys } from '@/lib/query-keys';
import { fullName } from '@/lib/property-constants';
import { useAuth } from '@/providers/AuthProvider';

export default function EditOwnerPage() {
  const { id } = useParams<{ id: string }>();
  const { isManager, isAdmin, isLoading: authLoading } = useAuth();
  const canManage = isManager || isAdmin;

  const { data: owner, isLoading } = useQuery({
    queryKey: queryKeys.owners.detail(id),
    queryFn: () => ownersService.getById(id),
    enabled: !!id && canManage,
  });

  if (authLoading || (canManage && isLoading)) {
    return <div className="py-12 text-center">Chargement...</div>;
  }
  if (!canManage) {
    return <div className="py-12 text-center">Accès réservé aux managers et administrateurs.</div>;
  }
  if (!owner) return <div className="py-12 text-center">Propriétaire introuvable</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/crm/owners/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Modifier {fullName(owner)}</h1>
          <p className="text-muted-foreground">Fiche propriétaire</p>
        </div>
      </div>
      <OwnerForm owner={owner} />
    </div>
  );
}
