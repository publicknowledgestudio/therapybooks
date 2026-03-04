import { Button } from "@/components/ui/button";
import { Plus } from "@/components/ui/icons";

export default function TherapistsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Therapists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your practice roster
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Therapist
        </Button>
      </div>

      <div className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">
          No therapists added yet.
        </p>
      </div>
    </div>
  );
}
