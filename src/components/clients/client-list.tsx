"use client";

import { useRouter } from "next/navigation";
import { usePrivacy } from "@/lib/privacy";
import { formatINR } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ClientRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  nextSessionDate: string | null;
  balance: number;
}

function formatNextSession(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const formatted = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  if (diffDays === 0) return `Today`;
  if (diffDays === 1) return `Tomorrow`;
  if (diffDays > 1 && diffDays <= 7) return formatted;
  return formatted;
}

export function ClientList({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();
  const { mask, isPrivate } = usePrivacy();

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Client Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Next Session</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow
              key={client.id}
              className="cursor-pointer hover:bg-accent/50"
              onClick={() => router.push(`/clients/${client.id}`)}
            >
              <TableCell className="font-medium">
                {mask(client.name)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {client.email ? mask(client.email) : "\u2014"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {client.phone ? mask(client.phone) : "\u2014"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {client.nextSessionDate
                  ? formatNextSession(client.nextSessionDate)
                  : "\u2014"}
              </TableCell>
              <TableCell
                className={`text-right tabular-nums ${
                  client.balance > 0
                    ? "text-red-600"
                    : client.balance < 0
                      ? "text-green-600"
                      : "text-muted-foreground"
                }`}
              >
                {isPrivate
                  ? mask(formatINR(client.balance))
                  : client.balance === 0
                    ? "\u2014"
                    : formatINR(Math.abs(client.balance))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
