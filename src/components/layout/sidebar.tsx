"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import {
  SquaresFour,
  Users,
  CalendarBlank,
  ArrowsLeftRight,
  FileText,
  LinkSimple,
  UserCheck,
  GearSix,
  SignOut,
  List,
  Eye,
  EyeSlash,
} from "@/components/ui/icons";
import { usePrivacy } from "@/lib/privacy";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: SquaresFour },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Appointments", href: "/sessions", icon: CalendarBlank },
  { label: "Bank Statement", href: "/statement", icon: ArrowsLeftRight },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Booking Link", href: "/booking-link", icon: LinkSimple },
  { label: "Therapists", href: "/therapists", icon: UserCheck },
];

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-white text-sidebar-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function PrivacyToggle() {
  const { isPrivate, togglePrivacy } = usePrivacy();
  const Icon = isPrivate ? Eye : EyeSlash;
  const label = isPrivate ? "Show Private Info" : "Hide Private Info";

  return (
    <button
      onClick={togglePrivacy}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        isPrivate
          ? "bg-white text-sidebar-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 w-56 bg-background border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-4 py-4">
        <Image
          src="/therapybook-logo.png"
          alt="therapybook"
          width={140}
          height={32}
          className="h-6 w-auto"
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.href)}
          />
        ))}

        {/* Spacer pushes settings + sign out to bottom */}
        <div className="mt-auto" />

        <PrivacyToggle />

        <NavLink
          href="/settings"
          icon={GearSix}
          label="Settings"
          isActive={isActive("/settings")}
        />

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <SignOut className="h-4 w-4" />
          Sign Out
        </button>

        {/* Bottom padding */}
        <div className="pb-3" />
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    setOpen(false);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);
  }

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center px-4 md:hidden bg-background border-b border-border">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <List className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0 bg-background">
          {/* Header */}
          <div className="px-4 py-4 border-b border-sidebar-border">
            <Image
              src="/therapybook-logo.png"
              alt="therapybook"
              width={140}
              height={32}
              className="h-6 w-auto"
            />
          </div>

          {/* Nav */}
          <nav className="flex-1 flex flex-col px-3 py-3 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={isActive(item.href)}
                onClick={() => setOpen(false)}
              />
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border px-3 py-3 space-y-0.5">
            <PrivacyToggle />

            <NavLink
              href="/settings"
              icon={GearSix}
              label="Settings"
              isActive={isActive("/settings")}
              onClick={() => setOpen(false)}
            />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <SignOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
