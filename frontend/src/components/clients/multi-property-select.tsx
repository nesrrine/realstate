'use client';

import { useState } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export interface PropertyOption {
  id: string;
  title: string;
  city: string;
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

export function MultiPropertySelect({
  options,
  selected,
  onChange,
  placeholder = 'Sélectionner des biens...',
  searchPlaceholder = 'Rechercher un bien...',
}: MultiPropertySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  const selectedOptions = options.filter((o) => selected.includes(o.id));
  const filtered = options.filter((o) =>
    o.title.toLowerCase().includes(search.toLowerCase()) ||
    o.city.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selectedOptions.length === 1 ? (
              `${selectedOptions[0].title} — ${selectedOptions[0].city}`
            ) : (
              `${selectedOptions.length} biens sélectionnés`
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <div className="p-2">
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground text-center">
                Aucun bien trouvé
              </p>
            ) : (
              filtered.map((option) => {
                const isSelected = selected.includes(option.id);
                return (
                  <div
                    key={option.id}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                    onClick={() => toggle(option.id)}
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded border ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.city} — {typeof option.price === 'number' ? option.price.toLocaleString('fr-FR') : option.price} DT
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-2 flex items-center justify-between border-t border-border">
            <span className="text-xs text-muted-foreground">
              {selected.length}/{options.length} sélectionné(s)
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => { onChange([]); setSearch(''); }}
            >
              <X className="h-3 w-3 mr-1" />
              Réinitialiser
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected chips */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map((option) => (
            <Badge
              key={option.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="text-xs truncate max-w-[120px]">
                {option.title}
              </span>
              <button
                type="button"
                onClick={() => toggle(option.id)}
                className="rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-1"
            onClick={() => { setOpen(true); setSearch(''); }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Ajouter
          </Button>
        </div>
      )}
    </div>
  );
}