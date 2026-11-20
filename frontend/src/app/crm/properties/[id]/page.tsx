"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  propertiesService,
  type PropertyImage,
  type PropertyDocument,
  type PropertyType,
} from "@/services/properties.service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PropertyMapDynamic from "@/components/maps/PropertyMapDynamic";
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Ruler,
  DoorOpen,
  Edit,
  Trash2,
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Calendar,
  Megaphone,
  Share2,
  Receipt,
  Globe,
  EyeOff,
} from "lucide-react";
import { downloadBlob } from "@/utils/download";
import { shareLink } from "@/lib/share";
import { useAuth } from "@/providers/AuthProvider";
import { canDelete, canEditProperty } from "@/lib/permissions";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { getVisitsCount, TYPE_LABELS } from "@/lib/property-constants";
import { formatPrice } from "@/lib/format";
import { AiClientMatchesCard } from "@/components/ai/ai-matches-card";
import { AiPriceEstimateCard } from "@/components/ai/ai-price-estimate-card";
import {
  getSpecificDetails,
  specificDetailsTitle,
} from "@/lib/property-specific-details";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  AVAILABLE: {
    label: "Disponible",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  RESERVED: {
    label: "Réservé",
    className: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
  SOLD: {
    label: "Vendu",
    className: "bg-blue-50 text-blue-700 ring-blue-600/20",
  },
  RENTED: {
    label: "Loué",
    className: "bg-violet-50 text-violet-700 ring-violet-600/20",
  },
};

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{children}</dd>
    </div>
  );
}

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  const { user } = useAuth();
  const canCreateTransaction = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingDocs, setIsDownloadingDocs] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const qc = useQueryClient();

  const {
    data: property,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.properties.detail(propertyId),
    queryFn: () => propertiesService.getById(propertyId),
    enabled: !!propertyId,
    staleTime: 10 * 60_000,
  });

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette propriété ?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await propertiesService.remove(propertyId);
      router.push("/crm/properties");
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Erreur lors de la suppression");
      setIsDeleting(false);
    }
  };

  const publishMutation = useMutation({
    mutationFn: (publish: boolean) =>
      propertiesService.update(propertyId, { isPublished: publish }),
    onMutate: () => {
      setIsPublishing(true);
    },
    onSuccess: (_data, publish) => {
      qc.invalidateQueries({ queryKey: queryKeys.properties.detail(propertyId) });
      qc.invalidateQueries({ queryKey: queryKeys.properties.all });
      if (publish) {
        toast.success("Bien publié sur le site public");
        shareLink(`${window.location.origin}/biens/${propertyId}`, property?.title ?? "");
      } else {
        toast.success("Publication désactivée");
      }
    },
    onError: (e: Error) => {
      toast.error(e?.message || "Impossible de modifier la publication");
    },
    onSettled: () => {
      // Réinitialisé dans tous les cas (succès, erreur) : le bouton ne reste jamais bloqué
      setIsPublishing(false);
    },
  });

  const handleTogglePublish = () => {
    // Empêche les doubles publications pendant le traitement
    if (isPublishing) return;
    publishMutation.mutate(!property?.isPublished);
  };

  const handleDownloadDocument = async (doc: PropertyDocument) => {
    try {
      const blob = await propertiesService.downloadDocument(propertyId, doc.id);

      // Vérifier que le blob est valide
      if (!blob || blob.size === 0) {
        throw new Error("Le fichier téléchargé est vide ou introuvable");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.originalName || doc.title || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Document téléchargé avec succès");
    } catch (error) {
      console.error("Erreur lors du téléchargement:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Erreur lors du téléchargement: ${errorMessage}`);
    }
  };

  const handleDownloadImages = async () => {
    if (!property?.images || property.images.length === 0) {
      toast.warning("Aucune image à télécharger");
      return;
    }

    setIsDownloading(true);
    try {
      const blob = await propertiesService.downloadImagesZip(propertyId);
      downloadBlob(blob, `property-${propertyId}-images.zip`);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      console.error("Error downloading images:", err);
      const errorMessage =
        err?.response?.data?.message || err?.message || "Erreur inconnue";
      toast.error(`Erreur lors du téléchargement des images: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadDocumentsZip = async () => {
    if (!property) return;
    const docs = property.documents ?? [];
    if (docs.length === 0) {
      toast.warning("Aucun document à télécharger");
      return;
    }

    setIsDownloadingDocs(true);
    try {
      const blob = await propertiesService.downloadDocumentsZip(propertyId);
      downloadBlob(blob, `property-${propertyId}-documents.zip`);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      console.error("Error downloading documents:", err);
      const errorMessage =
        err?.response?.data?.message || err?.message || "Erreur inconnue";
      toast.error(`Erreur lors du téléchargement des documents: ${errorMessage}`);
    } finally {
      setIsDownloadingDocs(false);
    }
  };

  /* ───────────── Chargement (pas de min-h-screen : évite le double scroll) ───────────── */
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  /* ───────────── Erreur / introuvable ───────────── */
  if (error || !property) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Link
          href="/crm/properties"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Propriété non trouvée</h3>
            <p className="text-sm text-muted-foreground">
              Cette propriété n&apos;existe pas ou a été supprimée.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Champs tolérants aux différences de nommage entre le type et le backend.
  // Utilisation de Record<string, unknown> pour éviter les accès non typés.
  const loose = property as unknown as Record<string, unknown>;
  const postalCode: string =
    (loose.zipCode as string) ?? (loose.postalCode as string) ?? "";
  const propertyType: string =
    (loose.type as string) ?? (loose.propertyType as string) ?? "-";
  const isRental = (["RENT", "RENTAL", "LOCATION"] as string[]).includes(
    String(property.transactionType),
  );
  const specificDetails = getSpecificDetails(property);

  // Numéro du titre foncier (champ ajouté en base : properties.titleDeedNumber)
  const titleDeedNumber: string =
    typeof loose.titleDeedNumber === "string" ? loose.titleDeedNumber.trim() : "";

  const status = STATUS_STYLES[property.status] ?? {
    label: property.status,
    className: "bg-slate-50 text-slate-700 ring-slate-600/20",
  };
  const visitsCount = getVisitsCount(property);
  const canEdit = canEditProperty(user, property);

  const keyFeatures = [
    { icon: Ruler, label: "Surface", value: `${property.surface} m²` },
    { icon: DoorOpen, label: "Pièces", value: property.rooms },
    { icon: Bed, label: "Chambres", value: property.bedrooms },
    { icon: Bath, label: "Salles de bain", value: property.bathrooms },
  ];

  const documentSections = [
    { id: "titre-foncier", title: "Titre foncier", category: "Titre foncier" },
    { id: "plans", title: "Plans", category: "Plan" },
    { id: "autres", title: "Autres documents", category: null },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* ═════════════ En-tête de page ═════════════ */}
      <header className="space-y-4">
        <Link
          href="/crm/properties"
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {property.title}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${status.className}`}
              >
                {status.label}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  property.isPublished
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                    : "bg-slate-50 text-slate-600 ring-slate-500/20"
                }`}
              >
                {property.isPublished ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <EyeOff className="h-3 w-3" />
                )}
                {property.isPublished ? "Publié" : "Non publié"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                {property.reference}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {property.address}, {postalCode} {property.city}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {visitsCount} visite{visitsCount > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {/* Un agent ne modifie que ses biens ; seul le gérant supprime */}
            {canEdit && (
              <Button asChild>
                <Link href={`/crm/properties/${property.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Link>
              </Button>
            )}
            {canDelete(user) && (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Suppression..." : "Supprimer"}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ═════════════ Contenu ═════════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ───────── Colonne gauche ───────── */}
        <div className="min-w-0 space-y-6">
          {/* Photos */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Photos</CardTitle>
              {property.images && property.images.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadImages}
                  disabled={isDownloading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isDownloading ? "Téléchargement..." : "Télécharger ZIP"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {property.images && property.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {property.images.map((image: PropertyImage, index: number) => (
                    <div
                      key={image.id}
                      className={`relative overflow-hidden rounded-lg bg-muted ${
                        index === 0
                          ? "col-span-2 aspect-video md:col-span-3"
                          : "aspect-[4/3]"
                      }`}
                    >
                      <Image
                        src={image.url}
                        alt={`${property.title} - ${index + 1}`}
                        fill
                        sizes={index === 0 ? "100vw" : "33vw"}
                        priority={index === 0}
                        className="object-cover"
                      />
                      {image.isCover && (
                        <div className="absolute left-2 top-2">
                          <Badge>Photo principale</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-16 w-16 text-muted-foreground/50" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Détails du bien */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Détails du bien</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prix */}
              <div className="flex items-center justify-between rounded-xl bg-primary/10 px-5 py-4">
                <span className="text-sm font-medium text-muted-foreground">
                  {isRental ? "Loyer" : "Prix de vente"}
                </span>
                <div className="flex items-baseline text-2xl font-bold text-primary">
                  {formatPrice(Number(property.price))}
                  {isRental && (
                    <span className="ml-1 text-sm font-medium">/mois</span>
                  )}
                </div>
              </div>

              {/* Caractéristiques */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {keyFeatures.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <f.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="truncate font-semibold">{f.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Titre + terrain / local commercial / fonds de commerce */}
              {specificDetails.length > 0 && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">
                    {specificDetailsTitle(property.type)}
                  </h3>
                  <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {specificDetails.map((row) => (
                      <div key={row.label} className="rounded-lg border p-3">
                        <dt className="text-xs text-muted-foreground">
                          {row.label}
                        </dt>
                        <dd className="font-semibold">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {/* Description */}
              <section>
                <h3 className="mb-2 text-sm font-semibold">Description</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {property.description || "Aucune description."}
                </p>
              </section>

              {property.notes && (
                <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                  <h3 className="mb-1 text-sm font-semibold text-amber-900">
                    Notes internes
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-amber-900/80">
                    {property.notes}
                  </p>
                </section>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  Documents juridiques et techniques
                </CardTitle>
                <CardDescription>
                  Titre foncier, plans et autres documents importants du bien
                </CardDescription>
              </div>
              {property.documents && property.documents.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handleDownloadDocumentsZip}
                  disabled={isDownloadingDocs}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isDownloadingDocs ? "Téléchargement..." : "Tout (ZIP)"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {documentSections.map((section) => {
                const docs =
                  section.category === null
                    ? (property.documents ?? []).filter(
                        (d) =>
                          !d.category ||
                          (String(d.category).toLowerCase() !== "titre foncier" &&
                            String(d.category).toLowerCase() !== "plan"),
                      )
                    : (property.documents ?? []).filter(
                        (d) =>
                          String(d.category).toLowerCase() ===
                          section.category.toLowerCase(),
                      );

                return (
                  <div key={section.id} className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </h4>
                    {docs.length > 0 ? (
                      <div className="space-y-2">
                        {docs.map((doc: PropertyDocument) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-border">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {doc.title}
                                </p>
                                {doc.description && (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {doc.description}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {doc.size
                                    ? `${(doc.size / 1024).toFixed(0)} Ko • `
                                    : ""}
                                  {new Date(doc.createdAt).toLocaleDateString(
                                    "fr-FR",
                                  )}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                              onClick={() => handleDownloadDocument(doc)}
                              title="Télécharger le document"
                              aria-label={`Télécharger ${doc.title}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed py-4 text-center text-sm text-muted-foreground">
                        Aucun document ajouté
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <AiClientMatchesCard propertyId={propertyId} />

          {/* Carte */}
          {property.latitude && property.longitude && (
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Localisation</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Google Maps
                  </a>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="overflow-hidden rounded-lg">
                  <PropertyMapDynamic
                    latitude={property.latitude}
                    longitude={property.longitude}
                    address={`${property.address}, ${property.city}`}
                    title={property.title}
                    height="360px"
                  />
                </div>
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {property.address}, {postalCode} {property.city},{" "}
                  {property.country}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ───────── Colonne droite ───────── */}
        <aside className="min-w-0 space-y-6">
          {/* Actions rapides (en premier : c'est ce qu'on utilise le plus) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canEdit && (
                <Button
                  className="w-full justify-start"
                  variant={property.isPublished ? "secondary" : "default"}
                  onClick={handleTogglePublish}
                  disabled={isPublishing}
                >
                  {property.isPublished ? (
                    <EyeOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Globe className="mr-2 h-4 w-4" />
                  )}
                  {isPublishing
                    ? "Publication en cours..."
                    : property.isPublished
                      ? "Dépublier l'annonce"
                      : "Publier l'annonce"}
                </Button>
              )}
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href={`/crm/visits/new?propertyIds=${propertyId}`}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Planifier une visite
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href={`/crm/studio-annonce?propertyId=${propertyId}`}>
                  <Megaphone className="mr-2 h-4 w-4" />
                  Créer une affiche
                </Link>
              </Button>
              {canCreateTransaction && (
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href={`/crm/transactions/new?propertyId=${propertyId}`}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Créer une transaction
                  </Link>
                </Button>
              )}
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => {
                  if (!property.publishedAt) {
                    toast.warning(
                      "Ce bien n'est pas publié : publiez-le pour partager son annonce",
                    );
                    return;
                  }
                  shareLink(
                    `${window.location.origin}/biens/${propertyId}`,
                    property.title,
                  );
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Partager l&apos;annonce
              </Button>
              {property.images && property.images.length > 0 && (
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={handleDownloadImages}
                  disabled={isDownloading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isDownloading ? "Téléchargement..." : "Télécharger images (ZIP)"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Informations (le titre foncier n'apparaît qu'ici) */}
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <InfoRow label="Type">
                  {TYPE_LABELS[propertyType as PropertyType] ?? propertyType}
                </InfoRow>
                <InfoRow label="Transaction">
                  {isRental ? "Location" : "Vente"}
                </InfoRow>
                <InfoRow label="Référence">
                  <span className="font-mono">
                    {property.reference || property.id}
                  </span>
                </InfoRow>
                <InfoRow label="N° titre foncier">
                  <span className="font-mono">
                    {titleDeedNumber || "Non renseigné"}
                  </span>
                </InfoRow>
                {property.googleMapsUrl && (
                  <InfoRow label="Google Maps">
                    <a
                      href={property.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-primary hover:underline"
                    >
                      <MapPin className="mr-1 h-4 w-4" />
                      Ouvrir
                    </a>
                  </InfoRow>
                )}
                <InfoRow label="Ajouté le">
                  {new Date(property.createdAt).toLocaleDateString("fr-FR")}
                </InfoRow>
                <InfoRow label="Mis à jour le">
                  {new Date(property.updatedAt).toLocaleDateString("fr-FR")}
                </InfoRow>
              </dl>
            </CardContent>
          </Card>

          <AiPriceEstimateCard propertyId={propertyId} isRental={isRental} />
        </aside>
      </div>
    </div>
  );
}