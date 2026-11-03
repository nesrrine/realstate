import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PropertyStatus } from '@/services/properties.service';
import { STATUS_LABELS, STATUS_STYLES } from '@/lib/property-constants';

export function StatusBadge({ status }: { status: PropertyStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function PublicationBadge({ published }: { published: boolean }) {
  return published ? (
    <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-green-700">
      <Eye className="h-3 w-3" /> Publié
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 border-gray-200 bg-gray-50 text-gray-500">
      <EyeOff className="h-3 w-3" /> Non publié
    </Badge>
  );
}