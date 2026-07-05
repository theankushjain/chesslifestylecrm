import { useState, useEffect } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Calendar, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

export default function Tasks() {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === "admin" || user?.role === "staff";
  
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assignee: "all_staff",
    due_date: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [taskRes, userRes, stuRes, batchRes] = await Promise.all([
        api.get("/tasks"),
        isAdminOrStaff ? api.get("/users").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        isAdminOrStaff ? api.get("/students").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        isAdminOrStaff ? api.get("/batches").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setTasks(taskRes.data);
      if (isAdminOrStaff) {
        setUsers(userRes.data);
        setStudents(stuRes.data);
        setBatches(batchRes.data);
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post("/tasks", form);
      toast.success("Task created");
      setForm({ ...form, title: "", description: "", due_date: "" });
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const toggleStatus = async (task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const getAssigneeLabel = (assigneeId) => {
    if (assigneeId === "all_staff") return "All Staff";
    if (assigneeId === "all_students") return "All Students";
    const u = users.find(x => x.id === assigneeId);
    if (u) return u.name;
    const s = students.find(x => x.id === assigneeId);
    if (s) return s.name;
    const b = batches.find(x => x.id === assigneeId);
    if (b) return `Batch: ${b.name}`;
    return "Unknown";
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const pendingTasks = tasks.filter(t => t.status !== "completed");
  const completedTasks = tasks.filter(t => t.status === "completed");

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <CheckSquare className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-semibold tracking-tight">Assignments & To-Dos</h1>
          <p className="text-muted-foreground mt-1">Manage tasks and homework assignments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {isAdminOrStaff && (
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Assign Task</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label>Assignee</Label>
                    <Select value={form.assignee} onValueChange={(v) => setForm({ ...form, assignee: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Global Groups</SelectLabel>
                          <SelectItem value="all_staff">All Staff</SelectItem>
                          <SelectItem value="all_students">All Students</SelectItem>
                        </SelectGroup>
                        {batches.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Batches</SelectLabel>
                            {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectGroup>
                        )}
                        {users.filter(u => u.role !== 'student').length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Staff Members</SelectLabel>
                            {users.filter(u => u.role !== 'student').map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                          </SelectGroup>
                        )}
                        {students.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Individual Students</SelectLabel>
                            {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Due Date (Optional)</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>

                  <Button type="submit" className="w-full">Create Task</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <div className={`lg:col-span-${isAdminOrStaff ? '2' : '3'} space-y-8`}>
          <div>
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              Pending Tasks
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
            </h3>
            <div className="space-y-3">
              {pendingTasks.map(task => (
                <div key={task.id} className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors flex gap-4 group">
                  <div className="pt-1">
                    <div 
                      onClick={() => toggleStatus(task)}
                      className="w-5 h-5 rounded border-2 border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary group-hover:bg-primary/5 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-medium">
                      {isAdminOrStaff && (
                        <div className="flex items-center gap-1.5 bg-secondary px-2 py-1 rounded">
                          <UserIcon className="w-3.5 h-3.5" />
                          {getAssigneeLabel(task.assignee)}
                        </div>
                      )}
                      {task.due_date && (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${new Date(task.due_date) < new Date() ? 'bg-rose-100 text-rose-700' : 'bg-secondary'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {pendingTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                  You're all caught up!
                </div>
              )}
            </div>
          </div>

          {completedTasks.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 text-muted-foreground">Completed</h3>
              <div className="space-y-3 opacity-60">
                {completedTasks.map(task => (
                  <div key={task.id} className="p-4 rounded-xl border bg-secondary flex gap-4">
                    <div className="pt-1">
                      <div 
                        onClick={() => toggleStatus(task)}
                        className="w-5 h-5 rounded border-2 border-primary bg-primary flex items-center justify-center cursor-pointer"
                      >
                        <CheckSquare className="w-3 h-3 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium line-through">{task.title}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
