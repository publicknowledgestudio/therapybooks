"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import {
  SquaresFour,
  FileText,
  Users,
  ArrowsLeftRight,
  UserCheck,
  TrendUp,
  GearSix,
  SignOut,
  List,
  SidebarSimple,
} from "@/components/ui/icons";

const iconMap = {
  SquaresFour,
  FileText,
  Users,
  ArrowsLeftRight,
  UserCheck,
  TrendUp,
  GearSix,
} as const;

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "SquaresFour" as const },
  { label: "Invoices", href: "/invoices", icon: "FileText" as const },
  { label: "Clients", href: "/clients", icon: "Users" as const },
  { label: "Transactions", href: "/transactions", icon: "ArrowsLeftRight" as const },
  { label: "Contractors", href: "/contractors", icon: "UserCheck" as const },
  { label: "Incentives", href: "/incentives", icon: "TrendUp" as const },
  { label: "Settings", href: "/settings", icon: "GearSix" as const },
];

interface NavBadges {
  [href: string]: number;
}

function NavLinks({
  onNavigate,
  badges,
  collapsed,
}: {
  onNavigate?: () => void;
  badges?: NavBadges;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = iconMap[item.icon];
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const badge = badges?.[item.href];

        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center rounded-lg text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" weight="fill" />
            {!collapsed && (
              <>
                {item.label}
                {badge != null && (
                  <span className="ml-auto text-[11px] font-normal tabular-nums text-sidebar-foreground/40">
                    {badge}
                  </span>
                )}
              </>
            )}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <span>{item.label}</span>
                {badge != null && (
                  <span className="ml-1.5 text-muted-foreground">{badge}</span>
                )}
              </TooltipContent>
            </Tooltip>
          );
        }

        return link;
      })}
    </>
  );
}

export function Sidebar({
  badges,
  collapsed,
  onToggle,
}: {
  badges?: NavBadges;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden md:flex md:flex-col md:fixed md:inset-y-0 bg-sidebar transition-[width] duration-200",
          collapsed ? "md:w-16" : "md:w-60"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold overflow-hidden">
            <div className="h-7 w-7 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold shrink-0">
              PK
            </div>
            {!collapsed && (
              <span className="text-sidebar-foreground whitespace-nowrap">Studio Finance</span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className={cn("flex-1 py-4 space-y-1", collapsed ? "px-2" : "px-3")}>
          <NavLinks badges={badges} collapsed={collapsed} />
        </nav>

        {/* Footer */}
        <div className={cn("border-t border-sidebar-border py-3", collapsed ? "px-2" : "px-3")}>
          {/* Toggle */}
          <button
            onClick={onToggle}
            className={cn(
              "flex w-full items-center rounded-lg py-2 text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors",
              collapsed ? "justify-center px-2" : "gap-3 px-3"
            )}
          >
            {collapsed ? (
              <SidebarSimple className="h-4 w-4" weight="fill" mirrored />
            ) : (
              <>
                <SidebarSimple className="h-4 w-4" weight="fill" />
                <span>Collapse</span>
              </>
            )}
          </button>

          {/* Sign out */}
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
                >
                  <SignOut className="h-4 w-4" weight="fill" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Log Out
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
            >
              <SignOut className="h-4 w-4" weight="fill" />
              Log Out
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

export function MobileNav({ badges }: { badges?: NavBadges }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center px-4 md:hidden bg-background/80 backdrop-blur-sm border-b border-border/50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <List className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0 bg-sidebar text-sidebar-foreground">
          <div className="flex h-14 items-center border-b border-sidebar-border px-4">
            <span className="font-semibold text-sidebar-foreground">PK Studio Finance</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            <NavLinks onNavigate={() => setOpen(false)} badges={badges} />
          </nav>
          <div className="border-t border-sidebar-border px-3 py-3">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
            >
              <SignOut className="h-4 w-4" weight="fill" />
              Log Out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
