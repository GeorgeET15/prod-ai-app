import { useState, useEffect } from "react";
import { RiskAlertCard } from "@/components/RiskAlertCard";

interface Project {
  id: string;
  name: string;
  total_budget: number;
  days_in_production: number;
  team_members: number;
  scenes_completed: number;
  total_scenes: number;
}

interface Budget {
  id: string;
  department: string;
  allocated: number;
  spent: number;
}

interface Schedule {
  id: string;
  scene: string;
  location: string;
  status: string;
  date: string;
}

interface Invoice {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  status: string;
  delay_days: number;
}

interface RiskAlert {
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  confidence: number;
  impact: string;
}

const RiskAlertGenerator = () => {
  const [risks, setRisks] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const projectId = localStorage.getItem("selectedProjectId") || "";
    if (!projectId) {
      setError("No project selected. Please select a project to view risks.");
      return;
    }

    const fetchRisks = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch project data
        const projectResponse = await fetch(
          `http://localhost:5000/project-data/${projectId}`
        );
        if (!projectResponse.ok) {
          const errorData = await projectResponse.json();
          throw new Error(
            `Failed to fetch project data: ${
              errorData.details || "Unknown error"
            }`
          );
        }
        const projectData = await projectResponse.json();

        // Ensure project data is valid
        if (!projectData.project) {
          throw new Error("No project data returned from server.");
        }

        // Fetch risks
        const riskResponse = await fetch(
          "http://localhost:5000/predict-risks",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project: projectData.project || {},
              budgets: projectData.budgets || [],
              schedules: projectData.schedules || [],
              invoices: projectData.invoices || [],
            }),
          }
        );

        if (!riskResponse.ok) {
          const errorData = await riskResponse.json();
          throw new Error(
            `Failed to fetch risks: ${errorData.error || "Unknown error"}`
          );
        }

        const riskData = await riskResponse.json();
        const backendRisks = Array.isArray(riskData)
          ? riskData
          : riskData.risks || [];
        setRisks(backendRisks);
      } catch (err) {
        console.error("Error fetching risks:", err);
        setError(
          `Failed to load risk alerts: ${err.message || "Please try again."}`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRisks();
  }, []);

  return (
    <div
      className={`
        space-y-3 max-h-[400px] overflow-y-auto pr-2
        [&::-webkit-scrollbar]:w-2
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30
        hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50
        dark:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40
        dark:hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60
      `}
    >
      {loading && (
        <div className="text-sm text-muted-foreground text-center pt-4">
          Loading risk alerts...
        </div>
      )}
      {error && (
        <div className="text-sm text-destructive text-center">{error}</div>
      )}
      {!loading && !error && risks.length === 0 && (
        <div className="text-sm text-muted-foreground text-center">
          No risk alerts available.
        </div>
      )}
      {risks.map((alert, idx) => (
        <RiskAlertCard key={idx} alert={alert} />
      ))}
    </div>
  );
};

export default RiskAlertGenerator;
