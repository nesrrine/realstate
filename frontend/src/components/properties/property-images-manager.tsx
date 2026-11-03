'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GripVertical, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { propertiesService, type PropertyImage } from '@/services/properties.service';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_IMAGES = 20;

function filterFiles(files: File[], currentCount: number): File[] {
  const valid: File[] = [];
  for (const f of files) {
    if (!ALLOWED.includes(f.type)) {
      toast.error(`${f.name} : format non supporté (JPG, PNG, WEBP, GIF)`);
    } else if (f.size > MAX_SIZE) {
      toast.error(`${f.name} : dépasse 10 Mo`);
    } else {
      valid.push(f);
    }
  }
  const room = Math.max(MAX_IMAGES - currentCount, 0);
  if (valid.length > room) {
    toast.error(`Maximum ${MAX_IMAGES} photos par bien`);
    return valid.slice(0, room);
  }
  return valid;
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// ── Zone d'ajout ────────────────────────────────────────────────────
function Dropzone({
  onFiles, disabled, loading,
}: { onFiles: (files: File[]) => void; disabled?: boolean; loading?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onClick={() => !disabled && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
        over ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        ref={ref}
        type="file"
        multiple
        hidden
        accept={ALLOWED.join(',')}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      {loading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <ImagePlus className="h-8 w-8 text-muted-foreground" />}
      <p className="text-sm font-medium">{loading ? 'Envoi en cours…' : 'Cliquez ou glissez vos photos ici'}</p>
      <p className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF · 10 Mo max · {MAX_IMAGES} photos max</p>
    </div>
  );
}

// ── Grille (affichage + glisser-déposer) ────────────────────────────
interface GridItem { id: string; url: string; isCover: boolean }

function ImageGrid({
  items, onDelete, onSetCover, onMove, disabled,
}: {
  items: GridItem[];
  onDelete: (id: string) => void;
  onSetCover: (id: string) => void;
  onMove: (from: number, to: number) => void;
  disabled?: boolean;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.id}
          draggable={!disabled}
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex !== null && dragIndex !== i) onMove(dragIndex, i);
            setDragIndex(null);
          }}
          onDragEnd={() => setDragIndex(null)}
          className={cn(
            'group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted',
            item.isCover && 'ring-2 ring-primary',
            dragIndex === i && 'opacity-40',
          )}
        >
          <Image
                            src={item.url}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            loading="lazy"
                            draggable={false}
                            className="h-full w-full object-cover"
                          />
          <GripVertical className="absolute right-2 top-2 h-4 w-4 text-white drop-shadow" />
          {item.isCover && <Badge className="absolute left-2 top-2">Principale</Badge>}

          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2">
            {!item.isCover && (
              <Button type="button" size="icon" variant="secondary" className="h-7 w-7" disabled={disabled}
                title="Définir comme principale" onClick={() => onSetCover(item.id)}>
                <Star className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button type="button" size="icon" variant="destructive" className="h-7 w-7" disabled={disabled}
              title="Supprimer" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mode modification : appels API directs ──────────────────────────
function LiveImages({ propertyId }: { propertyId: string }) {
  const qc = useQueryClient();
  const key = ['properties', 'images', propertyId] as const;

  const { data: images = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => propertiesService.getImages(propertyId),
  });

  const refresh = (list?: PropertyImage[]) => {
    if (list) qc.setQueryData(key, list);
    qc.invalidateQueries({ queryKey: queryKeys.properties.all });
  };

  const upload = useMutation({
    mutationFn: (files: File[]) => propertiesService.uploadImages(propertyId, files),
    onSuccess: (r) => { toast.success(`${r.length} photo(s) ajoutée(s)`); refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => propertiesService.deleteImage(propertyId, id),
    onSuccess: () => { toast.success('Photo supprimée'); refresh(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const cover = useMutation({
    mutationFn: (id: string) => propertiesService.setCoverImage(propertyId, id),
    onSuccess: (list) => { toast.success('Photo principale mise à jour'); refresh(list); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => propertiesService.reorderImages(propertyId, ids),
    onSuccess: (list) => refresh(list),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const busy = upload.isPending || remove.isPending || cover.isPending || reorder.isPending;

  return (
    <div className="space-y-4">
      <Dropzone
        loading={upload.isPending}
        disabled={busy || images.length >= MAX_IMAGES}
        onFiles={(files) => {
          const valid = filterFiles(files, images.length);
          if (valid.length) upload.mutate(valid);
        }}
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement des photos…</p>
      ) : images.length > 0 ? (
        <ImageGrid
          disabled={busy}
          items={images.map((img) => ({ id: img.id, url: img.url, isCover: img.isCover }))}
          onDelete={(id) => remove.mutate(id)}
          onSetCover={(id) => cover.mutate(id)}
          onMove={(from, to) => reorder.mutate(arrayMove(images, from, to).map((i) => i.id))}
        />
      ) : null}
      <p className="text-xs text-muted-foreground">
        Glissez les photos pour les réordonner. La première est la photo principale.
      </p>
    </div>
  );
}

// ── Mode création : fichiers en attente ─────────────────────────────
function PendingImages({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const ids = previews.map((p, i) => `${p.file.name}-${p.file.size}-${i}`);

  return (
    <div className="space-y-4">
      <Dropzone
        disabled={files.length >= MAX_IMAGES}
        onFiles={(added) => onChange([...files, ...filterFiles(added, files.length)])}
      />
      {previews.length > 0 && (
        <ImageGrid
          items={previews.map((p, i) => ({ id: ids[i], url: p.url, isCover: i === 0 }))}
          onDelete={(id) => onChange(files.filter((_, i) => ids[i] !== id))}
          onSetCover={(id) => onChange(arrayMove(files, ids.indexOf(id), 0))}
          onMove={(from, to) => onChange(arrayMove(files, from, to))}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Les photos seront envoyées à l&apos;enregistrement du bien. La première est la photo principale.
      </p>
    </div>
  );
}

// ── Export ──────────────────────────────────────────────────────────
interface Props {
  propertyId?: string;
  pendingFiles: File[];
  onPendingChange: (files: File[]) => void;
}

export function PropertyImagesManager({ propertyId, pendingFiles, onPendingChange }: Props) {
  return propertyId ? (
    <LiveImages propertyId={propertyId} />
  ) : (
    <PendingImages files={pendingFiles} onChange={onPendingChange} />
  );
}