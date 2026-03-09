"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { CircleNotch, PencilSimple } from "@/components/ui/icons";
import { toast } from "sonner";
import { usePrivacy } from "@/lib/privacy";
import { formatINR } from "@/lib/format";
import { updateClientAction } from "@/app/(dashboard)/clients/actions";

interface BalanceInlineFieldProps {
  value: number;
  clientId: number;
}

export function BalanceInlineField({ value, clientId }: BalanceInlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(Math.abs(value).toString());
  const [balanceType, setBalanceType] = useState<"owes" | "advance">(
    value < 0 ? "advance" : "owes"
  );
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const { mask, isPrivate } = usePrivacy();

  // Sync when prop changes (after revalidation)
  useEffect(() => {
    if (!editing) {
      setAmount(Math.abs(value).toString());
      setBalanceType(value < 0 ? "advance" : "owes");
    }
  }, [value, editing]);

  function startEditing() {
    if (isPrivate) return;
    setAmount(Math.abs(value).toString());
    setBalanceType(value < 0 ? "advance" : "owes");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancel() {
    setAmount(Math.abs(value).toString());
    setBalanceType(value < 0 ? "advance" : "owes");
    setEditing(false);
  }

  function save() {
    const raw = amount.trim();
    const parsed = raw ? parseFloat(raw) : 0;
    const signed = balanceType === "advance" ? -Math.abs(parsed) : Math.abs(parsed);

    // No change — just close
    if (signed === value) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await updateClientAction(
        clientId,
        "opening_balance",
        signed.toString()
      );
      if (result.error) {
        toast.error(result.error);
        setAmount(Math.abs(value).toString());
        setBalanceType(value < 0 ? "advance" : "owes");
      } else {
        toast.success("Opening balance updated");
      }
      setEditing(false);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
  }

  // Display value
  const displayValue = (() => {
    if (value === 0) return null;
    const formatted = formatINR(Math.abs(value));
    const label = value < 0 ? `${formatted} (advance)` : formatted;
    if (isPrivate) return mask(label);
    return label;
  })();

  if (editing) {
    return (
      <div className="space-y-1.5 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Opening Balance (INR)
          </p>
          {isPending && (
            <CircleNotch className="size-3 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-md border border-border text-xs">
            <button
              type="button"
              className={`rounded-l-md px-2.5 py-1.5 transition-colors ${
                balanceType === "owes"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setBalanceType("owes")}
            >
              Owes you
            </button>
            <button
              type="button"
              className={`rounded-r-md px-2.5 py-1.5 transition-colors ${
                balanceType === "advance"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setBalanceType("advance")}
            >
              Paid in advance
            </button>
          </div>
          <Input
            ref={inputRef}
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={save}
            onKeyDown={handleKeyDown}
            placeholder="0"
            disabled={isPending}
            className="flex-1"
          />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="group w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/50"
      onClick={startEditing}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Opening Balance (INR)
        </p>
        {!isPrivate && (
          <PencilSimple className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
      <p
        className={`mt-0.5 text-sm ${
          displayValue ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {displayValue ?? "Not set"}
      </p>
    </button>
  );
}
