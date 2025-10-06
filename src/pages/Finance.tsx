import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProductionSidebar } from "@/components/ProductionSidebar";
import { DashboardCard } from "@/components/DashboardCard";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Edit2,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, Component } from "react";
import { supabase } from "@/lib/supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Error Boundary Component
class ErrorBoundary extends Component<any, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <h1>Something went wrong. Please try again or refresh the page.</h1>
      );
    }
    return this.props.children;
  }
}

// Define interfaces for type safety
interface Budget {
  id?: number;
  category: string;
  allocated: string;
  spent: string;
  progress: number;
  status: string;
}

interface Expense {
  id?: number;
  item: string;
  amount: string;
  date: Date;
  status: string;
  delay?: string;
}

interface Vendor {
  id?: number;
  name: string;
  amount: string;
  status: string;
}

interface FinancialOverview {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
}

type Section = "budgetBreakdown" | "expenses" | "vendors";
type TableName = "budgets" | "invoices";

const tableMap: Record<Section, TableName> = {
  budgetBreakdown: "budgets",
  expenses: "invoices",
  vendors: "invoices",
};

const Finance = () => {
  const [budgetBreakdown, setBudgetBreakdown] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [financialOverview, setFinancialOverview] = useState<FinancialOverview>(
    {
      totalBudget: 0,
      totalSpent: 0,
      remaining: 0,
    }
  );
  const [editMode, setEditMode] = useState({
    budgetBreakdown: false,
    expenses: false,
    vendors: false,
  });
  const [newBudget, setNewBudget] = useState<Partial<Budget>>({});
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({});
  const [newVendor, setNewVendor] = useState<Partial<Vendor>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects and set selectedProjectId from local storage
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("id, name");
        if (projectsError) {
          console.error("Projects fetch error:", projectsError);
          setError("Failed to fetch projects.");
          return;
        }
        setProjects(projectsData || []);

        // Get selectedProjectId from local storage
        const storedProjectId = localStorage.getItem("selectedProjectId");
        if (
          storedProjectId &&
          projectsData?.some((p) => p.id === storedProjectId)
        ) {
          setSelectedProjectId(storedProjectId);
        } else if (projectsData?.length > 0) {
          // Fallback to first project if no valid stored ID
          setSelectedProjectId(projectsData[0].id);
          localStorage.setItem("selectedProjectId", projectsData[0].id);
        } else {
          setError("No projects available.");
        }
      } catch (err) {
        console.error("Fetch projects error:", err);
        setError("An unexpected error occurred while fetching projects.");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Listen for localStorage changes to selectedProjectId
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "selectedProjectId") {
        const newProjectId = event.newValue || "";
        if (newProjectId && projects.some((p) => p.id === newProjectId)) {
          setSelectedProjectId(newProjectId);
        } else {
          setSelectedProjectId("");
          setError("Selected project is invalid or not found.");
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [projects]);

  // Fetch project data when selectedProjectId or refreshKey changes
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!selectedProjectId) {
        setError("No project selected.");
        setBudgetBreakdown([]);
        setExpenses([]);
        setVendors([]);
        setFinancialOverview({ totalBudget: 0, totalSpent: 0, remaining: 0 });
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch project details
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select("id, total_budget")
          .eq("id", selectedProjectId)
          .maybeSingle();
        if (projectError) {
          console.error("Project fetch error:", projectError);
          setError("Failed to fetch project details.");
          setBudgetBreakdown([]);
          setExpenses([]);
          setVendors([]);
          setFinancialOverview({ totalBudget: 0, totalSpent: 0, remaining: 0 });
          return;
        }
        if (!project) {
          setError("Selected project not found.");
          setBudgetBreakdown([]);
          setExpenses([]);
          setVendors([]);
          setFinancialOverview({ totalBudget: 0, totalSpent: 0, remaining: 0 });
          setLoading(false);
          return;
        }
        const totalBudget = project.total_budget || 0;
        setFinancialOverview({ totalBudget, totalSpent: 0, remaining: 0 });

        // Fetch budgets
        const { data: budgetsData, error: budgetError } = await supabase
          .from("budgets")
          .select("id, department, allocated, spent")
          .eq("project_id", selectedProjectId);
        if (budgetError) {
          console.error("Budgets fetch error:", budgetError);
          setError("Failed to fetch budgets.");
          setBudgetBreakdown([]);
        } else {
          const budgetList: Budget[] = (budgetsData || []).map((budget) => {
            const allocatedNum = budget.allocated || 0;
            const spentNum = budget.spent || 0;
            const progress =
              allocatedNum > 0
                ? Math.round((spentNum / allocatedNum) * 100)
                : 0;
            const status =
              spentNum >= allocatedNum
                ? "Completed"
                : progress > 80
                ? "On Track"
                : "In Progress";
            return {
              id: budget.id,
              category: budget.department || "Unknown",
              allocated: `₹${(allocatedNum / 100000).toFixed(1)}L`,
              spent: `₹${(spentNum / 100000).toFixed(1)}L`,
              progress,
              status,
            };
          });
          setBudgetBreakdown(budgetList);
          const totalSpent =
            budgetsData?.reduce((sum, b) => sum + (b.spent || 0), 0) || 0;
          const remaining =
            budgetsData?.reduce(
              (sum, b) => sum + ((b.allocated || 0) - (b.spent || 0)),
              0
            ) || 0;
          setFinancialOverview((prev) => ({
            ...prev,
            totalSpent,
            remaining,
          }));
        }

        // Fetch invoices for expenses
        const { data: invoicesData, error: invoiceError } = await supabase
          .from("invoices")
          .select("id, vendor, amount, due_date, status, delay_days")
          .eq("project_id", selectedProjectId)
          .order("due_date", { ascending: false });
        if (invoiceError) {
          console.error("Invoices fetch error:", invoiceError);
          setError("Failed to fetch expenses.");
          setExpenses([]);
        } else {
          const expenseList: Expense[] = (invoicesData || []).map(
            (invoice) => ({
              id: invoice.id,
              item: invoice.vendor || "Unknown",
              amount: `₹${((invoice.amount || 0) / 100000).toFixed(1)}L`,
              date: new Date(invoice.due_date),
              status: invoice.status === "Paid" ? "Approved" : "Pending",
              delay: invoice.delay_days
                ? `${invoice.delay_days} days`
                : undefined,
            })
          );
          setExpenses(expenseList);
        }

        // Fetch invoices for vendors
        const { data: vendorInvoices, error: vendorError } = await supabase
          .from("invoices")
          .select("id, vendor, amount, status")
          .eq("project_id", selectedProjectId)
          .order("vendor");
        if (vendorError) {
          console.error("Vendor invoices fetch error:", vendorError);
          setError("Failed to fetch vendor payments.");
          setVendors([]);
        } else {
          const vendorList: Vendor[] = (vendorInvoices || []).map(
            (invoice) => ({
              id: invoice.id,
              name: invoice.vendor || "Unknown",
              amount: `₹${((invoice.amount || 0) / 100000).toFixed(1)}L`,
              status: invoice.status || "Pending",
            })
          );
          setVendors(vendorList);
        }
      } catch (err) {
        console.error("Fetch project data error:", err);
        setError("An unexpected error occurred while fetching project data.");
        setBudgetBreakdown([]);
        setExpenses([]);
        setVendors([]);
        setFinancialOverview({ totalBudget: 0, totalSpent: 0, remaining: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchProjectData();
  }, [selectedProjectId, refreshKey]);

  // Handle project deletion
  const onDeleteProject = async () => {
    if (!selectedProjectId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", selectedProjectId);
      if (error) throw error;
      setProjects(projects.filter((p) => p.id !== selectedProjectId));
      setSelectedProjectId("");
      localStorage.removeItem("selectedProjectId");
      alert("Project deleted successfully!");
    } catch (error) {
      console.error("Delete project error:", error);
      alert("Failed to delete project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updates to Supabase
  const handleSave = async (section: Section) => {
    if (isSaving || !selectedProjectId) return;
    setIsSaving(true);
    try {
      const table = tableMap[section];

      if (section === "budgetBreakdown") {
        // Update existing budgets
        for (const budget of budgetBreakdown.filter((b) => b.id)) {
          const allocatedNum =
            parseFloat(budget.allocated.replace(/[^0-9.]/g, "")) * 100000;
          const spentNum =
            parseFloat(budget.spent.replace(/[^0-9.]/g, "")) * 100000;
          const { error } = await supabase
            .from(table)
            .update({
              department: budget.category,
              allocated: allocatedNum,
              spent: spentNum,
            })
            .eq("id", budget.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new budgets
        for (const budget of budgetBreakdown.filter((b) => !b.id)) {
          const allocatedNum =
            parseFloat(budget.allocated.replace(/[^0-9.]/g, "")) * 100000;
          const spentNum =
            parseFloat(budget.spent.replace(/[^0-9.]/g, "")) * 100000;
          const { error } = await supabase.from(table).insert({
            project_id: selectedProjectId,
            department: budget.category,
            allocated: allocatedNum,
            spent: spentNum,
          });
          if (error) throw error;
        }
      } else if (section === "expenses") {
        // Update existing expenses
        for (const expense of expenses.filter((e) => e.id)) {
          const amountNum =
            parseFloat(expense.amount.replace(/[^0-9.]/g, "")) * 100000;
          const { error } = await supabase
            .from(table)
            .update({
              vendor: expense.item,
              amount: amountNum,
              due_date: expense.date.toISOString().split("T")[0],
              status: expense.status === "Approved" ? "Paid" : "Pending",
              delay_days: expense.delay
                ? parseInt(expense.delay.replace(/[^0-9]/g, "")) || 0
                : null,
            })
            .eq("id", expense.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new expenses
        for (const expense of expenses.filter((e) => !e.id)) {
          const amountNum =
            parseFloat(expense.amount.replace(/[^0-9.]/g, "")) * 100000;
          const { error } = await supabase.from(table).insert({
            project_id: selectedProjectId,
            vendor: expense.item,
            amount: amountNum,
            due_date: expense.date.toISOString().split("T")[0],
            status: expense.status === "Approved" ? "Paid" : "Pending",
            delay_days: expense.delay
              ? parseInt(expense.delay.replace(/[^0-9]/g, "")) || 0
              : null,
          });
          if (error) throw error;
        }
      } else if (section === "vendors") {
        // Update existing vendors
        for (const vendor of vendors.filter((v) => v.id)) {
          const amountNum =
            parseFloat(vendor.amount.replace(/[^0-9.]/g, "")) * 100000;
          const { error } = await supabase
            .from(table)
            .update({
              vendor: vendor.name,
              amount: amountNum,
              status: vendor.status,
            })
            .eq("id", vendor.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new vendors
        for (const vendor of vendors.filter((v) => !v.id)) {
          const amountNum =
            parseFloat(vendor.amount.replace(/[^0-9.]/g, "")) * 100000;
          const { error } = await supabase.from(table).insert({
            project_id: selectedProjectId,
            vendor: vendor.name,
            amount: amountNum,
            status: vendor.status || "Pending",
            due_date: new Date().toISOString().split("T")[0],
          });
          if (error) throw error;
        }
      }

      // Refresh data after save
      setRefreshKey((prev) => prev + 1);
      setEditMode({ ...editMode, [section]: false });
      alert("Changes saved successfully!");
    } catch (error) {
      console.error(`Save ${section} error:`, error);
      alert(
        `Failed to save changes for ${section}. Check console for details.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Add new item to local state
  const handleAdd = (section: Section) => {
    if (section === "budgetBreakdown") {
      if (!newBudget.category || !newBudget.allocated) {
        alert("Please fill in Category and Allocated fields.");
        return;
      }
      const allocatedNum =
        parseFloat(newBudget.allocated.replace(/[^0-9.]/g, "")) * 100000;
      const spentNum = newBudget.spent
        ? parseFloat(newBudget.spent.replace(/[^0-9.]/g, "")) * 100000
        : 0;
      const progress =
        allocatedNum > 0 ? Math.round((spentNum / allocatedNum) * 100) : 0;
      const status =
        spentNum >= allocatedNum
          ? "Completed"
          : progress > 80
          ? "On Track"
          : "In Progress";
      setBudgetBreakdown([
        ...budgetBreakdown,
        {
          category: newBudget.category,
          allocated: newBudget.allocated,
          spent: newBudget.spent || "₹0L",
          progress,
          status,
        } as Budget,
      ]);
      setNewBudget({});
    } else if (section === "expenses") {
      if (!newExpense.item || !newExpense.date || !newExpense.amount) {
        alert("Please fill in Item, Date, and Amount fields.");
        return;
      }
      setExpenses([
        ...expenses,
        {
          ...newExpense,
          status: newExpense.status || "Pending",
          delay: newExpense.delay || undefined,
        } as Expense,
      ]);
      setNewExpense({});
    } else if (section === "vendors") {
      if (!newVendor.name || !newVendor.amount) {
        alert("Please fill in Vendor Name and Amount fields.");
        return;
      }
      setVendors([
        ...vendors,
        {
          ...newVendor,
          status: newVendor.status || "Pending",
        } as Vendor,
      ]);
      setNewVendor({});
    }
  };

  // Handle deleting items
  const handleDelete = async (section: Section, index: number) => {
    if (
      !window.confirm(
        `Are you sure you want to delete this ${section.slice(0, -1)}?`
      )
    ) {
      return;
    }
    try {
      const table = tableMap[section];
      let id: number | undefined;
      if (section === "budgetBreakdown") {
        id = budgetBreakdown[index]?.id;
        setBudgetBreakdown(budgetBreakdown.filter((_, i) => i !== index));
      } else if (section === "expenses") {
        id = expenses[index]?.id;
        setExpenses(expenses.filter((_, i) => i !== index));
      } else if (section === "vendors") {
        id = vendors[index]?.id;
        setVendors(vendors.filter((_, i) => i !== index));
      }
      if (id) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("id", id)
          .eq("project_id", selectedProjectId);
        if (error) throw error;
      }
      alert(`${section.slice(0, -1)} deleted successfully!`);
    } catch (error) {
      console.error(`Delete ${section} error:`, error);
      alert(
        `Failed to delete ${section.slice(0, -1)}. Check console for details.`
      );
    }
  };

  // Cancel edit mode and reset
  const handleCancel = (section: Section) => {
    if (section === "budgetBreakdown") {
      setNewBudget({});
    } else if (section === "expenses") {
      setNewExpense({});
    } else if (section === "vendors") {
      setNewVendor({});
    }
    setRefreshKey((prev) => prev + 1); // Re-fetch data to revert changes
    setEditMode({ ...editMode, [section]: false });
  };

  // Render loading or error states
  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!selectedProjectId) {
    return <div>Please select a project from the sidebar.</div>;
  }

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <ProductionSidebar
            selectedProjectId={selectedProjectId}
            projects={projects}
            onDeleteProject={onDeleteProject}
            isSubmitting={isSubmitting}
          />
          <main className="flex-1">
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
              <div className="flex items-center gap-4 p-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Budget & Finance
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Financial tracking, budget management, forecasting
                  </p>
                </div>
              </div>
            </header>

            <div className="p-6 space-y-6">
              {/* Financial Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-primary rounded-lg text-primary-foreground">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm opacity-90">Total Budget</p>
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-bold">
                    ₹
                    {(
                      financialOverview.totalBudget / 10000000
                    ).toLocaleString()}{" "}
                    Cr
                  </p>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <TrendingUp className="w-5 h-5 text-destructive" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    ₹
                    {(financialOverview.totalSpent / 10000000).toLocaleString()}{" "}
                    Cr
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(
                      (financialOverview.totalSpent /
                        financialOverview.totalBudget) *
                        100 || 0
                    )}
                    % of budget
                  </p>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Remaining</p>
                    <TrendingDown className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    ₹{(financialOverview.remaining / 10000000).toLocaleString()}{" "}
                    Cr
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(
                      (financialOverview.remaining /
                        financialOverview.totalBudget) *
                        100 || 0
                    )}
                    % available
                  </p>
                </div>
              </div>

              {/* Budget Breakdown */}
              <DashboardCard
                title="Budget Breakdown by Department"
                icon={DollarSign}
              >
                <div className="space-y-4">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.budgetBreakdown
                          ? handleCancel("budgetBreakdown")
                          : setEditMode({ ...editMode, budgetBreakdown: true })
                      }
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.budgetBreakdown
                        ? "Cancel Edit"
                        : "Edit Budgets"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.budgetBreakdown && handleAdd("budgetBreakdown")
                      }
                      disabled={!editMode.budgetBreakdown || isSaving}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Budget
                    </Button>
                  </div>
                  {editMode.budgetBreakdown && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Category"
                        value={newBudget.category || ""}
                        onChange={(e) =>
                          setNewBudget({
                            ...newBudget,
                            category: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Allocated (e.g., ₹50L)"
                        value={newBudget.allocated || ""}
                        onChange={(e) =>
                          setNewBudget({
                            ...newBudget,
                            allocated: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Spent (e.g., ₹30L)"
                        value={newBudget.spent || ""}
                        onChange={(e) =>
                          setNewBudget({ ...newBudget, spent: e.target.value })
                        }
                        className="mb-2"
                      />
                    </div>
                  )}
                  {budgetBreakdown.map((budget, idx) => (
                    <div key={budget.id || `new-${idx}`} className="space-y-2">
                      {editMode.budgetBreakdown ? (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <Input
                              value={budget.category}
                              onChange={(e) => {
                                const newBudgets = [...budgetBreakdown];
                                newBudgets[idx].category = e.target.value;
                                setBudgetBreakdown(newBudgets);
                              }}
                              className="flex-1 mr-2"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDelete("budgetBreakdown", idx)
                              }
                              disabled={isSaving}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            value={budget.allocated}
                            onChange={(e) => {
                              const newBudgets = [...budgetBreakdown];
                              newBudgets[idx].allocated = e.target.value;
                              const allocatedNum =
                                parseFloat(
                                  e.target.value.replace(/[^0-9.]/g, "")
                                ) * 100000;
                              const spentNum =
                                parseFloat(
                                  newBudgets[idx].spent.replace(/[^0-9.]/g, "")
                                ) * 100000;
                              newBudgets[idx].progress =
                                allocatedNum > 0
                                  ? Math.round((spentNum / allocatedNum) * 100)
                                  : 0;
                              newBudgets[idx].status =
                                spentNum >= allocatedNum
                                  ? "Completed"
                                  : newBudgets[idx].progress > 80
                                  ? "On Track"
                                  : "In Progress";
                              setBudgetBreakdown(newBudgets);
                            }}
                            className="mb-2"
                          />
                          <Input
                            value={budget.spent}
                            onChange={(e) => {
                              const newBudgets = [...budgetBreakdown];
                              newBudgets[idx].spent = e.target.value;
                              const spentNum =
                                parseFloat(
                                  e.target.value.replace(/[^0-9.]/g, "")
                                ) * 100000;
                              const allocatedNum =
                                parseFloat(
                                  newBudgets[idx].allocated.replace(
                                    /[^0-9.]/g,
                                    ""
                                  )
                                ) * 100000;
                              newBudgets[idx].progress =
                                allocatedNum > 0
                                  ? Math.round((spentNum / allocatedNum) * 100)
                                  : 0;
                              newBudgets[idx].status =
                                spentNum >= allocatedNum
                                  ? "Completed"
                                  : newBudgets[idx].progress > 80
                                  ? "On Track"
                                  : "In Progress";
                              setBudgetBreakdown(newBudgets);
                            }}
                            className="mb-2"
                          />
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {budget.category}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {budget.spent} / {budget.allocated}
                              </p>
                            </div>
                            <Badge
                              variant={
                                budget.status === "On Track"
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {budget.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={budget.progress}
                              className="flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {budget.progress}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.budgetBreakdown && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("budgetBreakdown")}
                      disabled={isSaving}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Recent Expenses */}
              <DashboardCard title="Recent Expenses" icon={TrendingUp}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.expenses
                          ? handleCancel("expenses")
                          : setEditMode({ ...editMode, expenses: true })
                      }
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.expenses ? "Cancel Edit" : "Edit Expenses"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => editMode.expenses && handleAdd("expenses")}
                      disabled={!editMode.expenses || isSaving}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Expense
                    </Button>
                  </div>
                  {editMode.expenses && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Item (Vendor)"
                        value={newExpense.item || ""}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, item: e.target.value })
                        }
                        className="mb-2"
                      />
                      <DatePicker
                        selected={newExpense.date}
                        onChange={(date: Date) =>
                          setNewExpense({ ...newExpense, date })
                        }
                        dateFormat="dd MMM yyyy"
                        placeholderText="Select Due Date"
                        customInput={
                          <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-2" />
                        }
                      />
                      <Input
                        placeholder="Amount (e.g., ₹10L)"
                        value={newExpense.amount || ""}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            amount: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newExpense.status || "Pending"}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Approved">Approved</option>
                        <option value="Pending">Pending</option>
                      </select>
                      <Input
                        placeholder="Delay (e.g., 5 days)"
                        value={newExpense.delay || ""}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            delay: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                    </div>
                  )}
                  {expenses.map((expense, idx) => (
                    <div
                      key={expense.id || `new-${idx}`}
                      className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                    >
                      {editMode.expenses ? (
                        <>
                          <div className="flex-1 space-y-2 mr-2">
                            <Input
                              value={expense.item}
                              onChange={(e) => {
                                const newExpenses = [...expenses];
                                newExpenses[idx].item = e.target.value;
                                setExpenses(newExpenses);
                              }}
                              className="mb-2"
                            />
                            <DatePicker
                              selected={expense.date}
                              onChange={(date: Date) => {
                                const newExpenses = [...expenses];
                                newExpenses[idx].date = date;
                                setExpenses(newExpenses);
                              }}
                              dateFormat="dd MMM yyyy"
                              placeholderText="Select Due Date"
                              customInput={
                                <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-2" />
                              }
                            />
                            <Input
                              value={expense.amount}
                              onChange={(e) => {
                                const newExpenses = [...expenses];
                                newExpenses[idx].amount = e.target.value;
                                setExpenses(newExpenses);
                              }}
                              className="mb-2"
                            />
                            <select
                              value={expense.status}
                              onChange={(e) => {
                                const newExpenses = [...expenses];
                                newExpenses[idx].status = e.target.value;
                                setExpenses(newExpenses);
                              }}
                              className="w-full p-2 border border-input rounded-md mb-2"
                            >
                              <option value="Approved">Approved</option>
                              <option value="Pending">Pending</option>
                            </select>
                            <Input
                              value={expense.delay || ""}
                              onChange={(e) => {
                                const newExpenses = [...expenses];
                                newExpenses[idx].delay = e.target.value;
                                setExpenses(newExpenses);
                              }}
                              className="mb-2"
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete("expenses", idx)}
                            disabled={isSaving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="font-medium text-sm">
                              {expense.item}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {expense.date.toLocaleDateString("en-GB", {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">
                              {expense.amount}
                            </p>
                            <Badge
                              variant={
                                expense.status === "Approved"
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs mt-1"
                            >
                              {expense.status}
                            </Badge>
                            {expense.delay && (
                              <p className="text-xs text-destructive mt-1">
                                {expense.delay}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.expenses && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("expenses")}
                      disabled={isSaving}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Vendor Payments */}
              <DashboardCard
                title="Recent Vendor Payments"
                icon={AlertTriangle}
              >
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.vendors
                          ? handleCancel("vendors")
                          : setEditMode({ ...editMode, vendors: true })
                      }
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.vendors ? "Cancel Edit" : "Edit Payments"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => editMode.vendors && handleAdd("vendors")}
                      disabled={!editMode.vendors || isSaving}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  </div>
                  {editMode.vendors && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Vendor Name"
                        value={newVendor.name || ""}
                        onChange={(e) =>
                          setNewVendor({ ...newVendor, name: e.target.value })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Amount (e.g., ₹10L)"
                        value={newVendor.amount || ""}
                        onChange={(e) =>
                          setNewVendor({ ...newVendor, amount: e.target.value })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newVendor.status || "Pending"}
                        onChange={(e) =>
                          setNewVendor({ ...newVendor, status: e.target.value })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  )}
                  {vendors.map((vendor, idx) => (
                    <div
                      key={vendor.id || `new-${idx}`}
                      className="p-3 bg-secondary/20 rounded-lg"
                    >
                      {editMode.vendors ? (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <Input
                              value={vendor.name}
                              onChange={(e) => {
                                const newVendors = [...vendors];
                                newVendors[idx].name = e.target.value;
                                setVendors(newVendors);
                              }}
                              className="flex-1 mr-2"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete("vendors", idx)}
                              disabled={isSaving}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            value={vendor.amount}
                            onChange={(e) => {
                              const newVendors = [...vendors];
                              newVendors[idx].amount = e.target.value;
                              setVendors(newVendors);
                            }}
                            className="mb-2"
                          />
                          <select
                            value={vendor.status}
                            onChange={(e) => {
                              const newVendors = [...vendors];
                              newVendors[idx].status = e.target.value;
                              setVendors(newVendors);
                            }}
                            className="w-full p-2 border border-input rounded-md mb-2"
                          >
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm">{vendor.name}</p>
                            <Badge
                              variant={
                                vendor.status === "Pending"
                                  ? "destructive"
                                  : "default"
                              }
                              className="text-xs"
                            >
                              {vendor.status}
                            </Badge>
                          </div>
                          <div className="text-xs">
                            <p
                              className={`font-bold ${
                                vendor.status === "Pending"
                                  ? "text-destructive"
                                  : "text-primary"
                              }`}
                            >
                              {vendor.amount}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.vendors && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("vendors")}
                      disabled={isSaving}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ErrorBoundary>
  );
};

export default Finance;
