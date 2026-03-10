"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, CircleNotch } from "@/components/ui/icons";
import { toast } from "sonner";
import { createClientAction } from "@/app/(dashboard)/clients/actions";

interface AddClientDialogProps {
  defaultSessionRate?: number | null;
}

export function AddClientDialog({ defaultSessionRate }: AddClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const defaultRate = defaultSessionRate ? defaultSessionRate.toString() : "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentRate, setCurrentRate] = useState(defaultRate);
  const [openingBalance, setOpeningBalance] = useState("");
  const [balanceType, setBalanceType] = useState<"owes" | "advance">("owes");

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setCurrentRate(defaultRate);
    setOpeningBalance("");
    setBalanceType("owes");
    setError("");
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) resetForm();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      // Apply sign: advance payments stored as negative
      const signedBalance =
        openingBalance && balanceType === "advance"
          ? `-${openingBalance}`
          : openingBalance;

      const result = await createClientAction({
        name,
        email,
        phone,
        currentRate,
        openingBalance: signedBalance,
      });

      if (result.error) {
        setError(result.error);
      } else {
        toast.success(`${name} added to your client list`);
        setOpen(false);
        resetForm();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="client-name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client-email">Email</Label>
            <Input
              id="client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client-phone">Phone</Label>
            <Input
              id="client-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client-rate">Session Rate (INR)</Label>
            <Input
              id="client-rate"
              type="number"
              min="0"
              step="1"
              value={currentRate}
              onChange={(e) => setCurrentRate(e.target.value)}
              placeholder="2000"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="client-balance">Opening Balance (INR)</Label>
            <p className="text-xs text-muted-foreground">
              Starting balance from before you started using therapybook.
            </p>
            <div className="flex gap-2">
              <div className="inline-flex rounded-md border border-border text-xs">
                <button
                  type="button"
                  className={`rounded-l-md px-3 py-1.5 transition-colors ${
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
                  className={`rounded-r-md px-3 py-1.5 transition-colors ${
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
                id="client-balance"
                type="number"
                min="0"
                step="1"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0"
                className="flex-1"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Client
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
