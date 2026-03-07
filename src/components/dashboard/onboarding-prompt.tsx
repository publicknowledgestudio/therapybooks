"use client";

import Link from "next/link";
import { GoogleLogo } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

export function OnboardingPrompt() {
  return (
    <div className="mt-8 rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground">Get started</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect your Google account to see your schedule, clients, and sessions here.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Button asChild>
          <Link href="/onboarding">
            <GoogleLogo className="size-4" weight="bold" />
            Connect Google Account
          </Link>
        </Button>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}
