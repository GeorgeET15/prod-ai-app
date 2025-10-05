import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Film,
  ArrowLeft,
  Users,
  DollarSign,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabaseClient";

// Define interface for project data
interface ProjectData {
  name: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  team_members: number;
  total_scenes: number;
}

export default function OnboardingPage() {
  const [step, setStep] = useState<number>(1);
  const [projectData, setProjectData] = useState<ProjectData>({
    name: "",
    start_date: "",
    end_date: "",
    total_budget: 0,
    team_members: 0,
    total_scenes: 0,
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProjectData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();
  const totalSteps = 4;

  // Validate current step
  const validateStep = (): boolean => {
    const newErrors: Partial<Record<keyof ProjectData, string>> = {};
    if (step === 1) {
      if (!projectData.name.trim()) {
        newErrors.name = "Project name is required";
      }
      if (!projectData.start_date) {
        newErrors.start_date = "Start date is required";
      }
      if (!projectData.end_date) {
        newErrors.end_date = "End date is required";
      } else if (
        projectData.start_date &&
        new Date(projectData.end_date) < new Date(projectData.start_date)
      ) {
        newErrors.end_date = "End date must be after start date";
      }
    } else if (step === 2) {
      if (projectData.team_members < 0) {
        newErrors.team_members = "Team members cannot be negative";
      }
    } else if (step === 3) {
      if (projectData.total_budget < 0) {
        newErrors.total_budget = "Budget cannot be negative";
      }
      if (projectData.total_scenes < 0) {
        newErrors.total_scenes = "Total scenes cannot be negative";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateStep()) return;
    if (step < totalSteps) {
      setStep(step + 1);
      setErrors({});
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: projectData.name,
          start_date: projectData.start_date,
          end_date: projectData.end_date,
          total_budget: projectData.total_budget,
          days_in_production: 0,
          team_members: projectData.team_members,
          scenes_completed: 0,
          total_scenes: projectData.total_scenes,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (data) {
        alert("Project created successfully!");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle navigation between steps
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    } else {
      navigate(-1);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" /> Project Details
            </h2>
            <div className="p-4 bg-secondary/20 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="name"
                  className="text-right font-medium text-muted-foreground"
                >
                  Project Name
                </Label>
                <div className="col-span-3">
                  <Input
                    id="name"
                    value={projectData.name}
                    onChange={(e) =>
                      setProjectData({ ...projectData, name: e.target.value })
                    }
                    className="border-input bg-background focus:ring-1 focus:ring-primary"
                    placeholder="Enter project name"
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="start-date"
                  className="text-right font-medium text-muted-foreground"
                >
                  Start Date
                </Label>
                <div className="col-span-3">
                  <Input
                    id="start-date"
                    type="date"
                    value={projectData.start_date}
                    onChange={(e) =>
                      setProjectData({
                        ...projectData,
                        start_date: e.target.value,
                      })
                    }
                    className="border-input bg-background focus:ring-1 focus:ring-primary"
                  />
                  {errors.start_date && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.start_date}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="end-date"
                  className="text-right font-medium text-muted-foreground"
                >
                  End Date
                </Label>
                <div className="col-span-3">
                  <Input
                    id="end-date"
                    type="date"
                    value={projectData.end_date}
                    onChange={(e) =>
                      setProjectData({
                        ...projectData,
                        end_date: e.target.value,
                      })
                    }
                    className="border-input bg-background focus:ring-1 focus:ring-primary"
                  />
                  {errors.end_date && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.end_date}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Team Setup
            </h2>
            <div className="p-4 bg-secondary/20 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="team-members"
                  className="text-right font-medium text-muted-foreground"
                >
                  Team Members
                </Label>
                <div className="col-span-3">
                  <Input
                    id="team-members"
                    type="number"
                    min="0"
                    value={projectData.team_members}
                    onChange={(e) =>
                      setProjectData({
                        ...projectData,
                        team_members: parseInt(e.target.value) || 0,
                      })
                    }
                    className="border-input bg-background focus:ring-1 focus:ring-primary"
                    placeholder="Number of team members"
                  />
                  {errors.team_members && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.team_members}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Budget & Scenes
            </h2>
            <div className="p-4 bg-secondary/20 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="total-budget"
                  className="text-right font-medium text-muted-foreground"
                >
                  Total Budget (₹)
                </Label>
                <div className="col-span-3">
                  <Input
                    id="total-budget"
                    type="number"
                    min="0"
                    value={projectData.total_budget}
                    onChange={(e) =>
                      setProjectData({
                        ...projectData,
                        total_budget: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="border-input bg-background focus:ring-1 focus:ring-primary"
                    placeholder="Enter total budget"
                  />
                  {errors.total_budget && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.total_budget}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="total-scenes"
                  className="text-right font-medium text-muted-foreground"
                >
                  Total Scenes
                </Label>
                <div className="col-span-3">
                  <Input
                    id="total-scenes"
                    type="number"
                    min="0"
                    value={projectData.total_scenes}
                    onChange={(e) =>
                      setProjectData({
                        ...projectData,
                        total_scenes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="border-input bg-background focus:ring-1 focus:ring-primary"
                    placeholder="Number of scenes"
                  />
                  {errors.total_scenes && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.total_scenes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" /> Confirm Project
            </h2>
            <div className="p-4 bg-secondary/20 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <p className="text-right font-medium text-muted-foreground">
                  Project Name
                </p>
                <p className="col-span-3 font-medium">
                  {projectData.name || "N/A"}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <p className="text-right font-medium text-muted-foreground">
                  Start Date
                </p>
                <p className="col-span-3 font-medium">
                  {projectData.start_date || "N/A"}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <p className="text-right font-medium text-muted-foreground">
                  End Date
                </p>
                <p className="col-span-3 font-medium">
                  {projectData.end_date || "N/A"}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <p className="text-right font-medium text-muted-foreground">
                  Team Members
                </p>
                <p className="col-span-3 font-medium">
                  {projectData.team_members || 0}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <p className="text-right font-medium text-muted-foreground">
                  Total Budget
                </p>
                <p className="col-span-3 font-medium">
                  ₹{projectData.total_budget.toLocaleString() || 0}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <p className="text-right font-medium text-muted-foreground">
                  Total Scenes
                </p>
                <p className="col-span-3 font-medium">
                  {projectData.total_scenes || 0}
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-r border-border">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a
                      href="/onboarding"
                      className="flex items-center gap-2 bg-sidebar-accent text-sidebar-accent-foreground font-medium hover:bg-sidebar-accent/80 transition-colors"
                    >
                      <Film className="h-4 w-4" />
                      <span>Onboarding</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1">
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-4 p-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Create New Project - Step {step} of {totalSteps}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {step === 1
                    ? "Enter project details"
                    : step === 2
                    ? "Set up your team"
                    : step === 3
                    ? "Define budget and scenes"
                    : "Review and confirm"}
                </p>
              </div>
            </div>
          </header>
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <Progress value={(step / totalSteps) * 100} className="mb-6" />
              <div className="bg-card rounded-lg shadow-lg p-6 border border-border">
                <form onSubmit={handleCreateProject} className="space-y-6">
                  {renderStepContent()}
                  <div className="flex justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant="default"
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? (
                        "Submitting..."
                      ) : step === totalSteps ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Create Project
                        </>
                      ) : (
                        "Next"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
