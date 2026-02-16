"use client";

import { useState } from "react";
import { format, addDays } from "date-fns";
import { CalendarIcon, Zap, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeadlinePickerProps {
  value: string;
  onChange: (value: string) => void;
  minDate?: Date;
  name?: string;
  required?: boolean;
}

export function DeadlinePicker({
  value,
  onChange,
  minDate,
  name,
  required,
}: DeadlinePickerProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? new Date(value + "T00:00:00") : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  const handleQuickSelect = (days: number) => {
    const date = days === 0 ? new Date() : addDays(new Date(), days);
    onChange(format(date, "yyyy-MM-dd"));
    setOpen(false);
  };

  return (
    <>
      {name && (
        <input type="hidden" name={name} value={value} required={required} />
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Select deadline"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 border border-gray-200 shadow-lg rounded-xl"
          align="start"
        >
          <div className="rounded-xl overflow-hidden bg-white">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              disabled={minDate ? { before: minDate } : undefined}
              defaultMonth={selectedDate || new Date()}
              classNames={{
                root: "p-3",
                months: "flex flex-col",
                month: "flex flex-col gap-3",
                nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
                button_previous: "h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors",
                button_next: "h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors",
                month_caption: "flex h-8 w-full items-center justify-center px-8",
                caption_label: "text-sm font-semibold text-gray-800",
                table: "w-full border-collapse",
                weekdays: "flex",
                weekday: "flex-1 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center py-2",
                week: "mt-1 flex w-full",
                day: "group/day relative aspect-square h-full w-full p-0 text-center",
                outside: "text-gray-300",
                disabled: "text-gray-200 cursor-not-allowed",
                today: "ring-1 ring-blue-500/40 rounded-lg",
                range_start: "",
                range_middle: "",
                range_end: "",
                hidden: "invisible",
              }}
              components={{
                Root: ({ className, rootRef, ...props }) => (
                  <div ref={rootRef} className={cn(className)} {...props} />
                ),
                DayButton: ({ day, modifiers, className, ...props }) => {
                  const isSelected = modifiers.selected;
                  const isOutside = modifiers.outside;
                  const isDisabled = modifiers.disabled;
                  return (
                    <button
                      type="button"
                      disabled={isDisabled}
                      className={cn(
                        "flex aspect-square w-full min-w-[2rem] items-center justify-center rounded-lg text-sm transition-all",
                        isSelected
                          ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/25"
                          : isOutside
                          ? "text-gray-300"
                          : isDisabled
                          ? "text-gray-200 cursor-not-allowed"
                          : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                      )}
                      {...props}
                    />
                  );
                },
                Chevron: ({ orientation }) => (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-current"
                  >
                    {orientation === "left" ? (
                      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </svg>
                ),
              }}
            />

            {/* Quick Select Buttons */}
            <div className="flex gap-2 px-3 pb-3 border-t border-gray-100 pt-2">
              <button
                type="button"
                onClick={() => handleQuickSelect(0)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-gray-600 hover:text-blue-700 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-colors"
              >
                <Zap className="h-3 w-3" />
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(7)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-gray-600 hover:text-blue-700 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-colors"
              >
                <CalendarDays className="h-3 w-3" />
                +7 days
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(30)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-gray-600 hover:text-blue-700 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 transition-colors"
              >
                <CalendarDays className="h-3 w-3" />
                +30 days
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
