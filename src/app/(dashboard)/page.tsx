export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Overview of your practice
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Active Clients", "Sessions This Month", "Revenue This Month", "Outstanding Balances"].map((label) => (
          <div key={label} className="rounded-lg border border-border p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">—</p>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center text-sm text-muted-foreground">
        <p>No data yet. Start by adding clients and recording sessions.</p>
      </div>
    </div>
  );
}
