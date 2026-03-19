"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, X, MagnifyingGlass } from "@/components/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface ClientOption {
  id: number;
  name: string;
}

interface ClientPickerProps {
  suggestions: ClientOption[];
  allClients: ClientOption[];
  selected: ClientOption | null;
  onSelect: (client: ClientOption | null) => void;
}

export function ClientPicker({
  suggestions,
  allClients,
  selected,
  onSelect,
}: ClientPickerProps) {
  const [open, setOpen] = useState(false);

  if (selected) {
    return (
      <Badge
        variant="default"
        className="inline-flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200"
      >
        {selected.name}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="ml-0.5 rounded-full hover:bg-green-200 dark:hover:bg-green-800"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {suggestions.map((s) => (
        <Badge
          key={s.id}
          variant="outline"
          className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        >
          {s.name}
          <button
            type="button"
            onClick={() => onSelect(s)}
            className="rounded-full hover:bg-green-100 dark:hover:bg-green-900"
          >
            <Check className="h-3 w-3 text-green-600" />
          </button>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-full hover:bg-red-100 dark:hover:bg-red-900"
          >
            <X className="h-3 w-3 text-red-500" />
          </button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
          >
            <MagnifyingGlass className="h-3 w-3" />
            Search
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search clients..." />
            <CommandList>
              <CommandEmpty>No clients found.</CommandEmpty>
              <CommandGroup>
                {allClients.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name}
                    onSelect={() => {
                      onSelect(c);
                      setOpen(false);
                    }}
                  >
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
