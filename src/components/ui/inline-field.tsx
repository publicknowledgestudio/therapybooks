"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CircleNotch, PencilSimple } from "@/components/ui/icons";
import { toast } from "sonner";
import { usePrivacy } from "@/lib/privacy";
import { updateClientAction } from "@/app/(dashboard)/clients/actions";

interface InlineFieldProps {
  label: string;
  value: string | number | null;
  field: string;
  clientId: number;
  type?: "text" | "email" | "tel" | "number" | "textarea";
  placeholder?: string;
  format?: (v: string | number | null) => string;
  required?: boolean;
}

export function InlineField({
  label,
  value,
  field,
  clientId,
  type = "text",
  placeholder,
  format,
  required,
}: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const { mask, isPrivate } = usePrivacy();

  // Sync localValue when prop changes (after revalidation)
  useEffect(() => {
    if (!editing) {
      setLocalValue(value?.toString() ?? "");
    }
  }, [value, editing]);

  function startEditing() {
    if (isPrivate) return;
    setLocalValue(value?.toString() ?? "");
    setEditing(true);
    // Focus after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancel() {
    setLocalValue(value?.toString() ?? "");
    setEditing(false);
  }

  function save() {
    const newValue = localValue.trim();
    const oldValue = value?.toString() ?? "";

    // No change — just close
    if (newValue === oldValue.trim()) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await updateClientAction(clientId, field, newValue);
      if (result.error) {
        toast.error(result.error);
        setLocalValue(oldValue);
      } else {
        toast.success(`${label} updated`);
      }
      setEditing(false);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
    if (e.key === "Enter" && type !== "textarea") {
      e.preventDefault();
      save();
    }
  }

  // Display value
  const displayValue = (() => {
    if (value === null || value === undefined || value === "") return null;
    if (isPrivate) return mask(format ? format(value) : String(value));
    if (format) return format(value);
    return String(value);
  })();

  if (editing) {
    const sharedProps = {
      value: localValue,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => setLocalValue(e.target.value),
      onBlur: save,
      onKeyDown: handleKeyDown,
      placeholder: placeholder ?? label,
      disabled: isPending,
    };

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {isPending && (
            <CircleNotch className="size-3 animate-spin text-muted-foreground" />
          )}
        </div>
        {type === "textarea" ? (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={3}
            {...sharedProps}
          />
        ) : (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            min={type === "number" ? "0" : undefined}
            step={type === "number" ? "1" : undefined}
            {...sharedProps}
          />
        )}
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
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {!isPrivate && (
          <PencilSimple className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
      <p className={`mt-0.5 text-sm ${displayValue ? "text-foreground" : "text-muted-foreground"}`}>
        {displayValue ?? (placeholder || "Not set")}
      </p>
    </button>
  );
}
