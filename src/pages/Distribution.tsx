import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ProductionSidebar } from "@/components/ProductionSidebar";
import { DashboardCard } from "@/components/DashboardCard";
import {
  Ticket,
  MapPin,
  TrendingUp,
  Calendar,
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
interface Theater {
  id?: number;
  region: string;
  screens: number;
  revenue: string;
  status: string;
}

interface Marketing {
  id?: number;
  campaign: string;
  budget: string;
  spent: string;
  progress: number;
  status: string;
}

interface Release {
  id?: number;
  platform: string;
  date: string;
  status: string;
  markets: string;
}

interface RevenueProjections {
  totalBudget: number;
  preReleaseSales: number;
  projectedBoxOffice: number;
  breakEvenDay: string;
}

type Section = "theaters" | "marketing" | "releases";
type TableName = "theaters" | "budgets" | "schedules";

const tableMap: Record<Section, TableName> = {
  theaters: "theaters",
  marketing: "budgets",
  releases: "schedules",
};

const Distribution = () => {
  console.log("Using Distribution.tsx version c2f8b4a9");

  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [marketing, setMarketing] = useState<Marketing[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [revenueProjections, setRevenueProjections] =
    useState<RevenueProjections>({
      totalBudget: 0,
      preReleaseSales: 0,
      projectedBoxOffice: 0,
      breakEvenDay: "",
    });
  const [editMode, setEditMode] = useState({
    theaters: false,
    marketing: false,
    releases: false,
  });
  const [newTheater, setNewTheater] = useState<Partial<Theater>>({});
  const [newMarketing, setNewMarketing] = useState<Partial<Marketing>>({});
  const [newRelease, setNewRelease] = useState<Partial<Release>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects and set selectedProjectId from local storage
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
          setError("Failed to fetch projects.");
          return;
        }
        setProjects(projectsData || []);

        // Get selectedProjectId from local storage
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

  // Listen for localStorage changes to selectedProjectId
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

  // Fetch project data when selectedProjectId or refreshKey changes
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedProjectId) {
        console.log("No selectedProjectId, skipping fetch");
        setError("No project selected.");
        setTheaters([]);
        setMarketing([]);
        setReleases([]);
        setRevenueProjections({
          totalBudget: 0,
          preReleaseSales: 0,
          projectedBoxOffice: 0,
          breakEvenDay: "",
        });
        setLoading(false);
        return;
      }
      console.log("Fetching project data for ID:", selectedProjectId);
      setLoading(true);
      setError(null);
      try {
        // Fetch project data for budget and projections
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select("id, total_budget, end_date")
          .eq("id", selectedProjectId)
          .maybeSingle();
        if (projectError) {
          console.error("Project fetch error:", projectError);
          setError("Failed to fetch project details.");
          setTheaters([]);
          setMarketing([]);
          setReleases([]);
          setRevenueProjections({
            totalBudget: 0,
            preReleaseSales: 0,
            projectedBoxOffice: 0,
            breakEvenDay: "",
          });
          return;
        }
        if (!project) {
          console.log("No project found for ID:", selectedProjectId);
          setError("Selected project not found.");
          setTheaters([]);
          setMarketing([]);
          setReleases([]);
          setRevenueProjections({
            totalBudget: 0,
            preReleaseSales: 0,
            projectedBoxOffice: 0,
            breakEvenDay: "",
          });
          setLoading(false);
          return;
        }
        const totalBudget = project.total_budget || 0;
        const endDate = project.end_date
          ? new Date(project.end_date)
          : new Date();
        setRevenueProjections({
          totalBudget,
          preReleaseSales: Math.round(totalBudget * 1.2), // 20% more than budget
          projectedBoxOffice: Math.round(totalBudget * 2.5), // 2.5x budget
          breakEvenDay: "Day 5", // Can be refined with more data
        });

        // Theater Distribution (disabled until table is populated)
        setTheaters([
          {
            region: "Telangana",
            screens: 150,
            status: "Confirmed",
            revenue: "₹1.5 Cr",
          },
          {
            region: "Andhra Pradesh",
            screens: 120,
            status: "Confirmed",
            revenue: "₹1.2 Cr",
          },
          {
            region: "Karnataka",
            screens: 90,
            status: "In Negotiation",
            revenue: "₹0.9 Cr (Est)",
          },
          {
            region: "Tamil Nadu",
            screens: 70,
            status: "Pending",
            revenue: "₹0.7 Cr (Est)",
          },
          {
            region: "Kerala",
            screens: 60,
            status: "Pending",
            revenue: "₹0.6 Cr (Est)",
          },
        ]);

        // Marketing Campaigns
        const { data: marketingData, error: marketingError } = await supabase
          .from("budgets")
          .select("id, department, allocated, spent")
          .eq("project_id", selectedProjectId)
          .eq("department", "Marketing");
        if (marketingError) {
          console.error("Marketing fetch error:", marketingError);
          setError("Failed to fetch marketing campaigns.");
          setMarketing([]);
        } else {
          console.log("Marketing fetched:", marketingData);
          setMarketing(
            marketingData?.map((item) => ({
              id: item.id,
              campaign: item.department,
              budget: `₹${(item.allocated / 100000).toFixed(0)}L`,
              spent: `₹${(item.spent / 100000).toFixed(0)}L`,
              progress: Math.round((item.spent / item.allocated) * 100) || 0,
              status: item.spent >= item.allocated ? "Completed" : "Active",
            })) || []
          );
        }

        // Release Schedule
        const { data: scheduleData, error: scheduleError } = await supabase
          .from("schedules")
          .select("id, status, start_date, description")
          .eq("project_id", selectedProjectId)
          .order("start_date", { ascending: true });
        if (scheduleError) {
          console.error("Schedule fetch error:", scheduleError);
          setError("Failed to fetch release schedules.");
          setReleases([]);
        } else {
          console.log("Schedules fetched:", scheduleData);
          setReleases(
            scheduleData?.length > 0
              ? scheduleData.map((schedule, idx) => ({
                  id: schedule.id,
                  platform:
                    schedule.description ||
                    ["Theatrical", "OTT", "Satellite Rights"][idx],
                  date: schedule.start_date || "TBD",
                  status:
                    schedule.status ||
                    ["Scheduled", "Under Discussion", "In Negotiation"][idx],
                  markets: ["Pan India", "Worldwide", "Malayalam States"][idx],
                }))
              : [
                  {
                    platform: "Theatrical",
                    date: endDate.toISOString().split("T")[0],
                    status: "Scheduled",
                    markets: "Pan India",
                  },
                  {
                    platform: "OTT",
                    date: new Date(endDate.setMonth(endDate.getMonth() + 1))
                      .toISOString()
                      .split("T")[0],
                    status: "Under Discussion",
                    markets: "Worldwide",
                  },
                  {
                    platform: "Satellite Rights",
                    date: "TBD",
                    status: "In Negotiation",
                    markets: "Malayalam States",
                  },
                ]
          );
        }
      } catch (err) {
        console.error("Fetch project data error:", err);
        setError("An unexpected error occurred while fetching project data.");
        setTheaters([]);
        setMarketing([]);
        setReleases([]);
        setRevenueProjections({
          totalBudget: 0,
          preReleaseSales: 0,
          projectedBoxOffice: 0,
          breakEvenDay: "",
        });
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
    } catch (error) {
      console.error("Delete project error:", error);
      alert("Failed to delete project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updates to Supabase - Consolidated CRUD
  const handleSave = async (section: Section) => {
    if (isSaving || !selectedProjectId) return;
    setIsSaving(true);
    try {
      console.log(`Saving ${section} for project ID:`, selectedProjectId);
      const table = tableMap[section];

      if (section === "theaters") {
        // Update existing theaters
        for (const theater of theaters.filter((t) => t.id !== undefined)) {
          const revenueNum =
            parseFloat(theater.revenue.replace(/[^0-9.]/g, "")) *
            (theater.revenue.includes("Cr") ? 10000000 : 100000);
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              region: theater.region,
              screens: theater.screens,
              revenue: revenueNum,
              status: theater.status,
            })
            .eq("id", theater.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new theater
        if (newTheater.region && newTheater.screens) {
          const revenueNum = newTheater.revenue
            ? parseFloat(newTheater.revenue.replace(/[^0-9.]/g, "")) *
              (newTheater.revenue.includes("Cr") ? 10000000 : 100000)
            : 0;
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              region: newTheater.region,
              screens: newTheater.screens || 0,
              revenue: revenueNum,
              status: newTheater.status || "Pending",
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setTheaters([
              ...theaters,
              {
                ...newTheater,
                id: insertedData.id,
                revenue: newTheater.revenue || "₹0 Cr",
              } as Theater,
            ]);
            setNewTheater({});
          }
        }
      } else if (section === "marketing") {
        // Update existing marketing campaigns
        for (const campaign of marketing.filter((m) => m.id !== undefined)) {
          const budgetNum =
            parseFloat(campaign.budget.replace(/[^0-9.]/g, "")) * 100000;
          const spentNum =
            parseFloat(campaign.spent.replace(/[^0-9.]/g, "")) * 100000;
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              department: campaign.campaign,
              allocated: budgetNum,
              spent: spentNum,
            })
            .eq("id", campaign.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new marketing campaign
        if (newMarketing.campaign && newMarketing.budget) {
          const budgetNum =
            parseFloat(newMarketing.budget.replace(/[^0-9.]/g, "")) * 100000;
          const spentNum = newMarketing.spent
            ? parseFloat(newMarketing.spent.replace(/[^0-9.]/g, "")) * 100000
            : 0;
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              department: newMarketing.campaign,
              allocated: budgetNum,
              spent: spentNum,
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setMarketing([
              ...marketing,
              {
                ...newMarketing,
                id: insertedData.id,
                spent: newMarketing.spent || "₹0L",
                progress:
                  newMarketing.spent && newMarketing.budget
                    ? Math.round(
                        (parseFloat(
                          newMarketing.spent.replace(/[^0-9.]/g, "")
                        ) /
                          parseFloat(
                            newMarketing.budget.replace(/[^0-9.]/g, "")
                          )) *
                          100
                      )
                    : 0,
                status: newMarketing.status || "Active",
              } as Marketing,
            ]);
            setNewMarketing({});
          }
        }
      } else if (section === "releases") {
        // Update existing releases
        for (const release of releases.filter((r) => r.id !== undefined)) {
          const { error } = await supabase
            .from(table)
            .update({
              project_id: selectedProjectId,
              description: release.platform,
              status: release.status,
              start_date: release.date === "TBD" ? null : release.date,
            })
            .eq("id", release.id)
            .eq("project_id", selectedProjectId);
          if (error) throw error;
        }
        // Insert new release
        if (newRelease.platform) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: selectedProjectId,
              description: newRelease.platform,
              status: newRelease.status || "Scheduled",
              start_date:
                newRelease.date === "TBD" || !newRelease.date
                  ? null
                  : newRelease.date,
              scene_id: 0, // Default value, adjust as needed
            })
            .select("id")
            .single();
          if (error) throw error;
          if (insertedData) {
            setReleases([
              ...releases,
              {
                ...newRelease,
                id: insertedData.id,
                markets: newRelease.markets || "Unknown",
              } as Release,
            ]);
            setNewRelease({});
          }
        }
      }

      console.log(`${section} saved successfully`);
      setRefreshKey((prev) => prev + 1);
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
    if (section === "theaters") {
      if (!newTheater.region || !newTheater.screens) {
        alert("Please fill in Region and Screens fields.");
        return;
      }
      setTheaters([
        ...theaters,
        {
          ...newTheater,
          id: undefined,
          revenue: newTheater.revenue || "₹0 Cr",
          status: newTheater.status || "Pending",
        } as Theater,
      ]);
      setNewTheater({});
    } else if (section === "marketing") {
      if (!newMarketing.campaign || !newMarketing.budget) {
        alert("Please fill in Campaign and Budget fields.");
        return;
      }
      setMarketing([
        ...marketing,
        {
          ...newMarketing,
          id: undefined,
          spent: newMarketing.spent || "₹0L",
          progress:
            newMarketing.spent && newMarketing.budget
              ? Math.round(
                  (parseFloat(newMarketing.spent.replace(/[^0-9.]/g, "")) /
                    parseFloat(newMarketing.budget.replace(/[^0-9.]/g, ""))) *
                    100
                )
              : 0,
          status: newMarketing.status || "Active",
        } as Marketing,
      ]);
      setNewMarketing({});
    } else if (section === "releases") {
      if (!newRelease.platform) {
        alert("Please fill in Platform field.");
        return;
      }
      setReleases([
        ...releases,
        {
          ...newRelease,
          id: undefined,
          markets: newRelease.markets || "Unknown",
          status: newRelease.status || "Scheduled",
          date: newRelease.date || "TBD",
        } as Release,
      ]);
      setNewRelease({});
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
      console.log(`Deleting ${section} with ID:`, id);
      const table = tableMap[section];
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id)
        .eq("project_id", selectedProjectId);
      if (error) throw error;

      if (section === "theaters") {
        setTheaters(theaters.filter((t) => t.id !== id));
      } else if (section === "marketing") {
        setMarketing(marketing.filter((m) => m.id !== id));
      } else if (section === "releases") {
        setReleases(releases.filter((r) => r.id !== id));
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
    if (section === "theaters") {
      setNewTheater({});
    } else if (section === "marketing") {
      setNewMarketing({});
    } else if (section === "releases") {
      setNewRelease({});
    }
    setRefreshKey((prev) => prev + 1); // Re-fetch data to revert changes
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
                    Distribution
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Release planning, marketing, delivery
                  </p>
                </div>
              </div>
            </header>

            <div className="p-6 space-y-6">
              {/* Theater Distribution (Disabled until table is populated) */}
              <DashboardCard title="Theater Distribution" icon={Ticket}>
                <div className="text-center text-muted-foreground">
                  Theater distribution data is currently unavailable. Please
                  ensure the 'theaters' table is populated in the database.
                </div>
              </DashboardCard>

              {/* Marketing Campaigns */}
              <DashboardCard title="Marketing Campaigns" icon={TrendingUp}>
                <div className="space-y-4">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.marketing
                          ? handleCancel("marketing")
                          : setEditMode({ ...editMode, marketing: true })
                      }
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.marketing ? "Cancel Edit" : "Edit Marketing"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.marketing && handleAdd("marketing")
                      }
                      disabled={!editMode.marketing || isSaving}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Campaign
                    </Button>
                  </div>
                  {editMode.marketing && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Campaign Name"
                        value={newMarketing.campaign || ""}
                        onChange={(e) =>
                          setNewMarketing({
                            ...newMarketing,
                            campaign: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Budget (e.g., ₹50L)"
                        value={newMarketing.budget || ""}
                        onChange={(e) =>
                          setNewMarketing({
                            ...newMarketing,
                            budget: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Spent (e.g., ₹30L)"
                        value={newMarketing.spent || ""}
                        onChange={(e) =>
                          setNewMarketing({
                            ...newMarketing,
                            spent: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newMarketing.status || "Active"}
                        onChange={(e) =>
                          setNewMarketing({
                            ...newMarketing,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  )}
                  {marketing.map((campaign, idx) => (
                    <div key={campaign.id || idx} className="space-y-2">
                      {editMode.marketing ? (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <Input
                              value={campaign.campaign}
                              onChange={(e) => {
                                const newMarketingList = [...marketing];
                                newMarketingList[idx].campaign = e.target.value;
                                setMarketing(newMarketingList);
                              }}
                              className="flex-1 mr-2"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDelete("marketing", campaign.id!)
                              }
                              disabled={isSaving || !campaign.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            value={campaign.budget}
                            onChange={(e) => {
                              const newMarketingList = [...marketing];
                              newMarketingList[idx].budget = e.target.value;
                              newMarketingList[idx].progress =
                                newMarketingList[idx].spent && e.target.value
                                  ? Math.round(
                                      (parseFloat(
                                        newMarketingList[idx].spent.replace(
                                          /[^0-9.]/g,
                                          ""
                                        )
                                      ) /
                                        parseFloat(
                                          e.target.value.replace(/[^0-9.]/g, "")
                                        )) *
                                        100
                                    )
                                  : 0;
                              setMarketing(newMarketingList);
                            }}
                            className="mb-2"
                          />
                          <Input
                            value={campaign.spent}
                            onChange={(e) => {
                              const newMarketingList = [...marketing];
                              newMarketingList[idx].spent = e.target.value;
                              newMarketingList[idx].progress =
                                e.target.value && newMarketingList[idx].budget
                                  ? Math.round(
                                      (parseFloat(
                                        e.target.value.replace(/[^0-9.]/g, "")
                                      ) /
                                        parseFloat(
                                          newMarketingList[idx].budget.replace(
                                            /[^0-9.]/g,
                                            ""
                                          )
                                        )) *
                                        100
                                    )
                                  : 0;
                              setMarketing(newMarketingList);
                            }}
                            className="mb-2"
                          />
                          <select
                            value={campaign.status}
                            onChange={(e) => {
                              const newMarketingList = [...marketing];
                              newMarketingList[idx].status = e.target.value;
                              setMarketing(newMarketingList);
                            }}
                            className="w-full p-2 border border-input rounded-md mb-2"
                          >
                            <option value="Active">Active</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {campaign.campaign}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {campaign.spent} / {campaign.budget}
                              </p>
                            </div>
                            <Badge
                              variant={
                                campaign.status === "Completed"
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {campaign.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={campaign.progress}
                              className="flex-1"
                            />
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {campaign.progress}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.marketing && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("marketing")}
                      disabled={isSaving}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Release Schedule */}
              <DashboardCard title="Release Schedule" icon={Calendar}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.releases
                          ? handleCancel("releases")
                          : setEditMode({ ...editMode, releases: true })
                      }
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.releases ? "Cancel Edit" : "Edit Releases"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => editMode.releases && handleAdd("releases")}
                      disabled={!editMode.releases || isSaving}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Release
                    </Button>
                  </div>
                  {editMode.releases && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Platform"
                        value={newRelease.platform || ""}
                        onChange={(e) =>
                          setNewRelease({
                            ...newRelease,
                            platform: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Markets"
                        value={newRelease.markets || ""}
                        onChange={(e) =>
                          setNewRelease({
                            ...newRelease,
                            markets: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newRelease.status || "Scheduled"}
                        onChange={(e) =>
                          setNewRelease({
                            ...newRelease,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="Under Discussion">
                          Under Discussion
                        </option>
                        <option value="In Negotiation">In Negotiation</option>
                      </select>
                      <Input
                        placeholder="Date (or TBD)"
                        value={newRelease.date || ""}
                        onChange={(e) =>
                          setNewRelease({ ...newRelease, date: e.target.value })
                        }
                        className="mb-2"
                      />
                    </div>
                  )}
                  {releases.map((release, idx) => (
                    <div
                      key={release.id || idx}
                      className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                    >
                      {editMode.releases ? (
                        <>
                          <div className="flex-1 space-y-2 mr-2">
                            <Input
                              value={release.platform}
                              onChange={(e) => {
                                const newReleases = [...releases];
                                newReleases[idx].platform = e.target.value;
                                setReleases(newReleases);
                              }}
                              className="mb-2"
                            />
                            <Input
                              value={release.markets}
                              onChange={(e) => {
                                const newReleases = [...releases];
                                newReleases[idx].markets = e.target.value;
                                setReleases(newReleases);
                              }}
                              className="mb-2"
                            />
                            <select
                              value={release.status}
                              onChange={(e) => {
                                const newReleases = [...releases];
                                newReleases[idx].status = e.target.value;
                                setReleases(newReleases);
                              }}
                              className="w-full p-2 border border-input rounded-md mb-2"
                            >
                              <option value="Scheduled">Scheduled</option>
                              <option value="Under Discussion">
                                Under Discussion
                              </option>
                              <option value="In Negotiation">
                                In Negotiation
                              </option>
                            </select>
                            <Input
                              value={release.date}
                              onChange={(e) => {
                                const newReleases = [...releases];
                                newReleases[idx].date = e.target.value;
                                setReleases(newReleases);
                              }}
                              className="mb-2"
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDelete("releases", release.id!)
                            }
                            disabled={isSaving || !release.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="font-medium text-sm">
                              {release.platform}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {release.markets}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                release.status === "Scheduled"
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs mb-1"
                            >
                              {release.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {release.date}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.releases && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("releases")}
                      disabled={isSaving}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </DashboardCard>

              {/* Revenue Projections */}
              <DashboardCard title="Revenue Projections" icon={MapPin}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-secondary/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Total Budget
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      ₹
                      {(
                        revenueProjections.totalBudget / 10000000
                      ).toLocaleString()}{" "}
                      Cr
                    </p>
                  </div>
                  <div className="p-3 bg-secondary/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Pre-Release Sales
                    </p>
                    <p className="text-lg font-bold text-primary">
                      ₹
                      {(
                        revenueProjections.preReleaseSales / 10000000
                      ).toLocaleString()}{" "}
                      Cr
                    </p>
                  </div>
                  <div className="p-3 bg-secondary/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Projected BO
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      ₹
                      {(
                        revenueProjections.projectedBoxOffice / 10000000
                      ).toLocaleString()}{" "}
                      Cr
                    </p>
                  </div>
                  <div className="p-3 bg-secondary/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">Break Even</p>
                    <p className="text-lg font-bold text-accent">
                      {revenueProjections.breakEvenDay}
                    </p>
                  </div>
                </div>
              </DashboardCard>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </ErrorBoundary>
  );
};

export default Distribution;
