"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { fr } from "date-fns/locale" // Import French locale
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange;
  onDateChange?: (dateRange?: DateRange) => void;
}

export function DatePickerWithRange({
  className,
  date: initialDate,
  onDateChange,
}: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(
    initialDate || {
      from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Default to start of current month
      to: addDays(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 0), // Default to start of current month
    }
  );

  React.useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  const handleSelect = (selectedDate?: DateRange) => {
    setDate(selectedDate);
    if (onDateChange) {
      onDateChange(selectedDate);
    }
  };


  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd LLL, y", { locale: fr })} -{" "}
                  {format(date.to, "dd LLL, y", { locale: fr })}
                </>
              ) : (
                format(date.from, "dd LLL, y", { locale: fr })
              )
            ) : (
              <span>Choisir une plage de dates</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={fr} // Use French locale for the calendar
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
