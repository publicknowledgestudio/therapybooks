"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  CalendarBlank,
  Check,
  CheckCircle,
  Circle,
  MagnifyingGlass,
  Users,
} from "@/components/ui/icons";

type CalendarItem = {
  id: string;
  summary: string;
  primary: boolean;
};

type ContactItem = {
  name: string;
  email: string | null;
  phone: string | null;
  inCalendar: boolean;
};

const TOTAL_STEPS = 4;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i + 1 === current
              ? "bg-foreground"
              : i + 1 < current
                ? "bg-foreground/40"
                : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [calendarError, setCalendarError] = useState("");

  // Step 3: Contacts import state
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(
    new Set(),
  );
  const [contactSearch, setContactSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.provider_token) {
        setHasGoogleToken(true);
        setStep(2);
      }
    }
    checkSession();
  }, [supabase.auth]);

  // Fetch calendars when entering step 2
  useEffect(() => {
    if (step !== 2 || !hasGoogleToken) return;

    async function fetchCalendars() {
      setLoadingCalendars(true);
      setCalendarError("");

      try {
        const res = await fetch("/api/calendar/list");
        if (!res.ok) {
          throw new Error("Failed to fetch calendars");
        }
        const data = await res.json();
        const items: CalendarItem[] = data.calendars ?? [];
        setCalendars(items);

        // Pre-select the primary calendar
        const primary = items.find((c) => c.primary);
        if (primary) {
          setSelectedCalendar(primary.id);
        }
      } catch {
        setCalendarError("Could not load your calendars. Please try again.");
      } finally {
        setLoadingCalendars(false);
      }
    }

    fetchCalendars();
  }, [step, hasGoogleToken]);

  // Fetch contacts when entering step 3
  useEffect(() => {
    if (step !== 3) return;

    async function fetchContacts() {
      setLoadingContacts(true);
      setContactsError("");

      try {
        const params = new URLSearchParams();
        if (selectedCalendar) {
          params.set("calendarId", selectedCalendar);
        }
        const res = await fetch(`/api/contacts?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to fetch contacts");
        }
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
        setContactsError(
          "Could not load your contacts. Please try again or skip this step.",
        );
      } finally {
        setLoadingContacts(false);
      }
    }

    fetchContacts();
  }, [step, selectedCalendar]);

  // Filtered contacts based on search
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const query = contactSearch.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query),
    );
  }, [contacts, contactSearch]);

  // Map filtered indices back to original indices for selection tracking
  const filteredIndices = useMemo(() => {
    if (!contactSearch.trim()) return contacts.map((_, i) => i);
    const query = contactSearch.toLowerCase();
    return contacts.reduce<number[]>((acc, c, i) => {
      if (
        c.name.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.includes(query)
      ) {
        acc.push(i);
      }
      return acc;
    }, []);
  }, [contacts, contactSearch]);

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
        body: JSON.stringify({
          contacts: contactsToImport,
          calendarId: selectedCalendar,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to import clients");
      }

      const data = await res.json();
      const count = data.imported ?? contactsToImport.length;
      setImportCount(count);
      toast.success(`Successfully imported ${count} client${count !== 1 ? "s" : ""}.`);
      setStep(4);
    } catch {
      toast.error("Failed to import clients. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  async function handleGoogleConnect() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding`,
        scopes:
          "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Google sign-in error:", error.message);
    }
  }

  function handleGoToDashboard() {
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <StepIndicator current={step} />

      {/* Step 1: Welcome */}
      {step === 1 && (
        <div className="mt-8">
          <h1 className="text-2xl font-semibold">Welcome to therapybooks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Let&apos;s set up your practice in a few quick steps.
          </p>

          <div className="mt-8 space-y-3">
            <Button className="w-full" onClick={handleGoogleConnect}>
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Connect Google Account
            </Button>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleGoToDashboard}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Select Calendar */}
      {step === 2 && (
        <div className="mt-8">
          <h1 className="text-2xl font-semibold">
            Which calendar has your sessions?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the calendar you use to schedule therapy sessions.
          </p>

          <div className="mt-8">
            {loadingCalendars && (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
              </div>
            )}

            {calendarError && (
              <p className="text-sm text-red-600">{calendarError}</p>
            )}

            {!loadingCalendars && !calendarError && calendars.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No calendars found. Make sure your Google account has at least
                one calendar.
              </p>
            )}

            {!loadingCalendars && calendars.length > 0 && (
              <div className="space-y-2">
                {calendars.map((cal) => (
                  <button
                    key={cal.id}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50 ${
                      selectedCalendar === cal.id
                        ? "border-foreground bg-accent/30"
                        : "border-border"
                    }`}
                    onClick={() => setSelectedCalendar(cal.id)}
                  >
                    <span className="flex-shrink-0 text-foreground">
                      {selectedCalendar === cal.id ? (
                        <CheckCircle weight="fill" className="size-5" />
                      ) : (
                        <Circle className="size-5 text-muted-foreground" />
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <CalendarBlank className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{cal.summary}</span>
                      {cal.primary && (
                        <Badge variant="secondary" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setStep(4)}
            >
              Skip
            </button>
            <Button
              onClick={() => setStep(3)}
              disabled={!selectedCalendar}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Import Clients */}
      {step === 3 && (
        <div className="mt-8">
          <h1 className="text-2xl font-semibold">Add your active clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the clients you currently see. Contacts who appear in your
            calendar are pre-selected. You can set opening balances for anyone
            who owes you money from before.
          </p>

          <div className="mt-6">
            {/* Loading skeletons */}
            {loadingContacts && (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full rounded-md" />
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Skeleton className="h-4 w-4 rounded-[4px]" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {contactsError && (
              <p className="text-sm text-red-600">{contactsError}</p>
            )}

            {/* Empty state */}
            {!loadingContacts && !contactsError && contacts.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Users className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No contacts found in your Google account. You can add clients
                  manually from the dashboard.
                </p>
              </div>
            )}

            {/* Contacts list */}
            {!loadingContacts && contacts.length > 0 && (
              <>
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Selection counter */}
                <p className="mt-3 text-sm text-muted-foreground">
                  {selectedContacts.size} selected
                </p>

                {/* Scrollable list */}
                <ScrollArea className="mt-2 h-[320px] rounded-lg border">
                  <div className="p-1">
                    {filteredContacts.length === 0 && (
                      <p className="p-4 text-center text-sm text-muted-foreground">
                        No contacts match your search.
                      </p>
                    )}
                    {filteredContacts.map((contact, filterIdx) => {
                      const originalIdx = filteredIndices[filterIdx];
                      const isSelected = selectedContacts.has(originalIdx);

                      return (
                        <label
                          key={originalIdx}
                          className="flex cursor-pointer items-center gap-3 rounded-md p-3 transition-colors hover:bg-accent/50"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleContact(originalIdx)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">
                                {contact.name}
                              </span>
                              {contact.inCalendar && (
                                <Badge
                                  variant="secondary"
                                  className="shrink-0 text-[10px]"
                                >
                                  <CalendarBlank className="mr-1 size-3" />
                                  In your calendar
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {contact.email && (
                                <span className="truncate">{contact.email}</span>
                              )}
                              {contact.phone && (
                                <span className="shrink-0">{contact.phone}</span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setStep(4)}
            >
              Skip
            </button>
            <Button
              onClick={handleImport}
              disabled={selectedContacts.size === 0 || importing}
            >
              {importing
                ? "Importing..."
                : `Import ${selectedContacts.size} Client${selectedContacts.size !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="mt-8">
          <div className="flex items-center gap-3">
            <Check weight="bold" className="size-7 text-green-600" />
            <h1 className="text-2xl font-semibold">You&apos;re all set!</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {importCount !== null
              ? `Imported ${importCount} client${importCount !== 1 ? "s" : ""}. If any of them owe you money from before, set an opening balance on their profile.`
              : "Your practice is ready. Head to your dashboard to get started."}
          </p>

          <div className="mt-8">
            <Button className="w-full" onClick={handleGoToDashboard}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
