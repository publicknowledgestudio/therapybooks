import { Button } from "@/components/ui/button";
import { Plus } from "@/components/ui/icons";

export default function SessionsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and manage therapy sessions
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Session
        </Button>
      </div>

      <div className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">
          No sessions recorded yet.
        </p>
      </div>
    </div>
  );
}
