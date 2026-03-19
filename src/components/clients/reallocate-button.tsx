"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { allocateSessionPayments } from "@/app/(dashboard)/clients/allocate-payments";
import { useRouter } from "next/navigation";

export function ReallocateButton({ clientId }: { clientId: number }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await allocateSessionPayments(clientId);
      if (result.error) {
        setMessage(`Error: ${result.error}`);
      } else {
        setMessage(`Allocated ${result.allocated} payment(s)`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? "Allocating..." : "Re-allocate Payments"}
      </Button>
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
}
