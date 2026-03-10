"use client";

import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircleNotch } from "@/components/ui/icons";
import { toast } from "sonner";

const practiceProfileSchema = z.object({
  practice_name: z.string().optional(),
  practice_address: z.string().optional(),
  practice_phone: z.string().optional(),
  default_session_rate: z.union([z.number(), z.nan()]).optional(),
});

type PracticeProfileValues = z.infer<typeof practiceProfileSchema>;

type PracticeProfileFormProps = {
  practiceName: string | null;
  practiceAddress: string | null;
  practicePhone: string | null;
  defaultSessionRate: number | null;
};

export function PracticeProfileForm({
  practiceName,
  practiceAddress,
  practicePhone,
  defaultSessionRate,
}: PracticeProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PracticeProfileValues>({
    resolver: standardSchemaResolver(practiceProfileSchema),
    defaultValues: {
      practice_name: practiceName ?? "",
      practice_address: practiceAddress ?? "",
      practice_phone: practicePhone ?? "",
      default_session_rate: defaultSessionRate ?? undefined,
    },
  });

  async function onSubmit(data: PracticeProfileValues) {
    const payload = {
      ...data,
      default_session_rate:
        data.default_session_rate && !isNaN(data.default_session_rate)
          ? data.default_session_rate
          : null,
    };

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      toast.error("Failed to save practice profile");
      return;
    }

    toast.success("Practice profile saved");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="practice_name">Practice name</Label>
          <Input
            id="practice_name"
            placeholder="e.g. Mindful Therapy Practice"
            {...register("practice_name")}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="practice_address">Address</Label>
          <Input
            id="practice_address"
            placeholder="e.g. 123 Main St, Suite 200"
            {...register("practice_address")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="practice_phone">Phone</Label>
          <Input
            id="practice_phone"
            placeholder="e.g. +91 98765 43210"
            {...register("practice_phone")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="default_session_rate">Session Rate (INR)</Label>
          <Input
            id="default_session_rate"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 2000"
            {...register("default_session_rate", { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Default rate for new clients. Can be adjusted on each client&apos;s profile.
          </p>
        </div>
      </div>

      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting && <CircleNotch className="size-4 animate-spin" />}
        Save Profile
      </Button>
    </form>
  );
}
