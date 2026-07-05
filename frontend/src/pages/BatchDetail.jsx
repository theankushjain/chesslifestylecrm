import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, X, Trash2, CheckCircle2, XCircle, Clock, Users, Save, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { DAYS } from "./Classes";

export default function BatchDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [batch, setBatch] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceState, setAttendanceState] = useState({}); // {student_id: 'present'|'absent'|'late'}
  const [topic, setTopic] = useState("");
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canDelete = user.role === "admin";

  const load = async () => {
    const [b, s] = await Promise.all([api.get(`/batches/${id}`), api.get(`/students`)]);
    setBatch(b.data);
    setAllStudents(s.data);
  };
  useEffect(() => { load(); }, [id]);

  const loadAttendance = async (dateStr) => {
    if (!batch) return;
    const { data } = await api.get(`/batches/${id}/attendance`, { params: { target_date: dateStr } });
    const state = {};
    for (const r of data.records) {
      state[r.student_id] = r.status || "present"; // default to present
    }
    setAttendanceState(state);
    setTopic(data.records.find((r) => r.topic)?.topic || "");
  };
  useEffect(() => { if (batch) loadAttendance(attendanceDate); }, [batch, attendanceDate]);

  const studentsInBatch = useMemo(() => {
    const map = new Map(allStudents.map((s) => [s.id, s]));
    return (batch?.student_ids || []).map((sid) => map.get(sid)).filter(Boolean);
  }, [batch, allStudents]);

  const studentsNotInBatch = useMemo(() => {
    const set = new Set(batch?.student_ids || []);
    return allStudents.filter((s) => !set.has(s.id));
  }, [batch, allStudents]);

  const toggleStatus = (sid) => {
    const cur = attendanceState[sid] || "present";
    const next = cur === "present" ? "absent" : cur === "absent" ? "late" : "present";
    setAttendanceState({ ...attendanceState, [sid]: next });
  };

  const markAllPresent = () => {
    const s = {};
    for (const st of studentsInBatch) s[st.id] = "present";
    setAttendanceState(s);
  };

  const saveAttendance = async () => {
    if (studentsInBatch.length === 0) {
      toast.error("Add students to the batch first");
      return;
    }
    setSavingAttendance(true);
    const absent_ids = studentsInBatch.filter((s) => attendanceState[s.id] === "absent").map((s) => s.id);
    const late_ids = studentsInBatch.filter((s) => attendanceState[s.id] === "late").map((s) => s.id);
    try {
      await api.post(`/batches/${id}/attendance`, { date: attendanceDate, topic, absent_ids, late_ids });
      toast.success(`Attendance saved for ${attendanceDate}`);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSavingAttendance(false); }
  };

  const addStudent = async (sid) => {
    const updated = [...(batch.student_ids || []), sid];
    try {
      const { data } = await api.patch(`/batches/${id}`, { student_ids: updated });
      setBatch(data);
      toast.success("Added to batch");
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const removeStudent = async (sid) => {
    const updated = (batch.student_ids || []).filter((x) => x !== sid);
    try {
      const { data } = await api.patch(`/batches/${id}`, { student_ids: updated });
      setBatch(data);
      toast.success("Removed from batch");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const addSlot = async () => {
    const updated = [...(batch.schedule || []), { day: "mon", time: "17:00", duration_min: 60 }];
    try {
      const { data } = await api.patch(`/batches/${id}`, { schedule: updated });
      setBatch(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const updateSlot = async (idx, patch) => {
    const updated = batch.schedule.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    try {
      const { data } = await api.patch(`/batches/${id}`, { schedule: updated });
      setBatch(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const removeSlot = async (idx) => {
    const updated = batch.schedule.filter((_, i) => i !== idx);
    try {
      const { data } = await api.patch(`/batches/${id}`, { schedule: updated });
      setBatch(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/batches/${id}`);
      toast.success("Batch deleted");
      nav("/classes");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  if (!batch) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => nav(-1)} className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="bg-white border border-border/60 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="label-over">{batch.level} · Batch</div>
            <h1 className="text-3xl font-serif" data-testid="batch-name">{batch.name}</h1>
            {batch.coach && <div className="text-sm text-muted-foreground mt-1">Coach: {batch.coach}</div>}
          </div>
          <div className="flex flex-col gap-2">
            {(user.role === "admin" || user.role === "staff") && (
              <button onClick={() => setEditOpen(true)} data-testid="batch-edit-btn"
                className="p-3 border border-border/60 hover:bg-secondary" title="Edit">
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button onClick={() => setDeleteOpen(true)} data-testid="batch-delete-btn"
                className="p-3 border border-border/60 hover:bg-destructive hover:text-destructive-foreground" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Take attendance */}
      <section className="bg-white border border-border/60 p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="label-over">Take attendance</div>
            <div className="text-xs text-muted-foreground mt-1">Everyone is present by default. Tap a student to mark absent or late.</div>
          </div>
          <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)}
            data-testid="attendance-date" className="rounded-none w-auto" />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-widest">Topic (optional)</Label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Rook Endgames"
            data-testid="attendance-topic" className="rounded-none mb-3" />
        </div>

        {studentsInBatch.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border/60">
            No students in this batch yet. Add some below.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">
                {studentsInBatch.length} student{studentsInBatch.length !== 1 ? 's' : ''}
                {" · "}
                <span className="text-success font-medium">{studentsInBatch.filter((s) => (attendanceState[s.id] || 'present') === 'present').length} present</span>
              </div>
              <button onClick={markAllPresent} data-testid="mark-all-present"
                className="text-[10px] uppercase tracking-widest border border-border/60 px-2 py-1 hover:bg-secondary">
                Reset all present
              </button>
            </div>
            <div className="divide-y divide-border/60 border border-border/60">
              {studentsInBatch.map((s) => {
                const status = attendanceState[s.id] || 'present';
                const config = {
                  present: { icon: CheckCircle2, color: "text-success", bg: "bg-success/5", label: "Present" },
                  absent: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/5", label: "Absent" },
                  late: { icon: Clock, color: "text-warning", bg: "bg-warning/5", label: "Late" },
                }[status];
                const Icon = config.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleStatus(s.id)}
                    data-testid={`attendance-row-${s.id}`}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${config.bg} hover:brightness-95`}
                  >
                    <Icon className={`w-5 h-5 ${config.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{s.name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.level}</div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-medium ${config.color}`}>{config.label}</span>
                  </button>
                );
              })}
            </div>
            <Button onClick={saveAttendance} disabled={savingAttendance} data-testid="save-attendance"
              className="w-full mt-4 rounded-none h-11">
              <Save className="w-4 h-4 mr-1.5" />
              {savingAttendance ? "Saving..." : `Save attendance for ${attendanceDate}`}
            </Button>
          </>
        )}
      </section>

      {/* Schedule */}
      <section className="bg-white border border-border/60 p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="label-over">Weekly schedule</div>
            <div className="text-xs text-muted-foreground mt-1">When this batch meets each week.</div>
          </div>
          <Button size="sm" variant="outline" onClick={addSlot} data-testid="add-slot-btn" className="rounded-none">
            <Plus className="w-3.5 h-3.5 mr-1" /> Slot
          </Button>
        </div>
        <div className="space-y-2">
          {(batch.schedule || []).map((slot, i) => (
            <div key={i} className="flex items-center gap-2 border border-border/60 p-2">
              <Select value={slot.day} onValueChange={(v) => updateSlot(i, { day: v })}>
                <SelectTrigger className="rounded-none w-28" data-testid={`slot-day-${i}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="time" value={slot.time} onChange={(e) => updateSlot(i, { time: e.target.value })}
                data-testid={`slot-time-${i}`} className="rounded-none w-32" />
              <Input type="number" min="15" step="15" value={slot.duration_min}
                onChange={(e) => updateSlot(i, { duration_min: Number(e.target.value) })}
                data-testid={`slot-duration-${i}`} className="rounded-none w-20" />
              <span className="text-xs text-muted-foreground">min</span>
              <button onClick={() => removeSlot(i)} data-testid={`slot-remove-${i}`}
                className="ml-auto p-1.5 hover:bg-destructive/10 text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(!batch.schedule || batch.schedule.length === 0) && (
            <div className="p-4 text-center text-sm text-muted-foreground border border-dashed border-border/60">
              No schedule yet. Add a slot to define when this batch meets.
            </div>
          )}
        </div>
      </section>

      {/* Students in batch */}
      <section className="bg-white border border-border/60 p-6">
        <div className="label-over mb-3">Students in this batch ({studentsInBatch.length})</div>
        <div className="space-y-1 mb-4">
          {studentsInBatch.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-2 border border-border/60">
              <div>
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.level}</div>
              </div>
              <button onClick={() => removeStudent(s.id)} data-testid={`remove-student-${s.id}`}
                className="p-1.5 text-destructive hover:bg-destructive/10">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {studentsInBatch.length === 0 && (
            <div className="text-sm text-muted-foreground">No students yet.</div>
          )}
        </div>
        {studentsNotInBatch.length > 0 && (
          <div>
            <div className="label-over mb-2">Add student</div>
            <Select value="" onValueChange={addStudent}>
              <SelectTrigger data-testid="add-student-to-batch" className="rounded-none">
                <SelectValue placeholder="Choose a student to add..." />
              </SelectTrigger>
              <SelectContent>
                {studentsNotInBatch.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} — {s.level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <BatchEditDialog batch={batch} onSaved={() => { setEditOpen(false); load(); }} />
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">Delete this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the batch and its schedule. Student attendance records are kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="batch-delete-confirm"
              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BatchEditDialog({ batch, onSaved }) {
  const [form, setForm] = useState({ name: batch.name, level: batch.level, coach: batch.coach || "", notes: batch.notes || "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/batches/${batch.id}`, form);
      toast.success("Batch updated");
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };
  return (
    <DialogContent className="rounded-none max-w-lg">
      <DialogHeader><DialogTitle className="font-serif text-2xl">Edit batch</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-widest">Batch name</Label>
          <Input data-testid="batch-edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest">Level</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Beginner", "Intermediate", "Advanced"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Coach</Label>
            <Input value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value })} className="rounded-none" />
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-none" rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !form.name} data-testid="batch-edit-save" className="rounded-none">
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
