import { DashboardCard } from "./DashboardCard";
import { Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// Define interface for crew data
interface CrewMember {
  id: string;
  name: string;
  role: string;
  status: string;
}

export function TeamWidget() {
  const [teamMembers, setTeamMembers] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        const selectedProjectId = localStorage.getItem("selectedProjectId");
        if (!selectedProjectId) {
          setError("No project selected.");
          setTeamMembers([]);
          return;
        }

        const { data, error } = await supabase
          .from("crew")
          .select("id, name, role, status")
          .eq("project_id", selectedProjectId);

        if (error) {
          console.error("Error fetching crew:", error);
          setError("Failed to fetch crew data.");
          setTeamMembers([]);
          return;
        }

        setTeamMembers(data || []);
      } catch (err) {
        console.error("Unexpected error fetching crew:", err);
        setError("An unexpected error occurred while fetching crew data.");
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, []);

  return (
    <DashboardCard title="Key Team Members" icon={Users}>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading crew data...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : teamMembers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No crew data available.</p>
      ) : (
        <div className="space-y-3">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {member.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary/10 text-secondary">
                {member.status || "Not Started"}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
