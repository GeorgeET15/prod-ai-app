import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProductionSidebar } from "@/components/ProductionSidebar";
import { StatCard } from "@/components/StatCard";
import { BudgetChart } from "@/components/BudgetChart";
import { TimelineWidget } from "@/components/TimelineWidget";
import { TeamWidget } from "@/components/TeamWidget";
import { TasksWidget } from "@/components/TasksWidget"; // Import the new TasksWidget
import RiskAlertGenerator from "@/components/RiskAlertGenerator";
import { AIChatBox } from "@/components/AIChatBox";
import { SimulationDialog } from "@/components/SimulationDialog";
import {
  DollarSign,
  Clock,
  Users,
  Film,
  FileText,
  Download,
  Upload,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import UploadDialog from "@/components/UploadDialog";

// Define interfaces for type safety

interface ProjectListItem {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  total_budget: number;
  days_in_production: number;
  team_members: number;
  scenes_completed: number;
  total_scenes: number;
  start_date: string;
  end_date: string;
}

interface ProjectStats {
  totalBudget: number;
  daysInProduction: number;
  teamMembers: number;
  scenesCompleted: number;
  totalScenes: number;
}

interface HealthScore {
  overall: number;
  budgetCompliance: number;
  scheduleAdherence: number;
  crewEfficiency: number;
  qualityScore: number;
}

interface ScriptVersion {
  id: string;
  version: string;
  date: string;
  status: string;
  author: string;
}

interface CastingProgress {
  id: string;
  role: string;
  actor: string;
  status: string;
}

interface Location {
  id: string;
  name: string;
  type: string;
  cost: number; // Changed to number for calculations
  status: string;
}

interface Budget {
  id: string;
  department: string;
  allocated: number;
  spent: number;
}

interface Schedule {
  id: string;
  date: string;
  scene: string;
  location: string;
  status: string;
}

interface Invoice {
  id: string;
  vendor: string;
  amount: number; // Changed to number for calculations
  date: string;
  status: string;
}

interface Attendance {
  id: string;
  crew: string;
  date: string;
  status: string;
}

interface Deliverable {
  id: string;
  name: string;
  type: string;
  status: string;
  dueDate: string;
}

const Index = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [stats, setStats] = useState<ProjectStats>({
    totalBudget: 0,
    daysInProduction: 0,
    teamMembers: 0,
    scenesCompleted: 0,
    totalScenes: 0,
  });
  const [healthScore, setHealthScore] = useState<HealthScore>({
    overall: 0,
    budgetCompliance: 0,
    scheduleAdherence: 0,
    crewEfficiency: 0,
    qualityScore: 0,
  });
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    localStorage.getItem("selectedProjectId") || ""
  );
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<{
    projectName: string;
    startDate: string;
    endDate: string;
    scripts: ScriptVersion[];
    casting: CastingProgress[];
    locations: Location[];
    budgets: Budget[];
    schedules: Schedule[];
    invoices: Invoice[];
    attendance: Attendance[];
    deliverables: Deliverable[];
  }>({
    projectName: "",
    startDate: "",
    endDate: "",
    scripts: [],
    casting: [],
    locations: [],
    budgets: [],
    schedules: [],
    invoices: [],
    attendance: [],
    deliverables: [],
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("User fetch error:", error);
          return;
        }
      } catch (err) {
        console.error("Unexpected user fetch error:", err);
      }
    };

    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name");

        if (error) {
          console.error("Projects fetch error:", error);
          alert("Failed to fetch projects.");
          return;
        }

        setProjects((data as ProjectListItem[]) || []);

        if (data?.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
          localStorage.setItem("selectedProjectId", data[0].id);
        }
      } catch (err) {
        console.error("Unexpected projects fetch error:", err);
        alert("An unexpected error occurred while fetching projects.");
      }
    };

    fetchUser();
    fetchProjects();
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedProjectId", selectedProjectId);
    if (!selectedProjectId) {
      console.warn("No project ID selected");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch project details
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select(
            "total_budget, days_in_production, team_members, scenes_completed, total_scenes, name, start_date, end_date"
          )
          .eq("id", selectedProjectId)
          .single();
        if (projectError) {
          console.error("Project fetch error:", projectError);
          alert("Failed to fetch project data.");
          return;
        }
        if (!project) {
          console.warn("No project found for ID:", selectedProjectId);
          alert("No project found for the selected ID.");
          return;
        }
        setStats({
          totalBudget: project.total_budget || 0,
          daysInProduction: project.days_in_production || 0,
          teamMembers: project.team_members || 0,
          scenesCompleted: project.scenes_completed || 0,
          totalScenes: project.total_scenes || 0,
        });

        // Calculate health scores
        const scheduleAdherence =
          (project.scenes_completed / (project.total_scenes || 1)) * 100;
        const { data: budgets, error: budgetError } = await supabase
          .from("budgets")
          .select("id, department, spent, allocated")
          .eq("project_id", selectedProjectId);
        if (budgetError) {
          console.error("Budgets fetch error:", budgetError);
          alert("Failed to fetch budgets.");
        }
        const totalSpent = budgets?.reduce((sum, b) => sum + b.spent, 0) || 0;
        const totalAllocated =
          budgets?.reduce((sum, b) => sum + b.allocated, 0) ||
          project.total_budget ||
          0;
        const budgetCompliance =
          totalAllocated > 0
            ? ((totalAllocated - totalSpent) / totalAllocated) * 100
            : 0;

        const { data: attendance, error: attendanceError } = await supabase
          .from("attendance")
          .select("status")
          .eq("project_id", selectedProjectId);
        if (attendanceError) {
          console.error("Attendance fetch error:", attendanceError);
          alert("Failed to fetch attendance.");
        }
        const crewEfficiency =
          attendance?.length > 0
            ? (attendance.filter((a) => a.status === "Present").length /
                attendance.length) *
              100
            : 0;

        const { data: deliverables, error: deliverablesError } = await supabase
          .from("deliverables")
          .select("status")
          .eq("project_id", selectedProjectId);
        if (deliverablesError) {
          console.error("Deliverables fetch error:", deliverablesError);
          alert("Failed to fetch deliverables.");
        }
        const qualityScore =
          deliverables?.length > 0
            ? (deliverables.filter((d) => d.status === "Completed").length /
                deliverables.length) *
              100
            : 0;

        setHealthScore({
          overall: Math.round(
            (scheduleAdherence +
              budgetCompliance +
              crewEfficiency +
              qualityScore) /
              4
          ),
          budgetCompliance: Math.round(budgetCompliance),
          scheduleAdherence: Math.round(scheduleAdherence),
          crewEfficiency: Math.round(crewEfficiency),
          qualityScore: Math.round(qualityScore),
        });

        // Fetch remaining data for report
        const { data: scripts, error: scriptsError } = await supabase
          .from("scripts")
          .select("id, version, date, status, author")
          .eq("project_id", selectedProjectId)
          .order("date", { ascending: false });
        if (scriptsError) {
          console.error("Scripts fetch error:", scriptsError);
          alert("Failed to fetch scripts.");
        }

        const { data: castingCrew, error: castingCrewError } = await supabase
          .from("crew")
          .select("id, name, role, status")
          .eq("project_id", selectedProjectId);
        if (castingCrewError) {
          console.error("Casting fetch error:", castingCrewError);
          alert("Failed to fetch crew data.");
        }

        const { data: locations, error: locationsError } = await supabase
          .from("locations")
          .select("id, name, type, cost, status")
          .eq("project_id", selectedProjectId);
        if (locationsError) {
          console.error("Locations fetch error:", locationsError);
          alert("Failed to fetch locations.");
        }

        const { data: schedules, error: schedulesError } = await supabase
          .from("schedules")
          .select("id, start_date, scene_id, status, description")
          .eq("project_id", selectedProjectId)
          .order("start_date", { ascending: true });
        if (schedulesError) {
          console.error("Schedules fetch error:", schedulesError);
          alert("Failed to fetch schedules.");
        }

        const { data: invoices, error: invoicesError } = await supabase
          .from("invoices")
          .select("id, vendor, amount, date_issued, status")
          .eq("project_id", selectedProjectId);
        if (invoicesError) {
          console.error("Invoices fetch error:", invoicesError);
          alert("Failed to fetch invoices.");
        }

        const { data: attendanceRecords, error: attendanceRecordsError } =
          await supabase
            .from("attendance")
            .select("id, crew_id, date, status, crew(name)")
            .eq("project_id", selectedProjectId);

        if (attendanceRecordsError) {
          console.error("Attendance fetch error:", attendanceRecordsError);
          alert("Failed to fetch attendance.");
        }

        const { data: deliverablesRecords, error: deliverablesRecordsError } =
          await supabase
            .from("deliverables")
            .select("id, name, type, status, due_date")
            .eq("project_id", selectedProjectId);
        if (deliverablesRecordsError) {
          console.error("Deliverables fetch error:", deliverablesRecordsError);
          alert("Failed to fetch deliverables.");
        }

        setReportData({
          projectName: project.name || "Unnamed Project",
          startDate: project.start_date
            ? new Date(project.start_date).toLocaleDateString("en-GB")
            : "N/A",
          endDate: project.end_date
            ? new Date(project.end_date).toLocaleDateString("en-GB")
            : "N/A",
          scripts: scripts?.length
            ? scripts.map((script) => ({
                id: script.id,
                version: script.version,
                date: new Date(script.date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                }),
                status: script.status,
                author: script.author,
              }))
            : [],
          casting: castingCrew?.length
            ? castingCrew.map((crew) => ({
                id: crew.id,
                role: crew.role,
                actor: crew.name,
                status: crew.status || "Not Started",
              }))
            : [],
          locations: locations?.length
            ? locations.map((location) => ({
                id: location.id,
                name: location.name,
                type: location.type,
                cost: location.cost, // Store as number
                status: location.status,
              }))
            : [],
          budgets: budgets?.length
            ? budgets.map((budget) => ({
                id: budget.id,
                department: budget.department,
                allocated: budget.allocated,
                spent: budget.spent,
              }))
            : [],
          schedules: schedules?.length
            ? schedules.map((schedule) => ({
                id: schedule.id,
                date: new Date(schedule.start_date).toLocaleDateString("en-GB"),
                scene: `Scene ${schedule.scene_id}`,
                location: schedule.description || "N/A",
                status: schedule.status,
              }))
            : [],
          invoices: invoices?.length
            ? invoices.map((invoice) => ({
                id: invoice.id,
                vendor: invoice.vendor,
                amount: invoice.amount, // Store as number
                date: new Date(invoice.date_issued).toLocaleDateString("en-GB"),
                status: invoice.status,
              }))
            : [],
          attendance: attendanceRecords?.length
            ? attendanceRecords.map((record) => ({
                id: record.id,
                crew: "Unknown",
                date: new Date(record.date).toLocaleDateString("en-GB"),
                status: record.status,
              }))
            : [],
          deliverables: deliverablesRecords?.length
            ? deliverablesRecords.map((deliverable) => ({
                id: deliverable.id,
                name: deliverable.name,
                type: deliverable.type,
                status: deliverable.status,
                dueDate: new Date(deliverable.due_date).toLocaleDateString(
                  "en-GB"
                ),
              }))
            : [],
        });
      } catch (err) {
        console.error("Unexpected data fetch error:", err);
        alert("An unexpected error occurred while fetching data.");
      }
    };

    fetchData();
  }, [selectedProjectId]);

  const handleDeleteProject = async () => {
    try {
      setIsSubmitting(true);
      if (!selectedProjectId) {
        alert("No project selected to delete.");
        return;
      }

      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", selectedProjectId);

      if (error) {
        console.error("Error deleting project:", error);
        alert("Failed to delete project.");
        return;
      }

      setProjects((prev) => prev.filter((p) => p.id !== selectedProjectId));
      const newProjectId =
        projects.length > 1
          ? projects.find((p) => p.id !== selectedProjectId)?.id || ""
          : "";
      setSelectedProjectId(newProjectId);
      localStorage.setItem("selectedProjectId", newProjectId);
    } catch (err) {
      console.error("Unexpected error deleting project:", err);
      alert("An unexpected error occurred while deleting project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReports = () => {
    setReportOpen(true);
  };

  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      doc.setFontSize(20);
      doc.text(
        `${reportData.projectName} - Comprehensive Project Report`,
        margin,
        20
      );
      doc.setFontSize(12);
      doc.text(
        `Generated on: ${new Date().toLocaleDateString(
          "en-GB"
        )} at ${new Date().toLocaleTimeString("en-GB")}`,
        margin,
        30
      );

      doc.setFontSize(16);
      doc.text("Project Overview", margin, 50);
      autoTable(doc, {
        startY: 60,
        head: [["Field", "Value"]],
        body: [
          ["Project Name", reportData.projectName],
          ["Start Date", reportData.startDate],
          ["End Date", reportData.endDate],
          ["Total Budget", `₹${(stats.totalBudget / 10000000).toFixed(2)} Cr`],
          ["Days in Production", stats.daysInProduction.toString()],
          ["Team Members", stats.teamMembers.toString()],
          ["Scenes Completed", `${stats.scenesCompleted}/${stats.totalScenes}`],
        ],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      let finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(16);
      doc.text("Health Scores", margin, finalY);
      autoTable(doc, {
        startY: finalY + 10,
        head: [["Metric", "Score"]],
        body: [
          ["Overall Health", `${healthScore.overall}/100`],
          ["Budget Compliance", `${healthScore.budgetCompliance}%`],
          ["Schedule Adherence", `${healthScore.scheduleAdherence}%`],
          ["Crew Efficiency", `${healthScore.crewEfficiency}%`],
          ["Quality Score", `${healthScore.qualityScore}%`],
        ],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(16);
      doc.text("Script Development", margin, finalY);
      autoTable(doc, {
        startY: finalY + 10,
        head: [["Version", "Date", "Status", "Author"]],
        body: reportData.scripts.length
          ? reportData.scripts.map((script) => [
              script.version,
              script.date,
              script.status,
              script.author,
            ])
          : [["No scripts available", "", "", ""]],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(16);
      doc.text("Casting Progress", margin, finalY);
      autoTable(doc, {
        startY: finalY + 10,
        head: [["Role", "Actor", "Status"]],
        body: reportData.casting.length
          ? reportData.casting.map((cast) => [
              cast.role,
              cast.actor,
              cast.status,
            ])
          : [["No casting data available", "", ""]],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(16);
      doc.text("Location Management", margin, finalY);
      autoTable(doc, {
        startY: finalY + 10,
        head: [["Name", "Type", "Cost (₹)", "Status"]],
        body: reportData.locations.length
          ? reportData.locations.map((location) => [
              location.name,
              location.type,
              `${(location.cost / 100000).toFixed(2)}L`,
              location.status,
            ])
          : [["No locations available", "", "", ""]],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(16);
      doc.text("Budget Breakdown", margin, finalY);
      autoTable(doc, {
        startY: finalY + 10,
        head: [["Department", "Allocated (₹)", "Spent (₹)", "Remaining (₹)"]],
        body: reportData.budgets.length
          ? reportData.budgets.map((budget) => [
              budget.department,
              `${(budget.allocated / 100000).toFixed(2)}L`,
              `${(budget.spent / 100000).toFixed(2)}L`,
              `${((budget.allocated - budget.spent) / 100000).toFixed(2)}L`,
            ])
          : [["No budgets available", "", "", ""]],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(16);
      doc.text("Schedule Summary", margin, finalY);
      autoTable(doc, {
        startY: finalY + 10,
        head: [["Date", "Scene", "Location", "Status"]],
        body: reportData.schedules.length
          ? reportData.schedules.map((schedule) => [
              schedule.date,
              schedule.scene,
              schedule.location,
              schedule.status,
            ])
          : [["No schedules available", "", "", ""]],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(16);
      doc.text("Invoices", margin, finalY);
      autoTable(doc, {
        startY: finalY + 10,
        head: [["Vendor", "Amount (₹)", "Date Issued", "Status"]],
        body: reportData.invoices.length
          ? reportData.invoices.map((invoice) => [
              invoice.vendor,
              `${(invoice.amount / 100000).toFixed(2)}L`,
              invoice.date,
              invoice.status,
            ])
          : [["No invoices available", "", "", ""]],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(16);
      doc.text("Attendance Records", margin, finalY);
      autoTable(doc, {
        startY: finalY + 10,
        head: [["Crew", "Date", "Status"]],
        body: reportData.attendance.length
          ? reportData.attendance.map((record) => [
              record.crew,
              record.date,
              record.status,
            ])
          : [["No attendance records available", "", ""]],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(16);
      doc.text("Deliverables", margin, finalY);
      autoTable(doc, {
        startY: finalY + 10,
        head: [["Name", "Type", "Status", "Due Date"]],
        body: reportData.deliverables.length
          ? reportData.deliverables.map((deliverable) => [
              deliverable.name,
              deliverable.type,
              deliverable.status,
              deliverable.dueDate,
            ])
          : [["No deliverables available", "", "", ""]],
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin - 30,
          pageHeight - 10
        );
      }

      doc.save(`${reportData.projectName.replace(/\s+/g, "_")}_report.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Check console for details.");
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ProductionSidebar
          selectedProjectId={selectedProjectId}
          projects={projects}
          onDeleteProject={handleDeleteProject}
          isSubmitting={isSubmitting}
        />
        <main className="flex-1">
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Production Command Center
                  </h1>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="project-select"
                      className="text-sm text-muted-foreground"
                    >
                      Project:
                    </label>
                    <select
                      id="project-select"
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="bg-transparent border border-input rounded p-1 text-sm text-foreground"
                    >
                      {projects.length === 0 ? (
                        <option value="">No projects available</option>
                      ) : (
                        projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-32 text-xs"
                  onClick={handleViewReports}
                  disabled={projects.length === 0}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-32 text-xs"
                  onClick={() => setUploadOpen(true)} // Open UploadDialog
                  disabled={projects.length === 0}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Data
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="w-32 text-xs"
                  onClick={handleExportPDF}
                  disabled={projects.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </header>

          {projects.length === 0 ? (
            <div className="p-6">
              <div className="bg-card rounded-lg shadow-lg p-6 border border-border text-center">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  No Projects Available
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  No projects found. Please create a project to view data.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
              <Card className="bg-card border-border rounded-lg shadow-sm">
                <CardHeader className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    AI Risk Alerts
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    Real-time monitoring active
                  </span>
                </CardHeader>
                <CardContent>
                  <RiskAlertGenerator />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Budget"
                  value={`₹${(stats.totalBudget / 10000000).toFixed(2)} Cr`}
                  icon={DollarSign}
                  trend="+5% from last week"
                  trendUp={false}
                />
                <StatCard
                  title="Days in Production"
                  value={stats.daysInProduction.toString()}
                  icon={Clock}
                  trend="15 days remaining"
                  trendUp={false}
                />
                <StatCard
                  title="Team Members"
                  value={stats.teamMembers.toString()}
                  icon={Users}
                  trend="+8 this month"
                  trendUp={true}
                />
                <StatCard
                  title="Scenes Completed"
                  value={`${stats.scenesCompleted}/${stats.totalScenes}`}
                  icon={Film}
                  trend={`${Math.round(
                    (stats.scenesCompleted / (stats.totalScenes || 1)) * 100
                  )}% complete`}
                  trendUp={true}
                />
              </div>

              <BudgetChart />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TimelineWidget />
                <TeamWidget />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TasksWidget /> {/* Add TasksWidget */}
                <AIChatBox projectId="413a2d98-63e8-4bd2-8543-5d69ebd9fe06" />
                <div className="bg-gradient-primary rounded-lg p-6 text-primary-foreground">
                  <h3 className="text-xl font-bold mb-4">
                    Production Health Score
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Overall Health</span>
                        <span className="text-sm font-bold">
                          {healthScore.overall}/100
                        </span>
                      </div>
                      <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full"
                          style={{ width: `${healthScore.overall}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="opacity-90">Budget Compliance</span>
                        <span className="font-medium">
                          {healthScore.budgetCompliance}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="opacity-90">Schedule Adherence</span>
                        <span className="font-medium">
                          {healthScore.scheduleAdherence}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="opacity-90">Crew Efficiency</span>
                        <span className="font-medium">
                          {healthScore.crewEfficiency}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="opacity-90">Quality Score</span>
                        <span className="font-medium">
                          {healthScore.qualityScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <SimulationDialog
                open={simulationOpen}
                onOpenChange={setSimulationOpen}
              />

              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Comprehensive Project Report - {reportData.projectName}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Project Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Project Name
                            </span>
                            <span className="text-sm font-medium">
                              {reportData.projectName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Start Date
                            </span>
                            <span className="text-sm font-medium">
                              {reportData.startDate}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              End Date
                            </span>
                            <span className="text-sm font-medium">
                              {reportData.endDate}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Total Budget
                            </span>
                            <span className="text-sm font-medium">
                              ₹{(stats.totalBudget / 10000000).toFixed(2)} Cr
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Days in Production
                            </span>
                            <span className="text-sm font-medium">
                              {stats.daysInProduction}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Team Members
                            </span>
                            <span className="text-sm font-medium">
                              {stats.teamMembers}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Scenes Completed
                            </span>
                            <span className="text-sm font-medium">
                              {stats.scenesCompleted}/{stats.totalScenes}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">Health Scores</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Overall Health
                            </span>
                            <span className="text-sm font-medium">
                              {healthScore.overall}/100
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Budget Compliance
                            </span>
                            <span className="text-sm font-medium">
                              {healthScore.budgetCompliance}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Schedule Adherence
                            </span>
                            <span className="text-sm font-medium">
                              {healthScore.scheduleAdherence}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Crew Efficiency
                            </span>
                            <span className="text-sm font-medium">
                              {healthScore.crewEfficiency}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Quality Score
                            </span>
                            <span className="text-sm font-medium">
                              {healthScore.qualityScore}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Script Development
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {reportData.scripts.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No scripts available
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {reportData.scripts.map((script) => (
                              <div
                                key={script.id}
                                className="flex justify-between"
                              >
                                <span className="text-sm text-muted-foreground">
                                  {script.version} ({script.author})
                                </span>
                                <span className="text-sm font-medium">
                                  {script.status} - {script.date}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Casting Progress
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {reportData.casting.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No casting data available
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {reportData.casting.map((cast) => (
                              <div
                                key={cast.id}
                                className="flex justify-between"
                              >
                                <span className="text-sm text-muted-foreground">
                                  {cast.role} ({cast.actor})
                                </span>
                                <span className="text-sm font-medium">
                                  {cast.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Location Management
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {reportData.locations.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No locations available
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {reportData.locations.map((location) => (
                              <div
                                key={location.id}
                                className="flex justify-between"
                              >
                                <span className="text-sm text-muted-foreground">
                                  {location.name} ({location.type})
                                </span>
                                <span className="text-sm font-medium">
                                  ₹{(location.cost / 100000).toFixed(2)}L -{" "}
                                  {location.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Budget Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {reportData.budgets.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No budgets available
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {reportData.budgets.map((budget) => (
                              <div
                                key={budget.id}
                                className="flex justify-between"
                              >
                                <span className="text-sm text-muted-foreground">
                                  {budget.department}
                                </span>
                                <span className="text-sm font-medium">
                                  Allocated: ₹
                                  {(budget.allocated / 100000).toFixed(2)}L,
                                  Spent: ₹{(budget.spent / 100000).toFixed(2)}L
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Schedule Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {reportData.schedules.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No schedules available
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {reportData.schedules.map((schedule) => (
                              <div
                                key={schedule.id}
                                className="flex justify-between"
                              >
                                <span className="text-sm text-muted-foreground">
                                  {schedule.scene} ({schedule.location})
                                </span>
                                <span className="text-sm font-medium">
                                  {schedule.date} - {schedule.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">Invoices</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {reportData.invoices.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No invoices available
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {reportData.invoices.map((invoice) => (
                              <div
                                key={invoice.id}
                                className="flex justify-between"
                              >
                                <span className="text-sm text-muted-foreground">
                                  {invoice.vendor}
                                </span>
                                <span className="text-sm font-medium">
                                  ₹{(invoice.amount / 100000).toFixed(2)}L -{" "}
                                  {invoice.status} ({invoice.date})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Attendance Records
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {reportData.attendance.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No attendance records available
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {reportData.attendance.map((record) => (
                              <div
                                key={record.id}
                                className="flex justify-between"
                              >
                                <span className="text-sm text-muted-foreground">
                                  {record.crew}
                                </span>
                                <span className="text-sm font-medium">
                                  {record.status} - {record.date}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="text-lg">Deliverables</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {reportData.deliverables.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No deliverables available
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {reportData.deliverables.map((deliverable) => (
                              <div
                                key={deliverable.id}
                                className="flex justify-between"
                              >
                                <span className="text-sm text-muted-foreground">
                                  {deliverable.name} ({deliverable.type})
                                </span>
                                <span className="text-sm font-medium">
                                  {deliverable.status} - Due:{" "}
                                  {deliverable.dueDate}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setReportOpen(false)}
                    >
                      Close
                    </Button>
                    <Button variant="default" onClick={handleExportPDF}>
                      <Download className="h-4 w-4 mr-2" />
                      Export as PDF
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
