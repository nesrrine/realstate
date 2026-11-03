import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DataTableMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

function buildPages(page: number, total: number): (number | '…')[] {
  const set = new Set([1, total, page - 1, page, page + 1].filter(
    (p) => p >= 1 && p <= total,
  ));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}

interface Props {
  meta: DataTableMeta;
  onPage: (page: number) => void;
  onLimit: (limit: number) => void;
}

export function DataTablePagination({ meta, onPage, onLimit }: Props) {
  const { total, page, limit, totalPages } = meta;
  const hasPrev = meta.hasPrev ?? page > 1;
  const hasNext = meta.hasNext ?? page < totalPages;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        {from}–{to} sur {total} élément{total > 1 ? 's' : ''}
      </p>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Par page
          <Select value={String(limit)} onValueChange={(v) => onLimit(Number(v))}>
            <SelectTrigger className="h-8 w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!hasPrev}
            onClick={() => onPage(page - 1)}
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {buildPages(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`dots-${i}`} className="px-2 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                size="icon"
                className="h-8 w-8"
                variant={p === page ? 'default' : 'outline'}
                onClick={() => onPage(p)}
                aria-label={`Page ${p}`}
              >
                {p}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!hasNext}
            onClick={() => onPage(page + 1)}
            aria-label="Page suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
