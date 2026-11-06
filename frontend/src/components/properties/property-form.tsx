"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Save, Sparkles, Eye } from "lucide-react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  propertiesService,
  type LandZoning,
  type Property,
  type PropertyPayload,
  type PropertyUpdatePayload,
  type TitleType,
} from "@/services/properties.service";
import type { DocumentFile } from "./property-documents-manager";
import { ownersService } from "@/services/owners.service";
import { agentsService } from "@/services/agents.service";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
  fullName,
  landZoningOptions,
  statusOptions,
  titleTypeOptions,
  transactionOptions,
  typeOptions,
} from "@/lib/property-constants";
import {
  getVisibleFields,
  fieldLabel,
  surfaceLabel,
  priceLabel,
  type FieldKey,
} from "@/lib/property-field-rules";
import { GOVERNORATE_LIST, getDelegations } from "@/lib/tunisia-locations";
import { shareLink } from "@/lib/share";

import { QuickOwnerForm } from "../owners/quick-owner-form";
import { AiPropertyFiller } from "../ai/ai-property-filler";
import {
  aiService,
  AI_LANGUAGE_LABELS,
  type AiLanguage,
  type PropertyDraft,
} from "@/services/ai.service";

// Chargement lazy des composants lourds (Leaflet, gestion d'images, documents)
// pour ne pas les inclure dans le bundle JS initial de la page.
const PropertyImagesManager = dynamic(
  () =>
    import("./property-images-manager").then(
      (mod) => mod.PropertyImagesManager,
    ),
  {
    ssr: false,
    loading: () => <div className="h-40 animate-pulse rounded-md bg-muted" />,
  },
);
const PropertyDocumentsManager = dynamic(
  () =>
    import("./property-documents-manager").then(
      (mod) => mod.PropertyDocumentsManager,
    ),
  {
    ssr: false,
    loading: () => <div className="h-40 animate-pulse rounded-md bg-muted" />,
  },
);
const LocationPickerDynamic = dynamic(
  () =>
    import("./location-picker-dynamic").then(
      (mod) => mod.LocationPickerDynamic,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-md bg-muted">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    ),
  },
);

// Tableau stable (évite un nouveau tableau à chaque rendu)
const NO_DOCUMENTS: never[] = [];

// ── Validation ──────────────────────────────────────────────────────

const optNum = z
  .string()
  .optional()
  .refine((v) => !v || !Number.isNaN(Number(v)), "Nombre invalide");

