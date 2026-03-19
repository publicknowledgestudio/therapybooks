import { Skeleton } from "@/components/ui/skeleton";

export default function BookingLinkLoading() {
  return (
    <div className="max-w-2xl animate-in fade-in duration-300">
      {/* Header */}
      <Skeleton className="h-8 w-36" />
      <Skeleton className="mt-2 h-4 w-56" />

      {/* Booking link tile */}
      <div className="mt-8 rounded-lg border p-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-3 h-10 w-full rounded-md" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      <Skeleton className="mt-10 h-px w-full" />

      {/* Availability section */}
      <div className="mt-10 space-y-4">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
