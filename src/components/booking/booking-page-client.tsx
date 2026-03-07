"use client";

import { useState, useCallback } from "react";
import { SlotPicker } from "./slot-picker";
import { BookingForm } from "./booking-form";

interface TimeSlot {
  start: string;
  end: string;
}

interface BookingPageClientProps {
  slug: string;
  therapistName: string;
  practiceName: string | null;
  duration: number;
}

export function BookingPageClient({
  slug,
  therapistName,
  practiceName,
  duration,
}: BookingPageClientProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const handleSlotSelect = useCallback(
    (date: string, slot: TimeSlot | null) => {
      setSelectedDate(date);
      setSelectedSlot(slot);
    },
    [],
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Book an appointment
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {practiceName ? `${practiceName} - ` : ""}
          {therapistName}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {duration}-minute session
        </p>
      </div>

      <div className="border-t border-border" />

      {/* Slot Picker */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-foreground">
          Select a date & time
        </h2>
        <SlotPicker slug={slug} onSlotSelect={handleSlotSelect} />
      </div>

      {/* Booking Form — show once a slot is selected */}
      {selectedSlot && (
        <>
          <div className="border-t border-border" />
          <div>
            <h2 className="mb-4 text-sm font-medium text-foreground">
              Your details
            </h2>
            <BookingForm
              slug={slug}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              duration={duration}
              therapistName={therapistName}
            />
          </div>
        </>
      )}
    </div>
  );
}
