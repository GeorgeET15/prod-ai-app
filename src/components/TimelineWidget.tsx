import { DashboardCard } from "./DashboardCard";
import { Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// Define interfaces for type safety
interface Schedule {
  id: string;
  description: string;
  status: string;
  start_date: string;
}

interface Milestone {
  name: string;
  progress: number;
  status: "completed" | "active" | "upcoming";
}

export function TimelineWidget() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        setError(null);
        const selectedProjectId = localStorage.getItem("selectedProjectId");
        if (!selectedProjectId) {
          setError("No project selected.");
          setMilestones([]);
          return;
        }

        const { data, error } = await supabase
          .from("schedules")
          .select("id, description, status, start_date")
          .eq("project_id", selectedProjectId)
          .order("start_date", { ascending: true });

        if (error) {
          console.error("Error fetching schedules:", error);
          setError("Failed to fetch schedule data.");
          setMilestones([]);
          return;
        }

        // Define production phases
        const phases = [
          "Script Finalization",
          "Pre-Production",
          "Principal Photography",
          "Post-Production",
          "Distribution",
        ];

        // Map schedules to phases (based on description or other logic)
        const phaseSchedules: { [key: string]: Schedule[] } = {
          "Script Finalization": [],
          "Pre-Production": [],
          "Principal Photography": [],
          "Post-Production": [],
          Distribution: [],
        };

        // Assign schedules to phases based on description (simplified mapping)
        data?.forEach((schedule) => {
          if (schedule.description.toLowerCase().includes("script")) {
            phaseSchedules["Script Finalization"].push(schedule);
          } else if (
            schedule.description.toLowerCase().includes("prep") ||
            schedule.description.toLowerCase().includes("pre-production")
          ) {
            phaseSchedules["Pre-Production"].push(schedule);
          } else if (
            schedule.description.toLowerCase().includes("shoot") ||
            schedule.description.toLowerCase().includes("scene")
          ) {
            phaseSchedules["Principal Photography"].push(schedule);
          } else if (
            schedule.description.toLowerCase().includes("edit") ||
            schedule.description.toLowerCase().includes("post")
          ) {
            phaseSchedules["Post-Production"].push(schedule);
          } else if (schedule.description.toLowerCase().includes("distrib")) {
            phaseSchedules["Distribution"].push(schedule);
          }
        });

        // Calculate milestones
        const calculatedMilestones: Milestone[] = phases.map((phase) => {
          const schedules = phaseSchedules[phase];
          const completed = schedules.filter(
            (s) => s.status === "Completed"
          ).length;
          const total = schedules.length || 1; // Avoid division by zero
          const progress = Math.round((completed / total) * 100);

          // Determine status based on progress and dates
          let status: "completed" | "active" | "upcoming" = "upcoming";
          if (progress === 100) {
            status = "completed";
          } else if (schedules.length > 0) {
            const hasStarted = schedules.some(
              (s) => new Date(s.start_date) <= new Date()
            );
            status = hasStarted ? "active" : "upcoming";
          }

          return { name: phase, progress, status };
        });

        setMilestones(calculatedMilestones);
      } catch (err) {
        console.error("Unexpected error fetching schedules:", err);
        setError("An unexpected error occurred while fetching schedule data.");
        setMilestones([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  return (
    <DashboardCard title="Production Timeline" icon={Calendar}>
      {loading ? (
        <p className="text-sm text-muted-foreground">
          Loading timeline data...
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No timeline data available.
        </p>
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone) => (
            <div key={milestone.name} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">
                  {milestone.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {milestone.progress}%
                </span>
              </div>
              <Progress
                value={milestone.progress}
                className={`h-2 ${
                  milestone.status === "completed"
                    ? "bg-success"
                    : milestone.status === "active"
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