const reqPositive = z
  .string()
  .min(1, "Requis")
  .refine(
    (v) => !Number.isNaN(Number(v)) && Number(v) > 0,
    "Doit être supérieur à 0",
  );

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Minimum 3 caractères")
    .max(200, "Maximum 200 caractères"),
  description: z.string().optional(),
  type: z.enum(PROPERTY_TYPES),
  transactionType: z.enum(TRANSACTION_TYPES),
  status: z.enum(PROPERTY_STATUSES),

  address: z.string().trim().min(1, "Adresse requise"),
  city: z.string().trim().min(1, "Ville requise"),
  district: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  latitude: optNum,
  longitude: optNum,
  googleMapsUrl: z.string().url("URL invalide").optional(),

  price: reqPositive,
  charges: optNum,
  deposit: optNum,

  surface: reqPositive,
  rooms: optNum,
  bedrooms: optNum,
  bathrooms: optNum,
  floor: optNum,
  totalFloors: optNum,

  parking: z.boolean(),
  furnished: z.boolean(),
  elevator: z.boolean(),
  balcony: z.boolean(),
  garden: z.boolean(),
  cellar: z.boolean(),

  titleType: z.string().optional(),

  commercialMonthlyRevenue: optNum,
  commercialLeased: z.boolean(),
  commercialFrontage: optNum,
  commercialCeilingHeight: optNum,
  commercialMezzanine: z.boolean(),

  landFrontage: optNum,
  landDepth: optNum,
  landCos: optNum,
  landCuf: optNum,
  landZoning: z.string().optional(),
  landServiced: z.boolean(),
  landCorner: z.boolean(),

  businessActivity: z.string().max(150, "Maximum 150 caractères").optional(),
  businessDailyRevenue: optNum,
  businessRent: optNum,
  businessEmployees: optNum,

  ownerId: z.string().min(1, "Propriétaire requis"),
  agentId: z.string().optional(),
  isPublished: z.boolean(),
  notes: z.string().optional(),
  titleDeedNumber: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function getDefaults(p?: Property): FormValues {
  return {
    title: p?.title ?? "",
    description: p?.description ?? "",
    notes: p?.notes ?? "",
    titleDeedNumber: p?.titleDeedNumber ?? "",
    type: p?.type ?? "APARTMENT",
    transactionType: p?.transactionType ?? "SALE",
    status: p?.status ?? "DRAFT",

    address: p?.address ?? "",
    city: p?.city ?? "",
    district: p?.district ?? "",
    zipCode: p?.zipCode ?? "",
    country: p?.country ?? "TN",
    latitude: s(p?.latitude),
    longitude: s(p?.longitude),
    googleMapsUrl: p?.googleMapsUrl ?? "",

    price: s(p?.price),
    charges: s(p?.charges),
    deposit: s(p?.deposit),

    surface: s(p?.surface),
    rooms: s(p?.rooms),
    bedrooms: s(p?.bedrooms),
    bathrooms: s(p?.bathrooms),
    floor: s(p?.floor),
    totalFloors: s(p?.totalFloors),

    parking: p?.parking ?? false,
    furnished: p?.furnished ?? false,
    elevator: p?.elevator ?? false,
    balcony: p?.balcony ?? false,
    garden: p?.garden ?? false,
    cellar: p?.cellar ?? false,

    titleType: p?.titleType ?? "",

    commercialMonthlyRevenue: s(p?.commercialMonthlyRevenue),
    commercialLeased: p?.commercialLeased ?? false,
    commercialFrontage: s(p?.commercialFrontage),
    commercialCeilingHeight: s(p?.commercialCeilingHeight),
    commercialMezzanine: p?.commercialMezzanine ?? false,

    landFrontage: s(p?.landFrontage),
    landDepth: s(p?.landDepth),
    landCos: s(p?.landCos),
    landCuf: s(p?.landCuf),
    landZoning: p?.landZoning ?? "",
    landServiced: p?.landServiced ?? false,
    landCorner: p?.landCorner ?? false,

    businessActivity: p?.businessActivity ?? "",
    businessDailyRevenue: s(p?.businessDailyRevenue),
    businessRent: s(p?.businessRent),
    businessEmployees: s(p?.businessEmployees),

    ownerId: p?.owner?.id != null ? String(p.owner.id) : "",
    agentId: p?.agent?.id != null ? String(p.agent.id) : "",
    isPublished: p?.isPublished ?? false,
  };
}

