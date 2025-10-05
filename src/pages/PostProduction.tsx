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
interface EditingProgress {
  id?: number;
  phase: string;
  progress: number;
  status: string;
  deadline: string | null;
}

interface VfxShot {
  id?: number;
  shot: string;
  scene: number | string;
  description: string;
  status: string;
  artist: string;
  progress: number;
}

interface AudioTrack {
  id?: number;
  track: string;
  status: string;
  engineer: string;
  duration: string;
}

interface Deliverable {
  id?: number;
  item: string;
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

        // Editing Progress (from schedules table)
        const { data: schedules, error: scheduleError } = await supabase
          .from("schedules")
          .select("id, phase, progress, status, deadline")
          .eq("project_id", projectId)
          .is("phase", "not null");
        if (scheduleError) {
          console.error("Editing fetch error:", scheduleError);
        } else {
          setEditingProgress(
            schedules.length > 0
              ? schedules.map((schedule) => ({
                  id: schedule.id,
                  phase: schedule.phase,
                  progress: schedule.progress || 0,
                  status: schedule.status,
                  deadline: schedule.deadline
                    ? new Date(schedule.deadline).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "TBD",
                }))
              : [
                  {
                    phase: "Rough Cut",
                    progress: 100,
                    status: "Completed",
                    deadline: "15 Sep",
                  },
                  {
                    phase: "Fine Cut",
                    progress: 85,
                    status: "In Progress",
                    deadline: "10 Oct",
                  },
                  {
                    phase: "Final Cut",
                    progress: 0,
                    status: "Not Started",
                    deadline: "25 Oct",
                  },
                  {
                    phase: "Color Grading",
                    progress: 0,
                    status: "Not Started",
                    deadline: "05 Nov",
                  },
                ]
          );
        }

        // VFX Shots (from schedules and crew table)
        const { data: vfxSchedules, error: vfxScheduleError } = await supabase
          .from("schedules")
          .select("id, scene_id, description, status, progress")
          .eq("project_id", projectId)
          .limit(3);
        const { data: vfxCrew, error: vfxCrewError } = await supabase
          .from("crew")
          .select("name")
          .eq("role", "VFX Supervisor")
          .limit(3);
        if (vfxScheduleError || vfxCrewError) {
          console.error("VFX fetch error:", vfxScheduleError || vfxCrewError);
        } else {
          setVfxShots(
            vfxSchedules.map((schedule, idx) => ({
              id: schedule.id,
              shot: `VFX-${String(idx + 1).padStart(3, "0")}`,
              scene: schedule.scene_id,
              description: schedule.description || "VFX Task",
              status:
                schedule.status ||
                ["Modeling", "Compositing", "Review"][idx % 3],
              artist: vfxCrew[idx]?.name || "TBD",
              progress: schedule.progress || [60, 80, 95][idx % 3],
            }))
          );
        }

        // Audio Tracks (from crew table with audio roles)
        const { data: audioCrew, error: audioCrewError } = await supabase
          .from("crew")
          .select("id, name, role")
          .filter("role", "ilike", "%sound%")
          .limit(4);
        if (audioCrewError) {
          console.error("Audio fetch error:", audioCrewError);
        } else {
          setAudioTracks(
            audioCrew.map((crew, idx) => ({
              id: crew.id,
              track: [
                "Dialogue Edit",
                "Sound Design",
                "Background Score",
                "Final Mix",
              ][idx],
              status:
                idx === 0
                  ? "Completed"
                  : idx === 1
                  ? "In Progress"
                  : idx === 2
                  ? "Composing"
                  : "Pending",
              engineer: crew.name || "TBD",
              duration: idx < 2 ? "1h 42m" : "TBD",
            }))
          );
        }

