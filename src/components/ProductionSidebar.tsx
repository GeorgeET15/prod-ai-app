import {
  Film,
  LayoutDashboard,
  Calendar,
  DollarSign,
  Users,
  ClipboardList,
  Clapperboard,
  Film as FilmIcon,
  Package,
  Plus,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { cn } from "@/lib/utils";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Pre-Production", url: "/pre-production", icon: ClipboardList },
  { title: "Production", url: "/production", icon: Clapperboard },
  { title: "Post-Production", url: "/post-production", icon: FilmIcon },
  { title: "Distribution", url: "/distribution", icon: Package },
  { title: "Budget & Finance", url: "/finance", icon: DollarSign },
  { title: "Schedule", url: "/schedule", icon: Calendar },
  { title: "Team & HR", url: "/team", icon: Users },
];

interface ProductionSidebarProps {
  selectedProjectId: string;
  projects: { id: string; name: string }[];
  onDeleteProject: () => Promise<void>;
  isSubmitting: boolean;
}

export function ProductionSidebar({
  selectedProjectId,
  projects,
  onDeleteProject,
  isSubmitting,
}: ProductionSidebarProps) {
  return (
    <Sidebar className="border-r border-border bg-card/50 backdrop-blur-sm w-64">
      <SidebarHeader className="border-b border-border p-6 bg-card rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary rounded-lg p-2 shadow-md">
            <Film className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Production Copilot
            </h2>
            <p className="text-xs text-muted-foreground">AI Production Suite</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-muted-foreground px-2 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/onboarding"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground font-medium shadow-sm"
                          : "text-foreground hover:bg-secondary/20 hover:shadow-sm"
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create New Project</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                            : "text-foreground hover:bg-secondary/20 hover:shadow-sm"
                        )
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4 bg-card rounded-lg shadow-sm">
        <SettingsDialog
          selectedProjectId={selectedProjectId}
          projects={projects}
          onDeleteProject={onDeleteProject}
          isSubmitting={isSubmitting}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
