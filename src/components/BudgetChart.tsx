import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// Define interface for budget data
interface Budget {
  id: string;
  department: string;
  allocated: number;
  spent: number;
}

export function BudgetChart() {
  const [budgetData, setBudgetData] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        setLoading(true);
        setError(null);
        const selectedProjectId = localStorage.getItem("selectedProjectId");
        if (!selectedProjectId) {
          setError("No project selected.");
          setBudgetData([]);
          return;
        }

        const { data, error } = await supabase
          .from("budgets")
          .select("id, department, allocated, spent")
          .eq("project_id", selectedProjectId);

        if (error) {
          console.error("Error fetching budgets:", error);
          setError("Failed to fetch budget data.");
          setBudgetData([]);
          return;
        }

        setBudgetData(data || []);
      } catch (err) {
        console.error("Unexpected error fetching budgets:", err);
        setError("An unexpected error occurred while fetching budget data.");
        setBudgetData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetData();
  }, []);

  // Format data for Recharts, converting amounts to lakhs for display
  const chartData = budgetData.map((budget) => ({
    department: budget.department,
    budget: budget.allocated / 100000, // Convert to lakhs
    spent: budget.spent / 100000, // Convert to lakhs
  }));

  return (
    <Card className="border-border bg-card col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Budget Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading budget data...
          </p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : budgetData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No budget data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="department"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => `₹${value.toFixed(2)}L`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
                formatter={(value: number, name: string) => [
                  `₹${value.toFixed(2)}L`,
                  name === "budget" ? "Allocated" : "Spent",
                ]}
              />
              <Bar
                dataKey="budget"
                fill="hsl(var(--chart-1))"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="spent"
                fill="hsl(var(--chart-2))"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
