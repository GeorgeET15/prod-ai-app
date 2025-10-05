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
  id?: number;
  name: string;
  role: string;
  department: string;
  status: string;
  contact: string;
}

interface Department {
  id?: number;
  name: string;
  headCount: number;
  lead: string;
  budget: string;
  status: string;
}

interface Attendance {
  id?: number;
  date: Date;
  present: number;
  absent: number;
  late: number;
  total: number;
}

interface Payroll {
  id?: number;
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

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

        // Fetch project data
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("id")
          .eq("name", "Pranayam Oru Thudakkam")
          .single();
        if (projectError) {
          console.error("Project fetch error:", projectError);
          return;
        }
        const projectId = projectData?.id;
        if (!projectId) {
          console.error("Project not found");
          return;
        }

        // Key Personnel
        const { data: crew, error: crewError } = await supabase
          .from("crew")
          .select("id, name, role, department, status, contact")
          .eq("project_id", projectId)
          .limit(5);
        if (crewError) console.error("Crew fetch error:", crewError);
        else {
          setKeyPersonnel(
            crew?.map((person, idx) => ({
              id: person.id,
              name: person.name || "TBD",
              role:
                person.role ||
                [
                  "Director",
                  "Producer",
                  "DOP",
                  "Art Director",
                  "Sound Designer",
                ][idx],
              department:
                person.department ||
                ["Creative", "Production", "Camera", "Art", "Sound"][idx],
              status: person.status || (idx < 3 ? "On Set" : "Post-Production"),
              contact: person.contact || `+91 98765 4321${idx}`,
            })) || []
          );
        }

        // Department Overview
        const { data: deptData, error: deptError } = await supabase
          .from("departments")
          .select("id, name, head_count, lead, budget, status")
          .eq("project_id", projectId)
          .limit(5);
        if (deptError) console.error("Departments fetch error:", deptError);
        else {
          setDepartments(
            deptData?.map((dept, idx) => ({
              id: dept.id,
              name:
                dept.name ||
                [
                  "Camera Department",
                  "Art Department",
                  "Sound Department",
                  "Costume & Makeup",
                  "VFX Team",
                ][idx],
              headCount: dept.head_count || [12, 18, 8, 15, 22][idx],
              lead:
                dept.lead ||
                [
                  "Ravi Varma",
                  "Meera Reddy",
                  "Suresh Kumar",
                  "Lakshmi Devi",
                  "Anil Mehta",
                ][idx],
              budget: dept.budget
                ? `₹${(dept.budget / 100000).toFixed(0)}L`
                : ["₹85L", "₹1.2 Cr", "₹45L", "₹65L", "₹2.8 Cr"][idx],
              status: dept.status || (idx === 4 ? "Post-Production" : "Active"),
            })) || []
          );
        }

        // Attendance Records
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select("id, date, present, absent, late, total")
          .eq("project_id", projectId)
          .order("date", { ascending: false })
          .limit(3);
        if (attendanceError)
          console.error("Attendance fetch error:", attendanceError);
        else {
          setAttendance(
            attendanceData?.map((record, idx) => ({
              id: record.id,
              date: new Date(record.date),
              present: record.present || [118, 125, 120][idx % 3],
              absent: record.absent || [9, 2, 4][idx % 3],
              late: record.late || [5, 3, 6][idx % 3],
              total: record.total || 127,
            })) || []
          );
        }

