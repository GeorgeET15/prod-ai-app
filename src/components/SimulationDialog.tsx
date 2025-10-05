import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// Define interfaces for type safety
interface Project {
  total_budget: number;
  days_in_production: number;
  team_members: number;
  end_date: string;
}

interface Budget {
  allocated: number;
  spent: number;
}

interface Schedule {
  start_date: string;
  status: string;
}

interface SimulationData {
  currentBudget: number;
  currentCrew: number;
  daysLate: number;
  projectedBudget: number;
  projectedCrew: number;
  projectedDaysLate: number;
}

interface SimulationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimulationDialog({
  open,
  onOpenChange,
}: SimulationDialogProps) {
  const [simulationData, setSimulationData] = useState<SimulationData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSimulationData = async () => {
      try {
        setLoading(true);
        setError(null);
        const selectedProjectId = localStorage.getItem("selectedProjectId");
        if (!selectedProjectId) {
          setError("No project selected.");
          setSimulationData(null);
          return;
        }

        // Fetch project data
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select("total_budget, days_in_production, team_members, end_date")
          .eq("id", selectedProjectId)
          .single();
        if (projectError) {
          console.error("Project fetch error:", projectError);
          setError("Failed to fetch project data.");
          return;
        }
        if (!project) {
          setError("No project found for the selected ID.");
          return;
        }

        // Fetch budget data
        const { data: budgets, error: budgetError } = await supabase
          .from("budgets")
          .select("allocated, spent")
          .eq("project_id", selectedProjectId);
        if (budgetError) {
          console.error("Budget fetch error:", budgetError);
          setError("Failed to fetch budget data.");
          return;
        }

        // Fetch schedule data
        const { data: schedules, error: scheduleError } = await supabase
          .from("schedules")
          .select("start_date, status")
          .eq("project_id", selectedProjectId);
        if (scheduleError) {
          console.error("Schedule fetch error:", scheduleError);
          setError("Failed to fetch schedule data.");
          return;
        }

        // Fetch crew data
        const { data: crew, error: crewError } = await supabase
          .from("crew")
          .select("id")
          .eq("project_id", selectedProjectId);
        if (crewError) {
          console.error("Crew fetch error:", crewError);
          setError("Failed to fetch crew data.");
          return;
        }

        // Calculate current status
        const currentBudget =
          budgets?.reduce((sum, b) => sum + b.spent, 0) || project.total_budget;
        const currentCrew = crew?.length || project.team_members;
        const endDate = new Date(project.end_date);
        const today = new Date();
        const daysLate =
          Math.max(
            0,
            Math.ceil(
              (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            )
          ) + (schedules?.filter((s) => s.status !== "Completed").length || 0);

        // Simulate adding a second camera unit
        const additionalCost = 500000; // ₹5 lakh for 2-day camera unit rental and crew
        const additionalCrew = 4; // Camera operators, assistants
        const recoveredDays = daysLate > 0 ? Math.min(2, daysLate) : 0; // Recover up to 2 days

        setSimulationData({
          currentBudget,
          currentCrew,
          daysLate,
          projectedBudget: currentBudget + additionalCost,
          projectedCrew: currentCrew + additionalCrew,
          projectedDaysLate: daysLate - recoveredDays,
        });
      } catch (err) {
        console.error("Unexpected error fetching simulation data:", err);
        setError(
          "An unexpected error occurred while fetching simulation data."
        );
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchSimulationData();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Simulation: Add Second Camera Unit</DialogTitle>
          <DialogDescription>
            See how adding a second camera unit for 2 days affects your
            production
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading simulation data...
          </p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !simulationData ? (
          <p className="text-sm text-muted-foreground">
            No simulation data available.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Current vs Projected */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">
                  Current Status
                </h4>
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Budget:
                    </span>
                    <span className="text-sm font-medium">
                      ₹{(simulationData.currentBudget / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      End Date:
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        simulationData.daysLate > 0
                          ? "text-destructive"
                          : "text-secondary"
                      }`}
                    >
                      {simulationData.daysLate > 0
                        ? `${simulationData.daysLate} days late`
                        : "On track"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Crew:</span>
                    <span className="text-sm font-medium">
                      {simulationData.currentCrew} people
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  With 2nd Camera Unit
                  <ArrowRight className="h-4 w-4 text-primary" />
                </h4>
                <div className="space-y-2 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Budget:
                    </span>
                    <span className="text-sm font-medium flex items-center gap-1">
                      ₹{(simulationData.projectedBudget / 10000000).toFixed(2)}{" "}
                      Cr
                      <TrendingUp className="h-3 w-3 text-accent" />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      End Date:
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        simulationData.projectedDaysLate > 0
                          ? "text-destructive"
                          : "text-secondary"
                      } flex items-center gap-1`}
                    >
                      {simulationData.projectedDaysLate > 0
                        ? `${simulationData.projectedDaysLate} days late`
                        : "On track"}
                      <TrendingDown className="h-3 w-3 text-secondary" />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Crew:</span>
                    <span className="text-sm font-medium">
                      {simulationData.projectedCrew} people (+4)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Analysis */}
            <div className="p-4 bg-card border border-border rounded-lg">
              <h4 className="font-semibold mb-3 text-foreground">
                Impact Analysis
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Additional cost: ₹5.00L (
                  {((500000 / simulationData.currentBudget) * 100).toFixed(1)}%
                  increase)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {simulationData.daysLate > 0
                    ? `Recovers ${Math.min(
                        2,
                        simulationData.daysLate
                      )}-day schedule slip, ${
                        simulationData.projectedDaysLate === 0
                          ? "brings project back on track"
                          : "reduces delay"
                      }`
                    : "No schedule slip to recover"}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Requires 4 additional crew members (camera operators,
                  assistants)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Can shoot parallel scenes, reducing overall production days
                </li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Approve & Implement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
