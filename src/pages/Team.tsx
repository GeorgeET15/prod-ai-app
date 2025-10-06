import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProductionSidebar } from "@/components/ProductionSidebar";
import { DashboardCard } from "@/components/DashboardCard";
import {
  Users,
  UserCheck,
  Clock,
  DollarSign,
  Edit2,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
interface KeyPersonnel {
  id?: string;
  name: string;
  role: string;
  department: string;
  status: string;
  contact: string;
  available: string;
}

interface Department {
  id?: string;
  name: string;
  headCount: number;
  lead: string;
  budget: string;
  status: string;
}

interface Attendance {
  id?: string;
  date: Date;
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface Payroll {
  id?: string;
  category: string;
  amount: string;
  status: string;
  date: Date;
}

type Section = "keyPersonnel" | "departments" | "attendance" | "payroll";
type TableName = "crew" | "departments" | "attendance" | "payroll";

const tableMap: Record<Section, TableName> = {
  keyPersonnel: "crew",
  departments: "departments",
  attendance: "attendance",
  payroll: "payroll",
};

const Team = () => {
  console.log("Using Team.tsx version b2c3d4e5_2");

  const [keyPersonnel, setKeyPersonnel] = useState<KeyPersonnel[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [editMode, setEditMode] = useState({
    keyPersonnel: false,
    departments: false,
    attendance: false,
    payroll: false,
  });
  const [newPersonnel, setNewPersonnel] = useState<Partial<KeyPersonnel>>({});
  const [newDepartment, setNewDepartment] = useState<Partial<Department>>({});
  const [newAttendance, setNewAttendance] = useState<Partial<Attendance>>({});
  const [newPayroll, setNewPayroll] = useState<Partial<Payroll>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Debug state changes
  useEffect(() => {
    console.log("Edit mode state:", editMode);
    console.log("Is saving:", isSaving);
    console.log("Is submitting:", isSubmitting);
  }, [editMode, isSaving, isSubmitting]);

  // Fetch projects and set selectedProjectId from localStorage
  useEffect(() => {
    const fetchProjects = async () => {
      console.log("Fetching projects list");
      try {
        setLoading(true);
        setError(null);
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("id, name");
        if (projectsError) {
          console.error("Projects fetch error:", projectsError);
          setError(`Failed to fetch projects: ${projectsError.message}`);
          return;
        }
        console.log("Projects fetched:", projectsData);
        setProjects(projectsData || []);

        const storedProjectId = localStorage.getItem("selectedProjectId");
        console.log("Stored selectedProjectId:", storedProjectId);
        if (
          storedProjectId &&
          projectsData?.some((p) => p.id === storedProjectId)
        ) {
          setSelectedProjectId(storedProjectId);
        } else if (projectsData?.length > 0) {
          setSelectedProjectId(projectsData[0].id);
          localStorage.setItem("selectedProjectId", projectsData[0].id);
        } else {
          setError("No projects available. Please create a project first.");
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

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "selectedProjectId") {
        const newProjectId = event.newValue || "";
        console.log(
          "Storage event: selectedProjectId changed to",
          newProjectId
        );
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

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedProjectId) {
        console.log("No selectedProjectId, skipping fetch");
        setError("No project selected.");
        setKeyPersonnel([]);
        setDepartments([]);
        setAttendance([]);
        setPayroll([]);
        setLoading(false);
        return;
      }
      console.log("Fetching project data for ID:", selectedProjectId);
      setLoading(true);
      setError(null);
      try {
        // Key Personnel
        const { data: crew, error: crewError } = await supabase
          .from("crew")
          .select("id, name, role, department, status, contact, available")
          .eq("project_id", selectedProjectId);
        if (crewError) {
          console.error("Crew fetch error:", crewError);
          if (crewError.message.includes("Could not find the table")) {
            setError(
              "The 'crew' table does not exist in the database. Please create it using the provided SQL in the Supabase SQL Editor."
            );
          } else {
            setError(`Failed to fetch crew: ${crewError.message}`);
          }
          setKeyPersonnel([]);
        } else {
          console.log("Crew fetched:", crew);
          setKeyPersonnel(
            crew?.length > 0
              ? crew.map((person) => ({
                  id: person.id,
                  name: person.name || "TBD",
                  role: person.role || "Unknown",
                  department: person.department || "Unknown",
                  status: person.status || "On Set",
                  contact: person.contact || "",
                  available: person.available || "Full Day",
                }))
              : []
          );
        }

        // Department Overview
        const { data: deptData, error: deptError } = await supabase
          .from("departments")
          .select("id, name, head_count, lead, budget, status")
          .eq("project_id", selectedProjectId);
        if (deptError) {
          console.error("Departments fetch error:", deptError);
          if (deptError.message.includes("Could not find the table")) {
            setError(
              "The 'departments' table does not exist in the database. Please create it using the provided SQL in the Supabase SQL Editor."
            );
          } else {
            setError(`Failed to fetch departments: ${deptError.message}`);
          }
          setDepartments([]);
        } else {
          console.log("Departments fetched:", deptData);
          setDepartments(
            deptData?.length > 0
              ? deptData.map((dept) => ({
                  id: dept.id,
                  name: dept.name || "Unknown",
                  headCount: dept.head_count || 0,
                  lead: dept.lead || "TBD",
                  budget: dept.budget
                    ? dept.budget >= 10000000
                      ? `₹${(dept.budget / 10000000).toFixed(1)} Cr`
                      : `₹${(dept.budget / 100000).toFixed(0)}L`
                    : "₹0L",
                  status: dept.status || "Active",
                }))
              : []
          );
        }

        // Attendance Records
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select("id, date, present, absent, late, total")
          .eq("project_id", selectedProjectId)
          .order("date", { ascending: false });
        if (attendanceError) {
          console.error("Attendance fetch error:", attendanceError);
          if (attendanceError.message.includes("Could not find the table")) {
            setError(
              "The 'attendance' table does not exist in the database. Please create it using the provided SQL in the Supabase SQL Editor."
            );
          } else {
            setError(`Failed to fetch attendance: ${attendanceError.message}`);
          }
          setAttendance([]);
        } else {
          console.log("Attendance fetched:", attendanceData);
          setAttendance(
            attendanceData?.length > 0
              ? attendanceData.map((record) => ({
                  id: record.id,
                  date: new Date(record.date),
                  present: record.present || 0,
                  absent: record.absent || 0,
                  late: record.late || 0,
                  total: record.total || 0,
                }))
              : []
          );
        }

        // Payroll Management
        const { data: payrollData, error: payrollError } = await supabase
          .from("payroll")
          .select("id, category, amount, status, due_date")
          .eq("project_id", selectedProjectId)
          .order("due_date", { ascending: true });
        if (payrollError) {
          console.error("Payroll fetch error:", payrollError);
          if (payrollError.message.includes("Could not find the table")) {
            setError(
              "The 'payroll' table does not exist in the database. Please create it using the provided SQL in the Supabase SQL Editor."
            );
          } else {
            setError(`Failed to fetch payroll: ${payrollError.message}`);
          }
          setPayroll([]);
        } else {
          console.log("Payroll fetched:", payrollData);
          setPayroll(
            payrollData?.length > 0
              ? payrollData.map((payment) => ({
                  id: payment.id,
                  category: payment.category || "Unknown",
                  amount: payment.amount
                    ? payment.amount >= 10000000
                      ? `₹${(payment.amount / 10000000).toFixed(1)} Cr`
                      : `₹${(payment.amount / 100000).toFixed(0)}L`
                    : "₹0L",
                  status: payment.status || "Pending",
                  date: payment.due_date
                    ? new Date(payment.due_date)
                    : new Date(),
                }))
              : []
          );
        }
      } catch (error: any) {
        console.error("Fetch error:", error);
        setError(`An unexpected error occurred: ${error.message || error}`);
        setKeyPersonnel([]);
        setDepartments([]);
        setAttendance([]);
        setPayroll([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedProjectId, refreshKey]);

  // Handle project deletion
  const onDeleteProject = async () => {
    if (!selectedProjectId) return;
    setIsSubmitting(true);
    try {
      console.log("Deleting project with ID:", selectedProjectId);
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", selectedProjectId);
      if (error) throw error;
      setProjects(projects.filter((p) => p.id !== selectedProjectId));
      setSelectedProjectId("");
      localStorage.removeItem("selectedProjectId");
      alert("Project deleted successfully!");
    } catch (error: any) {
      console.error("Delete project error:", error);
      setError(`Failed to delete project: ${error.message}`);
      alert(`Failed to delete project: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updates to Supabase
  const handleSave = async (section: Section) => {
    if (isSaving || !selectedProjectId) return;
    setIsSaving(true);
    let table: TableName | undefined;
    try {
      console.log(`Saving ${section} for project ID:`, selectedProjectId);
      table = tableMap[section];
      if (!table) throw new Error(`Invalid section: ${section}`);

      if (section === "keyPersonnel") {
        // Update existing personnel
        for (const person of keyPersonnel.filter((p) => p.id !== undefined)) {
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              name: person.name,
              role: person.role,
              department: person.department,
              status: person.status,
              contact: person.contact,
              available: person.available || "Full Day",
            })
            .eq("id", person.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new personnel
        if (newPersonnel.name && newPersonnel.role) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              name: newPersonnel.name,
              role: newPersonnel.role,
              department: newPersonnel.department || "Unknown",
              status: newPersonnel.status || "On Set",
              contact: newPersonnel.contact || "",
              available: newPersonnel.available || "Full Day",
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setKeyPersonnel([
              ...keyPersonnel,
              { ...newPersonnel, id: insertedData.id } as KeyPersonnel,
            ]);
            setNewPersonnel({});
          }
        }
      } else if (section === "departments") {
        // Update existing departments
        for (const dept of departments.filter((d) => d.id !== undefined)) {
          const budgetNum =
            parseFloat(dept.budget.replace(/[^0-9.]/g, "")) *
            (dept.budget.includes("Cr") ? 10000000 : 100000);
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              name: dept.name,
              head_count: dept.headCount,
              lead: dept.lead,
              budget: budgetNum,
              status: dept.status,
            })
            .eq("id", dept.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new department
        if (newDepartment.name && newDepartment.lead) {
          const budgetNum = newDepartment.budget
            ? parseFloat(newDepartment.budget.replace(/[^0-9.]/g, "")) *
              (newDepartment.budget.includes("Cr") ? 10000000 : 100000)
            : 0;
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              name: newDepartment.name,
              head_count: newDepartment.headCount || 0,
              lead: newDepartment.lead,
              budget: budgetNum,
              status: newDepartment.status || "Active",
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setDepartments([
              ...departments,
              {
                ...newDepartment,
                id: insertedData.id,
                budget: newDepartment.budget || "₹0L",
              } as Department,
            ]);
            setNewDepartment({});
          }
        }
      } else if (section === "attendance") {
        // Update existing attendance records
        for (const record of attendance.filter((r) => r.id !== undefined)) {
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              date: record.date.toISOString().split("T")[0],
              present: record.present,
              absent: record.absent,
              late: record.late,
              total: record.total,
            })
            .eq("id", record.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new attendance record
        if (newAttendance.date && newAttendance.present !== undefined) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              date: newAttendance.date.toISOString().split("T")[0],
              present: newAttendance.present || 0,
              absent: newAttendance.absent || 0,
              late: newAttendance.late || 0,
              total: newAttendance.total || 0,
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setAttendance([
              ...attendance,
              { ...newAttendance, id: insertedData.id } as Attendance,
            ]);
            setNewAttendance({});
          }
        }
      } else if (section === "payroll") {
        // Update existing payroll records
        for (const payment of payroll.filter((p) => p.id !== undefined)) {
          const amountNum =
            parseFloat(payment.amount.replace(/[^0-9.]/g, "")) *
            (payment.amount.includes("Cr") ? 10000000 : 100000);
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              category: payment.category,
              amount: amountNum,
              status: payment.status,
              due_date: payment.date.toISOString().split("T")[0],
            })
            .eq("id", payment.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new payroll record
        if (newPayroll.category && newPayroll.date) {
          const amountNum = newPayroll.amount
            ? parseFloat(newPayroll.amount.replace(/[^0-9.]/g, "")) *
              (newPayroll.amount.includes("Cr") ? 10000000 : 100000)
            : 0;
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              category: newPayroll.category,
              amount: amountNum,
              status: newPayroll.status || "Pending",
              due_date: newPayroll.date.toISOString().split("T")[0],
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setPayroll([
              ...payroll,
              {
                ...newPayroll,
                id: insertedData.id,
                amount: newPayroll.amount || "₹0L",
              } as Payroll,
            ]);
            setNewPayroll({});
          }
        }
      }

      console.log(`${section} saved successfully`);
      setRefreshKey((prev) => prev + 1);
      setEditMode({ ...editMode, [section]: false });
      alert("Changes saved successfully!");
    } catch (error: any) {
      console.error(`Save ${section} error:`, error);
      if (table && error.message.includes("Could not find the table")) {
        setError(
          `The '${table}' table does not exist in the database. Please create it using the provided SQL in the Supabase SQL Editor.`
        );
      } else {
        setError(`Failed to save changes for ${section}: ${error.message}`);
      }
      alert(`Failed to save changes for ${section}: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Add new item to local state
  const handleAdd = (section: Section) => {
    if (section === "keyPersonnel") {
      if (!newPersonnel.name || !newPersonnel.role) {
        alert("Please fill in Name and Role fields.");
        return;
      }
      setKeyPersonnel([
        ...keyPersonnel,
        {
          ...newPersonnel,
          id: undefined,
          status: newPersonnel.status || "On Set",
          department: newPersonnel.department || "Unknown",
          contact: newPersonnel.contact || "",
          available: newPersonnel.available || "Full Day",
        } as KeyPersonnel,
      ]);
      setNewPersonnel({});
    } else if (section === "departments") {
      if (!newDepartment.name || !newDepartment.lead) {
        alert("Please fill in Department Name and Lead fields.");
        return;
      }
      setDepartments([
        ...departments,
        {
          ...newDepartment,
          id: undefined,
          headCount: newDepartment.headCount || 0,
          budget: newDepartment.budget || "₹0L",
          status: newDepartment.status || "Active",
        } as Department,
      ]);
      setNewDepartment({});
    } else if (section === "attendance") {
      if (!newAttendance.date || newAttendance.present === undefined) {
        alert("Please fill in Date and Present fields.");
        return;
      }
      setAttendance([
        ...attendance,
        {
          ...newAttendance,
          id: undefined,
          absent: newAttendance.absent || 0,
          late: newAttendance.late || 0,
          total: newAttendance.total || 0,
        } as Attendance,
      ]);
      setNewAttendance({});
    } else if (section === "payroll") {
      if (!newPayroll.category || !newPayroll.date) {
        alert("Please fill in Category and Due Date fields.");
        return;
      }
      setPayroll([
        ...payroll,
        {
          ...newPayroll,
          id: undefined,
          amount: newPayroll.amount || "₹0L",
          status: newPayroll.status || "Pending",
        } as Payroll,
      ]);
      setNewPayroll({});
    }
  };

  // Handle deleting items
  const handleDelete = async (section: Section, id: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete this ${section.slice(0, -1)}?`
      )
    ) {
      return;
    }
    try {
      console.log(`Deleting ${section} with ID:`, id);
      const table = tableMap[section];
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id)
        .eq("project_id", selectedProjectId);
      if (error) throw error;
      if (section === "keyPersonnel") {
        setKeyPersonnel(keyPersonnel.filter((p) => p.id !== id));
      } else if (section === "departments") {
        setDepartments(departments.filter((d) => d.id !== id));
      } else if (section === "attendance") {
        setAttendance(attendance.filter((r) => r.id !== id));
      } else if (section === "payroll") {
        setPayroll(payroll.filter((p) => p.id !== id));
      }
      alert(`${section.slice(0, -1)} deleted successfully!`);
    } catch (error: any) {
      console.error(`Delete ${section} error:`, error);
      setError(`Failed to delete ${section.slice(0, -1)}: ${error.message}`);
      alert(`Failed to delete ${section.slice(0, -1)}: ${error.message}`);
    }
  };

  // Cancel edit mode and reset new item forms
  const handleCancel = (section: Section) => {
    if (section === "keyPersonnel") {
      setNewPersonnel({});
    } else if (section === "departments") {
      setNewDepartment({});
    } else if (section === "attendance") {
      setNewAttendance({});
    } else if (section === "payroll") {
      setNewPayroll({});
    }
    setEditMode({ ...editMode, [section]: false });
    setRefreshKey((prev) => prev + 1);
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
                    Team & HR
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Crew management, scheduling, payroll
                  </p>
                </div>
              </div>
            </header>
            <div className="p-6 space-y-6">
              {/* Key Personnel */}
              <DashboardCard title="Key Personnel" icon={UserCheck}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.keyPersonnel
                          ? handleCancel("keyPersonnel")
                          : setEditMode({ ...editMode, keyPersonnel: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.keyPersonnel ? "Cancel Edit" : "Edit Personnel"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.keyPersonnel && handleAdd("keyPersonnel")
                      }
                      disabled={
                        !editMode.keyPersonnel || isSaving || isSubmitting
                      }
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Personnel
                    </Button>
                  </div>
                  {editMode.keyPersonnel && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Name"
                        value={newPersonnel.name || ""}
                        onChange={(e) =>
                          setNewPersonnel({
                            ...newPersonnel,
                            name: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Role"
                        value={newPersonnel.role || ""}
                        onChange={(e) =>
                          setNewPersonnel({
                            ...newPersonnel,
                            role: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Department"
                        value={newPersonnel.department || ""}
                        onChange={(e) =>
                          setNewPersonnel({
                            ...newPersonnel,
                            department: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newPersonnel.status || "On Set"}
                        onChange={(e) =>
                          setNewPersonnel({
                            ...newPersonnel,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="On Set">On Set</option>
                        <option value="Post-Production">Post-Production</option>
                      </select>
                      <Input
                        placeholder="Contact"
                        value={newPersonnel.contact || ""}
                        onChange={(e) =>
                          setNewPersonnel({
                            ...newPersonnel,
                            contact: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newPersonnel.available || "Full Day"}
                        onChange={(e) =>
                          setNewPersonnel({
                            ...newPersonnel,
                            available: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Full Day">Full Day</option>
                        <option value="Half Day">Half Day</option>
                        <option value="Not Available">Not Available</option>
                      </select>
                    </div>
                  )}
                  {keyPersonnel.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No personnel added yet. Click "Edit Personnel" to add one.
                    </p>
                  ) : (
                    keyPersonnel.map((person, idx) => (
                      <div
                        key={person.id || idx}
                        className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                      >
                        {editMode.keyPersonnel ? (
                          <>
                            <div className="flex-1 space-y-2 mr-2">
                              <Input
                                value={person.name}
                                onChange={(e) => {
                                  const newPersonnel = [...keyPersonnel];
                                  newPersonnel[idx].name = e.target.value;
                                  setKeyPersonnel(newPersonnel);
                                }}
                                className="mb-2"
                              />
                              <Input
                                value={person.role}
                                onChange={(e) => {
                                  const newPersonnel = [...keyPersonnel];
                                  newPersonnel[idx].role = e.target.value;
                                  setKeyPersonnel(newPersonnel);
                                }}
                                className="mb-2"
                              />
                              <Input
                                value={person.department}
                                onChange={(e) => {
                                  const newPersonnel = [...keyPersonnel];
                                  newPersonnel[idx].department = e.target.value;
                                  setKeyPersonnel(newPersonnel);
                                }}
                                className="mb-2"
                              />
                              <select
                                value={person.status}
                                onChange={(e) => {
                                  const newPersonnel = [...keyPersonnel];
                                  newPersonnel[idx].status = e.target.value;
                                  setKeyPersonnel(newPersonnel);
                                }}
                                className="w-full p-2 border border-input rounded-md mb-2"
                              >
                                <option value="On Set">On Set</option>
                                <option value="Post-Production">
                                  Post-Production
                                </option>
                              </select>
                              <Input
                                value={person.contact}
                                onChange={(e) => {
                                  const newPersonnel = [...keyPersonnel];
                                  newPersonnel[idx].contact = e.target.value;
                                  setKeyPersonnel(newPersonnel);
                                }}
                                className="mb-2"
                              />
                              <select
                                value={person.available}
                                onChange={(e) => {
                                  const newPersonnel = [...keyPersonnel];
                                  newPersonnel[idx].available = e.target.value;
                                  setKeyPersonnel(newPersonnel);
                                }}
                                className="w-full p-2 border border-input rounded-md mb-2"
                              >
                                <option value="Full Day">Full Day</option>
                                <option value="Half Day">Half Day</option>
                                <option value="Not Available">
                                  Not Available
                                </option>
                              </select>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDelete("keyPersonnel", person.id!)
                              }
                              disabled={isSaving || isSubmitting || !person.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {getInitials(person.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">
                                  {person.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {person.role} • {person.department}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={
                                person.status === "On Set"
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {person.status}
                            </Badge>
                          </>
                        )}
                      </div>
                    ))
                  )}
                  {editMode.keyPersonnel && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("keyPersonnel")}
                      disabled={isSaving || isSubmitting}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Departments */}
              <DashboardCard title="Department Overview" icon={Users}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.departments
                          ? handleCancel("departments")
                          : setEditMode({ ...editMode, departments: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.departments
                        ? "Cancel Edit"
                        : "Edit Departments"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.departments && handleAdd("departments")
                      }
                      disabled={
                        !editMode.departments || isSaving || isSubmitting
                      }
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Department
                    </Button>
                  </div>
                  {editMode.departments && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Department Name"
                        value={newDepartment.name || ""}
                        onChange={(e) =>
                          setNewDepartment({
                            ...newDepartment,
                            name: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Lead Name"
                        value={newDepartment.lead || ""}
                        onChange={(e) =>
                          setNewDepartment({
                            ...newDepartment,
                            lead: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Head Count"
                        value={
                          newDepartment.headCount !== undefined
                            ? newDepartment.headCount
                            : ""
                        }
                        onChange={(e) =>
                          setNewDepartment({
                            ...newDepartment,
                            headCount: parseInt(e.target.value) || 0,
                          })
                        }
                        type="number"
                        className="mb-2"
                      />
                      <Input
                        placeholder="Budget (e.g., ₹50L or ₹1.2 Cr)"
                        value={newDepartment.budget || ""}
                        onChange={(e) =>
                          setNewDepartment({
                            ...newDepartment,
                            budget: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newDepartment.status || "Active"}
                        onChange={(e) =>
                          setNewDepartment({
                            ...newDepartment,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Active">Active</option>
                        <option value="Post-Production">Post-Production</option>
                      </select>
                    </div>
                  )}
                  {departments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No departments added yet. Click "Edit Departments" to add
                      one.
                    </p>
                  ) : (
                    departments.map((dept, idx) => (
                      <div
                        key={dept.id || idx}
                        className="p-3 bg-secondary/20 rounded-lg"
                      >
                        {editMode.departments ? (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <Input
                                value={dept.name}
                                onChange={(e) => {
                                  const newDepts = [...departments];
                                  newDepts[idx].name = e.target.value;
                                  setDepartments(newDepts);
                                }}
                                className="flex-1 mr-2"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDelete("departments", dept.id!)
                                }
                                disabled={isSaving || isSubmitting || !dept.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <Input
                              value={dept.lead}
                              onChange={(e) => {
                                const newDepts = [...departments];
                                newDepts[idx].lead = e.target.value;
                                setDepartments(newDepts);
                              }}
                              className="mb-2"
                            />
                            <Input
                              value={dept.headCount}
                              onChange={(e) => {
                                const newDepts = [...departments];
                                newDepts[idx].headCount =
                                  parseInt(e.target.value) || 0;
                                setDepartments(newDepts);
                              }}
                              type="number"
                              className="mb-2"
                            />
                            <Input
                              value={dept.budget}
                              onChange={(e) => {
                                const newDepts = [...departments];
                                newDepts[idx].budget = e.target.value;
                                setDepartments(newDepts);
                              }}
                              className="mb-2"
                            />
                            <select
                              value={dept.status}
                              onChange={(e) => {
                                const newDepts = [...departments];
                                newDepts[idx].status = e.target.value;
                                setDepartments(newDepts);
                              }}
                              className="w-full p-2 border border-input rounded-md mb-2"
                            >
                              <option value="Active">Active</option>
                              <option value="Post-Production">
                                Post-Production
                              </option>
                            </select>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-sm">
                                  {dept.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Lead: {dept.lead}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {dept.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">
                                  Team Size
                                </p>
                                <p className="font-bold">
                                  {dept.headCount} members
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Department Budget
                                </p>
                                <p className="font-bold">{dept.budget}</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                  {editMode.departments && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("departments")}
                      disabled={isSaving || isSubmitting}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Attendance Tracking */}
              <DashboardCard title="Attendance Records" icon={Clock}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.attendance
                          ? handleCancel("attendance")
                          : setEditMode({ ...editMode, attendance: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.attendance ? "Cancel Edit" : "Edit Attendance"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.attendance && handleAdd("attendance")
                      }
                      disabled={
                        !editMode.attendance || isSaving || isSubmitting
                      }
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Attendance
                    </Button>
                  </div>
                  {editMode.attendance && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <DatePicker
                        selected={newAttendance.date}
                        onChange={(date: Date) =>
                          setNewAttendance({ ...newAttendance, date })
                        }
                        dateFormat="dd MMM yyyy"
                        placeholderText="Select Date"
                        customInput={
                          <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-2" />
                        }
                      />
                      <Input
                        placeholder="Present"
                        value={
                          newAttendance.present !== undefined
                            ? newAttendance.present
                            : ""
                        }
                        onChange={(e) =>
                          setNewAttendance({
                            ...newAttendance,
                            present: parseInt(e.target.value) || 0,
                          })
                        }
                        type="number"
                        className="mb-2"
                      />
                      <Input
                        placeholder="Absent"
                        value={
                          newAttendance.absent !== undefined
                            ? newAttendance.absent
                            : ""
                        }
                        onChange={(e) =>
                          setNewAttendance({
                            ...newAttendance,
                            absent: parseInt(e.target.value) || 0,
                          })
                        }
                        type="number"
                        className="mb-2"
                      />
                      <Input
                        placeholder="Late"
                        value={
                          newAttendance.late !== undefined
                            ? newAttendance.late
                            : ""
                        }
                        onChange={(e) =>
                          setNewAttendance({
                            ...newAttendance,
                            late: parseInt(e.target.value) || 0,
                          })
                        }
                        type="number"
                        className="mb-2"
                      />
                      <Input
                        placeholder="Total"
                        value={
                          newAttendance.total !== undefined
                            ? newAttendance.total
                            : ""
                        }
                        onChange={(e) =>
                          setNewAttendance({
                            ...newAttendance,
                            total: parseInt(e.target.value) || 0,
                          })
                        }
                        type="number"
                        className="mb-2"
                      />
                    </div>
                  )}
                  {attendance.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No attendance records added yet. Click "Edit Attendance"
                      to add one.
                    </p>
                  ) : (
                    attendance.map((record, idx) => (
                      <div
                        key={record.id || idx}
                        className="p-3 bg-secondary/20 rounded-lg"
                      >
                        {editMode.attendance ? (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <DatePicker
                                selected={record.date}
                                onChange={(date: Date) => {
                                  const newRecords = [...attendance];
                                  newRecords[idx].date = date;
                                  setAttendance(newRecords);
                                }}
                                dateFormat="dd MMM yyyy"
                                placeholderText="Select Date"
                                customInput={
                                  <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-2 flex-1 mr-2" />
                                }
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDelete("attendance", record.id!)
                                }
                                disabled={
                                  isSaving || isSubmitting || !record.id
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                value={record.present}
                                onChange={(e) => {
                                  const newRecords = [...attendance];
                                  newRecords[idx].present =
                                    parseInt(e.target.value) || 0;
                                  setAttendance(newRecords);
                                }}
                                type="number"
                                className="mb-2"
                              />
                              <Input
                                value={record.absent}
                                onChange={(e) => {
                                  const newRecords = [...attendance];
                                  newRecords[idx].absent =
                                    parseInt(e.target.value) || 0;
                                  setAttendance(newRecords);
                                }}
                                type="number"
                                className="mb-2"
                              />
                              <Input
                                value={record.late}
                                onChange={(e) => {
                                  const newRecords = [...attendance];
                                  newRecords[idx].late =
                                    parseInt(e.target.value) || 0;
                                  setAttendance(newRecords);
                                }}
                                type="number"
                                className="mb-2"
                              />
                              <Input
                                value={record.total}
                                onChange={(e) => {
                                  const newRecords = [...attendance];
                                  newRecords[idx].total =
                                    parseInt(e.target.value) || 0;
                                  setAttendance(newRecords);
                                }}
                                type="number"
                                className="mb-2"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-sm mb-2">
                              {record.date.toLocaleDateString("en-GB", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">Present</p>
                                <p className="font-bold text-primary">
                                  {record.present}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Absent</p>
                                <p className="font-bold text-destructive">
                                  {record.absent}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Late</p>
                                <p className="font-bold text-secondary">
                                  {record.late}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total</p>
                                <p className="font-bold">{record.total}</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                  {editMode.attendance && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("attendance")}
                      disabled={isSaving || isSubmitting}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Payroll */}
              <DashboardCard title="Payroll Management" icon={DollarSign}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.payroll
                          ? handleCancel("payroll")
                          : setEditMode({ ...editMode, payroll: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.payroll ? "Cancel Edit" : "Edit Payroll"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => editMode.payroll && handleAdd("payroll")}
                      disabled={!editMode.payroll || isSaving || isSubmitting}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payroll
                    </Button>
                  </div>
                  {editMode.payroll && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Category"
                        value={newPayroll.category || ""}
                        onChange={(e) =>
                          setNewPayroll({
                            ...newPayroll,
                            category: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Amount (e.g., ₹50L or ₹1.2 Cr)"
                        value={newPayroll.amount || ""}
                        onChange={(e) =>
                          setNewPayroll({
                            ...newPayroll,
                            amount: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newPayroll.status || "Pending"}
                        onChange={(e) =>
                          setNewPayroll({
                            ...newPayroll,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Processed">Processed</option>
                        <option value="Pending">Pending</option>
                      </select>
                      <DatePicker
                        selected={newPayroll.date}
                        onChange={(date: Date) =>
                          setNewPayroll({ ...newPayroll, date })
                        }
                        dateFormat="dd MMM yyyy"
                        placeholderText="Select Due Date"
                        customInput={
                          <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-2" />
                        }
                      />
                    </div>
                  )}
                  {payroll.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No payroll records added yet. Click "Edit Payroll" to add
                      one.
                    </p>
                  ) : (
                    payroll.map((payment, idx) => (
                      <div
                        key={payment.id || idx}
                        className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                      >
                        {editMode.payroll ? (
                          <>
                            <div className="flex-1 space-y-2 mr-2">
                              <Input
                                value={payment.category}
                                onChange={(e) => {
                                  const newPayrollList = [...payroll];
                                  newPayrollList[idx].category = e.target.value;
                                  setPayroll(newPayrollList);
                                }}
                                className="mb-2"
                              />
                              <Input
                                value={payment.amount}
                                onChange={(e) => {
                                  const newPayrollList = [...payroll];
                                  newPayrollList[idx].amount = e.target.value;
                                  setPayroll(newPayrollList);
                                }}
                                className="mb-2"
                              />
                              <select
                                value={payment.status}
                                onChange={(e) => {
                                  const newPayrollList = [...payroll];
                                  newPayrollList[idx].status = e.target.value;
                                  setPayroll(newPayrollList);
                                }}
                                className="w-full p-2 border border-input rounded-md mb-2"
                              >
                                <option value="Processed">Processed</option>
                                <option value="Pending">Pending</option>
                              </select>
                              <DatePicker
                                selected={payment.date}
                                onChange={(date: Date) => {
                                  const newPayrollList = [...payroll];
                                  newPayrollList[idx].date = date;
                                  setPayroll(newPayrollList);
                                }}
                                dateFormat="dd MMM yyyy"
                                placeholderText="Select Due Date"
                                customInput={
                                  <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-2" />
                                }
                              />
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDelete("payroll", payment.id!)
                              }
                              disabled={isSaving || isSubmitting || !payment.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div>
                              <p className="font-medium text-sm">
                                {payment.category}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Due:{" "}
                                {payment.date.toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">
                                {payment.amount}
                              </p>
                              <Badge
                                variant={
                                  payment.status === "Processed"
                                    ? "default"
                                    : "outline"
                                }
                                className="text-xs mt-1"
                              >
                                {payment.status}
                              </Badge>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                  {editMode.payroll && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("payroll")}
                      disabled={isSaving || isSubmitting}
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

export default Team;
