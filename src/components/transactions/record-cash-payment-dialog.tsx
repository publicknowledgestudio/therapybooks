"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CurrencyInr,
  CircleNotch,
  MagnifyingGlass,
  Check,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  fetchClients,
  recordCashPayment,
} from "@/app/(dashboard)/statement/actions";

export function RecordCashPaymentDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [clients, setClients] = useState<Array<{ id: number; name: string }>>(
    []
  );
  const [loadingClients, setLoadingClients] = useState(false);

  const [selectedClient, setSelectedClient] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch clients when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingClients(true);
      fetchClients()
        .then(setClients)
        .finally(() => setLoadingClients(false));

      // Reset form
      setSelectedClient(null);
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
  }, [open]);

  async function handleSubmit() {
    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!date) {
      toast.error("Please enter a date");
      return;
    }

    setSubmitting(true);
    const result = await recordCashPayment({
      clientId: selectedClient.id,
      amount: numAmount,
      date,
      notes,
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Cash payment recorded");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CurrencyInr className="mr-2 h-4 w-4" />
          Record Cash Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Cash Payment</DialogTitle>
          <DialogDescription>
            Record a cash or manual payment from a client.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Client picker */}
          <div className="grid gap-2">
            <Label htmlFor="client">Client</Label>
            <Popover
              open={clientPopoverOpen}
              onOpenChange={setClientPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientPopoverOpen}
                  className={cn(
                    "w-full justify-between font-normal",
                    !selectedClient && "text-muted-foreground"
                  )}
                >
                  {loadingClients
                    ? "Loading clients..."
                    : selectedClient
                      ? selectedClient.name
                      : "Select a client..."}
                  <MagnifyingGlass className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[375px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search clients..." />
                  <CommandList>
                    <CommandEmpty>No clients found.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={c.name}
                          onSelect={() => {
                            setSelectedClient(c);
                            setClientPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedClient?.id === c.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Amount */}
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (INR)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="e.g. Cash payment, or 'Paid by spouse — Ravi Kumar'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && (
              <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
            )}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