// Null permet d'effacer les champs facultatifs devenus invisibles (modification).
function toPayload(v: FormValues): PropertyUpdatePayload {
  const visible = getVisibleFields(v.type, v.transactionType);

  const num = (f: FieldKey, x?: string) =>
    visible.has(f) && x?.trim() !== "" && x !== undefined ? Number(x) : null;

  const bool = (f: FieldKey, x: boolean) => (visible.has(f) ? x : false);

  const n = (x?: string) => (x?.trim() ? Number(x) : null);

  const t = (x?: string) => (x?.trim() ? x.trim() : null);

  return {
    title: v.title.trim(),
    description: t(v.description),
    type: v.type,
    transactionType: v.transactionType,
    status: v.status,

    address: v.address.trim(),
    city: v.city.trim(),
    district: t(v.district),
    zipCode: t(v.zipCode),
    country: t(v.country),
    latitude: n(v.latitude),
    longitude: n(v.longitude),
    googleMapsUrl: v.googleMapsUrl?.trim() || null,

    surface: Number(v.surface),
    rooms: num("rooms", v.rooms),
    bedrooms: num("bedrooms", v.bedrooms),
    bathrooms: num("bathrooms", v.bathrooms),
    floor: num("floor", v.floor),
    totalFloors: num("totalFloors", v.totalFloors),

    parking: bool("parking", v.parking),
    furnished: bool("furnished", v.furnished),
    elevator: bool("elevator", v.elevator),
    balcony: bool("balcony", v.balcony),
    garden: bool("garden", v.garden),
    cellar: bool("cellar", v.cellar),

    price: Number(v.price),
    charges: num("charges", v.charges),
    deposit: num("deposit", v.deposit),

    titleType: v.titleType ? (v.titleType as TitleType) : null,

    commercialMonthlyRevenue: num("commercialMonthlyRevenue", v.commercialMonthlyRevenue),
    commercialLeased: bool("commercialLeased", v.commercialLeased),
    commercialFrontage: num("commercialFrontage", v.commercialFrontage),
    commercialCeilingHeight: num("commercialCeilingHeight", v.commercialCeilingHeight),
    commercialMezzanine: bool("commercialMezzanine", v.commercialMezzanine),

    landFrontage: num("landFrontage", v.landFrontage),
    landDepth: num("landDepth", v.landDepth),
    landCos: num("landCos", v.landCos),
    landCuf: num("landCuf", v.landCuf),
    landZoning: visible.has("landZoning") && v.landZoning ? (v.landZoning as LandZoning) : null,
    landServiced: bool("landServiced", v.landServiced),
    landCorner: bool("landCorner", v.landCorner),

    businessActivity: visible.has("businessActivity") ? t(v.businessActivity) : null,
    businessDailyRevenue: num("businessDailyRevenue", v.businessDailyRevenue),
    businessRent: num("businessRent", v.businessRent),
    businessEmployees: num("businessEmployees", v.businessEmployees),

    isPublished: v.isPublished,
    ownerId: v.ownerId,
    agentId: v.agentId,
    notes: t(v.notes),
    titleDeedNumber: t(v.titleDeedNumber),
  };
}

// Retire les null/undefined (utilisé à la création)
function stripNulls<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined),
  ) as T;
}

// ── Champ réutilisable ──────────────────────────────────────────────

function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const NONE = "__none__";

type SelectName =
  | "type"
  | "transactionType"
  | "status"
  | "ownerId"
  | "agentId"
  | "landZoning"
  | "titleType";

