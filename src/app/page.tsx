"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  CalendarBlank,
  Users,
  CurrencyInr,
  AddressBook,
} from "@/components/ui/icons";

const FEATURES = [
  {
    icon: CurrencyInr,
    title: "Payment Tracking",
    description:
      "Import HDFC Bank statements and automatically match payments to client sessions, generate invoices, and flag overdue payments.",
  },
  {
    icon: CalendarBlank,
    title: "Session Scheduling",
    description:
      "Enforce your working hours and a cancellation policy, and show clients a page where they can book sessions on empty calendar slots themselves.",
  },
  {
    icon: Users,
    title: "Client Reminders",
    description: "One-click Whatsapp reminders for sessions with meeting links or location pins to reduce no-shows.",
  },
];

const PERMISSIONS = [
  {
    icon: CalendarBlank,
    scope: "Google Calendar",
    reason:
      "So your sessions appear on your calendar automatically, and new calendar events can create sessions in therapybook.",
  },
  {
    icon: AddressBook,
    scope: "Google Contacts",
    reason:
      "Allows you to pick your clients from your phone contacts during onboarding instead of typing them in manually.",
  },
];

export default function LandingPage() {
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleGoogleSignIn() {
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
      setError(error.message);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Image
          src="/therapybook-logo.png"
          alt="therapybook"
          width={200}
          height={46}
          className="h-8 w-auto"
          priority
        />

        {/* Tagline */}
        <p className="mt-3 text-lg text-muted-foreground">
          Simple bookkeeping for Indian therapists.
        </p>

        {/* Features */}
        <div className="mt-10 space-y-5">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card">
                <Icon className="h-4 w-4 text-muted-foreground" weight="regular" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sign in */}
        <div className="mt-10">
          <Button
            type="button"
            className="w-full"
            onClick={handleGoogleSignIn}
          >
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
            Sign in with Google
          </Button>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        {/* Permissions explainer */}
        <div className="mt-10 rounded-lg border border-border bg-card p-5">
          <p className="text-sm font-medium text-foreground">
            Why we ask for permissions
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            We need access to your calendar, contacts and bank statement to
            automatically start matching sessions to your bank statement. This is
            optional, and you can alternatively fill out things manually.
          </p>
          <div className="mt-4 space-y-3">
            {PERMISSIONS.map(({ icon: Icon, scope, reason }) => (
              <div key={scope} className="flex gap-2.5">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" weight="regular" />
                <div>
                  <p className="text-xs font-medium text-foreground">{scope}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{reason}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            We never share your data with anyone. You can revoke access at any
            time from your Google account settings.
          </p>
        </div>

        {/* Legal links */}
        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <span>&middot;</span>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
