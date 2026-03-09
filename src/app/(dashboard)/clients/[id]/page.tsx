import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatINR, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CaretLeft, CurrencyInr, Wallet, Receipt } from "@/components/ui/icons";
import { ClientProfile } from "@/components/clients/client-profile";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "outline",
  confirmed: "default",
  cancelled: "destructive",
  no_show: "secondary",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = parseInt(id, 10);
  if (isNaN(clientId)) redirect("/clients");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/clients");

  // Fetch client
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("user_id", user.id)
    .single();

  if (!client) redirect("/clients");

  // Fetch sessions and payments in parallel
  const [sessionsResult, paymentsResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, date, start_time, end_time, duration_minutes, rate, status")
      .eq("client_id", clientId)
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
    supabase
      .from("client_payments")
      .select("id, amount, created_at, transactions(date)")
      .eq("client_id", clientId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const sessions = sessionsResult.data ?? [];
  const payments = paymentsResult.data ?? [];

  // Calculate balance summary
  const sessionsCharged = sessions
    .filter((s) => s.status !== "cancelled")
    .reduce((sum, s) => sum + (s.rate ?? 0), 0);
  const paymentsReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = client.opening_balance + sessionsCharged - paymentsReceived;

  const balanceCards = [
    {
      label: "Opening Balance",
      value: formatINR(client.opening_balance),
      icon: Wallet,
    },
    {
      label: "Sessions Charged",
      value: formatINR(sessionsCharged),
      icon: Receipt,
    },
    {
      label: "Payments Received",
      value: formatINR(paymentsReceived),
      icon: CurrencyInr,
    },
    {
      label: "Outstanding",
      value: formatINR(Math.abs(outstanding)),
      color:
        outstanding > 0
          ? "text-red-600"
          : outstanding < 0
            ? "text-green-600"
            : "text-foreground",
      icon: CurrencyInr,
    },
  ];

  function formatTime(startTime: string | null, endTime: string | null): string {
    if (!startTime) return "\u2014";
    const start = startTime.slice(0, 5); // "HH:MM"
    if (!endTime) return start;
    return `${start}\u2013${endTime.slice(0, 5)}`;
  }

  function formatDuration(minutes: number | null): string {
    if (!minutes) return "\u2014";
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <CaretLeft className="size-4" />
          Clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          {client.name}
        </h1>
      </div>

      {/* Client Profile — inline editable */}
      <ClientProfile client={client} />

      {/* Balance Summary Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {balanceCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border p-5"
          >
            <div className="flex items-center gap-2">
              <card.icon className="size-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
            <p
              className={`mt-1 text-2xl font-semibold tabular-nums ${
                card.color ?? "text-foreground"
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Session History */}
      <div className="mt-10">
        <h2 className="text-lg font-medium text-foreground">Sessions</h2>
        {sessions.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No sessions recorded yet.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{formatDate(session.date)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTime(session.start_time, session.end_time)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDuration(session.duration_minutes)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {session.rate !== null ? formatINR(session.rate) : "\u2014"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANT[session.status] ?? "outline"}
                        className="capitalize"
                      >
                        {session.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="mt-10">
        <h2 className="text-lg font-medium text-foreground">Payments</h2>
        {payments.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No payments received yet.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const txn = payment.transactions as { date: string } | null;
                  const dateStr = txn?.date ?? payment.created_at;
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(dateStr)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(payment.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
