import { Building2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AGENT_TYPE_LABELS, type AgentType } from '@/services/agents.service';

/** Agent terrain (vert, visites sur place) ou bureau (bleu, accueil et planification). */
export function AgentTypeBadge({ type }: { type?: AgentType | null }) {
  if (!type) return <span className="text-muted-foreground">—</span>;
  const field = type === 'FIELD';
  const Icon = field ? MapPin : Building2;
  return (
    <Badge
      variant="outline"
      className={
        field
          ? 'gap-1 border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'gap-1 border-sky-200 bg-sky-50 text-sky-700'
      }
    >
      <Icon className="h-3 w-3" />
      {AGENT_TYPE_LABELS[type]}
    </Badge>
  );
}
