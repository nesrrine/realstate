import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

/** Page temporaire : à remplacer module par module (étapes 4 à 8). */
export function ModulePlaceholder({ title, description, icon }: ModulePlaceholderProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} title="Module en cours de construction" description="Cette page sera connectée à l'API prochainement." />
    </>
  );
}
