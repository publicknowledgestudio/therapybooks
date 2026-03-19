import Link from "next/link";
import { CaretLeft, Lightning } from "@/components/ui/icons";
import { CHANGELOG } from "@/lib/changelog";

function formatEntryDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ChangelogPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <CaretLeft className="size-4" />
          Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground flex items-center gap-2">
          <Lightning className="h-6 w-6 text-amber-500" />
          Changelog
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent updates and improvements
        </p>
      </div>

      <div className="space-y-6">
        {CHANGELOG.map((entry) => (
          <div
            key={entry.id}
            className="rounded-lg border border-border p-5"
          >
            <div className="flex items-baseline gap-3">
              <h2 className="text-base font-medium text-foreground">
                {entry.title}
              </h2>
              <span className="text-xs text-muted-foreground">
                {formatEntryDate(entry.date)}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {entry.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
