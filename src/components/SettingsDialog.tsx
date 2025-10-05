import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Moon,
  Sun,
  Palette,
  Trash2,
  AlertCircle,
  Film,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface SettingsDialogProps {
  selectedProjectId: string;
  projects?: { id: string; name: string }[]; // optional for safety
  onDeleteProject: () => Promise<void>;
  isSubmitting: boolean;
}

export function SettingsDialog({
  selectedProjectId,
  projects = [], // default empty array
  onDeleteProject,
  isSubmitting,
}: SettingsDialogProps) {
  const { theme, setTheme, setAccentColor } = useTheme();
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // defensive: projects is always an array
  const project = projects.find((p) => p.id === selectedProjectId);

  const presetColors = [
    { name: "Purple", hue: 280, saturation: 65, lightness: 60 },
    { name: "Blue", hue: 220, saturation: 70, lightness: 55 },
    { name: "Green", hue: 150, saturation: 60, lightness: 50 },
    { name: "Orange", hue: 30, saturation: 90, lightness: 60 },
    { name: "Pink", hue: 330, saturation: 80, lightness: 60 },
    { name: "Teal", hue: 175, saturation: 70, lightness: 50 },
  ];

  const handlePresetClick = (preset: (typeof presetColors)[0]) => {
    setAccentColor({
      hue: preset.hue,
      saturation: preset.saturation,
      lightness: preset.lightness,
    });
  };

  const handleDeleteClick = () => {
    if (projects.length <= 1) {
      alert("Cannot delete the last project.");
      return;
    }
    setDeleteConfirmOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start text-foreground hover:bg-secondary/20 transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px] bg-card border-border rounded-md shadow-sm">
          <div className="flex items-center gap-3 p-4">
            <div className="bg-primary rounded-md p-1.5">
              <Film className="h-5 w-5 text-primary-foreground" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              Settings
            </DialogTitle>
          </div>

          <div className="space-y-4 px-4 pb-4">
            {/* Theme Toggle */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                {theme === "dark" ? (
                  <Moon className="h-3 w-3" />
                ) : (
                  <Sun className="h-3 w-3" />
                )}
                Theme
              </div>
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 text-xs hover:bg-secondary/20"
                  onClick={() => setTheme("light")}
                >
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 text-xs hover:bg-secondary/20"
                  onClick={() => setTheme("dark")}
                >
                  Dark
                </Button>
              </div>
            </div>

            {/* Accent Color Presets */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Palette className="h-3 w-3" />
                Accent Color
              </div>
              <div className="grid grid-cols-3 gap-2">
                {presetColors.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="ghost"
                    size="sm"
                    className="h-8 relative text-xs hover:bg-secondary/20"
                    onClick={() => handlePresetClick(preset)}
                  >
                    <div
                      className="absolute inset-0 opacity-10 rounded-md"
                      style={{
                        background: `hsl(${preset.hue} ${preset.saturation}% ${preset.lightness}%)`,
                      }}
                    />
                    <span className="relative z-10">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Project Management */}
            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <Trash2 className="h-3 w-3" />
                Project
              </div>
              <div className="text-xs text-muted-foreground">
                {project?.name || "N/A"}
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteClick}
                disabled={isSubmitting || projects.length <= 1}
                className="w-full text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
              {projects.length <= 1 && (
                <div className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Last project cannot be deleted
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-4 pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="text-xs hover:bg-secondary/20"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[350px] bg-card border-border rounded-md shadow-sm">
          <div className="flex items-center gap-3 p-4">
            <div className="bg-destructive rounded-md p-1.5">
              <Trash2 className="h-5 w-5 text-destructive-foreground" />
            </div>
            <DialogTitle className="text-xl font-bold text-destructive">
              Delete Project
            </DialogTitle>
          </div>
          <div className="px-4 pb-4 text-sm text-muted-foreground">
            Delete "{project?.name || "N/A"}"? This will remove all associated
            data and cannot be undone.
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isSubmitting}
              className="text-xs hover:bg-secondary/20"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                await onDeleteProject();
                setDeleteConfirmOpen(false);
                setOpen(false);
              }}
              disabled={isSubmitting}
              className="text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
