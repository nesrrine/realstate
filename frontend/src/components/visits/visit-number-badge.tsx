import { Badge } from "@/components/ui/badge";

/** 1re visite d'un client = « Visite », les suivantes = « Revisite » (avec leur rang). */
export function visitNumberLabel(n: number) {
  return n <= 1 ? "1re visite" : `Revisite · ${n}e visite`;
}

export function VisitNumberBadge({ number }: { number?: number | null }) {
  if (!number) return null;
  return (
    <Badge
      variant="outline"
      className={
        number > 1
          ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
          : "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300"
      }
    >
      {visitNumberLabel(number)}
    </Badge>
  );
}

/** Lien « Planifier une revisite » : client et biens pré-remplis dans le formulaire. */
export function revisitHref(clientId: string, propertyIds: string[] = []) {
  const q = new URLSearchParams({ clientId });
  if (propertyIds.length) q.set("propertyIds", propertyIds.join(","));
  return `/crm/visits/new?${q.toString()}`;
}
