import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProductionSidebar } from "@/components/ProductionSidebar";
import { DashboardCard } from "@/components/DashboardCard";
import {
  Film,
  Scissors,
  Music,
  Sparkles,
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
interface EditingProgress {
  id?: string; // Changed to string to match uuid
  phase: string;
  progress: number;
  status: string;
  start_date: string | null;
}

interface VfxShot {
  id?: string; // Changed to string to match uuid
  shot: string;
  scene: number | string;
  description: string;
  status: string;
  artist: string;
  progress: number;
}

interface AudioTrack {
  id?: string; // Changed to string to match uuid
  track: string;
  status: string;
  engineer: string;
  duration: string;
}

interface Deliverable {
  id?: string; // Changed to string to match uuid
  name: string;
  status: string;
}

type Section = "editingProgress" | "vfxShots" | "audioTracks" | "deliverables";
type TableName = "schedules" | "crew" | "deliverables";

const tableMap: Record<Section, TableName> = {
  editingProgress: "schedules",
  vfxShots: "schedules",
  audioTracks: "crew",
  deliverables: "deliverables",
};

const PostProduction = () => {
  console.log("Using PostProduction.tsx version a1b2c3d4e5");

  const [editingProgress, setEditingProgress] = useState<EditingProgress[]>([]);
  const [vfxShots, setVfxShots] = useState<VfxShot[]>([]);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [editMode, setEditMode] = useState({
    editingProgress: false,
    vfxShots: false,
    audioTracks: false,
    deliverables: false,
  });
  const [newEditingProgress, setNewEditingProgress] = useState<
    Partial<EditingProgress>
  >({});
  const [newVfxShot, setNewVfxShot] = useState<Partial<VfxShot>>({});
  const [newAudioTrack, setNewAudioTrack] = useState<Partial<AudioTrack>>({});
  const [newDeliverable, setNewDeliverable] = useState<Partial<Deliverable>>(
    {}
  );
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
        setEditingProgress([]);
        setVfxShots([]);
        setAudioTracks([]);
        setDeliverables([]);
        setLoading(false);
        return;
      }
      console.log("Fetching project data for ID:", selectedProjectId);
      setLoading(true);
      setError(null);
      try {
        // Editing Progress (from schedules table)
        const { data: schedules, error: scheduleError } = await supabase
          .from("schedules")
          .select("id, description, progress, status, start_date")
          .eq("project_id", selectedProjectId)
          .ilike("description", "%Cut%"); // Simplified filter
        if (scheduleError) {
          console.error("Editing fetch error:", scheduleError);
          setError(
            `Failed to fetch editing progress: ${scheduleError.message}`
          );
          setEditingProgress([]);
        } else {
          console.log("Editing schedules fetched:", schedules);
          setEditingProgress(
            schedules?.length > 0
              ? schedules.map((schedule) => ({
                  id: schedule.id,
                  phase: schedule.description || "Unknown",
                  progress: schedule.progress || 0,
                  status: schedule.status || "Not Started",
                  start_date: schedule.start_date
                    ? new Date(schedule.start_date).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "short",
                        }
                      )
                    : "TBD",
                }))
              : [
                  {
                    phase: "Rough Cut",
                    progress: 100,
                    status: "Completed",
                    start_date: "15 Sep",
                  },
                  {
                    phase: "Fine Cut",
                    progress: 85,
                    status: "In Progress",
                    start_date: "10 Oct",
                  },
                  {
                    phase: "Final Cut",
                    progress: 0,
                    status: "Not Started",
                    start_date: "25 Oct",
                  },
                  {
                    phase: "Color Grading",
                    progress: 0,
                    status: "Not Started",
                    start_date: "05 Nov",
                  },
                ]
          );
        }

        // VFX Shots (from schedules and crew table)
        const { data: vfxSchedules, error: vfxScheduleError } = await supabase
          .from("schedules")
          .select("id, scene_id, description, status, progress")
          .eq("project_id", selectedProjectId)
          .ilike("description", "VFX%");
        const { data: vfxCrew, error: vfxCrewError } = await supabase
          .from("crew")
          .select("name")
          .eq("project_id", selectedProjectId)
          .eq("role", "VFX Supervisor");
        if (vfxScheduleError || vfxCrewError) {
          console.error("VFX fetch error:", vfxScheduleError || vfxCrewError);
          setError(
            `Failed to fetch VFX shots: ${
              (vfxScheduleError || vfxCrewError)?.message
            }`
          );
          setVfxShots([]);
        } else {
          console.log("VFX schedules fetched:", vfxSchedules);
          setVfxShots(
            vfxSchedules?.length > 0
              ? vfxSchedules.map((schedule, idx) => ({
                  id: schedule.id,
                  shot:
                    schedule.description ||
                    `VFX-${String(idx + 1).padStart(3, "0")}`,
                  scene: schedule.scene_id,
                  description: schedule.description || "VFX Task",
                  status:
                    schedule.status ||
                    ["Modeling", "Compositing", "Review"][idx % 3],
                  artist: vfxCrew[idx]?.name || "TBD",
                  progress: schedule.progress || [60, 80, 95][idx % 3],
                }))
              : [
                  {
                    shot: "VFX-001",
                    scene: 1,
                    description: "Explosion Scene",
                    status: "Modeling",
                    artist: "TBD",
                    progress: 60,
                  },
                  {
                    shot: "VFX-002",
                    scene: 2,
                    description: "CGI Environment",
                    status: "Compositing",
                    artist: "TBD",
                    progress: 80,
                  },
                  {
                    shot: "VFX-003",
                    scene: 3,
                    description: "Character Effect",
                    status: "Review",
                    artist: "TBD",
                    progress: 95,
                  },
                ]
          );
        }

        // Audio Tracks (from crew table)
        const { data: audioCrew, error: audioCrewError } = await supabase
          .from("crew")
          .select("id, name, role, status, duration")
          .eq("project_id", selectedProjectId)
          .ilike("role", "%sound%");
        if (audioCrewError) {
          console.error("Audio fetch error:", audioCrewError);
          setError(`Failed to fetch audio tracks: ${audioCrewError.message}`);
          setAudioTracks([]);
        } else {
          console.log("Audio crew fetched:", audioCrew);
          setAudioTracks(
            audioCrew?.length > 0
              ? audioCrew.map((crew, idx) => ({
                  id: crew.id,
                  track: crew.role || "Unknown",
                  status:
                    crew.status ||
                    ["Completed", "In Progress", "Composing", "Pending"][
                      idx % 4
                    ],
                  engineer: crew.name || "TBD",
                  duration: crew.duration || "TBD",
                }))
              : [
                  {
                    track: "Sound Editor",
                    status: "Completed",
                    engineer: "TBD",
                    duration: "1h 42m",
                  },
                  {
                    track: "Sound Designer",
                    status: "In Progress",
                    engineer: "TBD",
                    duration: "TBD",
                  },
                  {
                    track: "Composer",
                    status: "Composing",
                    engineer: "TBD",
                    duration: "TBD",
                  },
                  {
                    track: "Sound Mixer",
                    status: "Pending",
                    engineer: "TBD",
                    duration: "TBD",
                  },
                ]
          );
        }

        // Deliverables Checklist (from deliverables table)
        const { data: deliverableData, error: deliverableError } =
          await supabase
            .from("deliverables")
            .select("id, name, status")
            .eq("project_id", selectedProjectId);
        if (deliverableError) {
          console.error("Deliverables fetch error:", deliverableError);
          setError(`Failed to fetch deliverables: ${deliverableError.message}`);
          setDeliverables([]);
        } else {
          console.log("Deliverables fetched:", deliverableData);
          setDeliverables(
            deliverableData?.length > 0
              ? deliverableData.map((d) => ({
                  id: d.id,
                  name: d.name,
                  status: d.status,
                }))
              : [
                  { name: "DCP (Digital Cinema Package)", status: "Pending" },
                  { name: "ProRes Master File", status: "Pending" },
                  {
                    name: "Subtitles (Telugu/Malayalam)",
                    status: "In Progress",
                  },
                  { name: "Trailer Cuts", status: "In Progress" },
                ]
          );
        }
      } catch (err: any) {
        console.error("Fetch project data error:", err);
        setError(`An unexpected error occurred: ${err.message || err}`);
        setEditingProgress([]);
        setVfxShots([]);
        setAudioTracks([]);
        setDeliverables([]);
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
    try {
      console.log(`Saving ${section} for project ID:`, selectedProjectId);
      const table = tableMap[section];

      if (section === "editingProgress") {
        // Update existing editing progress
        for (const edit of editingProgress.filter((e) => e.id !== undefined)) {
          const startDate =
            edit.start_date && edit.start_date !== "TBD"
              ? new Date(edit.start_date.split(" ").reverse().join("-"))
                  .toISOString()
                  .split("T")[0]
              : null;
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              description: edit.phase,
              progress: edit.progress,
              status: edit.status,
              start_date: startDate,
              scene_id: 0, // Default for editing tasks
            })
            .eq("id", edit.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new editing progress
        if (
          newEditingProgress.phase &&
          newEditingProgress.progress !== undefined
        ) {
          const startDate =
            newEditingProgress.start_date &&
            newEditingProgress.start_date !== "TBD"
              ? new Date(
                  newEditingProgress.start_date.split(" ").reverse().join("-")
                )
                  .toISOString()
                  .split("T")[0]
              : null;
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              description: newEditingProgress.phase,
              progress: newEditingProgress.progress || 0,
              status: newEditingProgress.status || "Not Started",
              start_date: startDate,
              scene_id: 0, // Default for editing tasks
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setEditingProgress([
              ...editingProgress,
              {
                ...newEditingProgress,
                id: insertedData.id,
                start_date: newEditingProgress.start_date || "TBD",
              } as EditingProgress,
            ]);
            setNewEditingProgress({});
          }
        }
      } else if (section === "vfxShots") {
        // Update existing VFX shots
        for (const vfx of vfxShots.filter((v) => v.id !== undefined)) {
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              scene_id: vfx.scene,
              description: vfx.description,
              status: vfx.status,
              progress: vfx.progress,
            })
            .eq("id", vfx.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new VFX shot
        if (newVfxShot.shot && newVfxShot.scene && newVfxShot.description) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              scene_id: newVfxShot.scene,
              description: newVfxShot.description,
              status: newVfxShot.status || "Modeling",
              progress: newVfxShot.progress || 0,
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setVfxShots([
              ...vfxShots,
              {
                ...newVfxShot,
                id: insertedData.id,
                artist: newVfxShot.artist || "TBD",
                status: newVfxShot.status || "Modeling",
                progress: newVfxShot.progress || 0,
              } as VfxShot,
            ]);
            setNewVfxShot({});
          }
        }
      } else if (section === "audioTracks") {
        // Update existing audio tracks
        for (const audio of audioTracks.filter((a) => a.id !== undefined)) {
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              name: audio.engineer,
              role: audio.track,
              status: audio.status,
              duration: audio.duration === "TBD" ? null : audio.duration,
              department: "Audio", // Default for audio tracks
            })
            .eq("id", audio.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new audio track
        if (newAudioTrack.track && newAudioTrack.engineer) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              name: newAudioTrack.engineer,
              role: newAudioTrack.track,
              status: newAudioTrack.status || "Pending",
              duration:
                newAudioTrack.duration === "TBD"
                  ? null
                  : newAudioTrack.duration,
              department: "Audio", // Default for audio tracks
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setAudioTracks([
              ...audioTracks,
              {
                ...newAudioTrack,
                id: insertedData.id,
                status: newAudioTrack.status || "Pending",
                duration: newAudioTrack.duration || "TBD",
              } as AudioTrack,
            ]);
            setNewAudioTrack({});
          }
        }
      } else if (section === "deliverables") {
        // Update existing deliverables
        for (const deliverable of deliverables.filter(
          (d) => d.id !== undefined
        )) {
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              name: deliverable.name,
              status: deliverable.status,
              due_date: "2025-12-31", // Default, since not used in UI
              type: "File", // Default, since not used in UI
            })
            .eq("id", deliverable.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new deliverable
        if (newDeliverable.name) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              name: newDeliverable.name,
              status: newDeliverable.status || "Pending",
              due_date: "2025-12-31", // Default, since not used in UI
              type: "File", // Default, since not used in UI
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setDeliverables([
              ...deliverables,
              {
                ...newDeliverable,
                id: insertedData.id,
                status: newDeliverable.status || "Pending",
              } as Deliverable,
            ]);
            setNewDeliverable({});
          }
        }
      }

      console.log(`${section} saved successfully`);
      setRefreshKey((prev) => prev + 1);
      setEditMode({ ...editMode, [section]: false });
      alert("Changes saved successfully!");
    } catch (error: any) {
      console.error(`Save ${section} error:`, error);
      alert(`Failed to save changes for ${section}: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Add new item to local state
  const handleAdd = (section: Section) => {
    if (section === "editingProgress") {
      if (
        !newEditingProgress.phase ||
        newEditingProgress.progress === undefined
      ) {
        alert("Please fill in Phase and Progress fields.");
        return;
      }
      setEditingProgress([
        ...editingProgress,
        {
          ...newEditingProgress,
          id: undefined,
          status: newEditingProgress.status || "Not Started",
          start_date: newEditingProgress.start_date || "TBD",
        } as EditingProgress,
      ]);
      setNewEditingProgress({});
    } else if (section === "vfxShots") {
      if (!newVfxShot.shot || !newVfxShot.scene || !newVfxShot.description) {
        alert("Please fill in Shot, Scene, and Description fields.");
        return;
      }
      setVfxShots([
        ...vfxShots,
        {
          ...newVfxShot,
          id: undefined,
          artist: newVfxShot.artist || "TBD",
          status: newVfxShot.status || "Modeling",
          progress: newVfxShot.progress || 0,
        } as VfxShot,
      ]);
      setNewVfxShot({});
    } else if (section === "audioTracks") {
      if (!newAudioTrack.track || !newAudioTrack.engineer) {
        alert("Please fill in Track and Engineer fields.");
        return;
      }
      setAudioTracks([
        ...audioTracks,
        {
          ...newAudioTrack,
          id: undefined,
          status: newAudioTrack.status || "Pending",
          duration: newAudioTrack.duration || "TBD",
        } as AudioTrack,
      ]);
      setNewAudioTrack({});
    } else if (section === "deliverables") {
      if (!newDeliverable.name) {
        alert("Please fill in Item field.");
        return;
      }
      setDeliverables([
        ...deliverables,
        {
          ...newDeliverable,
          id: undefined,
          status: newDeliverable.status || "Pending",
        } as Deliverable,
      ]);
      setNewDeliverable({});
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
      if (section === "editingProgress") {
        setEditingProgress(editingProgress.filter((e) => e.id !== id));
      } else if (section === "vfxShots") {
        setVfxShots(vfxShots.filter((v) => v.id !== id));
      } else if (section === "audioTracks") {
        setAudioTracks(audioTracks.filter((a) => a.id !== id));
      } else if (section === "deliverables") {
        setDeliverables(deliverables.filter((d) => d.id !== id));
      }
      alert(`${section.slice(0, -1)} deleted successfully!`);
    } catch (error: any) {
      console.error(`Delete ${section} error:`, error);
      alert(`Failed to delete ${section.slice(0, -1)}: ${error.message}`);
    }
  };

  // Cancel edit mode and reset forms
  const handleCancel = (section: Section) => {
    if (section === "editingProgress") {
      setNewEditingProgress({});
    } else if (section === "vfxShots") {
      setNewVfxShot({});
    } else if (section === "audioTracks") {
      setNewAudioTrack({});
    } else if (section === "deliverables") {
      setNewDeliverable({});
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
                    Post-Production
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Editing, VFX, sound design, color grading
                  </p>
                </div>
              </div>
            </header>

            <div className="p-6 space-y-6">
              {/* Editing Progress */}
              <DashboardCard title="Editing Pipeline" icon={Scissors}>
                <div className="space-y-4">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.editingProgress
                          ? handleCancel("editingProgress")
                          : setEditMode({ ...editMode, editingProgress: true })
                      }
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.editingProgress
                        ? "Cancel Edit"
                        : "Edit Progress"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.editingProgress && handleAdd("editingProgress")
                      }
                      disabled={!editMode.editingProgress || isSaving}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Progress
                    </Button>
                  </div>
                  {editMode.editingProgress && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Phase (e.g., Rough Cut)"
                        value={newEditingProgress.phase || ""}
                        onChange={(e) =>
                          setNewEditingProgress({
                            ...newEditingProgress,
                            phase: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        type="number"
                        placeholder="Progress (0-100)"
                        value={
                          newEditingProgress.progress !== undefined
                            ? newEditingProgress.progress
                            : ""
                        }
                        onChange={(e) =>
                          setNewEditingProgress({
                            ...newEditingProgress,
                            progress: parseInt(e.target.value) || 0,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newEditingProgress.status || "Not Started"}
                        onChange={(e) =>
                          setNewEditingProgress({
                            ...newEditingProgress,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Not Started">Not Started</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <Input
                        placeholder="Start Date (e.g., 15 Sep)"
                        value={newEditingProgress.start_date || ""}
                        onChange={(e) =>
                          setNewEditingProgress({
                            ...newEditingProgress,
                            start_date: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                    </div>
                  )}
                  {editingProgress.map((edit, idx) => (
                    <div key={edit.id || idx} className="space-y-2">
                      {editMode.editingProgress ? (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <Input
                              value={edit.phase}
                              onChange={(e) => {
                                const newProgress = [...editingProgress];
                                newProgress[idx].phase = e.target.value;
                                setEditingProgress(newProgress);
                              }}
                              className="flex-1 mr-2"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDelete("editingProgress", edit.id!)
                              }
                              disabled={isSaving || !edit.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            type="number"
                            value={edit.progress}
                            onChange={(e) => {
                              const newProgress = [...editingProgress];
                              newProgress[idx].progress =
                                parseInt(e.target.value) || 0;
                              setEditingProgress(newProgress);
                            }}
                            className="mb-2"
                          />
                          <select
                            value={edit.status}
                            onChange={(e) => {
                              const newProgress = [...editingProgress];
                              newProgress[idx].status = e.target.value;
                              setEditingProgress(newProgress);
                            }}
                            className="w-full p-2 border border-input rounded-md mb-2"
                          >
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                          <Input
                            placeholder="Start Date (e.g., 15 Sep)"
                            value={edit.start_date || ""}
                            onChange={(e) => {
                              const newProgress = [...editingProgress];
                              newProgress[idx].start_date = e.target.value;
                              setEditingProgress(newProgress);
                            }}
                            className="mb-2"
                          />
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {edit.phase}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Start: {edit.start_date}
                              </p>
                            </div>
                            <Badge
                              variant={
                                edit.status === "Completed"
                                  ? "default"
                                  : edit.status === "In Progress"
                                  ? "outline"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {edit.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={edit.progress}
                              className="flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {edit.progress}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.editingProgress && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("editingProgress")}
                      disabled={isSaving}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* VFX Pipeline */}
              <DashboardCard title="VFX Pipeline" icon={Sparkles}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.vfxShots
                          ? handleCancel("vfxShots")
                          : setEditMode({ ...editMode, vfxShots: true })
                      }
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.vfxShots ? "Cancel Edit" : "Edit VFX Shots"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => editMode.vfxShots && handleAdd("vfxShots")}
                      disabled={!editMode.vfxShots || isSaving}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add VFX Shot
                    </Button>
                  </div>
                  {editMode.vfxShots && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Shot (e.g., VFX-001)"
                        value={newVfxShot.shot || ""}
                        onChange={(e) =>
                          setNewVfxShot({ ...newVfxShot, shot: e.target.value })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Scene ID"
                        value={newVfxShot.scene || ""}
                        onChange={(e) =>
                          setNewVfxShot({
                            ...newVfxShot,
                            scene: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Description"
                        value={newVfxShot.description || ""}
                        onChange={(e) =>
                          setNewVfxShot({
                            ...newVfxShot,
                            description: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Artist"
                        value={newVfxShot.artist || ""}
                        onChange={(e) =>
                          setNewVfxShot({
                            ...newVfxShot,
                            artist: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        type="number"
                        placeholder="Progress (0-100)"
                        value={
                          newVfxShot.progress !== undefined
                            ? newVfxShot.progress
                            : ""
                        }
                        onChange={(e) =>
                          setNewVfxShot({
                            ...newVfxShot,
                            progress: parseInt(e.target.value) || 0,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newVfxShot.status || "Modeling"}
                        onChange={(e) =>
                          setNewVfxShot({
                            ...newVfxShot,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Modeling">Modeling</option>
                        <option value="Compositing">Compositing</option>
                        <option value="Review">Review</option>
                      </select>
                    </div>
                  )}
                  {vfxShots.map((vfx, idx) => (
                    <div
                      key={vfx.id || idx}
                      className="p-3 bg-secondary/20 rounded-lg space-y-2"
                    >
                      {editMode.vfxShots ? (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <Input
                              value={vfx.shot}
                              onChange={(e) => {
                                const newVfxShots = [...vfxShots];
                                newVfxShots[idx].shot = e.target.value;
                                setVfxShots(newVfxShots);
                              }}
                              className="flex-1 mr-2"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete("vfxShots", vfx.id!)}
                              disabled={isSaving || !vfx.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            value={vfx.scene}
                            onChange={(e) => {
                              const newVfxShots = [...vfxShots];
                              newVfxShots[idx].scene = e.target.value;
                              setVfxShots(newVfxShots);
                            }}
                            className="mb-2"
                          />
                          <Input
                            value={vfx.description}
                            onChange={(e) => {
                              const newVfxShots = [...vfxShots];
                              newVfxShots[idx].description = e.target.value;
                              setVfxShots(newVfxShots);
                            }}
                            className="mb-2"
                          />
                          <Input
                            value={vfx.artist}
                            onChange={(e) => {
                              const newVfxShots = [...vfxShots];
                              newVfxShots[idx].artist = e.target.value;
                              setVfxShots(newVfxShots);
                            }}
                            className="mb-2"
                          />
                          <Input
                            type="number"
                            value={vfx.progress}
                            onChange={(e) => {
                              const newVfxShots = [...vfxShots];
                              newVfxShots[idx].progress =
                                parseInt(e.target.value) || 0;
                              setVfxShots(newVfxShots);
                            }}
                            className="mb-2"
                          />
                          <select
                            value={vfx.status}
                            onChange={(e) => {
                              const newVfxShots = [...vfxShots];
                              newVfxShots[idx].status = e.target.value;
                              setVfxShots(newVfxShots);
                            }}
                            className="w-full p-2 border border-input rounded-md mb-2"
                          >
                            <option value="Modeling">Modeling</option>
                            <option value="Compositing">Compositing</option>
                            <option value="Review">Review</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {vfx.shot} - Scene {vfx.scene}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {vfx.description}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {vfx.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <Progress
                              value={vfx.progress}
                              className="flex-1 mr-3"
                            />
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                {vfx.artist}
                              </p>
                              <p className="text-xs font-bold">
                                {vfx.progress}%
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.vfxShots && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("vfxShots")}
                      disabled={isSaving}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Audio Post-Production */}
              <DashboardCard title="Audio Post-Production" icon={Music}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.audioTracks
                          ? handleCancel("audioTracks")
                          : setEditMode({ ...editMode, audioTracks: true })
                      }
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.audioTracks
                        ? "Cancel Edit"
                        : "Edit Audio Tracks"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.audioTracks && handleAdd("audioTracks")
                      }
                      disabled={!editMode.audioTracks || isSaving}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Audio Track
                    </Button>
                  </div>
                  {editMode.audioTracks && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Track (e.g., Sound Editor)"
                        value={newAudioTrack.track || ""}
                        onChange={(e) =>
                          setNewAudioTrack({
                            ...newAudioTrack,
                            track: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Engineer"
                        value={newAudioTrack.engineer || ""}
                        onChange={(e) =>
                          setNewAudioTrack({
                            ...newAudioTrack,
                            engineer: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newAudioTrack.status || "Pending"}
                        onChange={(e) =>
                          setNewAudioTrack({
                            ...newAudioTrack,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Composing">Composing</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <Input
                        placeholder="Duration (e.g., 1h 42m)"
                        value={newAudioTrack.duration || ""}
                        onChange={(e) =>
                          setNewAudioTrack({
                            ...newAudioTrack,
                            duration: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                    </div>
                  )}
                  {audioTracks.map((audio, idx) => (
                    <div
                      key={audio.id || idx}
                      className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                    >
                      {editMode.audioTracks ? (
                        <>
                          <div className="flex-1 space-y-2 mr-2">
                            <Input
                              value={audio.track}
                              onChange={(e) => {
                                const newAudioTracks = [...audioTracks];
                                newAudioTracks[idx].track = e.target.value;
                                setAudioTracks(newAudioTracks);
                              }}
                              className="mb-2"
                            />
                            <Input
                              value={audio.engineer}
                              onChange={(e) => {
                                const newAudioTracks = [...audioTracks];
                                newAudioTracks[idx].engineer = e.target.value;
                                setAudioTracks(newAudioTracks);
                              }}
                              className="mb-2"
                            />
                            <select
                              value={audio.status}
                              onChange={(e) => {
                                const newAudioTracks = [...audioTracks];
                                newAudioTracks[idx].status = e.target.value;
                                setAudioTracks(newAudioTracks);
                              }}
                              className="w-full p-2 border border-input rounded-md mb-2"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Composing">Composing</option>
                              <option value="Completed">Completed</option>
                            </select>
                            <Input
                              value={audio.duration}
                              onChange={(e) => {
                                const newAudioTracks = [...audioTracks];
                                newAudioTracks[idx].duration = e.target.value;
                                setAudioTracks(newAudioTracks);
                              }}
                              className="mb-2"
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDelete("audioTracks", audio.id!)
                            }
                            disabled={isSaving || !audio.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="font-medium text-sm">{audio.track}</p>
                            <p className="text-xs text-muted-foreground">
                              Engineer: {audio.engineer}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                audio.status === "Completed"
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {audio.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {audio.duration}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.audioTracks && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("audioTracks")}
                      disabled={isSaving}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Deliverables Checklist */}
              <DashboardCard title="Final Deliverables" icon={Film}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.deliverables
                          ? handleCancel("deliverables")
                          : setEditMode({ ...editMode, deliverables: true })
                      }
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.deliverables
                        ? "Cancel Edit"
                        : "Edit Deliverables"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.deliverables && handleAdd("deliverables")
                      }
                      disabled={!editMode.deliverables || isSaving}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Deliverable
                    </Button>
                  </div>
                  {editMode.deliverables && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Item"
                        value={newDeliverable.name || ""}
                        onChange={(e) =>
                          setNewDeliverable({
                            ...newDeliverable,
                            name: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newDeliverable.status || "Pending"}
                        onChange={(e) =>
                          setNewDeliverable({
                            ...newDeliverable,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  )}
                  {deliverables.map((deliverable, idx) => (
                    <div
                      key={deliverable.id || idx}
                      className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                    >
                      {editMode.deliverables ? (
                        <>
                          <div className="flex-1 space-y-2 mr-2">
                            <Input
                              value={deliverable.name}
                              onChange={(e) => {
                                const newDeliverables = [...deliverables];
                                newDeliverables[idx].name = e.target.value;
                                setDeliverables(newDeliverables);
                              }}
                              className="mb-2"
                            />
                            <select
                              value={deliverable.status}
                              onChange={(e) => {
                                const newDeliverables = [...deliverables];
                                newDeliverables[idx].status = e.target.value;
                                setDeliverables(newDeliverables);
                              }}
                              className="w-full p-2 border border-input rounded-md mb-2"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDelete("deliverables", deliverable.id!)
                            }
                            disabled={isSaving || !deliverable.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm">{deliverable.name}</span>
                          <Badge
                            variant={
                              deliverable.status === "Pending"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {deliverable.status}
                          </Badge>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.deliverables && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("deliverables")}
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

export default PostProduction;
