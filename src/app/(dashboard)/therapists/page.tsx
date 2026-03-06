import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, UserCheck } from "@/components/ui/icons";
import { EmptyState } from "@/components/empty-state";

export default async function TherapistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let items: { id: number }[] = [];

  if (user) {
    const { data } = await supabase
      .from("therapists")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    items = data ?? [];
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Therapists
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your practice roster
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Therapist
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No therapists yet"
          description="Add therapists to manage your practice roster."
          action={{ label: "Add Therapist", href: "/therapists/new" }}
        />
      ) : (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            {items.length} therapist{items.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
