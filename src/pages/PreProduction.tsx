import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProductionSidebar } from "@/components/ProductionSidebar";
import { DashboardCard } from "@/components/DashboardCard";
import {
  FileText,
  Users,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
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
  id?: number;
  version: string;
  date: string;
  status: string;
  author: string;
}

interface CastingProgress {
  id?: number;
  role: string;
  actor: string;
  status: string;
  auditions: number;
}

interface Location {
  id?: number;
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

        // Fetch project ID
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select("id")
          .eq("name", "Pranayam Oru Thudakkam")
          .single();
        if (projectError) {
          console.error("Project fetch error:", projectError);
          return;
        }
        const projectId = project.id;

        // Script Versions (from scripts table)
        const { data: scripts, error: scriptsError } = await supabase
          .from("scripts")
          .select("id, version, date, status, author")
          .eq("project_id", projectId)
          .order("date", { ascending: false });
        if (scriptsError) {
          console.error("Scripts fetch error:", scriptsError);
        } else {
          setScriptVersions(
            scripts.length > 0
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
              : [
                  {
                    version: "v3.2",
                    date: "02 Oct",
                    status: "Final",
                    author: "John Doe",
                  },
                  {
                    version: "v3.1",
                    date: "28 Sep",
                    status: "Draft",
                    author: "Jane Smith",
                  },
                  {
                    version: "v3.0",
                    date: "20 Sep",
                    status: "Review",
                    author: "TBD",
                  },
                ]
          );
        }

        // Casting Progress (from crew table)
        const { data: castingCrew, error: castingCrewError } = await supabase
          .from("crew")
          .select("id, name, role")
          .eq("project_id", projectId)
          .limit(4);
        if (castingCrewError) {
          console.error("Casting fetch error:", castingCrewError);
        } else {
          setCastingProgress(
            castingCrew.map((crew, idx) => {
              const roles = [
                "Lead Hero",
                "Lead Heroine",
                "Antagonist",
                "Supporting Cast",
              ];
              const status =
                idx === 1
                  ? "Completed"
                  : idx === 0
                  ? "In Progress"
                  : idx === 2
                  ? "Review"
                  : "Not Started";
              return {
                id: crew.id,
                role: roles[idx] || crew.role,
                actor:
                  idx === 1 ? crew.name : idx === 2 ? "Shortlisted (3)" : "TBD",
                status,
                auditions: [12, 8, 15, 0][idx],
              };
            })
          );
        }

        // Location Management (from locations table)
        const { data: locationData, error: locationError } = await supabase
          .from("locations")
          .select("id, name, type, cost, status")
          .eq("project_id", projectId)
          .limit(3);
        if (locationError) {
          console.error("Locations fetch error:", locationError);
        } else {
          setLocations(
            locationData.length > 0
              ? locationData.map((location) => ({
                  id: location.id,
                  name: location.name,
                  type: location.type,
                  cost: `₹${(location.cost / 100000).toFixed(0)}L`,
                  status: location.status,
                }))
              : [
                  {
                    name: "Ramoji Film City",
                    type: "Studio",
                    cost: "₹8L",
                    status: "Booked",
                  },
                  {
                    name: "Hyderabad Old City",
                    type: "Outdoor",
                    cost: "₹2L",
                    status: "Recce Done",
                  },
                  {
                    name: "Araku Valley",
                    type: "Outdoor",
                    cost: "₹5L",
                    status: "Pending Approval",
                  },
                ]
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

      if (section === "scriptVersions") {
        // Update existing script versions
        for (const script of scriptVersions.filter((s) => s.id !== undefined)) {
          const date =
            script.date !== "TBD"
              ? new Date(script.date.split(" ").reverse().join("-"))
                  .toISOString()
                  .split("T")[0]
              : null;
          const { error } = await supabase
            .from(table)
            .update({
              project_id: projectId,
              version: script.version,
              date,
              status: script.status,
              author: script.author,
            })
            .eq("id", script.id);
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
              project_id: projectId,
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
              project_id: projectId,
              name: cast.actor.includes("Shortlisted") ? null : cast.actor,
              role: cast.role,
            })
            .eq("id", cast.id);
          if (error) throw error;
        }
        // Insert new casting progress
        if (newCastingProgress.role && newCastingProgress.actor) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: projectId,
              name: newCastingProgress.actor.includes("Shortlisted")
                ? null
                : newCastingProgress.actor,
              role: newCastingProgress.role,
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
              project_id: projectId,
              name: location.name,
              type: location.type,
              cost: costNum,
              status: location.status,
            })
            .eq("id", location.id);
          if (error) throw error;
        }
        // Insert new location
        if (newLocation.name && newLocation.type && newLocation.cost) {
          const costNum =
            parseFloat(newLocation.cost.replace(/[^0-9.]/g, "")) * 100000;
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: projectId,
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
      if (section === "scriptVersions") {
        setScriptVersions(scriptVersions.filter((s) => s.id !== id));
      } else if (section === "castingProgress") {
        setCastingProgress(castingProgress.filter((c) => c.id !== id));
      } else if (section === "locations") {
        setLocations(locations.filter((l) => l.id !== id));
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
    if (section === "scriptVersions") {
      setNewScriptVersion({});
    } else if (section === "castingProgress") {
      setNewCastingProgress({});
    } else if (section === "locations") {
      setNewLocation({});
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
                        placeholder="Version (e.g., v3.3)"
                        value={newScriptVersion.version || ""}
                        onChange={(e) =>
                          setNewScriptVersion({
                            ...newScriptVersion,
                            version: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Date (e.g., 02 Oct)"
                        value={newScriptVersion.date || ""}
                        onChange={(e) =>
                          setNewScriptVersion({
                            ...newScriptVersion,
                            date: e.target.value,
                          })
                        }
                        className="mb-2"
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
                        {scriptVersions[0]?.version || "v3.2"} -{" "}
                        {scriptVersions[0]?.status || "Final"}
                      </p>
                    </div>
                    <Badge variant="default">Approved</Badge>
                  </div>
                  <div className="space-y-2">
                    {scriptVersions.map((script, idx) => (
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
                              <Input
                                value={script.date}
                                onChange={(e) => {
                                  const newScripts = [...scriptVersions];
                                  newScripts[idx].date = e.target.value;
                                  setScriptVersions(newScripts);
                                }}
                                className="mb-2"
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
                              disabled={isSaving || isSubmitting}
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
                                className="text-xs"
                              >
                                {script.status}
                              </Badge>{" "}
                              <p className="text-xs text-muted-foreground mt-1">
                                {script.date}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
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
                        placeholder="Role"
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
                        placeholder="Actor"
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
                  {castingProgress.map((cast, idx) => (
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
                              disabled={isSaving || isSubmitting}
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
                              <p className="font-medium text-sm">{cast.role}</p>
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
                  ))}
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
                        placeholder="Name"
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
                        placeholder="Type"
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
                  {locations.map((location, idx) => (
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
                            disabled={isSaving || isSubmitting}
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
                            <p className="font-bold text-sm">{location.cost}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {location.status}
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
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
