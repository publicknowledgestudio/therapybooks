"use client";

import { Users, CalendarBlank, CurrencyInr, Wallet } from "@/components/ui/icons";
import { formatINR } from "@/lib/format";
import { usePrivacy } from "@/lib/privacy";

interface StatCardsProps {
  activeClients: number;
  sessionsThisMonth: number;
  revenueThisMonth: number;
  outstandingBalances: number;
}

function currentMonthSubtitle(): string {
  const month = new Date().toLocaleString("en-IN", { month: "short" });
  return `All income received since 1 ${month}`;
}

const cards: {
  key: keyof StatCardsProps;
  label: string;
  subtitle?: string | (() => string);
  icon: React.ElementType;
  format: (v: number) => string;
  sensitive?: boolean;
}[] = [
  {
    key: "activeClients",
    label: "Active Clients",
    subtitle: "Clients with sessions in the past 60 days",
    icon: Users,
    format: (v: number) => v.toLocaleString("en-IN"),
  },
  {
    key: "sessionsThisMonth",
    label: "Sessions This Month",
    icon: CalendarBlank,
    format: (v: number) => v.toLocaleString("en-IN"),
  },
  {
    key: "revenueThisMonth",
    label: "Income This Month",
    subtitle: currentMonthSubtitle,
    icon: CurrencyInr,
    format: (v: number) => formatINR(v),
    sensitive: true,
  },
  {
    key: "outstandingBalances",
    label: "Outstanding Balances",
    icon: Wallet,
    format: (v: number) => formatINR(v),
    sensitive: true,
  },
];

export function StatCards(props: StatCardsProps) {
  const { mask } = usePrivacy();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ key, label, subtitle, icon: Icon, format, sensitive }) => {
        const formatted = format(props[key]);
        const display = sensitive ? mask(formatted) : formatted;

        return (
          <div key={key} className="rounded-lg bg-sidebar-accent p-5">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" weight="regular" />
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {display}
            </p>
            {subtitle && (
              <p className="mt-1 text-xs text-muted-foreground">
                {typeof subtitle === "function" ? subtitle() : subtitle}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
