'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toPng } from 'html-to-image';
import { Eye, Download, Trash2, Image as ImageIcon } from 'lucide-react';
import { studioService, StudioCreation } from '@/services/studio.service';
import { propertiesService, Property } from '@/services/properties.service';
import BluePremiumPoster from '@/components/studio/blue-premium-poster';

const POSTER_W = 1080;
const POSTER_H = 1350;

type Template = 'BLUE_PREMIUM' | 'BLUE_MODERN' | 'LUXURY' | 'MINIMAL' | 'FLASH_SALE';

const TEMPLATES: { value: Template; label: string }[] = [
  { value: 'BLUE_PREMIUM', label: 'Blue Premium' },
  { value: 'BLUE_MODERN', label: 'Blue Modern' },
  { value: 'LUXURY', label: 'Luxury' },
  { value: 'MINIMAL', label: 'Minimal' },
  { value: 'FLASH_SALE', label: 'Flash Sale' },
];

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

interface StudioPropertyMetadata {
  title?: string;
  banner?: string;
  type?: string;
  location?: string;
  phone?: string;
  slogan?: string;
  imageIndex?: number;
}

type StudioProperty = Property & {
  images?: Array<{ id?: string; url: string }>;
  agent?: { user?: { phone?: string } };
};

function StudioAnnonceContent() {
  const searchParams = useSearchParams();

  const [items, setItems] = useState<StudioCreation[]>([]);
  const [total, setTotal] = useState(0);
  const [props, setProps] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState(searchParams.get('propertyId') ?? '');
  const [selected, setSelected] = useState<StudioProperty | null>(null);
  const [template, setTemplate] = useState<Template>('BLUE_PREMIUM');

  const [editTitle, setEditTitle] = useState('');
  const [editBanner, setEditBanner] = useState('À VENDRE');
  const [editType, setEditType] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSlogan, setEditSlogan] = useState('');
  const [imageIndex, setImageIndex] = useState(0);

  const [creating, setCreating] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'download' | 'share' | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  // Affiche cachée en taille réelle (pour l'export PNG)
  const posterRef = useRef<HTMLDivElement>(null);
  // Conteneur de l'aperçu (pour calculer l'échelle)
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const pendingEditsRef = useRef<StudioPropertyMetadata | null>(null);

  // Applique les modifications enregistrées d'une création (stockées dans metadata)
  const applyEdits = (m: StudioPropertyMetadata | null | undefined) => {
    if (!m) return;
    if (m.title !== undefined) setEditTitle(m.title);
    if (m.banner !== undefined) setEditBanner(m.banner);
    if (m.type !== undefined) setEditType(m.type);
    if (m.location !== undefined) setEditLocation(m.location);
    if (m.phone !== undefined) setEditPhone(m.phone);
    if (m.slogan !== undefined) setEditSlogan(m.slogan);
    if (m.imageIndex !== undefined) setImageIndex(m.imageIndex);
  };

  // L'aperçu s'adapte automatiquement à la largeur disponible : pas de scroll, pas de vide
  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / POSTER_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [selected]);

  const refresh = useCallback(
    () =>
      studioService
        .list()
        .then((r) => {
          setItems(r.data);
          setTotal(r.total);
        })
        .catch(() => {}),
    [],
  );

  useEffect(() => {
    refresh();
    propertiesService
      .getAll({ limit: 100 })
      .then((r) => setProps(Array.isArray(r) ? r : (r.data ?? [])))
      .catch(() => {});
  }, [refresh]);

  useEffect(() => {
    if (!propertyId) {
      setSelected(null);
      return;
    }
    propertiesService
      .getById(propertyId)
      .then((p) => {
        setSelected(p as StudioProperty);
        setEditTitle(p.title ?? '');
        setEditBanner('À VENDRE');
        setEditType(p.type ?? 'TERRAIN');
        setEditLocation(p.city ?? '');
        setEditPhone((p.agent?.user as { phone?: string } | undefined)?.phone ?? '');
        setEditSlogan('Terrain idéal pour votre projet');
        setImageIndex(0);
        if (pendingEditsRef.current) {
          applyEdits(pendingEditsRef.current);
          pendingEditsRef.current = null;
        }
      })
      .catch(() => setMessage({ type: 'error', text: 'Impossible de charger le bien.' }));
  }, [propertyId]);

  const flash = (type: 'ok' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const create = async () => {
    if (!propertyId) return;
    setCreating(true);
    try {
      await studioService.create({
        propertyId,
        template,
        format: 'PORTRAIT',
        title: editTitle || 'Nouvelle affiche',
        metadata: {
          title: editTitle,
          banner: editBanner,
          type: editType,
          location: editLocation,
          phone: editPhone,
          slogan: editSlogan,
          imageIndex,
        } as Record<string, unknown>,
      } as StudioCreation);
      await refresh();
      flash('ok', 'Création enregistrée.');
    } catch {
      flash('error', "Erreur lors de l'enregistrement.");
    } finally {
      setCreating(false);
    }
  };

  const generatePng = () =>
    toPng(posterRef.current!, { width: POSTER_W, height: POSTER_H, pixelRatio: 2, cacheBust: true });

  const download = async () => {
    if (!posterRef.current) return;
    setExporting('download');
    try {
      const dataUrl = await generatePng();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `affiche-${(editTitle || 'annonce').replace(/\s+/g, '-').toLowerCase()}.png`;
      a.click();
    } catch {
      flash('error', "Échec de l'export de l'image.");
    } finally {
      setExporting(null);
    }
  };

  const share = async () => {
    if (!posterRef.current) return;
    setExporting('share');
    try {
      const dataUrl = await generatePng();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'affiche.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: editTitle });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        flash('ok', 'Partage indisponible : lien copié.');
      }
    } catch (e) {
      if (e && typeof e === 'object' && 'name' in e && e.name !== 'AbortError') {
        flash('error', 'Échec du partage.');
      }
    } finally {
      setExporting(null);
    }
  };

  // Charge une création dans l'éditeur (bien + modèle + modifications enregistrées)
  const loadCreation = (c: StudioCreation): boolean => {
    const cWithProperty = c as StudioCreation & { propertyId?: string; property?: { id?: string } };
    const pid = cWithProperty.propertyId ?? cWithProperty.property?.id;
    if (!pid) {
      flash('error', 'Bien introuvable pour cette création.');
      return false;
    }
    const m = (c as StudioCreation & { metadata?: StudioPropertyMetadata }).metadata;
    setTemplate(c.template as Template);
    if (pid === propertyId && selected) {
      applyEdits(m); // même bien déjà affiché : on applique directement
    } else {
      pendingEditsRef.current = m ?? null;
      setPropertyId(pid);
    }
    return true;
  };

  // Voir : affiche la création dans l'éditeur et remonte en haut
  const viewCreation = (c: StudioCreation) => {
    if (loadCreation(c)) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Télécharger : charge la création puis exporte le PNG automatiquement
  const downloadCreation = (c: StudioCreation) => {
    if (loadCreation(c)) setPendingDownload(true);
  };

  useEffect(() => {
    if (!pendingDownload || !selected || selected.id !== propertyId) return;
    const t = setTimeout(async () => {
      await download();
      setPendingDownload(false);
    }, 800); // laisse le temps à l'image de se charger
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDownload, selected, propertyId]);

  const deleteCreation = async (c: StudioCreation) => {
    if (!window.confirm(`Supprimer « ${c.title} » ?`)) return;
    setDeletingId(c.id);
    try {
      type StudioServiceWithDelete = typeof studioService & {
        remove?: (id: string) => Promise<void>;
        delete?: (id: string) => Promise<void>;
      };
      const svc = studioService as StudioServiceWithDelete;
      const del = svc.remove ?? svc.delete;
      if (!del) throw new Error('studioService.remove manquant');
      await del.call(studioService, c.id);
      await refresh();
      flash('ok', 'Création supprimée.');
    } catch {
      flash('error', 'Suppression impossible.');
    } finally {
      setDeletingId(null);
    }
  };

  const posterProps = selected && {
    title: editTitle || selected.title,
    bannerText: editBanner,
    propertyType: editType || selected.type,
    template,
    location: editLocation || selected.city,
    surface: selected.surface,
    price: selected.price,
    pricePerSqm: selected.pricePerSqm ?? undefined,
    phone: (editPhone || selected.agent?.user?.phone) ?? undefined,
    slogan: editSlogan,
    imageUrl: selected.images?.[imageIndex]?.url,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold">IMMOBILIER STUDIO</h1>
        <p className="text-muted-foreground">Créez vos annonces immobilières en quelques clics.</p>
      </div>

      {/* Barre d'actions */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow">
        <div className="w-44">
          <Field label="Modèle">
            <select value={template} onChange={(e) => setTemplate(e.target.value as Template)} className={inputCls}>
              {TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="min-w-[220px] flex-1">
          <Field label="Bien">
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputCls}>
              <option value="">Choisir un bien</option>
              {props.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button
          onClick={create}
          disabled={!propertyId || creating}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? 'Création...' : 'Nouvelle création'}
        </button>
      </div>

      {message && (
        <div
          className={`fixed right-6 top-20 z-50 rounded-lg px-4 py-3 text-sm shadow-lg ${
            message.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Éditeur + aperçu */}
      {selected && posterProps ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* Aperçu : seulement l'affiche, sans cadre ni scroll */}
          <div className="mx-auto w-full max-w-[420px] lg:mx-0">
            <div
              ref={previewRef}
              className="relative w-full overflow-hidden rounded-xl shadow-lg"
              style={{ aspectRatio: `${POSTER_W} / ${POSTER_H}` }}
            >
              <div
                style={{
                  width: POSTER_W,
                  height: POSTER_H,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
              >
                <BluePremiumPoster {...posterProps} />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={download}
                disabled={!!exporting}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {exporting === 'download' ? 'Export...' : 'Télécharger PNG'}
              </button>
              <button
                onClick={share}
                disabled={!!exporting}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {exporting === 'share' ? 'Préparation...' : 'Partager image'}
              </button>
            </div>
          </div>

          {/* Champs de personnalisation */}
          <div className="h-fit space-y-4 rounded-xl bg-white p-4 shadow">
            <h2 className="font-semibold">Personnalisation</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Titre">
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={inputCls} placeholder="Titre" />
              </Field>
              <Field label="Bandeau">
                <input value={editBanner} onChange={(e) => setEditBanner(e.target.value)} className={inputCls} placeholder="À VENDRE" />
              </Field>
              <Field label="Type de bien">
                <input value={editType} onChange={(e) => setEditType(e.target.value)} className={inputCls} placeholder="TERRAIN" />
              </Field>
              <Field label="Localisation">
                <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className={inputCls} placeholder="Tunis" />
              </Field>
              <Field label="Téléphone">
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputCls} placeholder="+216 ..." />
              </Field>
              <Field label="Slogan">
                <input value={editSlogan} onChange={(e) => setEditSlogan(e.target.value)} className={inputCls} placeholder="Slogan" />
              </Field>
              {(selected.images?.length ?? 0) > 1 && (
                <Field label="Photo">
                  <select value={imageIndex} onChange={(e) => setImageIndex(Number(e.target.value))} className={inputCls}>
                    {selected.images.map((img, i) => (
                      <option key={img.id ?? i} value={i}>
                        Photo {i + 1}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </div>

          {/* Affiche cachée en taille réelle, utilisée uniquement pour l'export */}
          <div aria-hidden style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }}>
            <div ref={posterRef} style={{ width: POSTER_W, height: POSTER_H }}>
              <BluePremiumPoster {...posterProps} />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center text-gray-500">
          Choisissez un bien pour générer son affiche.
        </div>
      )}

      {/* Historique */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Créations</h2>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">{total}</span>
        </div>

        {items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">Aucune création pour le moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-3">Création</th>
                  <th className="px-5 py-3">Modèle</th>
                  <th className="px-5 py-3">Format</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((c) => {
                  const cWithProperty = c as StudioCreation & {
                    property?: { images?: Array<{ url: string }>; city?: string };
                    createdAt?: string;
                  };
                  const prop = cWithProperty.property;
                  const thumb = prop?.images?.[0]?.url;
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-blue-50/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">{c.title}</p>
                            {prop?.city && <p className="truncate text-xs text-gray-500">{prop.city}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {c.template}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {c.format}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {cWithProperty.createdAt ? new Date(cWithProperty.createdAt).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => viewCreation(c)}
                            title="Voir"
                            aria-label="Voir"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-blue-100 hover:text-blue-700"
                          >
                            <Eye className="h-[18px] w-[18px]" />
                          </button>
                          <button
                            onClick={() => downloadCreation(c)}
                            disabled={!!exporting || pendingDownload}
                            title="Télécharger"
                            aria-label="Télécharger"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-green-100 hover:text-green-700 disabled:opacity-40"
                          >
                            <Download className="h-[18px] w-[18px]" />
                          </button>
                          <button
                            onClick={() => deleteCreation(c)}
                            disabled={deletingId === c.id}
                            title="Supprimer"
                            aria-label="Supprimer"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-red-100 hover:text-red-600 disabled:opacity-40"
                          >
                            <Trash2 className="h-[18px] w-[18px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudioAnnoncePage() {
  return (
    <Suspense fallback={<div className="p-6">Chargement...</div>}>
      <StudioAnnonceContent />
    </Suspense>
  );
}