        // Payroll Management
        const { data: payrollData, error: payrollError } = await supabase
          .from("payroll")
          .select("id, category, amount, status, due_date")
          .eq("project_id", projectId)
          .order("due_date", { ascending: true })
          .limit(4);
        if (payrollError) console.error("Payroll fetch error:", payrollError);
        else {
          setPayroll(
            payrollData?.map((payment, idx) => ({
              id: payment.id,
              category:
                payment.category ||
                [
                  "Key Crew",
                  "Supporting Crew",
                  "Daily Wage Workers",
                  "Vendors & Freelancers",
                ][idx],
              amount: payment.amount
                ? `₹${(payment.amount / 100000).toFixed(0)}L`
                : ["₹45L", "₹28L", "₹12L", "₹35L"][idx],
              status: payment.status || (idx < 2 ? "Processed" : "Pending"),
              date: payment.due_date
                ? new Date(payment.due_date)
                : new Date(`2025-10-${["01", "01", "05", "07"][idx]}`),
            })) || []
          );
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

      if (section === "keyPersonnel") {
        // Update existing personnel
        for (const person of keyPersonnel.filter((p) => p.id !== undefined)) {
          const { error } = await supabase
            .from(table)
            .update({
              project_id: projectId,
              name: person.name,
              role: person.role,
              department: person.department,
              status: person.status,
              contact: person.contact,
            })
            .eq("id", person.id);
          if (error) throw error;
        }
        // Insert new personnel
        if (newPersonnel.name && newPersonnel.role) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: projectId,
              name: newPersonnel.name,
              role: newPersonnel.role,
              department: newPersonnel.department || "Unknown",
              status: newPersonnel.status || "On Set",
              contact: newPersonnel.contact || "",
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
              project_id: projectId,
              name: dept.name,
              head_count: dept.headCount,
              lead: dept.lead,
              budget: budgetNum,
              status: dept.status,
            })
            .eq("id", dept.id);
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
              project_id: projectId,
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
              project_id: projectId,
              date: record.date.toISOString().split("T")[0],
              present: record.present,
              absent: record.absent,
              late: record.late,
              total: record.total,
            })
            .eq("id", record.id);
          if (error) throw error;
        }
        // Insert new attendance record
        if (newAttendance.date && newAttendance.present !== undefined) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: projectId,
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
              project_id: projectId,
              category: payment.category,
              amount: amountNum,
              status: payment.status,
              due_date: payment.date.toISOString().split("T")[0],
            })
            .eq("id", payment.id);
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
              project_id: projectId,
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
  const handleDelete = async (section: Section, id: number) => {
    if (
      !window.confirm(
        `Are you sure you want to delete this ${section.slice(0, -1)}?`
      )
    ) {
      return;
    }
    try {
      const table = tableMap[section];
      const { error } = await supabase.from(table).delete().eq("id", id);
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
    } catch (error) {
      console.error(`Delete ${section} error:`, error);
      alert(
        `Failed to delete ${section.slice(0, -1)}. Check console for details.`
      );
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
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.keyPersonnel ? "Cancel Edit" : "Edit Personnel"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.keyPersonnel && handleAdd("keyPersonnel")
                      }
                      disabled={!editMode.keyPersonnel || isSaving}
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
                    </div>
                  )}
                  {keyPersonnel.map((person, idx) => (
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
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDelete("keyPersonnel", person.id!)
                            }
                            disabled={isSaving}
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
                              person.status === "On Set" ? "default" : "outline"
                            }
                            className="text-xs"
                          >
                            {person.status}
                          </Badge>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.keyPersonnel && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("keyPersonnel")}
                      disabled={isSaving}
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
                      disabled={isSaving}
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
                      disabled={!editMode.departments || isSaving}
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
                        value={newDepartment.headCount || ""}
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
                  {departments.map((dept, idx) => (
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
                              disabled={isSaving}
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
                              <p className="font-medium text-sm">{dept.name}</p>
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
                              <p className="text-muted-foreground">Team Size</p>
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
                  ))}
                  {editMode.departments && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("departments")}
                      disabled={isSaving}
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
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.attendance ? "Cancel Edit" : "Edit Attendance"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.attendance && handleAdd("attendance")
                      }
                      disabled={!editMode.attendance || isSaving}
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
                        value={newAttendance.present || ""}
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
                        value={newAttendance.absent || ""}
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
                        value={newAttendance.late || ""}
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
                        value={newAttendance.total || ""}
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
                  {attendance.map((record, idx) => (
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
                              disabled={isSaving}
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
                  ))}
                  {editMode.attendance && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("attendance")}
                      disabled={isSaving}
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
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.payroll ? "Cancel Edit" : "Edit Payroll"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => editMode.payroll && handleAdd("payroll")}
                      disabled={!editMode.payroll || isSaving}
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
                  {payroll.map((payment, idx) => (
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
                            onClick={() => handleDelete("payroll", payment.id!)}
                            disabled={isSaving}
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
                  ))}
                  {editMode.payroll && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("payroll")}
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

export default Team;
