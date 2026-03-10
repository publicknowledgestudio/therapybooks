"use client";

import { CalendarBlank } from "@/components/ui/icons";

interface SessionStatCardsProps {
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
}

const cards: {
  key: keyof SessionStatCardsProps;
  label: string;
}[] = [
  { key: "thisWeek", label: "This Week" },
  { key: "lastWeek", label: "Last Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
];

export function SessionStatCards(props: SessionStatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ key, label }) => (
        <div key={key} className="rounded-lg bg-sidebar-accent p-5">
          <div className="flex items-center gap-2">
            <CalendarBlank className="size-4 text-muted-foreground" weight="regular" />
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {props[key]}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {props[key] === 1 ? "session" : "sessions"}
          </p>
        </div>
      ))}
    </div>
  );
}
