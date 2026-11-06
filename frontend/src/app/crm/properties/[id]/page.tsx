"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
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
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
      alert("Erreur lors de la suppression");
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
      console.log('Téléchargement du document:', doc);
      const blob = await propertiesService.downloadDocument(propertyId, doc.id);
      
      // Vérifier que le blob est valide
      if (!blob || blob.size === 0) {
        throw new Error('Le fichier téléchargé est vide ou introuvable');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.originalName || doc.title || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Document téléchargé avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur lors du téléchargement: ${errorMessage}`);
    }
  };

  const handleDownloadImages = async () => {
    if (!property?.images || property.images.length === 0) {
      alert("Aucune image à télécharger");
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
      alert(`Erreur lors du téléchargement des images: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadDocumentsZip = async () => {
    if (!property) return;
    const docs = property.documents ?? [];
    if (docs.length === 0) {
      alert("Aucun document à télécharger");
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
      alert(`Erreur lors du téléchargement des documents: ${errorMessage}`);
    } finally {
      setIsDownloadingDocs(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-500";
      case "RESERVED":
        return "bg-yellow-500";
      case "SOLD":
        return "bg-blue-500";
      case "RENTED":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "AVAILABLE":
        return "Disponible";
      case "RESERVED":
        return "Réservé";
      case "SOLD":
        return "Vendu";
      case "RENTED":
        return "Loué";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="space-y-6">
        <Link href="/crm/properties">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Propriété non trouvée
            </h3>
            <p className="text-muted-foreground">
              Cette propriété n&apos;existe pas ou a été supprimée.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Champs tolérants aux différences de nommage entre le type et le backend.
  // Utilisation de Record<string, unknown> pour éviter les accès non typés.
  if (!property) {
    return null;
  }
  const loose = property as unknown as Record<string, unknown>;
  const postalCode: string =
    (loose.zipCode as string) ?? (loose.postalCode as string) ?? "";
  const propertyType: string =
    (loose.type as string) ?? (loose.propertyType as string) ?? "-";
  const isRental = (["RENT", "RENTAL", "LOCATION"] as string[]).includes(
    String(property.transactionType),
  );
  const specificDetails = getSpecificDetails(property);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/crm/properties">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <div className="flex gap-2">
          {/* Un agent ne modifie que ses biens ; seul le gérant supprime */}
          {canEditProperty(user, property) && (
            <Link href={`/crm/properties/${property.id}/edit`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            </Link>
          )}
          {canDelete(user) && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images Gallery */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Photos</CardTitle>
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
            <CardContent className="p-0">
              {property.images && property.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 p-4">
                  {property.images.map(
                    (image: PropertyImage, index: number) => (
                      <div
                        key={image.id}
                        className={`relative aspect-video rounded-lg overflow-hidden ${
                          index === 0 ? "col-span-2" : ""
                        }`}
                      >
                        <Image
                          src={image.url}
                          alt={`${property.title} - ${index + 1}`}
                          fill
                          sizes={index === 0 ? "100vw" : "50vw"}
                          priority={index === 0}
                          className="object-cover"
                        />
                        {image.isCover && (
                          <div className="absolute top-2 left-2">
                            <Badge>Photo principale</Badge>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Building2 className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                    {property.title}
                    <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {property.reference}
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {property.address}, {postalCode} {property.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {getVisitsCount(property)} visite
                      {getVisitsCount(property) > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <Badge className={getStatusColor(property.status)}>
                  {getStatusLabel(property.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Price */}
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                  <span className="text-sm font-medium">Prix</span>
                  <div className="flex items-center text-2xl font-bold text-primary">
                    {formatPrice(Number(property.price))}
                    {isRental && <span className="text-sm ml-1">/mois</span>}
                  </div>
                </div>

                {/* Key Features */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Ruler className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Surface</p>
                      <p className="font-semibold">{property.surface} m²</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <DoorOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pièces</p>
                      <p className="font-semibold">{property.rooms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Bed className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Chambres</p>
                      <p className="font-semibold">{property.bedrooms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Bath className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Salles de bain
                      </p>
                      <p className="font-semibold">{property.bathrooms}</p>
                    </div>
                  </div>
                </div>

                {/* Titre + terrain / local commercial / fonds de commerce */}
                {specificDetails.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">
                      {specificDetailsTitle(property.type)}
                    </h3>
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {specificDetails.map((row) => (
                        <div key={row.label} className="rounded-lg border p-3">
                          <dt className="text-xs text-muted-foreground">{row.label}</dt>
                          <dd className="font-semibold">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {property.description}
                  </p>
                </div>

                {property.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Notes internes</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {property.notes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Documents juridiques et techniques</CardTitle>
              <CardDescription>
                Titre foncier, plans et autres documents importants du bien
              </CardDescription>
              {property.documents && property.documents.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadDocumentsZip}
                  disabled={isDownloadingDocs}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isDownloadingDocs ? "Téléchargement..." : "Télécharger tout (ZIP)"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  id: "titre-foncier",
                  title: "Titre foncier",
                  category: "Titre foncier",
                },
                {
                  id: "plans",
                  title: "Plans",
                  category: "Plan",
                },
                {
                  id: "autres",
                  title: "Autres documents",
                  category: null,
                },
              ].map((section) => {
                const docs =
                  section.category === null
                    ? (property.documents ?? []).filter(
                        (d) =>
                          !d.category ||
                          (String(d.category).toLowerCase() !==
                            "titre foncier" &&
                            String(d.category).toLowerCase() !== "plan"),
                      )
                    : (property.documents ?? []).filter(
                        (d) =>
                          String(d.category).toLowerCase() ===
                          section.category.toLowerCase(),
                      );

                return (
                  <div key={section.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        {section.title}
                      </h4>
                    </div>
                    {docs.length > 0 ? (
                      <div className="space-y-2">
                        {docs.map((doc: PropertyDocument) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-muted"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {doc.title}
                                </p>
                                {doc.description && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {doc.description}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {doc.size
                                    ? `${(doc.size / 1024).toFixed(0)} Ko`
                                    : ""}{" "}
                                  •{" "}
                                  {new Date(doc.createdAt).toLocaleDateString(
                                    "fr-FR",
                                  )}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc)}
                              title="Télécharger le document"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                        Aucun document ajouté
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <AiClientMatchesCard propertyId={propertyId} />

          {/* Map */}
          {property.latitude && property.longitude && (
            <Card>
              <CardHeader>
                <CardTitle>Localisation</CardTitle>
              </CardHeader>
              <CardContent>
                <PropertyMapDynamic
                  latitude={property.latitude}
                  longitude={property.longitude}
                  address={`${property.address}, ${property.city}`}
                  title={property.title}
                  height="400px"
                />
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    {property.address}, {postalCode} {property.city},{" "}
                    {property.country}
                  </p>
                  <div className="mt-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Voir dans Google Maps
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Property Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">
                  {TYPE_LABELS[propertyType as PropertyType] ?? propertyType}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transaction</p>
                <p className="font-medium">{isRental ? "Location" : "Vente"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Référence</p>
                <p className="font-medium font-mono">
                  {property.reference || property.id}
                </p>
              </div>
              {property.googleMapsUrl && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Lien Google Maps
                  </p>
                  <a
                    href={property.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary hover:underline font-medium"
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    Ouvrir dans Google Maps
                  </a>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Ajouté le</p>
                <p className="font-medium">
                  {new Date(property.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mis à jour le</p>
                <p className="font-medium">
                  {new Date(property.updatedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </CardContent>
          </Card>

          <AiPriceEstimateCard propertyId={propertyId} isRental={isRental} />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {property.images && property.images.length > 0 && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleDownloadImages}
                  disabled={isDownloading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isDownloading
                    ? "Téléchargement..."
                    : "Télécharger images (ZIP)"}
                </Button>
              )}
              <Button className="w-full" variant="outline" asChild>
                <Link href={`/crm/visits/new?propertyIds=${propertyId}`}>Planifier une visite</Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link href={`/crm/studio-annonce?propertyId=${propertyId}`}>Créer une affiche</Link>
              </Button>
              {canCreateTransaction && (
                <Button className="w-full" variant="outline" asChild>
                  <Link href={`/crm/transactions/new?propertyId=${propertyId}`}>Créer une transaction</Link>
                </Button>
              )}
              {canEditProperty(user, property) && (
                <Button
                  className="w-full"
                  variant={property?.isPublished ? "secondary" : "default"}
                  onClick={handleTogglePublish}
                  disabled={isPublishing}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {isPublishing
                    ? "Publication en cours..."
                    : property?.isPublished
                    ? "Déspublier l'annonce"
                    : "Publier l'annonce"}
                </Button>
              )}
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  if (!property?.publishedAt) {
                    toast.warning("Ce bien n'est pas publié : publiez-le pour partager son annonce");
                    return;
                  }
                  shareLink(`${window.location.origin}/biens/${propertyId}`, property.title);
                }}
              >
                Partager l&apos;annonce
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
