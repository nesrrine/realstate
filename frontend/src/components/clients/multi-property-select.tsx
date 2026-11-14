
"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Plus,
  X,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
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

function toNumber(value: number | string | undefined): number {
  if (value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(value: number | string): string {
  return toNumber(value).toLocaleString("fr-FR");
}

export function MultiPropertySelect({
  options,
  selected,
  onChange,
  placeholder = "Sélectionner des biens...",
  searchPlaceholder = "Rechercher par titre, référence, adresse...",
}: MultiPropertySelectProps) {
  const [open, setOpen] = useState(false);
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
            .filter((d): d is string => !!d),
        ),
      ).sort(),
    [options, city],
  );

  const types = useMemo(
    () => Array.from(new Set(options.map((o) => o.type).filter(Boolean))),
    [options],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return options.filter((o) => {
      const searchable = [
        o.title,
        o.reference,
        o.address,
        o.city,
        o.district,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !searchable.includes(query)) return false;

      if (type !== "ALL" && o.type !== type) return false;

      if (
        transactionType !== "ALL" &&
        o.transactionType !== transactionType
      )
        return false;

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

  const hasFilters =
    !!search ||
    type !== "ALL" ||
    transactionType !== "ALL" ||
    status !== "ALL" ||
    city !== "ALL" ||
    district !== "ALL" ||
    !!priceMin ||
    !!priceMax ||
    !!surfaceMin ||
    !!surfaceMax;

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
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal min-h-10"
          >
            <span className="truncate text-left">
              {selectedOptions.length === 0
                ? placeholder
                : `${selectedOptions.length} bien(s) sélectionné(s)`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[min(94vw,460px)] p-0"
        >
          <div className="border-b p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <SlidersHorizontal className="h-4 w-4" />
                Recherche multicritère
              </div>

              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-7 text-xs"
                >
                  Effacer les filtres
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9 h-9"
              />
            </div>

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
                      {TYPE_LABELS[t!] ?? t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Transaction
                </label>
                <select
                  className={selectClass}
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                >
                  <option value="ALL">Vente et location</option>
                  <option value="SALE">Vente</option>
                  <option value="RENTAL">Location</option>
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
                    <option key={c} value={c}>{c}</option>
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
                    <option key={d} value={d}>{d}</option>
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
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">
                Prix (DT)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Prix minimum"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="h-9"
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Prix maximum"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">
                Surface (m²)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Surface min."
                  value={surfaceMin}
                  onChange={(e) => setSurfaceMin(e.target.value)}
                  className="h-9"
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Surface max."
                  value={surfaceMax}
                  onChange={(e) => setSurfaceMax(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {filtered.length} résultat(s) sur {options.length}
            </span>

            {filtered.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={selectAllFiltered}
              >
                Tout sélectionner
              </Button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun bien ne correspond aux critères.
              </p>
            ) : (
              filtered.map((option) => {
                const isSelected = selected.includes(option.id);

                return (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => toggle(option.id)}
                    className="flex w-full items-start gap-3 rounded-md p-2 text-left hover:bg-accent transition-colors"
                  >
                    <span
                      className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-sm truncate">
                        {option.title}
                      </span>

                      <span className="block text-xs text-muted-foreground">
                        {option.reference && `${option.reference} · `}
                        {option.city}
                        {option.district && ` · ${option.district}`}
                      </span>

                      <span className="block text-xs text-muted-foreground mt-1">
                        {TYPE_LABELS[option.type ?? ""] ?? option.type ?? "Bien"} 
                        {" · "}
                        {TRANSACTION_LABELS[option.transactionType ?? ""] ?? ""}
                        {" · "}
                        {formatPrice(option.price)} DT
                        {option.surface && ` · ${formatPrice(option.surface)} m²`}
                      </span>
                    </span>

                    <span className="shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {STATUS_LABELS[option.status] ?? option.status}
                      </Badge>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t p-3">
            <span className="text-xs text-muted-foreground">
              {selected.length} / {options.length} sélectionné(s)
            </span>

            <Button
              type="button"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Terminer
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">
              Biens sélectionnés
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-destructive"
              onClick={() => onChange([])}
            >
              Tout supprimer
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {selectedOptions.map((option) => (
              <Badge
                key={option.id}
                variant="secondary"
                className="gap-1 pr-1 max-w-full"
              >
                <span className="text-xs truncate max-w-[150px]">
                  {option.title}
                </span>
                <button
                  type="button"
                  aria-label={`Retirer ${option.title}`}
                  onClick={() => toggle(option.id)}
                  className="rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
