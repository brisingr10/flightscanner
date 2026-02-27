"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import airports from "@/data/airports.json";

interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

interface AirportComboboxProps {
  value: string;
  onSelect: (iata: string) => void;
  placeholder?: string;
  excludeIata?: string;
}

export function AirportCombobox({
  value,
  onSelect,
  placeholder = "공항 선택...",
  excludeIata,
}: AirportComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedAirport = (airports as Airport[]).find(
    (a) => a.iata === value
  );

  const filteredAirports = excludeIata
    ? (airports as Airport[]).filter((a) => a.iata !== excludeIata)
    : (airports as Airport[]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedAirport
            ? `${selectedAirport.iata} - ${selectedAirport.city}`
            : placeholder}
          <span className="ml-2 shrink-0 opacity-50">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command>
          <CommandInput placeholder="공항 검색..." />
          <CommandList>
            <CommandEmpty>공항을 찾을 수 없습니다.</CommandEmpty>
            <CommandGroup>
              {filteredAirports.map((airport) => (
                <CommandItem
                  key={airport.iata}
                  value={`${airport.iata} ${airport.name} ${airport.city} ${airport.country}`}
                  onSelect={() => {
                    onSelect(airport.iata);
                    setOpen(false);
                  }}
                >
                  <span className="font-mono font-bold mr-2">
                    {airport.iata}
                  </span>
                  <span className="truncate">
                    {airport.city} - {airport.name}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {airport.country}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
