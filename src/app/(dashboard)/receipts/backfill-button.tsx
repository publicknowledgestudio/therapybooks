"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CircleNotch } from "@/components/ui/icons";
import { toast } from "sonner";
import { backfillReceipts } from "./actions";

export function BackfillButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleBackfill() {
    setLoading(true);
    try {
      const result = await backfillReceipts();
      if (result.error) {
        toast.error(result.error);
      } else if (result.created === 0) {
        toast.info("All payments already have receipts");
      } else {
        toast.success(
          `Generated ${result.created} receipt${result.created !== 1 ? "s" : ""}`
        );
      }
      router.refresh();
    } catch {
      toast.error("Failed to generate receipts");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleBackfill}
      disabled={loading}
    >
      {loading && <CircleNotch className="size-4 animate-spin" />}
      Generate Receipts for Previous Payments
    </Button>
  );
}
