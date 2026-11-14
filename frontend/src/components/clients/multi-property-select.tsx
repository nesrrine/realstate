"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  MapPin,
  Ruler,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export interface PropertyOption {
  id: string;
  title: string;
  reference?: string;
  address?: string;
  city: string;
  district?: string | null;
  type?: string;
  transactionType?: string;
  surface?: number | string;
  price: number | string;
  status: string;
}

interface MultiPropertySelectProps {
  options: PropertyOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

const TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Appartement",
  VILLA: "Villa",
  HOUSE: "Maison",
  LAND: "Terrain",
  COMMERCIAL: "Local commercial",
  OFFICE: "Bureau",
  BUSINESS: "Fond de commerce",
  OTHER: "Autre",
};

const TRANSACTION_LABELS: Record<string, string> = {
  SALE: "Vente",
  RENTAL: "Location",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  AVAILABLE: "Disponible",
  RESERVED: "Réservé",
  SOLD: "Vendu",
  RENTED: "Loué",
  ARCHIVED: "Archivé",
};

// Couleur par statut : lisible d'un coup d'œil, compatible mode sombre
const STATUS_STYLES: Record<string, string> = {
  AVAILABLE:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  RESERVED:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  SOLD: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
  RENTED:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  DRAFT:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  ARCHIVED:
    "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700",
};

