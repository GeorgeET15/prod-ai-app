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
  category: string;
  status: string;
  delay?: string;
}

interface Vendor {
  id?: number;
  name: string;
  pending: string;
  paid: string;
  status: string;
  ids: number[];
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

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects for the sidebar
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("id, name");
        if (projectsError) {
          console.error("Projects fetch error:", projectsError);
        } else {
          setProjects(projectsData || []);
          // Set the selected project ID (e.g., for "Pranayam Oru Thudakkam")
          const selectedProject = projectsData?.find(
            (p) => p.name === "Pranayam Oru Thudakkam"
          );
          if (selectedProject) {
            setSelectedProjectId(selectedProject.id);
          }
        }

        // Fetch project data for total budget
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select("id, total_budget")
          .eq("name", "Pranayam Oru Thudakkam")
          .single();
        if (projectError) {
          console.error("Project fetch error:", projectError);
        } else {
          const totalBudget = project.total_budget;
          setFinancialOverview({ totalBudget, totalSpent: 0, remaining: 0 });

          const projectId = project.id;

          // Budget Breakdown
          const { data: budgets, error: budgetError } = await supabase
            .from("budgets")
            .select("id, department, allocated, spent")
            .eq("project_id", projectId);
          if (budgetError) console.error("Budgets fetch error:", budgetError);
          else {
            const budgetList: Budget[] =
              budgets?.map((budget) => ({
                id: budget.id,
                category: budget.department,
                allocated: `₹${(budget.allocated / 100000).toFixed(1)}L`,
                spent: `₹${(budget.spent / 100000).toFixed(1)}L`,
                progress:
                  Math.round((budget.spent / budget.allocated) * 100) || 0,
                status:
                  budget.spent >= budget.allocated
                    ? "Completed"
                    : budget.spent / budget.allocated > 0.8
                    ? "On Track"
                    : "In Progress",
              })) || [];
            setBudgetBreakdown(budgetList);
            const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
            const remaining = budgets.reduce(
              (sum, b) => sum + (b.allocated - b.spent),
              0
            );
            setFinancialOverview((prev) => ({
              ...prev,
              totalSpent,
              remaining,
            }));
          }

          // Recent Expenses
          const { data: invoices, error: invoiceError } = await supabase
            .from("invoices")
            .select("id, vendor, amount, due_date, status, delay_days")
            .eq("project_id", projectId)
            .order("due_date", { ascending: false })
            .limit(4);
          if (invoiceError)
            console.error("Invoices fetch error:", invoiceError);
          else {
            setExpenses(
              invoices?.map((invoice) => ({
                id: invoice.id,
                item: `${invoice.vendor} - ${new Date(
                  invoice.due_date
                ).toLocaleDateString("en-GB", {
                  month: "short",
                  day: "numeric",
                })}`,
                amount: `₹${(invoice.amount / 100000).toFixed(1)}L`,
                date: new Date(invoice.due_date),
                category:
                  budgets[Math.floor(Math.random() * budgets.length)]
                    ?.department || "Unknown",
                status: invoice.status === "Paid" ? "Approved" : "Pending",
                delay: invoice.delay_days
                  ? `${invoice.delay_days} days`
                  : undefined,
              })) || []
            );
          }

          // Vendor Payments
          const { data: vendorData, error: vendorError } = await supabase
            .from("invoices")
            .select("id, vendor, amount, status")
            .eq("project_id", projectId)
            .order("vendor");
          if (vendorError) console.error("Vendor fetch error:", vendorError);
          else {
            const vendorMap = new Map<
              string,
              { paid: number; pending: number; ids: number[] }
            >();
            vendorData.forEach((invoice) => {
              const vendor = invoice.vendor;
              if (!vendorMap.has(vendor)) {
                vendorMap.set(vendor, { paid: 0, pending: 0, ids: [] });
              }
              const entry = vendorMap.get(vendor)!;
              entry.ids.push(invoice.id);
              if (invoice.status === "Paid") {
                entry.paid += invoice.amount;
              } else {
                entry.pending += invoice.amount;
              }
            });
            const vendorList: Vendor[] = Array.from(vendorMap.entries())
              .map(([name, amounts]) => ({
                name,
                pending: `₹${(amounts.pending / 100000).toFixed(1)}L`,
                paid: `₹${(amounts.paid / 100000).toFixed(1)}L`,
                status:
                  amounts.pending > 0
                    ? "Payment Due"
                    : amounts.paid > 0
                    ? "Settled"
                    : "Current",
                ids: amounts.ids,
              }))
              .slice(0, 3);
            setVendors(vendorList);
          }
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };
    fetchData();
  }, []);

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
      alert("Project deleted successfully!");
    } catch (error) {
      console.error("Delete project error:", error);
      alert("Failed to delete project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updates to Supabase - Consolidated CRUD
  const handleSave = async (section: Section) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const { data: projectData } = await supabase
        .from("projects")
        .select("id")
        .eq("name", "Pranayam Oru Thudakkam")
        .single();
      const projectId = projectData?.id;
      if (!projectId) {
        throw new Error("Project not found");
      }

      const table = tableMap[section];

      if (section === "budgetBreakdown") {
        // Update existing budgets
        for (const budget of budgetBreakdown.filter(
          (b) => b.id !== undefined
        )) {
          const allocatedNum =
            parseFloat(budget.allocated.replace(/[^0-9.]/g, "")) * 100000;
          const spentNum =
            parseFloat(budget.spent.replace(/[^0-9.]/g, "")) * 100000;
          const { error } = await supabase
            .from(table)
            .update({
              project_id: projectId,
              department: budget.category,
              allocated: allocatedNum,
              spent: spentNum,
            })
            .eq("id", budget.id);
          if (error) throw error;
        }
        // Insert new budget
        if (newBudget.category && newBudget.allocated) {
          const allocatedNum =
            parseFloat(newBudget.allocated.replace(/[^0-9.]/g, "")) * 100000;
          const spentNum = newBudget.spent
            ? parseFloat(newBudget.spent.replace(/[^0-9.]/g, "")) * 100000
            : 0;
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: projectId,
              department: newBudget.category,
              allocated: allocatedNum,
              spent: spentNum,
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setBudgetBreakdown([
              ...budgetBreakdown,
              {
                ...newBudget,
                id: insertedData.id,
                spent: newBudget.spent || "₹0L",
                progress:
                  newBudget.spent && newBudget.allocated
                    ? Math.round(
                        (parseFloat(newBudget.spent.replace(/[^0-9.]/g, "")) /
                          parseFloat(
                            newBudget.allocated.replace(/[^0-9.]/g, "")
                          )) *
                          100
                      )
                    : 0,
                status: newBudget.status || "In Progress",
              } as Budget,
            ]);
            setNewBudget({});
          }
        }
      } else if (section === "expenses") {
        // Update existing expenses
        for (const expense of expenses.filter((e) => e.id !== undefined)) {
          const amountNum =
            parseFloat(expense.amount.replace(/[^0-9.]/g, "")) * 100000;
          const { error } = await supabase
            .from(table)
            .update({
              project_id: projectId,
              vendor: expense.item.split(" - ")[0],
              amount: amountNum,
              due_date: expense.date.toISOString().split("T")[0],
              status: expense.status === "Approved" ? "Paid" : "Pending",
              delay_days: expense.delay
                ? parseInt(expense.delay.replace(/[^0-9]/g, "")) || 0
                : null,
            })
            .eq("id", expense.id);
          if (error) throw error;
        }
        // Insert new expense
        if (newExpense.item && newExpense.date && newExpense.amount) {
          const amountNum =
            parseFloat(newExpense.amount.replace(/[^0-9.]/g, "")) * 100000;
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: projectId,
              vendor: newExpense.item.split(" - ")[0] || newExpense.item,
              amount: amountNum,
              due_date: newExpense.date.toISOString().split("T")[0],
              status: newExpense.status === "Approved" ? "Paid" : "Pending",
              delay_days: newExpense.delay
                ? parseInt(newExpense.delay.replace(/[^0-9]/g, "")) || 0
                : null,
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setExpenses([
              ...expenses,
              { ...newExpense, id: insertedData.id } as Expense,
            ]);
            setNewExpense({});
          }
        }
      } else if (section === "vendors") {
        // Update existing vendor invoices
        for (const vendor of vendors.filter((v) => v.ids && v.ids.length > 0)) {
          const pendingNum =
            parseFloat(vendor.pending.replace(/[^0-9.]/g, "")) * 100000;
          const paidNum =
            parseFloat(vendor.paid.replace(/[^0-9.]/g, "")) * 100000;
          const status = vendor.status === "Payment Due" ? "Pending" : "Paid";
          const { error } = await supabase
            .from(table)
            .update({
              vendor: vendor.name,
              amount: status === "Paid" ? paidNum : pendingNum,
              status,
            })
            .in("id", vendor.ids);
          if (error) throw error;
        }
        // Insert new vendor invoice
        if (newVendor.name && (newVendor.pending || newVendor.paid)) {
          const pendingNum = newVendor.pending
            ? parseFloat(newVendor.pending.replace(/[^0-9.]/g, "")) * 100000
            : 0;
          const paidNum = newVendor.paid
            ? parseFloat(newVendor.paid.replace(/[^0-9.]/g, "")) * 100000
            : 0;
          const amount = paidNum > 0 ? paidNum : pendingNum;
          const status = paidNum > 0 ? "Paid" : "Pending";
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: projectId,
              vendor: newVendor.name,
              amount,
              status,
              due_date: new Date().toISOString().split("T")[0], // Default to today
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setVendors([
              ...vendors,
              {
                ...newVendor,
                id: insertedData.id,
                pending: newVendor.pending || "₹0L",
                paid: newVendor.paid || "₹0L",
                status:
                  newVendor.status || (paidNum > 0 ? "Settled" : "Payment Due"),
                ids: [insertedData.id],
              } as Vendor,
            ]);
            setNewVendor({});
          }
        }
      }

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
      setBudgetBreakdown([
        ...budgetBreakdown,
        {
          ...newBudget,
          id: undefined,
          spent: newBudget.spent || "₹0L",
          progress:
            newBudget.spent && newBudget.allocated
              ? Math.round(
                  (parseFloat(newBudget.spent.replace(/[^0-9.]/g, "")) /
                    parseFloat(newBudget.allocated.replace(/[^0-9.]/g, ""))) *
                    100
                )
              : 0,
          status: newBudget.status || "In Progress",
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
          id: undefined,
          category: newExpense.category || "Unknown",
          status: newExpense.status || "Pending",
          delay: newExpense.delay || undefined,
        } as Expense,
      ]);
      setNewExpense({});
    } else if (section === "vendors") {
      if (!newVendor.name || (!newVendor.pending && !newVendor.paid)) {
        alert(
          "Please fill in Vendor Name and at least one of Pending or Paid fields."
        );
        return;
      }
      setVendors([
        ...vendors,
        {
          ...newVendor,
          id: undefined,
          pending: newVendor.pending || "₹0L",
          paid: newVendor.paid || "₹0L",
          status:
            newVendor.status || (newVendor.paid ? "Settled" : "Payment Due"),
          ids: [],
        } as Vendor,
      ]);
      setNewVendor({});
    }
  };

  // Handle deleting items
  const handleDelete = async (section: Section, id: number | number[]) => {
    if (
      !window.confirm(
        `Are you sure you want to delete this ${section.slice(0, -1)}?`
      )
    ) {
      return;
    }
    try {
      const table = tableMap[section];
      if (section === "vendors") {
        const { error } = await supabase
          .from(table)
          .delete()
          .in("id", id as number[]);
        if (error) throw error;
        setVendors(vendors.filter((v) => v.ids !== id));
      } else {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) throw error;
        if (section === "budgetBreakdown") {
          setBudgetBreakdown(budgetBreakdown.filter((b) => b.id !== id));
        } else if (section === "expenses") {
          setExpenses(expenses.filter((e) => e.id !== id));
        }
      }
      alert(`${section.slice(0, -1)} deleted successfully!`);
    } catch (error) {
      console.error(`Delete ${section} error:`, error);
      alert(
        `Failed to delete ${section.slice(0, -1)}. Check console for details.`
      );
    }
  };

  // Cancel edit mode and reset new item forms
  const handleCancel = (section: Section) => {
    if (section === "budgetBreakdown") {
      setNewBudget({});
    } else if (section === "expenses") {
      setNewExpense({});
    } else if (section === "vendors") {
      setNewVendor({});
    }
    setEditMode({ ...editMode, [section]: false });
  };

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
                      <select
                        value={newBudget.status || "In Progress"}
                        onChange={(e) =>
                          setNewBudget({ ...newBudget, status: e.target.value })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="On Track">On Track</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  )}
                  {budgetBreakdown.map((budget, idx) => (
                    <div key={budget.id || idx} className="space-y-2">
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
                                handleDelete("budgetBreakdown", budget.id!)
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
                              newBudgets[idx].progress =
                                newBudgets[idx].spent && e.target.value
                                  ? Math.round(
                                      (parseFloat(
                                        newBudgets[idx].spent.replace(
                                          /[^0-9.]/g,
                                          ""
                                        )
                                      ) /
                                        parseFloat(
                                          e.target.value.replace(/[^0-9.]/g, "")
                                        )) *
                                        100
                                    )
                                  : 0;
                              setBudgetBreakdown(newBudgets);
                            }}
                            className="mb-2"
                          />
                          <Input
                            value={budget.spent}
                            onChange={(e) => {
                              const newBudgets = [...budgetBreakdown];
                              newBudgets[idx].spent = e.target.value;
                              newBudgets[idx].progress =
                                e.target.value && newBudgets[idx].allocated
                                  ? Math.round(
                                      (parseFloat(
                                        e.target.value.replace(/[^0-9.]/g, "")
                                      ) /
                                        parseFloat(
                                          newBudgets[idx].allocated.replace(
                                            /[^0-9.]/g,
                                            ""
                                          )
                                        )) *
                                        100
                                    )
                                  : 0;
                              setBudgetBreakdown(newBudgets);
                            }}
                            className="mb-2"
                          />
                          <select
                            value={budget.status}
                            onChange={(e) => {
                              const newBudgets = [...budgetBreakdown];
                              newBudgets[idx].status = e.target.value;
                              setBudgetBreakdown(newBudgets);
                            }}
                            className="w-full p-2 border border-input rounded-md mb-2"
                          >
                            <option value="In Progress">In Progress</option>
                            <option value="On Track">On Track</option>
                            <option value="Completed">Completed</option>
                          </select>
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
                        placeholder="Item (e.g., Vendor - Date)"
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
                      <Input
                        placeholder="Category"
                        value={newExpense.category || ""}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            category: e.target.value,
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
                      key={expense.id || idx}
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
                            <Input
                              value={expense.category}
                              onChange={(e) => {
                                const newExpenses = [...expenses];
                                newExpenses[idx].category = e.target.value;
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
                            onClick={() =>
                              handleDelete("expenses", expense.id!)
                            }
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
                              {expense.category} •{" "}
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
              <DashboardCard title="Vendor Payment Status" icon={AlertTriangle}>
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
                      {editMode.vendors ? "Cancel Edit" : "Edit Vendors"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => editMode.vendors && handleAdd("vendors")}
                      disabled={!editMode.vendors || isSubmitting}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vendor
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
                        placeholder="Paid (e.g., ₹20L)"
                        value={newVendor.paid || ""}
                        onChange={(e) =>
                          setNewVendor({ ...newVendor, paid: e.target.value })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Pending (e.g., ₹10L)"
                        value={newVendor.pending || ""}
                        onChange={(e) =>
                          setNewVendor({
                            ...newVendor,
                            pending: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newVendor.status || "Payment Due"}
                        onChange={(e) =>
                          setNewVendor({ ...newVendor, status: e.target.value })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Payment Due">Payment Due</option>
                        <option value="Settled">Settled</option>
                        <option value="Current">Current</option>
                      </select>
                    </div>
                  )}
                  {vendors.map((vendor, idx) => (
                    <div
                      key={vendor.id || idx}
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
                              onClick={() =>
                                handleDelete("vendors", vendor.ids)
                              }
                              disabled={isSaving}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={vendor.paid}
                              onChange={(e) => {
                                const newVendors = [...vendors];
                                newVendors[idx].paid = e.target.value;
                                newVendors[idx].status =
                                  e.target.value && !newVendors[idx].pending
                                    ? "Settled"
                                    : "Payment Due";
                                setVendors(newVendors);
                              }}
                              className="mb-2"
                            />
                            <Input
                              value={vendor.pending}
                              onChange={(e) => {
                                const newVendors = [...vendors];
                                newVendors[idx].pending = e.target.value;
                                newVendors[idx].status =
                                  newVendors[idx].paid && !e.target.value
                                    ? "Settled"
                                    : "Payment Due";
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
                              <option value="Payment Due">Payment Due</option>
                              <option value="Settled">Settled</option>
                              <option value="Current">Current</option>
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm">{vendor.name}</p>
                            <Badge
                              variant={
                                vendor.status === "Payment Due"
                                  ? "destructive"
                                  : vendor.status === "Settled"
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {vendor.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Paid</p>
                              <p className="font-bold text-primary">
                                {vendor.paid}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Pending</p>
                              <p className="font-bold text-destructive">
                                {vendor.pending}
                              </p>
                            </div>
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
