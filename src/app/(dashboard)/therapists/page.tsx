import { UserCheck } from "@/components/ui/icons";
import { EmptyState } from "@/components/empty-state";

export default function TherapistsPage() {
  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Therapists</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your practice roster
        </p>
      </div>

      <EmptyState
        icon={UserCheck}
        title="Coming soon"
        description="Multi-therapist support is on the roadmap. You'll be able to manage a team of therapists and their schedules from here."
      />
    </div>
  );
}
