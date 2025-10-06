import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProductionSidebar } from "@/components/ProductionSidebar";
import { DashboardCard } from "@/components/DashboardCard";
import {
  Video,
  Camera,
  Clock,
  AlertTriangle,
  CheckCircle2,
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
interface ShootDay {
  id?: string;
  day: string;
  date: string;
  scenes: string;
  status: string;
  shots: string;
}

interface Daily {
  id?: string;
  scene: string;
  takes: number;
  approved: number;
  review: number;
  retake: number;
  director: string;
}

interface Equipment {
  id?: string;
  item: string;
  unit: string;
  status: string;
  condition: string;
}

type Section = "shootDays" | "dailies" | "equipment" | "currentDay";
type TableName = "schedules" | "dailies" | "equipment";

const tableMap: Record<Section, TableName> = {
  shootDays: "schedules",
  dailies: "dailies",
  equipment: "equipment",
  currentDay: "schedules",
};

const Production = () => {
  console.log("Using Production.tsx version d5e6f7g8_2");

  const [shootDays, setShootDays] = useState<ShootDay[]>([]);
  const [dailies, setDailies] = useState<Daily[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [currentDay, setCurrentDay] = useState<Partial<ShootDay>>({});
  const [editMode, setEditMode] = useState({
    shootDays: false,
    dailies: false,
    equipment: false,
    currentDay: false,
  });
  const [newShootDay, setNewShootDay] = useState<Partial<ShootDay>>({});
  const [newDaily, setNewDaily] = useState<Partial<Daily>>({});
  const [newEquipment, setNewEquipment] = useState<Partial<Equipment>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  // Fetch project data
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedProjectId) {
        console.log("No selectedProjectId, skipping fetch");
        setError("No project selected.");
        setShootDays([]);
        setDailies([]);
        setEquipment([]);
        setCurrentDay({});
        setLoading(false);
        return;
      }
      console.log("Fetching project data for ID:", selectedProjectId);
      setLoading(true);
      setError(null);
      try {
        const currentDate = new Date();
        // Current Shoot Day and Shoot Days History (from schedules)
        const { data: schedules, error: scheduleError } = await supabase
          .from("schedules")
          .select("id, scene_id, status, start_date")
          .eq("project_id", selectedProjectId)
          .order("start_date", { ascending: false });
        if (scheduleError) {
          console.error("Schedules fetch error:", scheduleError);
          if (scheduleError.message.includes("Could not find the table")) {
            setError(
              "The 'schedules' table does not exist in the database. Please create it using the provided SQL in the Supabase SQL Editor."
            );
          } else {
            setError(`Failed to fetch schedules: ${scheduleError.message}`);
          }
          setShootDays([]);
          setCurrentDay({});
        } else {
          console.log("Schedules fetched:", schedules);
          const formattedDays =
            schedules?.length > 0
              ? schedules.map((schedule, idx) => {
                  const dayNum = schedules.length - idx;
                  const date = schedule.start_date
                    ? new Date(schedule.start_date)
                    : new Date(
                        currentDate.setDate(currentDate.getDate() - idx)
                      );
                  const isToday =
                    date.toDateString() === currentDate.toDateString();
                  return {
                    id: schedule.id,
                    day: `Day ${dayNum}`,
                    date: date.toLocaleDateString("en-GB", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }),
                    scenes: schedule.scene_id
                      ? [
                          schedule.scene_id - 2,
                          schedule.scene_id - 1,
                          schedule.scene_id,
                        ].join(", ")
                      : "N/A",
                    status:
                      schedule.status ||
                      (isToday ? "In Progress" : "Completed"),
                    shots: isToday
                      ? "12/24"
                      : `${24 - idx * 6}/${24 - idx * 6}`,
                  };
                })
              : [];
          setShootDays(formattedDays);
          const todaySchedule = schedules?.find(
            (s) =>
              s.start_date &&
              new Date(s.start_date).toDateString() ===
                currentDate.toDateString()
          );
          setCurrentDay(
            todaySchedule
              ? {
                  id: todaySchedule.id,
                  day: `Day ${schedules.length}`,
                  date: new Date(todaySchedule.start_date).toLocaleDateString(
                    "en-GB",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  ),
                  scenes: todaySchedule.scene_id
                    ? [
                        todaySchedule.scene_id - 2,
                        todaySchedule.scene_id - 1,
                        todaySchedule.scene_id,
                      ].join(", ")
                    : "N/A",
                  status: todaySchedule.status || "In Progress",
                  shots: "12/24",
                }
              : formattedDays[0] || {}
          );
        }

        // Dailies Review (from dailies table)
        const { data: dailiesData, error: dailiesError } = await supabase
          .from("dailies")
          .select(
            "id, scene_id, takes, approved, review, retake, director_status"
          )
          .eq("project_id", selectedProjectId)
          .order("scene_id", { ascending: false });
        if (dailiesError) {
          console.error("Dailies fetch error:", dailiesError);
          if (dailiesError.message.includes("Could not find the table")) {
            setError(
              "The 'dailies' table does not exist in the database. Please create it using the provided SQL in the Supabase SQL Editor."
            );
          } else {
            setError(`Failed to fetch dailies: ${dailiesError.message}`);
          }
          setDailies([]);
        } else {
          console.log("Dailies fetched:", dailiesData);
          setDailies(
            dailiesData?.length > 0
              ? dailiesData.map((daily) => ({
                  id: daily.id,
                  scene: `Scene ${daily.scene_id}`,
                  takes: daily.takes || 0,
                  approved: daily.approved || 0,
                  review: daily.review || 0,
                  retake: daily.retake || 0,
                  director: daily.director_status || "Pending",
                }))
              : []
          );
        }

        // Equipment Status (from equipment table)
        const { data: equipmentData, error: equipmentError } = await supabase
          .from("equipment")
          .select("id, name, unit, status, condition")
          .eq("project_id", selectedProjectId);
        if (equipmentError) {
          console.error("Equipment fetch error:", equipmentError);
          if (equipmentError.message.includes("Could not find the table")) {
            setError(
              "The 'equipment' table does not exist in the database. Please create it using the provided SQL in the Supabase SQL Editor."
            );
          } else {
            setError(`Failed to fetch equipment: ${equipmentError.message}`);
          }
          setEquipment([]);
        } else {
          console.log("Equipment fetched:", equipmentData);
          setEquipment(
            equipmentData?.length > 0
              ? equipmentData.map((item) => ({
                  id: item.id,
                  item: item.name || "Unknown",
                  unit: item.unit || "Unknown",
                  status: item.status || "Standby",
                  condition: item.condition || "Good",
                }))
              : []
          );
        }
      } catch (err: any) {
        console.error("Fetch project data error:", err);
        setError(`An unexpected error occurred: ${err.message || err}`);
        setShootDays([]);
        setDailies([]);
        setEquipment([]);
        setCurrentDay({});
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

      if (section === "shootDays" || section === "currentDay") {
        // Update existing shoot days
        for (const day of shootDays.filter((d) => d.id !== undefined)) {
          const sceneIds = day.scenes.split(", ").map(Number);
          const primarySceneId = sceneIds[sceneIds.length - 1] || 0;
          const date =
            day.date && day.date !== "TBD"
              ? new Date(day.date.split(" ").reverse().join("-"))
                  .toISOString()
                  .split("T")[0]
              : null;
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              scene_id: primarySceneId,
              status: day.status,
              start_date: date,
            })
            .eq("id", day.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Update current day
        if (section === "currentDay" && currentDay.id) {
          const sceneIds = currentDay.scenes?.split(", ").map(Number);
          const primarySceneId =
            (sceneIds && sceneIds[sceneIds.length - 1]) || 0;
          const date =
            currentDay.date && currentDay.date !== "TBD"
              ? new Date(currentDay.date.split(" ").reverse().join("-"))
                  .toISOString()
                  .split("T")[0]
              : null;
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              scene_id: primarySceneId,
              status: currentDay.status,
              start_date: date,
            })
            .eq("id", currentDay.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new shoot day
        if (
          section === "shootDays" &&
          newShootDay.day &&
          newShootDay.date &&
          newShootDay.scenes
        ) {
          const sceneIds = newShootDay.scenes.split(", ").map(Number);
          const primarySceneId = sceneIds[sceneIds.length - 1] || 0;
          const date =
            newShootDay.date !== "TBD"
              ? new Date(newShootDay.date.split(" ").reverse().join("-"))
                  .toISOString()
                  .split("T")[0]
              : null;
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              scene_id: primarySceneId,
              status: newShootDay.status || "In Progress",
              start_date: date,
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            const newDay = {
              ...newShootDay,
              id: insertedData.id,
              status: newShootDay.status || "In Progress",
              shots: newShootDay.shots || "0/0",
            } as ShootDay;
            setShootDays([...shootDays, newDay]);
            setNewShootDay({});
            const currentDate = new Date();
            const isToday =
              new Date(
                newDay.date.split(" ").reverse().join("-")
              ).toDateString() === currentDate.toDateString();
            if (isToday) {
              setCurrentDay(newDay);
            }
          }
        }
      } else if (section === "dailies") {
        // Update existing dailies
        for (const daily of dailies.filter((d) => d.id !== undefined)) {
          const sceneId = parseInt(daily.scene.replace("Scene ", ""));
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              scene_id: sceneId,
              takes: daily.takes,
              approved: daily.approved,
              review: daily.review,
              retake: daily.retake,
              director_status: daily.director,
            })
            .eq("id", daily.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new daily
        if (newDaily.scene && newDaily.takes !== undefined) {
          const sceneId = parseInt(newDaily.scene.replace("Scene ", ""));
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              scene_id: sceneId,
              takes: newDaily.takes,
              approved: newDaily.approved || 0,
              review: newDaily.review || 0,
              retake: newDaily.retake || 0,
              director_status: newDaily.director || "Pending",
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setDailies([
              ...dailies,
              {
                ...newDaily,
                id: insertedData.id,
                approved: newDaily.approved || 0,
                review: newDaily.review || 0,
                retake: newDaily.retake || 0,
                director: newDaily.director || "Pending",
              } as Daily,
            ]);
            setNewDaily({});
          }
        }
      } else if (section === "equipment") {
        // Update existing equipment
        for (const item of equipment.filter((e) => e.id !== undefined)) {
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              name: item.item,
              unit: item.unit,
              status: item.status,
              condition: item.condition,
            })
            .eq("id", item.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new equipment
        if (newEquipment.item && newEquipment.unit) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              name: newEquipment.item,
              unit: newEquipment.unit,
              status: newEquipment.status || "Standby",
              condition: newEquipment.condition || "Good",
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setEquipment([
              ...equipment,
              {
                ...newEquipment,
                id: insertedData.id,
                status: newEquipment.status || "Standby",
                condition: newEquipment.condition || "Good",
              } as Equipment,
            ]);
            setNewEquipment({});
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
    if (section === "shootDays") {
      if (!newShootDay.day || !newShootDay.date || !newShootDay.scenes) {
        alert("Please fill in Day, Date, and Scenes fields.");
        return;
      }
      const newDay = {
        ...newShootDay,
        id: undefined,
        status: newShootDay.status || "In Progress",
        shots: newShootDay.shots || "0/0",
      } as ShootDay;
      setShootDays([...shootDays, newDay]);
      setNewShootDay({});
      const currentDate = new Date();
      const isToday =
        new Date(newDay.date.split(" ").reverse().join("-")).toDateString() ===
        currentDate.toDateString();
      if (isToday) {
        setCurrentDay(newDay);
      }
    } else if (section === "dailies") {
      if (!newDaily.scene || newDaily.takes === undefined) {
        alert("Please fill in Scene and Takes fields.");
        return;
      }
      setDailies([
        ...dailies,
        {
          ...newDaily,
          id: undefined,
          approved: newDaily.approved || 0,
          review: newDaily.review || 0,
          retake: newDaily.retake || 0,
          director: newDaily.director || "Pending",
        } as Daily,
      ]);
      setNewDaily({});
    } else if (section === "equipment") {
      if (!newEquipment.item || !newEquipment.unit) {
        alert("Please fill in Item and Unit fields.");
        return;
      }
      setEquipment([
        ...equipment,
        {
          ...newEquipment,
          id: undefined,
          status: newEquipment.status || "Standby",
          condition: newEquipment.condition || "Good",
        } as Equipment,
      ]);
      setNewEquipment({});
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
      if (section === "shootDays") {
        setShootDays(shootDays.filter((d) => d.id !== id));
        if (currentDay.id === id) {
          setCurrentDay(shootDays.find((d) => d.id !== id) || {});
        }
      } else if (section === "dailies") {
        setDailies(dailies.filter((d) => d.id !== id));
      } else if (section === "equipment") {
        setEquipment(equipment.filter((e) => e.id !== id));
      }
      alert(`${section.slice(0, -1)} deleted successfully!`);
    } catch (error: any) {
      console.error(`Delete ${section} error:`, error);
      setError(`Failed to delete ${section.slice(0, -1)}: ${error.message}`);
      alert(`Failed to delete ${section.slice(0, -1)}: ${error.message}`);
    }
  };

  // Cancel edit mode and reset forms
  const handleCancel = (section: Section) => {
    if (section === "shootDays") {
      setNewShootDay({});
    } else if (section === "dailies") {
      setNewDaily({});
    } else if (section === "equipment") {
      setNewEquipment({});
    } else if (section === "currentDay") {
      setCurrentDay(shootDays[0] || {});
    }
    setRefreshKey((prev) => prev + 1);
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
                    Production
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Active shooting, dailies review, on-set management
                  </p>
                </div>
              </div>
            </header>

            <div className="p-6 space-y-6">
              {/* Current Shoot Day */}
              <DashboardCard
                title={`Today's Shoot - ${currentDay.day || "No Current Day"}`}
                icon={Video}
              >
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.currentDay
                          ? handleCancel("currentDay")
                          : setEditMode({ ...editMode, currentDay: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.currentDay ? "Cancel Edit" : "Edit Current Day"}
                    </Button>
                  </div>
                  {Object.keys(currentDay).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No shoot day scheduled for today. Add a shoot day to get
                      started.
                    </p>
                  ) : editMode.currentDay ? (
                    <>
                      <Input
                        placeholder="Day (e.g., Day 46)"
                        value={currentDay.day || ""}
                        onChange={(e) =>
                          setCurrentDay({
                            ...currentDay,
                            day: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <DatePicker
                        selected={
                          currentDay.date
                            ? new Date(
                                currentDay.date.split(" ").reverse().join("-")
                              )
                            : null
                        }
                        onChange={(date: Date) =>
                          setCurrentDay({
                            ...currentDay,
                            date: date
                              ? date.toLocaleDateString("en-GB", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "",
                          })
                        }
                        dateFormat="dd MMM yyyy"
                        placeholderText="Select Date (e.g., 04 Oct 2025)"
                        customInput={
                          <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-2" />
                        }
                      />
                      <Input
                        placeholder="Scenes (e.g., 15, 16, 17)"
                        value={currentDay.scenes || ""}
                        onChange={(e) =>
                          setCurrentDay({
                            ...currentDay,
                            scenes: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Shots (e.g., 12/24)"
                        value={currentDay.shots || ""}
                        onChange={(e) =>
                          setCurrentDay({
                            ...currentDay,
                            shots: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={currentDay.status || "In Progress"}
                        onChange={(e) =>
                          setCurrentDay({
                            ...currentDay,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <Button
                        variant="default"
                        onClick={() => handleSave("currentDay")}
                        disabled={isSaving || isSubmitting}
                        className="mt-3"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Scenes
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {currentDay.scenes || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Shots Progress
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {currentDay.shots || "0/0"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Time Elapsed
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            6h 20m
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Status
                          </p>
                          <Badge variant="default">On Schedule</Badge>
                        </div>
                      </div>
                      <Progress value={50} />
                    </>
                  )}
                </div>
              </DashboardCard>

              {/* Shoot History */}
              <DashboardCard title="Shoot Days History" icon={Camera}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.shootDays
                          ? handleCancel("shootDays")
                          : setEditMode({ ...editMode, shootDays: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.shootDays ? "Cancel Edit" : "Edit Shoot Days"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.shootDays && handleAdd("shootDays")
                      }
                      disabled={!editMode.shootDays || isSaving || isSubmitting}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Shoot Day
                    </Button>
                  </div>
                  {editMode.shootDays && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Day (e.g., Day 46)"
                        value={newShootDay.day || ""}
                        onChange={(e) =>
                          setNewShootDay({
                            ...newShootDay,
                            day: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <DatePicker
                        selected={
                          newShootDay.date
                            ? new Date(
                                newShootDay.date.split(" ").reverse().join("-")
                              )
                            : null
                        }
                        onChange={(date: Date) =>
                          setNewShootDay({
                            ...newShootDay,
                            date: date
                              ? date.toLocaleDateString("en-GB", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "",
                          })
                        }
                        dateFormat="dd MMM yyyy"
                        placeholderText="Select Date (e.g., 04 Oct 2025)"
                        customInput={
                          <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-2" />
                        }
                      />
                      <Input
                        placeholder="Scenes (e.g., 15, 16, 17)"
                        value={newShootDay.scenes || ""}
                        onChange={(e) =>
                          setNewShootDay({
                            ...newShootDay,
                            scenes: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Shots (e.g., 12/24)"
                        value={newShootDay.shots || ""}
                        onChange={(e) =>
                          setNewShootDay({
                            ...newShootDay,
                            shots: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newShootDay.status || "In Progress"}
                        onChange={(e) =>
                          setNewShootDay({
                            ...newShootDay,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  )}
                  {shootDays.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No shoot days scheduled yet. Click "Edit Shoot Days" to
                      add one.
                    </p>
                  ) : (
                    shootDays.map((day, idx) => (
                      <div
                        key={day.id || idx}
                        className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                      >
                        {editMode.shootDays ? (
                          <>
                            <div className="flex-1 space-y-2 mr-2">
                              <Input
                                value={day.day}
                                onChange={(e) => {
                                  const newDays = [...shootDays];
                                  newDays[idx].day = e.target.value;
                                  setShootDays(newDays);
                                }}
                                className="mb-2"
                              />
                              <DatePicker
                                selected={
                                  day.date && day.date !== "TBD"
                                    ? new Date(
                                        day.date.split(" ").reverse().join("-")
                                      )
                                    : null
                                }
                                onChange={(date: Date) => {
                                  const newDays = [...shootDays];
                                  newDays[idx].date = date
                                    ? date.toLocaleDateString("en-GB", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "TBD";
                                  setShootDays(newDays);
                                }}
                                dateFormat="dd MMM yyyy"
                                placeholderText="Select Date (e.g., 04 Oct 2025)"
                                customInput={
                                  <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-2" />
                                }
                              />
                              <Input
                                value={day.scenes}
                                onChange={(e) => {
                                  const newDays = [...shootDays];
                                  newDays[idx].scenes = e.target.value;
                                  setShootDays(newDays);
                                }}
                                className="mb-2"
                              />
                              <Input
                                value={day.shots}
                                onChange={(e) => {
                                  const newDays = [...shootDays];
                                  newDays[idx].shots = e.target.value;
                                  setShootDays(newDays);
                                }}
                                className="mb-2"
                              />
                              <select
                                value={day.status}
                                onChange={(e) => {
                                  const newDays = [...shootDays];
                                  newDays[idx].status = e.target.value;
                                  setShootDays(newDays);
                                }}
                                className="w-full p-2 border border-input rounded-md mb-2"
                              >
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete("shootDays", day.id!)}
                              disabled={isSaving || isSubmitting || !day.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  day.status === "Completed"
                                    ? "bg-primary"
                                    : "bg-secondary"
                                }`}
                              />
                              <div>
                                <p className="font-medium text-sm">
                                  {day.day} - {day.date}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Scenes: {day.scenes}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={
                                  day.status === "Completed"
                                    ? "default"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {day.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {day.shots} shots
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                  {editMode.shootDays && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("shootDays")}
                      disabled={isSaving || isSubmitting}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Dailies Review */}
              <DashboardCard title="Dailies Review" icon={CheckCircle2}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.dailies
                          ? handleCancel("dailies")
                          : setEditMode({ ...editMode, dailies: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.dailies ? "Cancel Edit" : "Edit Dailies"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => editMode.dailies && handleAdd("dailies")}
                      disabled={!editMode.dailies || isSaving || isSubmitting}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Daily
                    </Button>
                  </div>
                  {editMode.dailies && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Scene (e.g., Scene 16)"
                        value={newDaily.scene || ""}
                        onChange={(e) =>
                          setNewDaily({ ...newDaily, scene: e.target.value })
                        }
                        className="mb-2"
                      />
                      <Input
                        type="number"
                        placeholder="Takes"
                        value={
                          newDaily.takes !== undefined ? newDaily.takes : ""
                        }
                        onChange={(e) =>
                          setNewDaily({
                            ...newDaily,
                            takes: parseInt(e.target.value) || 0,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        type="number"
                        placeholder="Approved"
                        value={
                          newDaily.approved !== undefined
                            ? newDaily.approved
                            : ""
                        }
                        onChange={(e) =>
                          setNewDaily({
                            ...newDaily,
                            approved: parseInt(e.target.value) || 0,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        type="number"
                        placeholder="Review"
                        value={
                          newDaily.review !== undefined ? newDaily.review : ""
                        }
                        onChange={(e) =>
                          setNewDaily({
                            ...newDaily,
                            review: parseInt(e.target.value) || 0,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        type="number"
                        placeholder="Retake"
                        value={
                          newDaily.retake !== undefined ? newDaily.retake : ""
                        }
                        onChange={(e) =>
                          setNewDaily({
                            ...newDaily,
                            retake: parseInt(e.target.value) || 0,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newDaily.director || "Pending"}
                        onChange={(e) =>
                          setNewDaily({
                            ...newDaily,
                            director: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                      </select>
                    </div>
                  )}
                  {dailies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No dailies available yet. Click "Edit Dailies" to add one.
                    </p>
                  ) : (
                    dailies.map((daily, idx) => (
                      <div
                        key={daily.id || idx}
                        className="p-3 bg-secondary/20 rounded-lg space-y-2"
                      >
                        {editMode.dailies ? (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <Input
                                value={daily.scene}
                                onChange={(e) => {
                                  const newDailies = [...dailies];
                                  newDailies[idx].scene = e.target.value;
                                  setDailies(newDailies);
                                }}
                                className="flex-1 mr-2"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDelete("dailies", daily.id!)
                                }
                                disabled={isSaving || isSubmitting || !daily.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <Input
                              type="number"
                              value={daily.takes}
                              onChange={(e) => {
                                const newDailies = [...dailies];
                                newDailies[idx].takes =
                                  parseInt(e.target.value) || 0;
                                setDailies(newDailies);
                              }}
                              className="mb-2"
                            />
                            <Input
                              type="number"
                              value={daily.approved}
                              onChange={(e) => {
                                const newDailies = [...dailies];
                                newDailies[idx].approved =
                                  parseInt(e.target.value) || 0;
                                setDailies(newDailies);
                              }}
                              className="mb-2"
                            />
                            <Input
                              type="number"
                              value={daily.review}
                              onChange={(e) => {
                                const newDailies = [...dailies];
                                newDailies[idx].review =
                                  parseInt(e.target.value) || 0;
                                setDailies(newDailies);
                              }}
                              className="mb-2"
                            />
                            <Input
                              type="number"
                              value={daily.retake}
                              onChange={(e) => {
                                const newDailies = [...dailies];
                                newDailies[idx].retake =
                                  parseInt(e.target.value) || 0;
                                setDailies(newDailies);
                              }}
                              className="mb-2"
                            />
                            <select
                              value={daily.director}
                              onChange={(e) => {
                                const newDailies = [...dailies];
                                newDailies[idx].director = e.target.value;
                                setDailies(newDailies);
                              }}
                              className="w-full p-2 border border-input rounded-md mb-2"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Approved">Approved</option>
                            </select>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">
                                {daily.scene}
                              </p>
                              <Badge
                                variant={
                                  daily.director === "Approved"
                                    ? "default"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {daily.director}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">
                                  Total Takes
                                </p>
                                <p className="font-bold">{daily.takes}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Approved
                                </p>
                                <p className="font-bold text-primary">
                                  {daily.approved}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Review</p>
                                <p className="font-bold text-secondary">
                                  {daily.review}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Retake</p>
                                <p className="font-bold text-destructive">
                                  {daily.retake}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                  {editMode.dailies && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("dailies")}
                      disabled={isSaving || isSubmitting}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Equipment Status */}
              <DashboardCard title="Equipment & Crew" icon={AlertTriangle}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.equipment
                          ? handleCancel("equipment")
                          : setEditMode({ ...editMode, equipment: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.equipment ? "Cancel Edit" : "Edit Equipment"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.equipment && handleAdd("equipment")
                      }
                      disabled={!editMode.equipment || isSaving || isSubmitting}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Equipment
                    </Button>
                  </div>
                  {editMode.equipment && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Item (e.g., ARRI Alexa Mini)"
                        value={newEquipment.item || ""}
                        onChange={(e) =>
                          setNewEquipment({
                            ...newEquipment,
                            item: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Unit (e.g., Unit 4)"
                        value={newEquipment.unit || ""}
                        onChange={(e) =>
                          setNewEquipment({
                            ...newEquipment,
                            unit: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newEquipment.status || "Standby"}
                        onChange={(e) =>
                          setNewEquipment({
                            ...newEquipment,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="In Use">In Use</option>
                        <option value="Standby">Standby</option>
                      </select>
                      <select
                        value={newEquipment.condition || "Good"}
                        onChange={(e) =>
                          setNewEquipment({
                            ...newEquipment,
                            condition: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Good">Good</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </div>
                  )}
                  {equipment.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No equipment added yet. Click "Edit Equipment" to add one.
                    </p>
                  ) : (
                    equipment.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                      >
                        {editMode.equipment ? (
                          <>
                            <div className="flex-1 space-y-2 mr-2">
                              <Input
                                value={item.item}
                                onChange={(e) => {
                                  const newEquipment = [...equipment];
                                  newEquipment[idx].item = e.target.value;
                                  setEquipment(newEquipment);
                                }}
                                className="mb-2"
                              />
                              <Input
                                value={item.unit}
                                onChange={(e) => {
                                  const newEquipment = [...equipment];
                                  newEquipment[idx].unit = e.target.value;
                                  setEquipment(newEquipment);
                                }}
                                className="mb-2"
                              />
                              <select
                                value={item.status}
                                onChange={(e) => {
                                  const newEquipment = [...equipment];
                                  newEquipment[idx].status = e.target.value;
                                  setEquipment(newEquipment);
                                }}
                                className="w-full p-2 border border-input rounded-md mb-2"
                              >
                                <option value="In Use">In Use</option>
                                <option value="Standby">Standby</option>
                              </select>
                              <select
                                value={item.condition}
                                onChange={(e) => {
                                  const newEquipment = [...equipment];
                                  newEquipment[idx].condition = e.target.value;
                                  setEquipment(newEquipment);
                                }}
                                className="w-full p-2 border border-input rounded-md mb-2"
                              >
                                <option value="Good">Good</option>
                                <option value="Maintenance">Maintenance</option>
                              </select>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDelete("equipment", item.id!)
                              }
                              disabled={isSaving || isSubmitting || !item.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div>
                              <p className="font-medium text-sm">{item.item}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.unit}
                              </p>
                            </div>
                            <div className="text-right space-y-1">
                              <Badge
                                variant={
                                  item.status === "In Use"
                                    ? "default"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {item.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {item.condition}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                  {editMode.equipment && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("equipment")}
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

export default Production;
