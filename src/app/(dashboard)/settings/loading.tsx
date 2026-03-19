import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      {/* Header */}
      <Skeleton className="h-8 w-28" />
      <Skeleton className="mt-2 h-4 w-40" />

      <div className="mt-10 space-y-10">
        {/* Practice Profile section */}
        <section>
          <Skeleton className="mb-4 h-4 w-32" />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
          </div>
        </section>

        <Skeleton className="h-px w-full" />

        {/* Google Calendar section */}
        <section>
          <Skeleton className="mb-4 h-4 w-32" />
          <div className="rounded-lg border p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-9 w-36 rounded-md" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