function toNumber(value: number | string | undefined): number {
  if (value === undefined || value === "") return 0;

  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(value: number | string): string {
  return toNumber(value).toLocaleString("fr-FR");
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function MultiPropertySelect({
  options,
  selected,
  onChange,
  placeholder = "Sélectionner des biens...",
  searchPlaceholder = "Rechercher par titre, référence, adresse...",
}: MultiPropertySelectProps) {
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");

  const [type, setType] = useState("ALL");
  const [transactionType, setTransactionType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [city, setCity] = useState("ALL");
  const [district, setDistrict] = useState("ALL");

  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [surfaceMin, setSurfaceMin] = useState("");
  const [surfaceMax, setSurfaceMax] = useState("");

  const cities = useMemo(
    () =>
      Array.from(new Set(options.map((o) => o.city).filter(Boolean))).sort(),
    [options],
  );

  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          options
            .filter((o) => city === "ALL" || o.city === city)
            .map((o) => o.district)
            .filter((d): d is string => Boolean(d)),
        ),
      ).sort(),
    [options, city],
  );

  const types = useMemo(
    () =>
      Array.from(
        new Set(
          options.map((o) => o.type).filter((t): t is string => Boolean(t)),
        ),
      ),
    [options],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return options.filter((o) => {
      const searchable = [o.title, o.reference, o.address, o.city, o.district]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !searchable.includes(query)) return false;
      if (type !== "ALL" && o.type !== type) return false;
      if (transactionType !== "ALL" && o.transactionType !== transactionType) {
        return false;
      }
      if (status !== "ALL" && o.status !== status) return false;
      if (city !== "ALL" && o.city !== city) return false;
      if (district !== "ALL" && o.district !== district) return false;

      const price = toNumber(o.price);
      const surface = toNumber(o.surface);

      if (priceMin && price < Number(priceMin)) return false;
      if (priceMax && price > Number(priceMax)) return false;
      if (surfaceMin && surface < Number(surfaceMin)) return false;
      if (surfaceMax && surface > Number(surfaceMax)) return false;

      return true;
    });
  }, [
    options,
    search,
    type,
    transactionType,
    status,
    city,
    district,
    priceMin,
    priceMax,
    surfaceMin,
    surfaceMax,
  ]);

  const selectedOptions = options.filter((o) => selected.includes(o.id));

  // Nombre de filtres avancés actifs (hors recherche texte)
  const activeFilterCount = [
    type !== "ALL",
    transactionType !== "ALL",
    status !== "ALL",
    city !== "ALL",
    district !== "ALL",
    Boolean(priceMin),
    Boolean(priceMax),
    Boolean(surfaceMin),
    Boolean(surfaceMax),
  ].filter(Boolean).length;

  const hasFilters = Boolean(search) || activeFilterCount > 0;

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  const resetFilters = () => {
    setSearch("");
    setType("ALL");
    setTransactionType("ALL");
    setStatus("ALL");
    setCity("ALL");
    setDistrict("ALL");
    setPriceMin("");
    setPriceMax("");
    setSurfaceMin("");
    setSurfaceMax("");
  };

  const selectAllFiltered = () => {
    const newIds = new Set(selected);
    filtered.forEach((o) => newIds.add(o.id));
    onChange(Array.from(newIds));
  };

  const selectClass =
    "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  const chipBase =
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors";
  const chipOn = "border-primary bg-primary text-primary-foreground";
  const chipOff =
    "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground";

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "group flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-left transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              selectedOptions.length === 0
                ? "border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5"
                : "border-primary/40 bg-primary/5 hover:border-primary",
              open && "border-primary ring-2 ring-primary/20",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                selectedOptions.length === 0
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              <Building2 className="h-4 w-4" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {selectedOptions.length === 0
                  ? placeholder
                  : `${selectedOptions.length} bien${selectedOptions.length > 1 ? "s" : ""} sélectionné${selectedOptions.length > 1 ? "s" : ""}`}
              </span>
              <span className="block text-xs text-muted-foreground">
                {options.length} bien{options.length > 1 ? "s" : ""} disponible
                {options.length > 1 ? "s" : ""} dans le catalogue
              </span>
            </span>

            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={8}
          className="flex max-h-[min(82vh,680px)] w-[min(94vw,560px)] flex-col overflow-hidden rounded-xl border p-0 shadow-xl"
        >
          {/* ── En-tête : recherche + filtres ─────────────────────── */}
          <div className="space-y-3 border-b bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-10 rounded-lg bg-background pl-9"
                />
              </div>

              <Button
                type="button"
                variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
                className="h-10 gap-2 rounded-lg px-3"
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filtres</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1 text-[11px] font-semibold text-primary">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Raccourcis : transaction */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { value: "ALL", label: "Tous" },
                { value: "SALE", label: "Vente" },
                { value: "RENTAL", label: "Location" },
              ].map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setTransactionType(chip.value)}
                  className={cn(
                    chipBase,
                    transactionType === chip.value ? chipOn : chipOff,
                  )}
                >
                  {chip.label}
                </button>
              ))}

              <span className="mx-1 h-4 w-px bg-border" />

              {["AVAILABLE", "RESERVED"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(status === s ? "ALL" : s)}
                  className={cn(chipBase, status === s ? chipOn : chipOff)}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}

              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ml-auto text-xs font-medium text-destructive hover:underline"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Filtres avancés (repliables) */}
            {showFilters && (
              <div className="space-y-3 rounded-lg border bg-background p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Type de bien
                    </label>
                    <select
                      className={selectClass}
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="ALL">Tous les types</option>
                      {types.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t] ?? t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Statut
                    </label>
                    <select
                      className={selectClass}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="ALL">Tous les statuts</option>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Ville
                    </label>
                    <select
                      className={selectClass}
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        setDistrict("ALL");
                      }}
                    >
                      <option value="ALL">Toutes les villes</option>
                      {cities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Quartier / Délégation
                    </label>
                    <select
                      className={selectClass}
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    >
                      <option value="ALL">Tous les quartiers</option>
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Prix (DT)</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        className="h-9 rounded-lg"
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        className="h-9 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Surface (m²)</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={surfaceMin}
                        onChange={(e) => setSurfaceMin(e.target.value)}
                        className="h-9 rounded-lg"
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={surfaceMax}
                        onChange={(e) => setSurfaceMax(e.target.value)}
                        className="h-9 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Barre de résultats ─────────────────────────────────── */}
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {filtered.length}
              </span>{" "}
              résultat{filtered.length > 1 ? "s" : ""} sur {options.length}
            </span>

            {filtered.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary hover:text-primary"
                onClick={selectAllFiltered}
              >
                Tout sélectionner
              </Button>
            )}
          </div>

          {/* ── Liste des biens ────────────────────────────────────── */}
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Building2 className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Aucun bien ne correspond aux critères.
                </p>
                {hasFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                  >
                    Effacer les filtres
                  </Button>
                )}
              </div>
            ) : (
              filtered.map((option) => {
                const isSelected = selected.includes(option.id);

                return (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => toggle(option.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-3 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                        : "border-transparent bg-card hover:border-border hover:bg-accent/60",
                    )}
                  >
                    {/* Barre d'accent à gauche quand sélectionné */}
                    {isSelected && (
                      <span className="absolute inset-y-0 left-0 w-1 bg-primary" />
                    )}

                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 bg-background",
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>

                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {option.title}
                        </span>
                        <StatusPill status={option.status} />
                      </span>

                      <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {option.city}
                          {option.district && `, ${option.district}`}
                        </span>
                        {option.reference && (
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                            {option.reference}
                          </span>
                        )}
                      </span>

                      <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                        <span className="text-muted-foreground">
                          {TYPE_LABELS[option.type ?? ""] ?? option.type ?? "Bien"}
                          {option.transactionType &&
                            ` · ${TRANSACTION_LABELS[option.transactionType] ?? ""}`}
                        </span>
                        {option.surface ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Ruler className="h-3 w-3" />
                            {formatPrice(option.surface)} m²
                          </span>
                        ) : null}
                        <span className="ml-auto text-sm font-bold text-primary">
                          {formatPrice(option.price)} DT
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* ── Pied : compteur + validation ───────────────────────── */}
          <div className="flex items-center justify-between gap-3 border-t bg-muted/30 p-3">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {selected.length}
              </span>{" "}
              sélectionné{selected.length > 1 ? "s" : ""}
            </span>

            <Button type="button" size="sm" className="px-5" onClick={() => setOpen(false)}>
              Terminer
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* ── Résumé des biens choisis (toujours visible sous le champ) ── */}
      {selectedOptions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Biens à visiter
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => onChange([])}
            >
              Tout supprimer
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {selectedOptions.map((option) => (
              <div
                key={option.id}
                className="flex items-start gap-2 rounded-lg border border-l-4 border-l-primary bg-card p-2.5 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {option.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {option.city}
                    {option.district && `, ${option.district}`}
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-primary">
                    {formatPrice(option.price)} DT
                  </p>
                </div>

                <button
                  type="button"
                  aria-label={`Retirer ${option.title}`}
                  onClick={() => toggle(option.id)}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}