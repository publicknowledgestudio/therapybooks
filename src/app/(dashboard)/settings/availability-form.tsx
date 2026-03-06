"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CircleNotch } from "@/components/ui/icons";
import { toast } from "sonner";

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const dayScheduleSchema = z.object({
  key: z.string(),
  start: z.string(),
  end: z.string(),
  enabled: z.boolean(),
});

const availabilitySchema = z.object({
  days: z.array(dayScheduleSchema),
  session_duration_minutes: z.number().min(15).max(120),
  break_between_minutes: z.number().min(0).max(60),
  advance_notice_hours: z.number().min(0).max(168),
  cancellation_window_hours: z.number().min(0).max(168),
});

type AvailabilityFormValues = z.infer<typeof availabilitySchema>;

type WorkingHours = Record<
  string,
  { start: string; end: string; enabled: boolean }
>;

type AvailabilityFormProps = {
  workingHours: WorkingHours;
  sessionDurationMinutes: number;
  breakBetweenMinutes: number;
  advanceNoticeHours: number;
  cancellationWindowHours: number;
};

export function AvailabilityForm({
  workingHours,
  sessionDurationMinutes,
  breakBetweenMinutes,
  advanceNoticeHours,
  cancellationWindowHours,
}: AvailabilityFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<AvailabilityFormValues>({
    resolver: standardSchemaResolver(availabilitySchema),
    defaultValues: {
      days: DAY_KEYS.map((key) => ({
        key,
        start: workingHours[key]?.start ?? "09:00",
        end: workingHours[key]?.end ?? "18:00",
        enabled: workingHours[key]?.enabled ?? false,
      })),
      session_duration_minutes: sessionDurationMinutes,
      break_between_minutes: breakBetweenMinutes,
      advance_notice_hours: advanceNoticeHours,
      cancellation_window_hours: cancellationWindowHours,
    },
  });

  const { fields } = useFieldArray({ control, name: "days" });
  const watchDays = watch("days");

  async function onSubmit(data: AvailabilityFormValues) {
    // Convert days array back to working_hours object
    const working_hours: WorkingHours = {};
    for (const day of data.days) {
      working_hours[day.key] = {
        start: day.start,
        end: day.end,
        enabled: day.enabled,
      };
    }

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        working_hours,
        session_duration_minutes: data.session_duration_minutes,
        break_between_minutes: data.break_between_minutes,
        advance_notice_hours: data.advance_notice_hours,
        cancellation_window_hours: data.cancellation_window_hours,
      }),
    });

    if (!res.ok) {
      toast.error("Failed to save availability settings");
      return;
    }

    toast.success("Availability settings saved");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Working Hours */}
      <div>
        <h4 className="text-sm font-medium mb-4">Working Hours</h4>
        <div className="space-y-3">
          {fields.map((field, index) => {
            const dayEnabled = watchDays[index]?.enabled ?? false;
            return (
              <div
                key={field.id}
                className="grid grid-cols-[100px_40px_1fr_auto_1fr] items-center gap-3"
              >
                <span className="text-sm text-foreground">
                  {DAY_LABELS[field.key]}
                </span>
                <Switch
                  checked={dayEnabled}
                  onCheckedChange={(checked: boolean) =>
                    setValue(`days.${index}.enabled`, checked)
                  }
                />
                <Input
                  type="time"
                  disabled={!dayEnabled}
                  className="max-w-[130px]"
                  {...register(`days.${index}.start`)}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  disabled={!dayEnabled}
                  className="max-w-[130px]"
                  {...register(`days.${index}.end`)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Session Settings */}
      <div>
        <h4 className="text-sm font-medium mb-4">Session Settings</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="session_duration_minutes">
              Session duration (minutes)
            </Label>
            <Input
              id="session_duration_minutes"
              type="number"
              min={15}
              max={120}
              {...register("session_duration_minutes", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="break_between_minutes">
              Break between sessions (minutes)
            </Label>
            <Input
              id="break_between_minutes"
              type="number"
              min={0}
              max={60}
              {...register("break_between_minutes", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="advance_notice_hours">
              Minimum advance notice (hours)
            </Label>
            <Input
              id="advance_notice_hours"
              type="number"
              min={0}
              max={168}
              {...register("advance_notice_hours", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cancellation_window_hours">
              Cancellation window (hours)
            </Label>
            <Input
              id="cancellation_window_hours"
              type="number"
              min={0}
              max={168}
              {...register("cancellation_window_hours", {
                valueAsNumber: true,
              })}
            />
          </div>
        </div>
      </div>

      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting && <CircleNotch className="size-4 animate-spin" />}
        Save Availability
      </Button>
    </form>
  );
}
