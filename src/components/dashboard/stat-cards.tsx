"use client";

import { Users, CalendarBlank, CurrencyInr, Wallet } from "@/components/ui/icons";
import { formatINR } from "@/lib/format";

interface StatCardsProps {
  activeClients: number;
  sessionsThisMonth: number;
  revenueThisMonth: number;
  outstandingBalances: number;
}

const cards = [
  {
    key: "activeClients",
    label: "Active Clients",
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
    label: "Revenue This Month",
    icon: CurrencyInr,
    format: (v: number) => formatINR(v),
  },
  {
    key: "outstandingBalances",
    label: "Outstanding Balances",
    icon: Wallet,
    format: (v: number) => formatINR(v),
  },
] as const;

export function StatCards(props: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, format }) => (
        <div key={key} className="rounded-lg border border-border p-5">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" weight="regular" />
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {format(props[key])}
          </p>
        </div>
      ))}
    </div>
  );
}
