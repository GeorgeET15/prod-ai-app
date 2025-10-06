import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProductionSidebar } from "@/components/ProductionSidebar";
import { DashboardCard } from "@/components/DashboardCard";
import {
  FileText,
  Users,
  MapPin,
  Edit2,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
interface ScriptVersion {
  id?: string;
  version: string;
  date: string;
  status: string;
  author: string;
}

interface CastingProgress {
  id?: string;
  role: string;
  actor: string;
  status: string;
  auditions: number;
}

interface Location {
  id?: string;
  name: string;
  type: string;
  cost: string;
  status: string;
}

type Section = "scriptVersions" | "castingProgress" | "locations";
type TableName = "scripts" | "crew" | "locations";

const tableMap: Record<Section, TableName> = {
  scriptVersions: "scripts",
  castingProgress: "crew",
  locations: "locations",
};

const PreProduction = () => {
  console.log("Using PreProduction.tsx version b1c2d3e4");

  const [scriptVersions, setScriptVersions] = useState<ScriptVersion[]>([]);
  const [castingProgress, setCastingProgress] = useState<CastingProgress[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [editMode, setEditMode] = useState({
    scriptVersions: false,
    castingProgress: false,
    locations: false,
  });
  const [newScriptVersion, setNewScriptVersion] = useState<
    Partial<ScriptVersion>
  >({});
  const [newCastingProgress, setNewCastingProgress] = useState<
    Partial<CastingProgress>
  >({});
  const [newLocation, setNewLocation] = useState<Partial<Location>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch projects and set selectedProjectId
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
        const selectedProject = projectsData?.find(
          (p) => p.name === "Pranayam Oru Thudakkam"
        );
        if (
          storedProjectId &&
          projectsData?.some((p) => p.id === storedProjectId)
        ) {
          setSelectedProjectId(storedProjectId);
        } else if (selectedProject) {
          setSelectedProjectId(selectedProject.id);
          localStorage.setItem("selectedProjectId", selectedProject.id);
        } else if (projectsData?.length > 0) {
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
        setScriptVersions([]);
        setCastingProgress([]);
        setLocations([]);
        setLoading(false);
        return;
      }
      console.log("Fetching project data for ID:", selectedProjectId);
      setLoading(true);
      setError(null);
      try {
        // Script Versions (from scripts table)
        const { data: scripts, error: scriptsError } = await supabase
          .from("scripts")
          .select("id, version, date, status, author")
          .eq("project_id", selectedProjectId)
          .order("date", { ascending: false });
        if (scriptsError) {
          console.error("Scripts fetch error:", scriptsError);
          if (scriptsError.message.includes("Could not find the table")) {
            setError(
              "The 'scripts' table does not exist in the database. Please create it using the provided SQL in the Supabase SQL Editor."
            );
          } else {
            setError(
              `Failed to fetch script versions: ${scriptsError.message}`
            );
          }
          setScriptVersions([]);
        } else {
          console.log("Scripts fetched:", scripts);
          setScriptVersions(
            scripts?.map((script) => ({
              id: script.id,
              version: script.version || "Unknown",
              date: script.date
                ? new Date(script.date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })
                : "TBD",
              status: script.status || "Draft",
              author: script.author || "TBD",
            })) || []
          );
        }

        // Casting Progress (from crew table, filtered by department = 'Casting')
        const { data: castingCrew, error: castingCrewError } = await supabase
          .from("crew")
          .select("id, name, role, status")
          .eq("project_id", selectedProjectId)
          .eq("department", "Casting");
        if (castingCrewError) {
          console.error("Casting fetch error:", castingCrewError);
          if (castingCrewError.message.includes("Could not find the table")) {
            setError(
              "The 'crew' table does not exist in the database. Please create it using the provided SQL in the Supabase SQL Editor."
            );
          } else {
            setError(
              `Failed to fetch casting progress: ${castingCrewError.message}`
            );
          }
          setCastingProgress([]);
        } else {
          console.log("Casting crew fetched:", castingCrew);
          setCastingProgress(
            castingCrew?.map((crew, idx) => ({
              id: crew.id,
              role: crew.role || "Unknown",
              actor:
                crew.name ||
                (crew.status === "Review" ? "Shortlisted (3)" : "TBD"),
              status:
                crew.status ||
                ["In Progress", "Completed", "Review", "Not Started"][idx % 4],
              auditions:
                crew.status === "Completed"
                  ? 8
                  : crew.status === "Review"
                  ? 15
                  : crew.status === "In Progress"
                  ? 12
                  : 0,
            })) || []
          );
        }

        // Location Management (from locations table)
        const { data: locationData, error: locationError } = await supabase
          .from("locations")
          .select("id, name, type, cost, status")
          .eq("project_id", selectedProjectId);
        if (locationError) {
          console.error("Locations fetch error:", locationError);
          if (locationError.message.includes("Could not find the table")) {
            setError(
              "The 'locations' table does not exist in the database. Please create it using the provided SQL in the Supabase SQL Editor."
            );
          } else {
            setError(`Failed to fetch locations: ${locationError.message}`);
          }
          setLocations([]);
        } else {
          console.log("Locations fetched:", locationData);
          setLocations(
            locationData?.map((location) => ({
              id: location.id,
              name: location.name || "Unknown",
              type: location.type || "Unknown",
              cost: `₹${(location.cost / 100000).toFixed(0)}L`,
              status: location.status || "Pending Approval",
            })) || []
          );
        }
      } catch (err: any) {
        console.error("Fetch project data error:", err);
        setError(`An unexpected error occurred: ${err.message || err}`);
        setScriptVersions([]);
        setCastingProgress([]);
        setLocations([]);
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
      alert(`Failed to delete project: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updates to Supabase
  const handleSave = async (section: Section) => {
    if (isSaving || !selectedProjectId) return;
    setIsSaving(true);
    const table = tableMap[section];
    if (!table) {
      setIsSaving(false);
      const errorMsg = `Invalid section: ${section}`;
      console.error(errorMsg);
      setError(errorMsg);
      alert(errorMsg);
      return;
    }
    try {
      console.log(`Saving ${section} for project ID:`, selectedProjectId);

      if (section === "scriptVersions") {
        // Update existing script versions
        for (const script of scriptVersions.filter((s) => s.id !== undefined)) {
          const date =
            script.date && script.date !== "TBD"
              ? new Date(script.date.split(" ").reverse().join("-"))
                  .toISOString()
                  .split("T")[0]
              : null;
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              version: script.version,
              date,
              status: script.status,
              author: script.author,
            })
            .eq("id", script.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new script version
        if (
          newScriptVersion.version &&
          newScriptVersion.date &&
          newScriptVersion.author
        ) {
          const date =
            newScriptVersion.date !== "TBD"
              ? new Date(newScriptVersion.date.split(" ").reverse().join("-"))
                  .toISOString()
                  .split("T")[0]
              : null;
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              version: newScriptVersion.version,
              date,
              status: newScriptVersion.status || "Draft",
              author: newScriptVersion.author,
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setScriptVersions([
              {
                ...newScriptVersion,
                id: insertedData.id,
                status: newScriptVersion.status || "Draft",
                date: newScriptVersion.date || "TBD",
              } as ScriptVersion,
              ...scriptVersions,
            ]);
            setNewScriptVersion({});
          }
        }
      } else if (section === "castingProgress") {
        // Update existing casting progress
        for (const cast of castingProgress.filter((c) => c.id !== undefined)) {
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              name: cast.actor.includes("Shortlisted") ? null : cast.actor,
              role: cast.role,
              status: cast.status,
              department: "Casting",
            })
            .eq("id", cast.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new casting progress
        if (newCastingProgress.role && newCastingProgress.actor) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              name: newCastingProgress.actor.includes("Shortlisted")
                ? null
                : newCastingProgress.actor,
              role: newCastingProgress.role,
              status: newCastingProgress.status || "Not Started",
              department: "Casting",
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setCastingProgress([
              ...castingProgress,
              {
                ...newCastingProgress,
                id: insertedData.id,
                status: newCastingProgress.status || "Not Started",
                auditions: newCastingProgress.auditions || 0,
              } as CastingProgress,
            ]);
            setNewCastingProgress({});
          }
        }
      } else if (section === "locations") {
        // Update existing locations
        for (const location of locations.filter((l) => l.id !== undefined)) {
          const costNum =
            parseFloat(location.cost.replace(/[^0-9.]/g, "")) * 100000;
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              name: location.name,
              type: location.type,
              cost: costNum,
              status: location.status,
            })
            .eq("id", location.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new location
        if (newLocation.name && newLocation.type && newLocation.cost) {
          const costNum =
            parseFloat(newLocation.cost.replace(/[^0-9.]/g, "")) * 100000;
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              name: newLocation.name,
              type: newLocation.type,
              cost: costNum,
              status: newLocation.status || "Pending Approval",
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setLocations([
              ...locations,
              {
                ...newLocation,
                id: insertedData.id,
                status: newLocation.status || "Pending Approval",
                cost: newLocation.cost || "₹0L",
              } as Location,
            ]);
            setNewLocation({});
          }
        }
      }

      console.log(`${section} saved successfully`);
      setRefreshKey((prev) => prev + 1);
      setEditMode({ ...editMode, [section]: false });
      alert("Changes saved successfully!");
    } catch (error: any) {
      console.error(`Save ${section} error:`, error);
      const errorMsg = error.message.includes("Could not find the table")
        ? `The '${table}' table does not exist in the database. Please create it using the provided SQL in the Supabase SQL Editor.`
        : `Failed to save changes for ${section}: ${error.message}`;
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // Add new item to local state
  const handleAdd = (section: Section) => {
    if (section === "scriptVersions") {
      if (
        !newScriptVersion.version ||
        !newScriptVersion.date ||
        !newScriptVersion.author
      ) {
        alert("Please fill in Version, Date, and Author fields.");
        return;
      }
      setScriptVersions([
        {
          ...newScriptVersion,
          id: undefined,
          status: newScriptVersion.status || "Draft",
          date: newScriptVersion.date || "TBD",
        } as ScriptVersion,
        ...scriptVersions,
      ]);
      setNewScriptVersion({});
    } else if (section === "castingProgress") {
      if (!newCastingProgress.role || !newCastingProgress.actor) {
        alert("Please fill in Role and Actor fields.");
        return;
      }
      setCastingProgress([
        ...castingProgress,
        {
          ...newCastingProgress,
          id: undefined,
          status: newCastingProgress.status || "Not Started",
          auditions: newCastingProgress.auditions || 0,
        } as CastingProgress,
      ]);
      setNewCastingProgress({});
    } else if (section === "locations") {
      if (!newLocation.name || !newLocation.type || !newLocation.cost) {
        alert("Please fill in Name, Type, and Cost fields.");
        return;
      }
      setLocations([
        ...locations,
        {
          ...newLocation,
          id: undefined,
          status: newLocation.status || "Pending Approval",
          cost: newLocation.cost || "₹0L",
        } as Location,
      ]);
      setNewLocation({});
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
      if (section === "scriptVersions") {
        setScriptVersions(scriptVersions.filter((s) => s.id !== id));
      } else if (section === "castingProgress") {
        setCastingProgress(castingProgress.filter((c) => c.id !== id));
      } else if (section === "locations") {
        setLocations(locations.filter((l) => l.id !== id));
      }
      alert(`${section.slice(0, -1)} deleted successfully!`);
    } catch (error: any) {
      console.error(`Delete ${section} error:`, error);
      alert(`Failed to delete ${section.slice(0, -1)}: ${error.message}`);
    }
  };

  // Cancel edit mode and reset forms
  const handleCancel = (section: Section) => {
    if (section === "scriptVersions") {
      setNewScriptVersion({});
    } else if (section === "castingProgress") {
      setNewCastingProgress({});
    } else if (section === "locations") {
      setNewLocation({});
    }
    setRefreshKey((prev) => prev + 1); // Re-fetch data
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
                    Pre-Production
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Script development, casting, location scouting
                  </p>
                </div>
              </div>
            </header>

            <div className="p-6 space-y-6">
              {/* Script Management */}
              <DashboardCard title="Script Development" icon={FileText}>
                <div className="space-y-4">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.scriptVersions
                          ? handleCancel("scriptVersions")
                          : setEditMode({ ...editMode, scriptVersions: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.scriptVersions ? "Cancel Edit" : "Edit Scripts"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.scriptVersions && handleAdd("scriptVersions")
                      }
                      disabled={
                        !editMode.scriptVersions || isSaving || isSubmitting
                      }
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Script Version
                    </Button>
                  </div>
                  {editMode.scriptVersions && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Version (e.g., v1.0)"
                        value={newScriptVersion.version || ""}
                        onChange={(e) =>
                          setNewScriptVersion({
                            ...newScriptVersion,
                            version: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <DatePicker
                        selected={
                          newScriptVersion.date
                            ? new Date(
                                newScriptVersion.date
                                  .split(" ")
                                  .reverse()
                                  .join("-")
                              )
                            : null
                        }
                        onChange={(date: Date) =>
                          setNewScriptVersion({
                            ...newScriptVersion,
                            date: date
                              ? date.toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                })
                              : "",
                          })
                        }
                        dateFormat="dd MMM"
                        placeholderText="Select Date (e.g., 02 Oct)"
                        customInput={
                          <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
                        }
                      />
                      <Input
                        placeholder="Author"
                        value={newScriptVersion.author || ""}
                        onChange={(e) =>
                          setNewScriptVersion({
                            ...newScriptVersion,
                            author: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newScriptVersion.status || "Draft"}
                        onChange={(e) =>
                          setNewScriptVersion({
                            ...newScriptVersion,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Review">Review</option>
                        <option value="Final">Final</option>
                      </select>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Current Version
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {scriptVersions[0]?.version || "N/A"} -{" "}
                        {scriptVersions[0]?.status || "Draft"}
                      </p>
                    </div>
                    <Badge variant="default">Approved</Badge>
                  </div>
                  <div className="space-y-2">
                    {scriptVersions.length === 0 ? (
                      <p className="text-muted-foreground">
                        No script versions available.
                      </p>
                    ) : (
                      scriptVersions.map((script, idx) => (
                        <div
                          key={script.id || idx}
                          className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                        >
                          {editMode.scriptVersions ? (
                            <>
                              <div className="flex-1 space-y-2 mr-2">
                                <Input
                                  value={script.version}
                                  onChange={(e) => {
                                    const newScripts = [...scriptVersions];
                                    newScripts[idx].version = e.target.value;
                                    setScriptVersions(newScripts);
                                  }}
                                  className="mb-2"
                                />
                                <DatePicker
                                  selected={
                                    script.date && script.date !== "TBD"
                                      ? new Date(
                                          script.date
                                            .split(" ")
                                            .reverse()
                                            .join("-")
                                        )
                                      : null
                                  }
                                  onChange={(date: Date) => {
                                    const newScripts = [...scriptVersions];
                                    newScripts[idx].date = date
                                      ? date.toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                        })
                                      : "TBD";
                                    setScriptVersions(newScripts);
                                  }}
                                  dateFormat="dd MMM"
                                  placeholderText="Select Date (e.g., 02 Oct)"
                                  customInput={
                                    <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-2" />
                                  }
                                />
                                <Input
                                  value={script.author}
                                  onChange={(e) => {
                                    const newScripts = [...scriptVersions];
                                    newScripts[idx].author = e.target.value;
                                    setScriptVersions(newScripts);
                                  }}
                                  className="mb-2"
                                />
                                <select
                                  value={script.status}
                                  onChange={(e) => {
                                    const newScripts = [...scriptVersions];
                                    newScripts[idx].status = e.target.value;
                                    setScriptVersions(newScripts);
                                  }}
                                  className="w-full p-2 border border-input rounded-md mb-2"
                                >
                                  <option value="Draft">Draft</option>
                                  <option value="Review">Review</option>
                                  <option value="Final">Final</option>
                                </select>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDelete("scriptVersions", script.id!)
                                }
                                disabled={
                                  isSaving || isSubmitting || !script.id
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">
                                    {script.version}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {script.author}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge
                                  variant={
                                    script.status === "Final"
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  <p className="text-xs">{script.status}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {script.date}
                                  </p>
                                </Badge>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  {editMode.scriptVersions && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("scriptVersions")}
                      disabled={isSaving || isSubmitting}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Casting Progress */}
              <DashboardCard title="Casting & Talent" icon={Users}>
                <div className="space-y-4">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.castingProgress
                          ? handleCancel("castingProgress")
                          : setEditMode({ ...editMode, castingProgress: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.castingProgress
                        ? "Cancel Edit"
                        : "Edit Casting"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.castingProgress && handleAdd("castingProgress")
                      }
                      disabled={
                        !editMode.castingProgress || isSaving || isSubmitting
                      }
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Casting
                    </Button>
                  </div>
                  {editMode.castingProgress && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Role (e.g., Lead Hero)"
                        value={newCastingProgress.role || ""}
                        onChange={(e) =>
                          setNewCastingProgress({
                            ...newCastingProgress,
                            role: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Actor (e.g., Actor Name or Shortlisted)"
                        value={newCastingProgress.actor || ""}
                        onChange={(e) =>
                          setNewCastingProgress({
                            ...newCastingProgress,
                            actor: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newCastingProgress.status || "Not Started"}
                        onChange={(e) =>
                          setNewCastingProgress({
                            ...newCastingProgress,
                            status: e.target.value,
                            auditions:
                              e.target.value === "Completed"
                                ? 8
                                : e.target.value === "Review"
                                ? 15
                                : e.target.value === "In Progress"
                                ? 12
                                : 0,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">Review</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <Input
                        type="number"
                        placeholder="Auditions"
                        value={
                          newCastingProgress.auditions !== undefined
                            ? newCastingProgress.auditions
                            : ""
                        }
                        onChange={(e) =>
                          setNewCastingProgress({
                            ...newCastingProgress,
                            auditions: parseInt(e.target.value) || 0,
                          })
                        }
                        className="mb-2"
                      />
                    </div>
                  )}
                  {castingProgress.length === 0 ? (
                    <p className="text-muted-foreground">
                      No casting progress available.
                    </p>
                  ) : (
                    castingProgress.map((cast, idx) => (
                      <div key={cast.id || idx} className="space-y-2">
                        {editMode.castingProgress ? (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <Input
                                value={cast.role}
                                onChange={(e) => {
                                  const newCasting = [...castingProgress];
                                  newCasting[idx].role = e.target.value;
                                  setCastingProgress(newCasting);
                                }}
                                className="flex-1 mr-2"
                              />
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleDelete("castingProgress", cast.id!)
                                }
                                disabled={isSaving || isSubmitting || !cast.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <Input
                              value={cast.actor}
                              onChange={(e) => {
                                const newCasting = [...castingProgress];
                                newCasting[idx].actor = e.target.value;
                                setCastingProgress(newCasting);
                              }}
                              className="mb-2"
                            />
                            <select
                              value={cast.status}
                              onChange={(e) => {
                                const newCasting = [...castingProgress];
                                newCasting[idx].status = e.target.value;
                                newCasting[idx].auditions =
                                  e.target.value === "Completed"
                                    ? 8
                                    : e.target.value === "Review"
                                    ? 15
                                    : e.target.value === "In Progress"
                                    ? 12
                                    : 0;
                                setCastingProgress(newCasting);
                              }}
                              className="w-full p-2 border border-input rounded-md mb-2"
                            >
                              <option value="Not Started">Not Started</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Review">Review</option>
                              <option value="Completed">Completed</option>
                            </select>
                            <Input
                              type="number"
                              value={cast.auditions}
                              onChange={(e) => {
                                const newCasting = [...castingProgress];
                                newCasting[idx].auditions =
                                  parseInt(e.target.value) || 0;
                                setCastingProgress(newCasting);
                              }}
                              className="mb-2"
                            />
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">
                                  {cast.role}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {cast.actor}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  cast.status === "Completed"
                                    ? "default"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {cast.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={
                                  cast.status === "Completed"
                                    ? 100
                                    : cast.status === "Review"
                                    ? 75
                                    : cast.status === "In Progress"
                                    ? 50
                                    : 0
                                }
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {cast.auditions} auditions
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                  {editMode.castingProgress && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("castingProgress")}
                      disabled={isSaving || isSubmitting}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Location Scouting */}
              <DashboardCard title="Location Management" icon={MapPin}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.locations
                          ? handleCancel("locations")
                          : setEditMode({ ...editMode, locations: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.locations ? "Cancel Edit" : "Edit Locations"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.locations && handleAdd("locations")
                      }
                      disabled={!editMode.locations || isSaving || isSubmitting}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </div>
                  {editMode.locations && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Name (e.g., Film Studio)"
                        value={newLocation.name || ""}
                        onChange={(e) =>
                          setNewLocation({
                            ...newLocation,
                            name: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Type (e.g., Studio)"
                        value={newLocation.type || ""}
                        onChange={(e) =>
                          setNewLocation({
                            ...newLocation,
                            type: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Cost (e.g., ₹5L)"
                        value={newLocation.cost || ""}
                        onChange={(e) =>
                          setNewLocation({
                            ...newLocation,
                            cost: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newLocation.status || "Pending Approval"}
                        onChange={(e) =>
                          setNewLocation({
                            ...newLocation,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Pending Approval">
                          Pending Approval
                        </option>
                        <option value="Recce Done">Recce Done</option>
                        <option value="Booked">Booked</option>
                      </select>
                    </div>
                  )}
                  {locations.length === 0 ? (
                    <p className="text-muted-foreground">
                      No locations available.
                    </p>
                  ) : (
                    locations.map((location, idx) => (
                      <div
                        key={location.id || idx}
                        className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                      >
                        {editMode.locations ? (
                          <>
                            <div className="flex-1 space-y-2 mr-2">
                              <Input
                                value={location.name}
                                onChange={(e) => {
                                  const newLocations = [...locations];
                                  newLocations[idx].name = e.target.value;
                                  setLocations(newLocations);
                                }}
                                className="mb-2"
                              />
                              <Input
                                value={location.type}
                                onChange={(e) => {
                                  const newLocations = [...locations];
                                  newLocations[idx].type = e.target.value;
                                  setLocations(newLocations);
                                }}
                                className="mb-2"
                              />
                              <Input
                                value={location.cost}
                                onChange={(e) => {
                                  const newLocations = [...locations];
                                  newLocations[idx].cost = e.target.value;
                                  setLocations(newLocations);
                                }}
                                className="mb-2"
                              />
                              <select
                                value={location.status}
                                onChange={(e) => {
                                  const newLocations = [...locations];
                                  newLocations[idx].status = e.target.value;
                                  setLocations(newLocations);
                                }}
                                className="w-full p-2 border border-input rounded-md mb-2"
                              >
                                <option value="Pending Approval">
                                  Pending Approval
                                </option>
                                <option value="Recce Done">Recce Done</option>
                                <option value="Booked">Booked</option>
                              </select>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDelete("locations", location.id!)
                              }
                              disabled={
                                isSaving || isSubmitting || !location.id
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-primary" />
                              <div>
                                <p className="font-medium text-sm">
                                  {location.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {location.type}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">
                                {location.cost}
                              </p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {location.status}
                              </Badge>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                  {editMode.locations && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("locations")}
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

export default PreProduction;
