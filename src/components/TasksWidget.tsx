import { DashboardCard } from "./DashboardCard";
import { CheckSquare, Edit, Trash } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// Define interface for task data
interface Task {
  id: string;
  task: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  project_id: string;
}

export function TasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    task: "",
    priority: "medium" as "high" | "medium" | "low",
    completed: false,
  });

  // Fetch tasks from Supabase
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const selectedProjectId = localStorage.getItem("selectedProjectId");
        if (!selectedProjectId) {
          setError("No project selected.");
          setTasks([]);
          return;
        }

        const { data, error } = await supabase
          .from("tasks")
          .select("id, task, completed, priority, project_id")
          .eq("project_id", selectedProjectId)
          .order("priority", { ascending: false }); // High priority first

        if (error) {
          console.error("Error fetching tasks:", error);
          setError("Failed to fetch task data.");
          setTasks([]);
          return;
        }

        setTasks(data || []);
      } catch (err) {
        console.error("Unexpected error fetching tasks:", err);
        setError("An unexpected error occurred while fetching task data.");
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Handle opening the form for adding or editing
  const handleOpenForm = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        task: task.task,
        priority: task.priority,
        completed: task.completed,
      });
    } else {
      setEditingTask(null);
      setFormData({ task: "", priority: "medium", completed: false });
    }
    setDialogOpen(true);
  };

  // Handle form input changes
  const handleFormChange = (
    field: keyof typeof formData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle task creation or update
  const handleSaveTask = async () => {
    try {
      const selectedProjectId = localStorage.getItem("selectedProjectId");
      if (!selectedProjectId) {
        setError("No project selected.");
        return;
      }

      if (!formData.task.trim()) {
        setError("Task description is required.");
        return;
      }

      if (editingTask) {
        // Update existing task
        const { error } = await supabase
          .from("tasks")
          .update({
            task: formData.task,
            priority: formData.priority,
            completed: formData.completed,
          })
          .eq("id", editingTask.id);

        if (error) {
          console.error("Error updating task:", error);
          setError("Failed to update task.");
          return;
        }

        setTasks((prev) =>
          prev.map((t) =>
            t.id === editingTask.id
              ? {
                  ...t,
                  task: formData.task,
                  priority: formData.priority,
                  completed: formData.completed,
                }
              : t
          )
        );
      } else {
        // Create new task
        const { data, error } = await supabase
          .from("tasks")
          .insert([
            {
              task: formData.task,
              priority: formData.priority,
              completed: formData.completed,
              project_id: selectedProjectId,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Error creating task:", error);
          setError("Failed to create task.");
          return;
        }

        setTasks((prev) => [...prev, data]);
      }

      setDialogOpen(false);
      setEditingTask(null);
      setFormData({ task: "", priority: "medium", completed: false });
    } catch (err) {
      console.error("Unexpected error saving task:", err);
      setError("An unexpected error occurred while saving task.");
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) {
        console.error("Error deleting task:", error);
        setError("Failed to delete task.");
        return;
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("Unexpected error deleting task:", err);
      setError("An unexpected error occurred while deleting task.");
    }
  };

  // Handle toggling completed status
  const handleToggleCompleted = async (
    taskId: string,
    currentCompleted: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ completed: !currentCompleted })
        .eq("id", taskId);

      if (error) {
        console.error("Error updating task completion:", error);
        setError("Failed to update task completion.");
        return;
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, completed: !currentCompleted } : t
        )
      );
    } catch (err) {
      console.error("Unexpected error updating task completion:", err);
      setError("An unexpected error occurred while updating task completion.");
    }
  };

  return (
    <DashboardCard title="Priority Tasks" icon={CheckSquare}>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading task data...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks available.</p>
      ) : (
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => handleOpenForm()}
          >
            Add New Task
          </Button>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={() =>
                  handleToggleCompleted(task.id, task.completed)
                }
                className="mt-0.5"
              />
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    task.completed
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {task.task}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                    task.priority === "high"
                      ? "bg-destructive/10 text-destructive"
                      : task.priority === "medium"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {task.priority}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenForm(task)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTask(task.id)}
                >
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Edit Task" : "Add New Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task">Task Description</Label>
              <Input
                id="task"
                value={formData.task}
                onChange={(e) => handleFormChange("task", e.target.value)}
                placeholder="Enter task description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  handleFormChange(
                    "priority",
                    value as "high" | "medium" | "low"
                  )
                }
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="completed"
                checked={formData.completed}
                onCheckedChange={(checked) =>
                  handleFormChange("completed", checked as boolean)
                }
              />
              <Label htmlFor="completed">Mark as Completed</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardCard>
  );
}
