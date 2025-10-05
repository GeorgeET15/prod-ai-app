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

        // Fetch project data for budget and projections
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .select("id, total_budget, end_date")
          .eq("name", "Pranayam Oru Thudakkam")
          .single();
        if (projectError) {
          console.error("Project fetch error:", projectError);
        } else {
          const totalBudget = project.total_budget;
          const endDate = new Date(project.end_date);
          setRevenueProjections({
            totalBudget,
            preReleaseSales: Math.round(totalBudget * 1.2), // 20% more than budget
            projectedBoxOffice: Math.round(totalBudget * 2.5), // 2.5x budget
            breakEvenDay: "Day 5", // Can be refined with more data
          });

          const projectId = project.id;

          // Theater Distribution
          const { data: theaterData, error: theaterError } = await supabase
            .from("theaters")
            .select("id, region, screens, revenue, status")
            .eq("project_id", projectId);
          if (theaterError)
            console.error("Theaters fetch error:", theaterError);
          else {
            setTheaters(
              theaterData?.length > 0
                ? theaterData.map((theater) => ({
                    id: theater.id,
                    region: theater.region,
                    screens: theater.screens,
                    status: theater.status,
                    revenue: `₹${(theater.revenue / 10000000).toFixed(1)} Cr`,
                  }))
                : [
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
                  ]
            );
          }

          // Marketing Campaigns
          const { data: marketingData, error: marketingError } = await supabase
            .from("budgets")
            .select("id, department, allocated, spent")
            .eq("project_id", projectId)
            .eq("department", "Marketing");
          if (marketingError)
            console.error("Marketing fetch error:", marketingError);
          else {
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
            .select("id, status, deadline, description")
            .eq("project_id", projectId)
            .order("deadline", { ascending: true })
            .limit(3);
          if (scheduleError)
            console.error("Schedule fetch error:", scheduleError);
          else {
            const endDate = new Date(project.end_date);
            setReleases(
              scheduleData?.length > 0
                ? scheduleData.map((schedule, idx) => ({
                    id: schedule.id,
                    platform:
                      schedule.description ||
                      ["Theatrical", "OTT", "Satellite Rights"][idx],
                    date: schedule.deadline,
                    status:
                      schedule.status ||
                      ["Scheduled", "Under Discussion", "In Negotiation"][idx],
                    markets: ["Pan India", "Worldwide", "Malayalam States"][
                      idx
                    ],
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

      if (section === "theaters") {
        // Update existing theaters
        for (const theater of theaters.filter((t) => t.id !== undefined)) {
          const revenueNum =
            parseFloat(theater.revenue.replace(/[^0-9.]/g, "")) *
            (theater.revenue.includes("Cr") ? 10000000 : 100000);
          const { error } = await supabase
            .from(table)
            .update({
              project_id: projectId,
              region: theater.region,
              screens: theater.screens,
              revenue: revenueNum,
              status: theater.status,
            })
            .eq("id", theater.id);
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
              project_id: projectId,
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
              project_id: projectId,
              department: campaign.campaign,
              allocated: budgetNum,
              spent: spentNum,
            })
            .eq("id", campaign.id);
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
              project_id: projectId,
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
              project_id: projectId,
              description: release.platform,
              status: release.status,
              deadline: release.date === "TBD" ? null : release.date,
            })
            .eq("id", release.id);
          if (error) throw error;
        }
        // Insert new release
        if (newRelease.platform) {
          const { data: insertedData, error } = await supabase
            .from(table)
            .insert({
              project_id: projectId,
              description: newRelease.platform,
              status: newRelease.status || "Scheduled",
              deadline:
                newRelease.date === "TBD" || !newRelease.date
                  ? null
                  : newRelease.date,
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
      const table = tableMap[section];
      const { error } = await supabase.from(table).delete().eq("id", id);
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
                    Distribution
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Release planning, marketing, delivery
                  </p>
                </div>
              </div>
            </header>

            <div className="p-6 space-y-6">
              {/* Theater Distribution */}
              <DashboardCard title="Theater Distribution" icon={Ticket}>
                <div className="space-y-3">
                  <div className="flex gap-2 mb-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editMode.theaters
                          ? handleCancel("theaters")
                          : setEditMode({ ...editMode, theaters: true })
                      }
                      className="flex-1"
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {editMode.theaters ? "Cancel Edit" : "Edit Theaters"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => editMode.theaters && handleAdd("theaters")}
                      disabled={!editMode.theaters || isSaving}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Theater
                    </Button>
                  </div>
                  {editMode.theaters && (
                    <div className="p-3 bg-secondary/20 rounded-lg space-y-2 mb-3">
                      <Input
                        placeholder="Region"
                        value={newTheater.region || ""}
                        onChange={(e) =>
                          setNewTheater({
                            ...newTheater,
                            region: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <Input
                        placeholder="Screens"
                        value={newTheater.screens || ""}
                        onChange={(e) =>
                          setNewTheater({
                            ...newTheater,
                            screens: parseInt(e.target.value) || 0,
                          })
                        }
                        type="number"
                        className="mb-2"
                      />
                      <Input
                        placeholder="Revenue (e.g., ₹1.5 Cr)"
                        value={newTheater.revenue || ""}
                        onChange={(e) =>
                          setNewTheater({
                            ...newTheater,
                            revenue: e.target.value,
                          })
                        }
                        className="mb-2"
                      />
                      <select
                        value={newTheater.status || "Pending"}
                        onChange={(e) =>
                          setNewTheater({
                            ...newTheater,
                            status: e.target.value,
                          })
                        }
                        className="w-full p-2 border border-input rounded-md mb-2"
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="In Negotiation">In Negotiation</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  )}
                  {theaters.map((theater, idx) => (
                    <div
                      key={theater.id || idx}
                      className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                    >
                      {editMode.theaters ? (
                        <>
                          <div className="flex-1 space-y-2 mr-2">
                            <Input
                              value={theater.region}
                              onChange={(e) => {
                                const newTheaters = [...theaters];
                                newTheaters[idx].region = e.target.value;
                                setTheaters(newTheaters);
                              }}
                              className="mb-2"
                            />
                            <Input
                              value={theater.screens}
                              onChange={(e) => {
                                const newTheaters = [...theaters];
                                newTheaters[idx].screens =
                                  parseInt(e.target.value) || 0;
                                setTheaters(newTheaters);
                              }}
                              type="number"
                              className="mb-2"
                            />
                            <Input
                              value={theater.revenue}
                              onChange={(e) => {
                                const newTheaters = [...theaters];
                                newTheaters[idx].revenue = e.target.value;
                                setTheaters(newTheaters);
                              }}
                              className="mb-2"
                            />
                            <select
                              value={theater.status}
                              onChange={(e) => {
                                const newTheaters = [...theaters];
                                newTheaters[idx].status = e.target.value;
                                setTheaters(newTheaters);
                              }}
                              className="w-full p-2 border border-input rounded-md mb-2"
                            >
                              <option value="Confirmed">Confirmed</option>
                              <option value="In Negotiation">
                                In Negotiation
                              </option>
                              <option value="Pending">Pending</option>
                            </select>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDelete("theaters", theater.id!)
                            }
                            disabled={isSaving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="font-medium text-sm">
                              {theater.region}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {theater.screens} screens
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                theater.status === "Confirmed"
                                  ? "default"
                                  : "outline"
                              }
                              className="text-xs mb-1"
                            >
                              {theater.status}
                            </Badge>
                            <p className="text-xs font-bold">
                              {theater.revenue}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {editMode.theaters && (
                    <Button
                      variant="default"
                      onClick={() => handleSave("theaters")}
                      disabled={isSaving}
                      className="mt-3"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
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
                              disabled={isSaving}
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
                            disabled={isSaving}
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
