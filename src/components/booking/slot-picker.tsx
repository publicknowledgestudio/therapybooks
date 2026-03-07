"use client";

import { useState, useEffect, useCallback } from "react";
import { CaretLeft, CaretRight, Spinner } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface TimeSlot {
  start: string;
  end: string;
}

interface SlotPickerProps {
  slug: string;
  onSlotSelect: (date: string, slot: TimeSlot | null) => void;
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function SlotPicker({ slug, onSlotSelect }: SlotPickerProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(
    async (date: string) => {
      setLoading(true);
      setError(null);
      setSlots([]);
      setSelectedSlot(null);
      onSlotSelect(date, null);

      try {
        const res = await fetch(
          `/api/calendar/availability?slug=${encodeURIComponent(slug)}&date=${date}`,
        );
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to load availability");
          return;
        }
        const data = await res.json();
        setSlots(data.slots || []);
      } catch {
        setError("Failed to load availability");
      } finally {
        setLoading(false);
      }
    },
    [slug, onSlotSelect],
  );

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, fetchSlots]);

  function handleDateClick(day: number) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
  }

  function handleSlotClick(slot: TimeSlot) {
    setSelectedSlot(slot);
    if (selectedDate) {
      onSlotSelect(selectedDate, slot);
    }
  }

  function goToPrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const todayStr = toDateString(today);

  // Determine if prev month button should be disabled (can't go before current month)
  const isPrevDisabled =
    currentYear < today.getFullYear() ||
    (currentYear === today.getFullYear() && currentMonth <= today.getMonth());

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={goToPrevMonth}
            disabled={isPrevDisabled}
            className="rounded-md p-1.5 text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Previous month"
          >
            <CaretLeft size={18} />
          </button>
          <span className="text-sm font-medium text-foreground">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button
            onClick={goToNextMonth}
            className="rounded-md p-1.5 text-foreground transition-colors hover:bg-secondary"
            aria-label="Next month"
          >
            <CaretRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0">
          {/* Day labels */}
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="pb-2 text-center text-xs font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}

          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const isPast = dateStr < todayStr;

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                disabled={isPast}
                className={cn(
                  "mx-auto flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors",
                  isPast && "cursor-not-allowed text-muted-foreground/40",
                  !isPast && !isSelected && "hover:bg-secondary",
                  isToday && !isSelected && "font-semibold text-foreground",
                  isSelected &&
                    "bg-foreground text-background font-medium",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-foreground">
            {formatDateDisplay(new Date(selectedDate + "T12:00:00"))}
          </h3>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Spinner size={20} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <p className="py-4 text-center text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && slots.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No available slots on this day
            </p>
          )}

          {!loading && !error && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => {
                const isActive =
                  selectedSlot?.start === slot.start &&
                  selectedSlot?.end === slot.end;
                return (
                  <button
                    key={slot.start}
                    onClick={() => handleSlotClick(slot)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "border-foreground bg-foreground text-background font-medium"
                        : "border-border bg-background text-foreground hover:bg-secondary",
                    )}
                  >
                    {formatTime12h(slot.start)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
