"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  minDate?: Date;
  maxRangeDays?: number;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "날짜 범위 선택...",
  minDate,
  maxRangeDays = 5,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const diffDays = Math.ceil(
        (range.to.getTime() - range.from.getTime()) / 86_400_000
      );
      if (diffDays >= maxRangeDays) {
        // Cap the end date at maxRangeDays from start
        const capped = new Date(range.from);
        capped.setDate(capped.getDate() + maxRangeDays - 1);
        onChange({ from: range.from, to: capped });
        return;
      }
    }
    onChange(range);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start font-normal",
            !value?.from && "text-muted-foreground"
          )}
        >
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "yyyy년 M월 d일", { locale: ko })} -{" "}
                {format(value.to, "yyyy년 M월 d일", { locale: ko })}
              </>
            ) : (
              format(value.from, "yyyy년 M월 d일", { locale: ko })
            )
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={handleSelect}
          numberOfMonths={2}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (date < new Date()) return true;
            return false;
          }}
        />
        <div className="px-4 pb-3 text-xs text-muted-foreground">
          최대 {maxRangeDays}일 선택 가능
        </div>
      </PopoverContent>
    </Popover>
  );
}
