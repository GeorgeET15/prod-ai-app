import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProductionSidebar } from "@/components/ProductionSidebar";
import { DashboardCard } from "@/components/DashboardCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
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
  id?: number; // Optional for new items
  day: string;
  date: Date;
  location: string;
  scenes: string;
  crew: number;
  callTime: string;
  status: string;
}

interface Milestone {
  id?: number; // Optional for new items
  milestone: string;
  date: Date;
  status: string;
  progress: number;
}

interface CrewMember {
  id?: number; // Optional for new items
  role: string;
  lead: string;
  available: string;
  status: string;
}

interface ScheduleHealth {
  daysCompleted: number;
  daysRemaining: number;
  scheduleVariance: number;
  onTimePercentage: number;
}

type Section = "shootDays" | "milestones" | "crew";
type TableName = "schedules" | "milestones" | "crew";

const tableMap: Record<Section, TableName> = {
  shootDays: "schedules",
  milestones: "milestones",
  crew: "crew",
};

const Schedule = () => {
  const [upcomingShootDays, setUpcomingShootDays] = useState<ShootDay[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [crewSchedule, setCrewSchedule] = useState<CrewMember[]>([]);
  const [scheduleHealth, setScheduleHealth] = useState<ScheduleHealth>({
    daysCompleted: 0,
    daysRemaining: 0,
    scheduleVariance: 0,
    onTimePercentage: 0,
  });
  const [editMode, setEditMode] = useState({
    shootDays: false,
    milestones: false,
    crew: false,
  });
  const [newShootDay, setNewShootDay] = useState<Partial<ShootDay>>({});
  const [newMilestone, setNewMilestone] = useState<Partial<Milestone>>({});
  const [newCrew, setNewCrew] = useState<Partial<CrewMember>>({});
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

        const { data: projectData } = await supabase
          .from("projects")
          .select("id")
          .eq("name", "Pranayam Oru Thudakkam")
          .single();
        const projectId = projectData?.id;
        if (!projectId) {
          console.error("Project not found");
          return;
        }

        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select(
            "start_date, end_date, days_in_production, total_scenes, scenes_completed"
          )
          .eq("id", projectId)
          .single();
        if (projectError) {
          console.error("Project fetch error:", projectError);
        } else if (project) {
          const startDate = new Date(project.start_date);
          const endDate = new Date(project.end_date);
          const totalDays = Math.floor(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const daysCompleted = project.days_in_production;
          const daysRemaining = Math.max(0, totalDays - daysCompleted);
          const scheduleVariance =
            daysCompleted -
            (totalDays * project.scenes_completed) / project.total_scenes;
          const onTimePercentage =
            (project.scenes_completed / project.total_scenes) * 100;

          setScheduleHealth({
            daysCompleted,
            daysRemaining,
            scheduleVariance: Math.round(scheduleVariance),
            onTimePercentage: Math.round(onTimePercentage),
          });
        }

        // Fetch milestones
        const { data: milestonesData, error: milestonesError } = await supabase
          .from("milestones")
          .select("id, milestone, target_date, status, progress")
          .eq("project_id", projectId)
          .order("target_date", { ascending: true });
        if (milestonesError) {
          console.error("Milestones fetch error:", milestonesError);
        } else {
          const startDate = new Date(project.start_date);
          const endDate = new Date(project.end_date);
          const totalDays = Math.floor(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const fallbackMilestones: Milestone[] = [
            {
              id: 1,
              milestone: "Principal Photography Start",
              date: new Date("2025-08-20"),
              status: "Completed",
              progress: 100,
            },
            {
              id: 2,
              milestone: "Mid-Production Review",
              date: new Date("2025-09-15"),
              status: "Completed",
              progress: 100,
            },
            {
              id: 3,
              milestone: "Principal Photography End",
              date: new Date("2025-11-29"),
              status: "In Progress",
              progress: Math.round(
                (project?.days_in_production / totalDays) * 100 || 0
              ),
            },
            {
              id: 4,
              milestone: "Rough Cut Complete",
              date: new Date("2025-12-15"),
              status: "Upcoming",
              progress: 0,
            },
            {
              id: 5,
              milestone: "Final Cut Lock",
              date: new Date("2026-01-01"),
              status: "Upcoming",
              progress: 0,
            },
          ];
          setMilestones(
            milestonesData?.length > 0
              ? milestonesData.map((m) => ({
                  id: m.id,
                  milestone: m.milestone,
                  date: new Date(m.target_date),
                  status: m.status,
                  progress: m.progress,
                })) || []
              : fallbackMilestones
          );
        }

        // Fetch schedules (shoot days)
        const { data: schedules, error: scheduleError } = await supabase
          .from("schedules")
          .select(
            "id, scene_id, description, planned_start, planned_end, status"
          )
          .eq("project_id", projectId)
          .gte("planned_start", new Date().toISOString().split("T")[0])
          .order("planned_start", { ascending: true });

        if (scheduleError) {
          console.error("Schedules fetch error:", scheduleError);
        } else if (schedules && project) {
          const days: ShootDay[] = schedules.map((schedule, idx) => ({
            id: schedule.id,
            day: `Day ${project.days_in_production + idx + 1}`,
            date: new Date(schedule.planned_start),
            location: schedule.description?.split(" in ")[1] || "Unknown",
            scenes: schedule.scene_id ? String(schedule.scene_id) : "N/A",
            crew: Math.floor(Math.random() * 20) + 30,
            callTime: "06:00",
            status: schedule.status || "Scheduled",
          }));
          setUpcomingShootDays(days);
        }

        // Fetch crew
        const { data: crew, error: crewError } = await supabase
          .from("crew")
          .select("id, name, role")
          .eq("project_id", projectId)
          .limit(4);
        if (crewError) {
          console.error("Crew fetch error:", crewError);
        } else {
          setCrewSchedule(
            crew?.map((c) => ({
              id: c.id,
              role: c.role,
              lead: c.name,
              available: "Full Day",
              status: "Confirmed",
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

      if (section === "shootDays") {
        // Update existing shoot days
        for (const day of upcomingShootDays.filter((d) => d.id !== undefined)) {
          const { error } = await supabase
            .from(table)
            .update({
              project_id: projectId,
              scene_id: parseInt(day.scenes.split(", ")[0]) || null,
              description: `Shoot in ${day.location}`,
              planned_start: day.date.toISOString().split("T")[0],
              planned_end: new Date(
                day.date.getTime() + 24 * 60 * 60 * 1000 - 1
              ).toISOString(),
              status: day.status,
            })
            .eq("id", day.id);
          if (error) throw error;
        }
        // Insert new shoot days
        const newDays = upcomingShootDays.filter((d) => d.id === undefined);
        if (newDays.length > 0) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert(
              newDays.map((day) => ({
                project_id: projectId,
                scene_id: parseInt(day.scenes?.split(", ")[0]) || null,
                description: `Shoot in ${day.location || "Unknown"}`,
                planned_start: day.date.toISOString().split("T")[0],
                planned_end: new Date(
                  day.date.getTime() + 24 * 60 * 60 * 1000 - 1
                ).toISOString(),
                status: day.status || "Scheduled",
              }))
            )
            .select("id");
          if (error) throw error;
          if (insertedData) {
            // Update local state with new IDs
            const updatedDays = upcomingShootDays.map((day) => {
              if (day.id === undefined) {
                const newId = insertedData.shift()?.id;
                if (newId) {
                  return { ...day, id: newId } as ShootDay;
                }
              }
              return day;
            });
            setUpcomingShootDays(updatedDays);
          }
        }
      } else if (section === "milestones") {
        // Update existing milestones
        for (const milestone of milestones.filter((m) => m.id !== undefined)) {
          const { error } = await supabase
            .from(table)
            .update({
              project_id: projectId,
              milestone: milestone.milestone,
              target_date: milestone.date.toISOString().split("T")[0],
              status: milestone.status,
              progress: milestone.progress,
            })
            .eq("id", milestone.id);
          if (error) throw error;
        }
        // Insert new milestones
        const newMilestones = milestones.filter((m) => m.id === undefined);
        if (newMilestones.length > 0) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert(
              newMilestones.map((milestone) => ({
                project_id: projectId,
                milestone: milestone.milestone,
                target_date: milestone.date.toISOString().split("T")[0],
                status: milestone.status || "Upcoming",
                progress: milestone.progress || 0,
              }))
            )
            .select("id");
          if (error) throw error;
          if (insertedData) {
            const updatedMilestones = milestones.map((milestone) => {
              if (milestone.id === undefined) {
                const newId = insertedData.shift()?.id;
                if (newId) {
                  return { ...milestone, id: newId } as Milestone;
                }
              }
              return milestone;
            });
            setMilestones(updatedMilestones);
          }
        }
      } else if (section === "crew") {
        // Update existing crew
        for (const crewMember of crewSchedule.filter(
          (c) => c.id !== undefined
        )) {
          const { error } = await supabase
            .from(table)
            .update({
              project_id: projectId,
              role: crewMember.role,
              name: crewMember.lead,
            })
            .eq("id", crewMember.id);
          if (error) throw error;
        }
        // Insert new crew
        const newCrewMembers = crewSchedule.filter((c) => c.id === undefined);
        if (newCrewMembers.length > 0) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert(
              newCrewMembers.map((crew) => ({
                project_id: projectId,
                role: crew.role,
                name: crew.lead,
              }))
            )
            .select("id");
          if (error) throw error;
          if (insertedData) {
            const updatedCrew = crewSchedule.map((crew) => {
              if (crew.id === undefined) {
                const newId = insertedData.shift()?.id;
                if (newId) {
                  return {
                    ...crew,
                    id: newId,
                    available: "Full Day",
                    status: "Confirmed",
                  } as CrewMember;
                }
              }
              return crew;
            });
            setCrewSchedule(updatedCrew);
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

  // Add new item to local state only (will be saved on handleSave)
  const handleAdd = (section: Section) => {
    if (section === "shootDays") {
      if (!newShootDay.day || !newShootDay.date) {
        alert("Please fill in Day and Date fields.");
        return;
      }
      setUpcomingShootDays([
        ...upcomingShootDays,
        {
          ...newShootDay,
          id: undefined,
          callTime: "06:00",
          crew: newShootDay.crew || 30,
        } as ShootDay,
      ]);
      setNewShootDay({});
    } else if (section === "milestones") {
      if (!newMilestone.milestone || !newMilestone.date) {
        alert("Please fill in Milestone and Date fields.");
        return;
      }
      setMilestones([
        ...milestones,
        { ...newMilestone, id: undefined } as Milestone,
      ]);
      setNewMilestone({});
    } else if (section === "crew") {
      if (!newCrew.role || !newCrew.lead) {
        alert("Please fill in Role and Lead Name fields.");
        return;
      }
      setCrewSchedule([
        ...crewSchedule,
        {
          ...newCrew,
          id: undefined,
          available: "Full Day",
          status: "Confirmed",
        } as CrewMember,
      ]);
      setNewCrew({});
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

      if (section === "shootDays") {
        setUpcomingShootDays(upcomingShootDays.filter((day) => day.id !== id));
      } else if (section === "milestones") {
        setMilestones(milestones.filter((milestone) => milestone.id !== id));
      } else if (section === "crew") {
        setCrewSchedule(crewSchedule.filter((crew) => crew.id !== id));
      }
      alert(`${section.slice(0, -1)} deleted successfully!`);
    } catch (error) {
      console.error(`Delete ${section} error:`, error);
      alert(
        `Failed to delete ${section.slice(0, -1)}. Check console for details.`
      );
    }
  };

  // Parse callTime to valid Date or default (unused but retained)
  const parseCallTime = (callTime: string | undefined): Date | null => {
    if (!callTime) return null;
    const [time, modifier] = callTime.split(" ");
    let [hours, minutes] = time.split(":");
    let h = parseInt(hours, 10);
    if (modifier && modifier.toUpperCase() === "PM" && h !== 12) h += 12;
    else if (modifier && modifier.toUpperCase() === "AM" && h === 12) h = 0;
    const date = new Date();
    date.setHours(h, parseInt(minutes || "0"), 0, 0);
    return isNaN(date.getTime()) ? null : date;
  };

  // Cancel edit mode and reset new item forms
  const handleCancel = (section: Section) => {
    if (section === "shootDays") {
      setNewShootDay({});
    } else if (section === "milestones") {
      setNewMilestone({});
    } else if (section === "crew") {
      setNewCrew({});
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
                    Schedule
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Production timeline, shoot days, milestones
                  </p>
                </div>
              </div>
            </header>

            <div className="p-6 space-y-6">
              {/* Upcoming Shoot Days */}
              <DashboardCard title="Upcoming Shoot Days" icon={Calendar}>
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
                      disabled={isSaving}
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
                        placeholder="Day (e.g., Day 4)"
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
                        selected={newShootDay.date}
                        onChange={(date: Date) =>
                          setNewShootDay({ ...newShootDay, date })
                        }
                        dateFormat="dd MMM yyyy"
                        placeholderText="Select Date"
                        customInput={
                          <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
                        }
                      />
                      <Input
                        placeholder="Location"
                        value={newShootDay.location || ""}
                        onChange={(e) =>
                          setNewShootDay({
                            ...newShootDay,
                            location: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Scenes (e.g., 1, 2)"
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
                        placeholder="Crew Size"
                        value={newShootDay.crew || ""}
                        onChange={(e) =>
                          setNewShootDay({
                            ...newShootDay,
                            crew: parseInt(e.target.value) || 0,
                          })
                        }
                        type="number"
                        className="mb-2"
                      />
                      <select
                        value={newShootDay.status || "Scheduled"}
                        onChange={(e) =>
                          setNewShootDay({
                            ...newShootDay,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Weather Risk">Weather Risk</option>
                      </select>
                    </div>
                  )}
                  {upcomingShootDays.map((day, idx) => (
                    <div
                      key={day.id || idx}
                      className="p-3 bg-secondary/20 rounded-lg space-y-2"
                    >
                      {editMode.shootDays ? (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <Input
                              value={day.day}
                              onChange={(e) => {
                                const newDays = [...upcomingShootDays];
                                newDays[idx].day = e.target.value;
                                setUpcomingShootDays(newDays);
                              }}
                              className="flex-1 mr-2"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete("shootDays", day.id!)}
                              disabled={isSaving || isSubmitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <DatePicker
                            selected={day.date}
                            onChange={(date: Date) => {
                              const newDays = [...upcomingShootDays];
                              newDays[idx].date = date;
                              setUpcomingShootDays(newDays);
                            }}
                            dateFormat="dd MMM yyyy"
                            placeholderText="Select Date"
                            customInput={
                              <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-2" />
                            }
                          />
                          <Input
                            value={day.location}
                            onChange={(e) => {
                              const newDays = [...upcomingShootDays];
                              newDays[idx].location = e.target.value;
                              setUpcomingShootDays(newDays);
                            }}
                            className="mb-2"
                          />
                          <Input
                            value={day.scenes}
                            onChange={(e) => {
                              const newDays = [...upcomingShootDays];
                              newDays[idx].scenes = e.target.value;
                              setUpcomingShootDays(newDays);
                            }}
                            className="mb-2"
                          />
                          <Input
                            value={day.crew}
                            onChange={(e) => {
                              const newDays = [...upcomingShootDays];
                              newDays[idx].crew = parseInt(e.target.value) || 0;
                              setUpcomingShootDays(newDays);
                            }}
                            type="number"
                            className="mb-2"
                          />
                          <select
                            value={day.status}
                            onChange={(e) => {
                              const newDays = [...upcomingShootDays];
                              newDays[idx].status = e.target.value;
                              setUpcomingShootDays(newDays);
                            }}
                            className="w-full p-2 border border-input rounded-md mb-2"
                          >
                            <option value="Scheduled">Scheduled</option>
                            <option value="Weather Risk">Weather Risk</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {day.day} -{" "}
                                {day.date.toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">
                                  {day.location}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={
                                day.status === "Weather Risk"
                                  ? "destructive"
                                  : "default"
                              }
                              className="text-xs"
                            >
                              {day.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Scenes</p>
                              <p className="font-bold">{day.scenes}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Call Time</p>
                              <p className="font-bold">{day.callTime}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Crew Size</p>
                              <p className="font-bold">{day.crew} people</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
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

              {/* Production Milestones */}
              <DashboardCard title="Production Milestones" icon={Clock}>
                <div className="space-y-4">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.milestones
                          ? handleCancel("milestones")
                          : setEditMode({ ...editMode, milestones: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.milestones ? "Cancel Edit" : "Edit Milestones"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.milestones && handleAdd("milestones")
                      }
                      disabled={
                        !editMode.milestones || isSaving || isSubmitting
                      }
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Milestone
                    </Button>
                  </div>
                  {editMode.milestones && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Milestone Name"
                        value={newMilestone.milestone || ""}
                        onChange={(e) =>
                          setNewMilestone({
                            ...newMilestone,
                            milestone: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <DatePicker
                        selected={newMilestone.date}
                        onChange={(date: Date) =>
                          setNewMilestone({ ...newMilestone, date })
                        }
                        dateFormat="dd MMM yyyy"
                        placeholderText="Select Date"
                        customInput={
                          <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
                        }
                      />
                      <Input
                        placeholder="Progress (%)"
                        value={newMilestone.progress || ""}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setNewMilestone({
                            ...newMilestone,
                            progress: value > 100 ? 100 : value < 0 ? 0 : value,
                          });
                        }}
                        type="number"
                        className="mb-2"
                      />
                      <select
                        value={newMilestone.status || "Upcoming"}
                        onChange={(e) =>
                          setNewMilestone({
                            ...newMilestone,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Completed">Completed</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Upcoming">Upcoming</option>
                      </select>
                    </div>
                  )}
                  {milestones.map((milestone, idx) => (
                    <div key={milestone.id || idx} className="space-y-2">
                      {editMode.milestones ? (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <Input
                              value={milestone.milestone}
                              onChange={(e) => {
                                const newMilestones = [...milestones];
                                newMilestones[idx].milestone = e.target.value;
                                setMilestones(newMilestones);
                              }}
                              className="flex-1 mr-2"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDelete("milestones", milestone.id!)
                              }
                              disabled={isSaving || isSubmitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <DatePicker
                            selected={milestone.date}
                            onChange={(date: Date) => {
                              const newMilestones = [...milestones];
                              newMilestones[idx].date = date;
                              setMilestones(newMilestones);
                            }}
                            dateFormat="dd MMM yyyy"
                            placeholderText="Select Date"
                            customInput={
                              <Input className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary mb-2" />
                            }
                          />
                          <Input
                            value={milestone.progress}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              const newMilestones = [...milestones];
                              newMilestones[idx].progress =
                                value > 100 ? 100 : value < 0 ? 0 : value;
                              setMilestones(newMilestones);
                            }}
                            type="number"
                            className="mb-2"
                          />
                          <select
                            value={milestone.status}
                            onChange={(e) => {
                              const newMilestones = [...milestones];
                              newMilestones[idx].status = e.target.value;
                              setMilestones(newMilestones);
                            }}
                            className="w-full p-2 border border-input rounded-md mb-2"
                          >
                            <option value="Completed">Completed</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Upcoming">Upcoming</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {milestone.milestone}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Target:{" "}
                                {milestone.date.toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </p>
                            </div>
                            <Badge
                              variant={
                                milestone.status === "Completed"
                                  ? "default"
                                  : milestone.status === "In Progress"
                                  ? "outline"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {milestone.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={milestone.progress}
                              className="flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {milestone.progress}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.milestones && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("milestones")}
                      disabled={isSaving || isSubmitting}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Crew Availability */}
              <DashboardCard title="Tomorrow's Crew Availability" icon={Users}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.crew
                          ? handleCancel("crew")
                          : setEditMode({ ...editMode, crew: true })
                      }
                      className="flex-1"
                      disabled={isSaving || isSubmitting}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.crew ? "Cancel Edit" : "Edit Crew"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => editMode.crew && handleAdd("crew")}
                      disabled={!editMode.crew || isSaving || isSubmitting}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Crew
                    </Button>
                  </div>
                  {editMode.crew && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Role"
                        value={newCrew.role || ""}
                        onChange={(e) =>
                          setNewCrew({ ...newCrew, role: e.target.value })
                        }
                        className="mb-2 w-1/2"
                      />
                      <Input
                        placeholder="Lead Name"
                        value={newCrew.lead || ""}
                        onChange={(e) =>
                          setNewCrew({ ...newCrew, lead: e.target.value })
                        }
                        className="mb-2 w-1/2"
                      />
                    </div>
                  )}
                  {crewSchedule.map((crew, idx) => (
                    <div
                      key={crew.id || idx}
                      className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                    >
                      {editMode.crew ? (
                        <>
                          <div className="flex-1 flex gap-2 mr-2">
                            <Input
                              value={crew.role}
                              onChange={(e) => {
                                const newCrewList = [...crewSchedule];
                                newCrewList[idx].role = e.target.value;
                                setCrewSchedule(newCrewList);
                              }}
                              className="mb-2 w-1/2"
                            />
                            <Input
                              value={crew.lead}
                              onChange={(e) => {
                                const newCrewList = [...crewSchedule];
                                newCrewList[idx].lead = e.target.value;
                                setCrewSchedule(newCrewList);
                              }}
                              className="mb-2 w-1/2"
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete("crew", crew.id!)}
                            disabled={isSaving || isSubmitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="font-medium text-sm">{crew.role}</p>
                            <p className="text-xs text-muted-foreground">
                              Lead: {crew.lead}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="default" className="text-xs mb-1">
                              Confirmed
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              Full Day
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.crew && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("crew")}
                      disabled={isSaving || isSubmitting}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Schedule Health */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-card border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    Days Completed
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {scheduleHealth.daysCompleted}/60
                  </p>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    Days Remaining
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {scheduleHealth.daysRemaining}
                  </p>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    Schedule Variance
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {scheduleHealth.scheduleVariance} days
                  </p>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    On-Time %
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {scheduleHealth.onTimePercentage}%
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ErrorBoundary>
  );
};

export default Schedule;
