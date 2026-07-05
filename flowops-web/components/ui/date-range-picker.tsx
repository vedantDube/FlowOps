"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { cn } from "@/app/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  startMonth?: Date;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  startMonth,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value, open]);

  const label =
    value?.from && value?.to
      ? `${format(value.from, "MMM d, yyyy")} – ${format(value.to, "MMM d, yyyy")}`
      : "Custom range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-3 text-xs rounded-md gap-1.5 text-muted-foreground hover:text-foreground",
            value?.from && value?.to && "text-foreground",
            className,
          )}
        >
          <CalendarIcon size={12} />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto">
        <Calendar
          mode="range"
          defaultMonth={draft?.from}
          selected={draft}
          onSelect={setDraft}
          numberOfMonths={2}
          startMonth={startMonth}
          endMonth={new Date()}
          disabled={{ after: new Date() }}
        />
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            disabled={!draft?.from || !draft?.to}
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
