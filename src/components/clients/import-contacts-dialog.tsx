"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CircleNotch,
  MagnifyingGlass,
  Users,
  CalendarBlank,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type ContactItem = {
  name: string;
  email: string | null;
  phone: string | null;
  inCalendar: boolean;
};

export function ImportContactsDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(
    new Set()
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  // Fetch contacts when dialog opens
  useEffect(() => {
    if (!open) return;

    async function fetchContacts() {
      setLoading(true);
      setError("");
      setContacts([]);
      setSelectedContacts(new Set());
      setSearch("");

      try {
        const res = await fetch("/api/contacts");
        if (!res.ok) throw new Error("Failed to fetch contacts");
        const data = await res.json();
        const items: ContactItem[] = data.contacts ?? [];
        setContacts(items);

        // Pre-select contacts that appear in calendar
        const preSelected = new Set<number>();
        items.forEach((c, i) => {
          if (c.inCalendar) preSelected.add(i);
        });
        setSelectedContacts(preSelected);
      } catch {
        setError(
          "Could not load your Google contacts. Make sure Google is connected in Settings."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, [open]);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [contacts, search]);

  const filteredIndices = useMemo(() => {
    if (!search.trim()) return contacts.map((_, i) => i);
    const q = search.toLowerCase();
    return contacts.reduce<number[]>((acc, c, i) => {
      if (
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      ) {
        acc.push(i);
      }
      return acc;
    }, []);
  }, [contacts, search]);

  function toggleContact(originalIndex: number) {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(originalIndex)) {
        next.delete(originalIndex);
      } else {
        next.add(originalIndex);
      }
      return next;
    });
  }

  async function handleImport() {
    const contactsToImport = Array.from(selectedContacts).map((i) => ({
      name: contacts[i].name,
      email: contacts[i].email,
      phone: contacts[i].phone,
    }));

    if (contactsToImport.length === 0) {
      toast.error("Please select at least one contact to import.");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: contactsToImport }),
      });

      if (!res.ok) throw new Error("Failed to import clients");

      const data = await res.json();
      const count = data.imported ?? contactsToImport.length;
      toast.success(
        `Imported ${count} client${count !== 1 ? "s" : ""}`
      );
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to import clients. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Users className="mr-1.5 h-4 w-4" />
        Import Contacts
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Google Contacts</DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <CircleNotch className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {error}
            </p>
          )}

          {!loading && !error && contacts.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No contacts found.
            </p>
          )}

          {!loading && contacts.length > 0 && (
            <>
              <div className="relative">
                <MagnifyingGlass className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                {selectedContacts.size} of {contacts.length} selected
              </div>

              <ScrollArea className="flex-1 min-h-0 max-h-[40vh]">
                <div className="space-y-1">
                  {filteredContacts.map((contact, fi) => {
                    const originalIndex = filteredIndices[fi];
                    const isSelected = selectedContacts.has(originalIndex);
                    return (
                      <label
                        key={originalIndex}
                        className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleContact(originalIndex)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {contact.name}
                            </span>
                            {contact.inCalendar && (
                              <Badge
                                variant="outline"
                                className="text-[10px] gap-1 shrink-0"
                              >
                                <CalendarBlank className="h-2.5 w-2.5" />
                                In calendar
                              </Badge>
                            )}
                          </div>
                          {(contact.email || contact.phone) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[contact.email, contact.phone]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || selectedContacts.size === 0}
            >
              {importing && (
                <CircleNotch className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {importing
                ? "Importing..."
                : `Import ${selectedContacts.size} Contact${selectedContacts.size !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