function ControlledSelect({
  control,
  name,
  options,
  placeholder,
  allowEmpty,
}: {
  control: Control<FormValues>;
  name: SelectName;
  options: { value: string; label: string }[];
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          value={field.value || (allowEmpty ? NONE : "")}
          onValueChange={(v) => {
            field.onChange(v === NONE ? "" : v);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {allowEmpty && <SelectItem value={NONE}>—</SelectItem>}
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

const textareaClass =
  "flex min-h-[130px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50";

// ── Formulaire ──────────────────────────────────────────────────────

interface Props {
  mode: "create" | "edit";
  property?: Property;
}

export function PropertyForm({ mode, property }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const isEdit = mode === "edit";
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<DocumentFile[]>([]);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  // Publication automatique : après la création et l'upload des photos,
  // publier le bien sur le site et copier le lien de partage.
  const [autoPublish, setAutoPublish] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(property),
  });

  const { data: owners = [], refetch: refetchOwners } = useQuery({
    queryKey: queryKeys.owners.options,
    queryFn: ownersService.getOptions,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: agents = [] } = useQuery({
    queryKey: queryKeys.agents.options,
    queryFn: agentsService.getOptions,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const handleOwnerCreated = async (newOwnerId: string) => {
    if (!newOwnerId) {
      toast.error("Le propriétaire a été créé mais son identifiant est introuvable");
      return;
    }
    await refetchOwners();
    setValue("ownerId", String(newOwnerId), { shouldValidate: true });
    toast.success("Propriétaire créé et sélectionné");
  };

  const ownerOptions = owners.map((o) => ({
    value: String(o.id),
    label: `${fullName(o)}${o.phone ? ` · ${o.phone}` : ""}`,
  }));

  if (
    property?.owner &&
    !owners.some((o) => String(o.id) === String(property.owner.id))
  ) {
    ownerOptions.unshift({
      value: String(property.owner.id),
      label: fullName(property.owner),
    });
  }

  const agentOptions = agents.map((a) => ({
    value: String(a.id),
    label: fullName(a.user),
  }));

  const [price, surface, isPublished, status, type, transactionType] = watch([
    "price",
    "surface",
    "isPublished",
    "status",
    "type",
    "transactionType",
  ]);

  const visible = getVisibleFields(type, transactionType);
  const show = (f: FieldKey) => visible.has(f);

  const pricePerSqm =
    Number(price) > 0 && Number(surface) > 0
      ? Number(price) / Number(surface)
      : null;

  const uploadDocuments = async (propertyId: string) => {
    const results = await Promise.allSettled(
      pendingDocuments
        .filter((doc) => !!doc.file)
        .map((doc) =>
          propertiesService.uploadDocument(
            propertyId,
            doc.file!,
            doc.name,
            undefined,
            doc.type === "title_deed"
              ? "Titre foncier"
              : doc.type === "plan"
                ? "Plan"
                : "Autre",
          ),
        ),
    );
    return results.filter((r) => r.status === "rejected").length;
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = toPayload(values);
      // Le titre est capturé ici car onSuccess est asynchrone et n'a pas accès au payload
      const createdTitle = payload.title;

      if (isEdit && property) {
        await propertiesService.update(property.id, stripNulls(payload) as PropertyPayload);
        const docFailed = await uploadDocuments(property.id);
        return { id: property.id, uploadFailed: docFailed > 0, created: false, title: createdTitle };
      }

      // À la création, les champs vides sont absents (et non null)
      const created = await propertiesService.create(
        stripNulls(payload) as PropertyPayload,
      );

      let uploadFailed = false;

      if (pendingFiles.length > 0) {
        try {
          await propertiesService.uploadImages(created.id, pendingFiles);
        } catch {
          uploadFailed = true;
        }
      }

      const docFailed = await uploadDocuments(created.id);
      if (docFailed > 0) uploadFailed = true;

      // Publication automatique (si cochée) : après la création et l'upload des photos.
      // On le fait ici, dans le mutationFn, pour que la publication ne se déclenche
      // que si la création et l'upload des photos ont succeedi.
      if (autoPublish && !uploadFailed) {
        try {
          await propertiesService.update(created.id, { isPublished: true });
        } catch {
          uploadFailed = true;
        }
      }

      return { id: created.id, uploadFailed, created: true, title: createdTitle };
    },

    onSuccess: ({ id, uploadFailed, created, title }) => {
      qc.invalidateQueries({ queryKey: queryKeys.properties.all });

      if (uploadFailed) {
        toast.warning(
          "Bien créé, mais l'envoi des photos a échoué. Réessayez ici.",
        );
        router.push(`/crm/properties/${id}/edit`);
        return;
      }

      if (created && autoPublish) {
        toast.success("Bien créé et publié sur le site public");
        // Partager le lien de l'annonce juste après la publication
        if (typeof window !== "undefined") {
          shareLink(`${window.location.origin}/biens/${id}`, title ?? 'Annonce');
        }
      } else {
        toast.success(isEdit ? "Bien mis à jour" : "Bien créé");
      }
      router.push("/crm/properties");
    },

    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const err = (name: keyof FormValues) =>
    errors[name]?.message as string | undefined;

  const checkbox = (
    name:
      | "parking"
      | "furnished"
      | "elevator"
      | "balcony"
      | "garden"
      | "cellar"
      | "landServiced"
      | "landCorner"
      | "commercialLeased"
      | "commercialMezzanine",
    label: string,
  ) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-input accent-primary"
        {...register(name)}
      />
      {label}
    </label>
  );

  // ── IA : remplissage depuis un texte, rédaction de la description ──
  const [descLanguage, setDescLanguage] = useState<AiLanguage>("fr");
  const descriptionMutation = useMutation({
    mutationFn: () => aiService.propertyDescription(getValues(), descLanguage),
    onSuccess: ({ description }) => {
      setValue("description", description, { shouldDirty: true });
      toast.success("Description générée : relisez-la avant d'enregistrer");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const applyDraft = (d: PropertyDraft) => {
    const opts = { shouldDirty: true, shouldValidate: false } as const;
    const text = (name: keyof FormValues, v: string | null) => {
      if (v) setValue(name, v as never, opts);
    };
    const num = (name: keyof FormValues, v: number | null) => {
      if (v !== null && v !== undefined) setValue(name, String(v) as never, opts);
    };
    const bool = (name: keyof FormValues, v: boolean | null) => {
      if (v !== null && v !== undefined) setValue(name, v as never, opts);
    };
    text("title", d.title);
    text("type", d.type);
    text("transactionType", d.transactionType);
    if (d.city && GOVERNORATE_LIST.includes(d.city)) setValue("city", d.city, opts);
    text("district", d.district);
    text("address", d.address);
    text("titleType", d.titleType);
    text("businessActivity", d.businessActivity);
    num("price", d.price);
    num("surface", d.surface);
    num("rooms", d.rooms);
    num("bedrooms", d.bedrooms);
    num("bathrooms", d.bathrooms);
    num("floor", d.floor);
    num("totalFloors", d.totalFloors);
    num("charges", d.charges);
    num("landFrontage", d.landFrontage);
    num("landDepth", d.landDepth);
    num("businessDailyRevenue", d.businessDailyRevenue);
    num("commercialMonthlyRevenue", d.commercialMonthlyRevenue);
    bool("parking", d.parking);
    bool("furnished", d.furnished);
    bool("elevator", d.elevator);
    bool("balcony", d.balcony);
    bool("garden", d.garden);
    bool("cellar", d.cellar);
    if (d.ownerName || d.ownerPhone) {
      toast.info(
        `Propriétaire mentionné : ${[d.ownerName, d.ownerPhone].filter(Boolean).join(" – ")}. Choisissez-le ou créez-le dans « Propriétaire ».`,
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit((v) => {
        // Bloque l'envoi si le propriétaire n'existe pas dans la liste chargée
        const ownerOk = ownerOptions.some((o) => o.value === v.ownerId);
        if (!ownerOk) {
          setError("ownerId", {
            type: "validate",
            message:
              "Propriétaire introuvable, sélectionnez-en un dans la liste",
          });
          return;
        }
        mutation.mutate(v);
      })}
      className="space-y-6"
      noValidate
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {!isEdit && <AiPropertyFiller onApply={applyDraft} />}

          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Titre"
                required
                error={err("title")}
                className="sm:col-span-2"
              >
                <Input
                  placeholder="Ex : Appartement S+2 lumineux à La Marsa"
                  {...register("title")}
                />
              </Field>

              <Field label="Type de bien" required error={err("type")}>
                <ControlledSelect
                  control={control}
                  name="type"
                  options={typeOptions}
                />
              </Field>

              <Field
                label="Transaction"
                required
                error={err("transactionType")}
              >
                <ControlledSelect
                  control={control}
                  name="transactionType"
                  options={transactionOptions}
                />
              </Field>

              <Field label="Statut" required error={err("status")}>
                <ControlledSelect
                  control={control}
                  name="status"
                  options={statusOptions}
                />
              </Field>

              <Field
                label="Description"
                error={err("description")}
                className="sm:col-span-2"
              >
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={descLanguage}
                    onChange={(e) => setDescLanguage(e.target.value as AiLanguage)}
                    aria-label="Langue de la description"
                  >
                    {(Object.keys(AI_LANGUAGE_LABELS) as AiLanguage[]).map((l) => (
                      <option key={l} value={l}>
                        {AI_LANGUAGE_LABELS[l]}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => descriptionMutation.mutate()}
                    disabled={descriptionMutation.isPending}
                  >
                    {descriptionMutation.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-4 w-4" />
                    )}
                    Générer avec l&apos;IA
                  </Button>
                </div>
                <textarea
                  className={textareaClass}
                  placeholder="Décrivez le bien…"
                  {...register("description")}
                />
              </Field>
            </CardContent>
          </Card>

          {/* Localisation */}
          <Card>
            <CardHeader>
              <CardTitle>Localisation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Adresse"
                required
                error={err("address")}
                className="sm:col-span-2"
              >
                <Input {...register("address")} />
              </Field>

              <Field label="Gouvernorat" required error={err("city")}>
                <Controller
                  control={control}
                  name="city"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un gouvernorat" />
                      </SelectTrigger>
                      <SelectContent>
                        {GOVERNORATE_LIST.map((gov) => (
                          <SelectItem key={gov} value={gov}>
                            {gov}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field label="Délégation" error={err("district")}>
                <Controller
                  control={control}
                  name="district"
                  render={({ field }) => {
                    const city = watch("city");
                    const delegations = city ? getDelegations(city) : [];
                    return (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={delegations.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              delegations.length === 0
                                ? "Sélectionnez d'abord un gouvernorat"
                                : "Sélectionner une délégation"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {delegations.map((del) => (
                            <SelectItem key={del} value={del}>
                              {del}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
              </Field>

              <Field label="Code postal" error={err("zipCode")}>
                <Input {...register("zipCode")} />
              </Field>

              <Field label="Pays (code)" error={err("country")}>
                <Input placeholder="TN" {...register("country")} />
              </Field>

              {/* Sélecteur de localisation interactif */}
              <div className="sm:col-span-2">
                <Label className="mb-2 block">
                  Localisation sur la carte
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Cliquez sur la carte ou déplacez le marqueur)
                  </span>
                </Label>
                <Controller
                  control={control}
                  name="latitude"
                  render={({ field: latField }) => (
                    <Controller
                      control={control}
                      name="longitude"
                      render={({ field: lngField }) => {
                        const currentLocation =
                          latField.value && lngField.value
                            ? {
                                lat: Number(latField.value),
                                lng: Number(lngField.value),
                              }
                            : null;

                        return (
                          <LocationPickerDynamic
                            value={currentLocation}
                            onChange={(coords) => {
                              latField.onChange(String(coords.lat));
                              lngField.onChange(String(coords.lng));
                            }}
                            height={320}
                          />
                        );
                      }}
                    />
                  )}
                />
                {(errors.latitude || errors.longitude) && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.latitude?.message || errors.longitude?.message}
                  </p>
                )}
              </div>

              {/* Champs manuels latitude/longitude (ajustement fin) */}
              <Field label="Latitude (optionnel)" error={err("latitude")}>
                <Input
                  type="number"
                  step="any"
                  placeholder="Ex: 36.8065"
                  {...register("latitude")}
                />
              </Field>

              <Field label="Longitude (optionnel)" error={err("longitude")}>
                <Input
                  type="number"
                  step="any"
                  placeholder="Ex: 10.1815"
                  {...register("longitude")}
                />
              </Field>

              <Field label="Lien Google Maps" error={err("googleMapsUrl")}>
                <Input
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                  {...register("googleMapsUrl")}
                />
              </Field>
            </CardContent>
          </Card>

          {/* Prix */}
          <Card>
            <CardHeader>
              <CardTitle>Prix</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field
                label={priceLabel(transactionType)}
                required
                error={err("price")}
              >
                <Input
                  type="number"
                  min={0}
                  step="any"
                  {...register("price")}
                />
              </Field>

              {show("charges") && (
                <Field label="Charges mensuelles" error={err("charges")}>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    {...register("charges")}
                  />
                </Field>
              )}

              {show("deposit") && (
                <Field label="Dépôt de garantie" error={err("deposit")}>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    {...register("deposit")}
                  />
                </Field>
              )}

              {pricePerSqm !== null && transactionType === "SALE" && (
                <p className="text-sm text-muted-foreground sm:col-span-3">
                  Prix au m² :{" "}
                  <span className="font-medium text-foreground">
                    {formatPrice(pricePerSqm)}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Caractéristiques */}
          <Card>
            <CardHeader>
              <CardTitle>Caractéristiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label={surfaceLabel(type)}
                  required
                  error={err("surface")}
                >
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    {...register("surface")}
                  />
                </Field>

                <Field label="Type de titre" error={err("titleType")}>
                  <ControlledSelect
                    control={control}
                    name="titleType"
                    options={titleTypeOptions}
                    placeholder="—"
                    allowEmpty
                  />
                </Field>

                {show("rooms") && (
                  <Field label={fieldLabel("rooms", type)} error={err("rooms")}>
                    <Input type="number" min={0} {...register("rooms")} />
                  </Field>
                )}

                {show("bedrooms") && (
                  <Field label="Chambres" error={err("bedrooms")}>
                    <Input type="number" min={0} {...register("bedrooms")} />
                  </Field>
                )}

                {show("bathrooms") && (
                  <Field
                    label={fieldLabel("bathrooms", type)}
                    error={err("bathrooms")}
                  >
                    <Input type="number" min={0} {...register("bathrooms")} />
                  </Field>
                )}

                {show("floor") && (
                  <Field label={fieldLabel("floor", type)} error={err("floor")}>
                    <Input type="number" {...register("floor")} />
                  </Field>
                )}

                {show("totalFloors") && (
                  <Field
                    label={fieldLabel("totalFloors", type)}
                    error={err("totalFloors")}
                  >
                    <Input type="number" min={0} {...register("totalFloors")} />
                  </Field>
                )}
              </div>

              {type === "LAND" && (
                <div className="space-y-4 border-t border-border pt-5">
                  <p className="text-sm font-medium">Terrain</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Façade (m)" error={err("landFrontage")}>
                      <Input type="number" min={0} step="any" {...register("landFrontage")} />
                    </Field>
                    <Field label="Profondeur (m)" error={err("landDepth")}>
                      <Input type="number" min={0} step="any" {...register("landDepth")} />
                    </Field>
                    <Field label="Zone (plan d'aménagement)" error={err("landZoning")}>
                      <ControlledSelect
                        control={control}
                        name="landZoning"
                        options={landZoningOptions}
                        placeholder="—"
                        allowEmpty
                      />
                    </Field>
                    <Field label="COS" error={err("landCos")}>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="ex. 0,4"
                        {...register("landCos")}
                      />
                    </Field>
                    <Field label="CUF" error={err("landCuf")}>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="ex. 1,2"
                        {...register("landCuf")}
                      />
                    </Field>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    COS : part du terrain constructible au sol. CUF : surface
                    totale constructible (tous niveaux) par m² de terrain.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {checkbox("landServiced", "Viabilisé (eau, électricité)")}
                    {checkbox("landCorner", "Terrain d'angle")}
                  </div>
                </div>
              )}

              {type === "COMMERCIAL" && (
                <div className="space-y-4 border-t border-border pt-5">
                  <p className="text-sm font-medium">Local commercial</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field
                      label="Revenu par mois"
                      error={err("commercialMonthlyRevenue")}
                    >
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        {...register("commercialMonthlyRevenue")}
                      />
                    </Field>
                    <Field label="Façade vitrine (m)" error={err("commercialFrontage")}>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        {...register("commercialFrontage")}
                      />
                    </Field>
                    <Field
                      label="Hauteur sous plafond (m)"
                      error={err("commercialCeilingHeight")}
                    >
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        {...register("commercialCeilingHeight")}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {checkbox("commercialLeased", "Actuellement loué")}
                    {checkbox("commercialMezzanine", "Mezzanine")}
                  </div>
                </div>
              )}

              {type === "BUSINESS" && (
                <div className="space-y-4 border-t border-border pt-5">
                  <p className="text-sm font-medium">Fonds de commerce</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Activité" error={err("businessActivity")}>
                      <Input
                        placeholder="ex. Café, pharmacie, boulangerie…"
                        {...register("businessActivity")}
                      />
                    </Field>
                    <Field label="Recette par jour" error={err("businessDailyRevenue")}>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        {...register("businessDailyRevenue")}
                      />
                    </Field>
                    <Field label="Loyer mensuel du local" error={err("businessRent")}>
                      <Input type="number" min={0} step="any" {...register("businessRent")} />
                    </Field>
                    <Field label="Nombre d'employés" error={err("businessEmployees")}>
                      <Input type="number" min={0} {...register("businessEmployees")} />
                    </Field>
                  </div>
                </div>
              )}

              {(
                [
                  "parking",
                  "furnished",
                  "elevator",
                  "balcony",
                  "garden",
                  "cellar",
                ] as const
              ).some(show) && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {show("parking") && checkbox("parking", "Parking")}
                  {show("furnished") && checkbox("furnished", "Meublé")}
                  {show("elevator") && checkbox("elevator", "Ascenseur")}
                  {show("balcony") && checkbox("balcony", "Balcon")}
                  {show("garden") && checkbox("garden", "Jardin")}
                  {show("cellar") && checkbox("cellar", "Cave")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Numéro de titre foncier */}
          <Card>
            <CardHeader>
              <CardTitle>Titre foncier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="titleDeedNumber">Numéro de titre foncier</Label>
                <Input id="titleDeedNumber" {...register("titleDeedNumber")} placeholder="Ex: 12345" />
              </div>
            </CardContent>
          </Card>

          {/* Note interne (visible uniquement par l'agence) */}
          <Card>
            <CardHeader>
              <CardTitle>Note interne</CardTitle>
              <CardDescription>
                Commentaires réservés à l&apos;agence, non visibles sur le site public
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register("notes")}
                  placeholder="Informations internes sur le bien, le vendeur, les visites..."
                />
                {err("notes") && (
                  <p className="text-xs text-destructive">{err("notes")}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <CardDescription>
                {isEdit
                  ? "Les modifications de photos sont enregistrées immédiatement."
                  : "Ajoutez vos photos maintenant, elles seront envoyées à la création du bien."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyImagesManager
                propertyId={property?.id}
                pendingFiles={pendingFiles}
                onPendingChange={setPendingFiles}
              />
            </CardContent>
          </Card>

          {/* Documents juridiques */}
          <Card>
            <CardHeader>
              <CardTitle>Documents juridiques</CardTitle>
              <CardDescription>
                Titre foncier, plans, et autres documents importants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyDocumentsManager
                propertyId={property?.id}
                documents={
                  isEdit && property?.documents
                    ? property.documents.map(doc => ({
                        id: doc.id,
                        name: doc.originalName || doc.title,
                        type: (doc.category?.toLowerCase().includes('titre') || doc.category?.toLowerCase().includes('foncier'))
                          ? 'title_deed'
                          : doc.category?.toLowerCase().includes('plan')
                          ? 'plan'
                          : 'other',
                        size: doc.size || 0,
                        url: doc.url,
                      }))
                    : NO_DOCUMENTS
                }
                onDocumentsChange={(docs) => {
                  setPendingDocuments(docs);
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Publication */}
          <Card>
            <CardHeader>
              <CardTitle>Publication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-input accent-primary"
                  {...register("isPublished")}
                />
                <span className="text-sm">
                  <span className="font-medium">Publier ce bien</span>
                  <span className="block text-muted-foreground">
                    Visible sur le site public.
                  </span>
                </span>
              </label>

              {isPublished && status === "DRAFT" && (
                <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-700">
                  Le bien est publié mais son statut est « Brouillon ». Pensez à
                  le passer en « Disponible ».
                </p>
              )}
            </CardContent>
          </Card>

          {/* Propriétaire */}
          <Card>
            <CardHeader>
              <CardTitle>Propriétaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ownerId">
                  Propriétaire <span className="text-destructive">*</span>
                </Label>
                <ControlledSelect
                  control={control}
                  name="ownerId"
                  options={ownerOptions}
                  placeholder={
                    ownerOptions.length
                      ? "Choisir un propriétaire"
                      : "Aucun propriétaire"
                  }
                />
</div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsOwnerModalOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouveau propriétaire
              </Button>

              {ownerOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Créez d&apos;abord un propriétaire pour pouvoir enregistrer un bien.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Agents */}
          {agentOptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <Field label="Agent" error={err("agentId")}>
                  <ControlledSelect
                    control={control}
                    name="agentId"
                    options={agentOptions}
                    placeholder="Sélectionner un agent"
                    allowEmpty
                  />
                </Field>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" asChild>
          <Link href="/crm/properties">Annuler</Link>
        </Button>

        {!isEdit && (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={autoPublish}
              onChange={(e) => setAutoPublish(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Eye className="h-4 w-4 text-muted-foreground" />
            Publier automatiquement sur le site et copier le lien de partage
          </label>
        )}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isEdit ? "Enregistrer" : "Créer le bien"}
        </Button>
      </div>

      {/* Modal de création rapide de propriétaire */}
      <QuickOwnerForm
        open={isOwnerModalOpen}
        onOpenChange={setIsOwnerModalOpen}
        onSuccess={(newOwner) => {
          handleOwnerCreated(newOwner.id);
          setIsOwnerModalOpen(false);
        }}
      />
    </form>
  );
}