        // Deliverables Checklist (from deliverables table)
        const { data: deliverableData, error: deliverableError } =
          await supabase
            .from("deliverables")
            .select("id, item, status")
            .eq("project_id", projectId);
        if (deliverableError) {
          console.error("Deliverables fetch error:", deliverableError);
        } else {
          setDeliverables(
            deliverableData.length > 0
              ? deliverableData
              : [
                  { item: "DCP (Digital Cinema Package)", status: "Pending" },
                  { item: "ProRes Master File", status: "Pending" },
                  {
                    item: "Subtitles (Telugu/Malayalam)",
                    status: "In Progress",
                  },
                  { item: "Trailer Cuts", status: "In Progress" },
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

      if (section === "editingProgress") {
        // Update existing editing progress
        for (const edit of editingProgress.filter((e) => e.id !== undefined)) {
          const deadlineDate =
            edit.deadline && edit.deadline !== "TBD"
              ? new Date(edit.deadline.split(" ").reverse().join("-"))
                  .toISOString()
                  .split("T")[0]
              : null;
          const { error } = await supabase
            .from(table)
            .update({
              project_id: projectId,
              phase: edit.phase,
              progress: edit.progress,
              status: edit.status,
              deadline: deadlineDate,
            })
            .eq("id", edit.id);
          if (error) throw error;
        }
        // Insert new editing progress
        if (
          newEditingProgress.phase &&
          newEditingProgress.progress !== undefined
        ) {
          const deadlineDate =
            newEditingProgress.deadline && newEditingProgress.deadline !== "TBD"
              ? new Date(
                  newEditingProgress.deadline.split(" ").reverse().join("-")
                )
                  .toISOString()
                  .split("T")[0]
              : null;
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: projectId,
              phase: newEditingProgress.phase,
              progress: newEditingProgress.progress || 0,
              status: newEditingProgress.status || "Not Started",
              deadline: deadlineDate,
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
                deadline: newEditingProgress.deadline || "TBD",
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
              project_id: projectId,
              scene_id: vfx.scene,
              description: vfx.description,
              status: vfx.status,
              progress: vfx.progress,
            })
            .eq("id", vfx.id);
          if (error) throw error;
        }
        // Insert new VFX shot
        if (newVfxShot.shot && newVfxShot.scene && newVfxShot.description) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: projectId,
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
              name: audio.engineer,
              role: audio.track.includes("Dialogue")
                ? "Sound Editor"
                : audio.track.includes("Score")
                ? "Composer"
                : "Sound Mixer",
            })
            .eq("id", audio.id);
          if (error) throw error;
        }
        // Insert new audio track
        if (newAudioTrack.track && newAudioTrack.engineer) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              name: newAudioTrack.engineer,
              role: newAudioTrack.track.includes("Dialogue")
                ? "Sound Editor"
                : newAudioTrack.track.includes("Score")
                ? "Composer"
                : "Sound Mixer",
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
              project_id: projectId,
              item: deliverable.item,
              status: deliverable.status,
            })
            .eq("id", deliverable.id);
          if (error) throw error;
        }
        // Insert new deliverable
        if (newDeliverable.item) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: projectId,
              item: newDeliverable.item,
              status: newDeliverable.status || "Pending",
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
          deadline: newEditingProgress.deadline || "TBD",
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
      if (!newDeliverable.item) {
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
    } catch (error) {
      console.error(`Delete ${section} error:`, error);
      alert(
        `Failed to delete ${section.slice(0, -1)}. Check console for details.`
      );
    }
  };

  // Cancel edit mode and reset new item forms
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
                        placeholder="Phase"
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
                      <DatePicker
                        selected={
                          newEditingProgress.deadline &&
                          newEditingProgress.deadline !== "TBD"
                            ? new Date(
                                newEditingProgress.deadline
                                  .split(" ")
                                  .reverse()
                                  .join("-")
                              )
                            : null
                        }
                        onChange={(date: Date | null) =>
                          setNewEditingProgress({
                            ...newEditingProgress,
                            deadline: date
                              ? date.toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                })
                              : "TBD",
                          })
                        }
                        placeholderText="Select Deadline"
                        dateFormat="dd MMM"
                        className="w-full p-2 border border-input rounded-md mb-2"
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
                              disabled={isSaving}
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
                          <DatePicker
                            selected={
                              edit.deadline && edit.deadline !== "TBD"
                                ? new Date(
                                    edit.deadline.split(" ").reverse().join("-")
                                  )
                                : null
                            }
                            onChange={(date: Date | null) => {
                              const newProgress = [...editingProgress];
                              newProgress[idx].deadline = date
                                ? date.toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                  })
                                : "TBD";
                              setEditingProgress(newProgress);
                            }}
                            placeholderText="Select Deadline"
                            dateFormat="dd MMM"
                            className="w-full p-2 border border-input rounded-md mb-2"
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
                                Deadline: {edit.deadline}
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
                              disabled={isSaving}
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
                        placeholder="Track"
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
                            disabled={isSaving}
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
                        value={newDeliverable.item || ""}
                        onChange={(e) =>
                          setNewDeliverable({
                            ...newDeliverable,
                            item: e.target.value,
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
                              value={deliverable.item}
                              onChange={(e) => {
                                const newDeliverables = [...deliverables];
                                newDeliverables[idx].item = e.target.value;
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
                            disabled={isSaving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm">{deliverable.item}</span>
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
