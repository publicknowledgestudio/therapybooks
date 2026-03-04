export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Client #{id}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Client details will appear here
      </p>

      {/* Balance summary */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Paid", value: "\u2014" },
          { label: "Total Charged", value: "\u2014" },
          { label: "Balance", value: "\u2014" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border p-5">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Session history */}
      <div className="mt-10">
        <h2 className="text-lg font-medium text-foreground">Sessions</h2>
        <p className="mt-4 text-sm text-muted-foreground">No sessions recorded.</p>
      </div>

      {/* Payment history */}
      <div className="mt-10">
        <h2 className="text-lg font-medium text-foreground">Payments</h2>
        <p className="mt-4 text-sm text-muted-foreground">No payments allocated.</p>
      </div>
    </div>
  );
}
