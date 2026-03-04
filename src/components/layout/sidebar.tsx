"use client";

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
  UserCheck,
  GearSix,
  SignOut,
  List,
} from "@/components/ui/icons";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: SquaresFour },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Sessions", href: "/sessions", icon: CalendarBlank },
  { label: "Transactions", href: "/transactions", icon: ArrowsLeftRight },
  { label: "Invoices", href: "/invoices", icon: FileText },
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
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 w-56 bg-background border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-4 py-4">
        <span className="text-sm font-semibold text-foreground tracking-tight">
          therapybooks
        </span>
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
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
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
            <span className="text-sm font-semibold text-foreground tracking-tight">
              therapybooks
            </span>
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
