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

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentRate, setCurrentRate] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setCurrentRate("");
    setOpeningBalance("");
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
      const result = await createClientAction({
        name,
        email,
        phone,
        currentRate,
        openingBalance,
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
              Amount this client owes you from before you started using therapybook.
            </p>
            <Input
              id="client-balance"
              type="number"
              min="0"
              step="1"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0"
            />
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
