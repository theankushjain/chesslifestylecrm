import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Plus,
  X,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Save,
  Pencil,
  Building2,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { DAYS } from "./Classes";
import BatchTopicPickerModal from "@/components/crm/BatchTopicPickerModal";

export default function BatchDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [batch, setBatch] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [batchOutcomes, setBatchOutcomes] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceState, setAttendanceState] = useState({}); // {student_id: 'present'|'absent'|'late'}

  // Topic & Learning Progress Outcomes state
  const [selectedOutcomeTexts, setSelectedOutcomeTexts] = useState([]);
  const [customTopics, setCustomTopics] = useState([]);
  const [customTopicInput, setCustomTopicInput] = useState("");
  const [topicNotes, setTopicNotes] = useState("");
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);

  const [savingAttendance, setSavingAttendance] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canDelete = user.role === "admin";

  const loadData = async () => {
    try {
      const [b, s, instRes] = await Promise.all([
        api.get(`/batches/${id}`),
        api.get(`/students`),
        api.get(`/institutes`).catch(() => ({ data: [] })),
      ]);
      setBatch(b.data);
      setAllStudents(s.data);
      setInstitutes(instRes.data);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const loadOutcomes = async () => {
    try {
      const res = await api.get(`/batches/${id}/outcomes`);
      setBatchOutcomes(res.data.outcomes || []);
    } catch (e) {
      // silently fallback
    }
  };

  useEffect(() => {
    loadData();
    loadOutcomes();
  }, [id]);

  const loadAttendance = async (dateStr) => {
    if (!batch) return;
    try {
      const { data } = await api.get(`/batches/${id}/attendance`, { params: { target_date: dateStr } });
      const state = {};
      for (const r of data.records) {
        state[r.student_id] = r.status || "present"; // default to present
      }
      setAttendanceState(state);

      const existingTopic = data.records.find((r) => r.topic)?.topic || "";
      setTopicNotes(existingTopic);

      if (existingTopic) {
        const parts = existingTopic.split(",").map((p) => p.trim()).filter(Boolean);
        const outcomeTextsSet = new Set((batchOutcomes || []).map((o) => o.text));
        const matchedOutcomes = [];
        const matchedCustom = [];

        parts.forEach((p) => {
          if (outcomeTextsSet.has(p)) {
            matchedOutcomes.push(p);
          } else {
            matchedCustom.push(p);
          }
        });
        setSelectedOutcomeTexts(matchedOutcomes);
        setCustomTopics(matchedCustom);
      } else {
        setSelectedOutcomeTexts([]);
        setCustomTopics([]);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  useEffect(() => {
    if (batch) loadAttendance(attendanceDate);
  }, [batch, attendanceDate]);

  const studentsInBatch = useMemo(() => {
    const map = new Map(allStudents.map((s) => [s.id, s]));
    return (batch?.student_ids || []).map((sid) => map.get(sid)).filter(Boolean);
  }, [batch, allStudents]);

  const studentsNotInBatch = useMemo(() => {
    const set = new Set(batch?.student_ids || []);
    const list = allStudents.filter((s) => !set.has(s.id));
    if (batch?.institute_id) {
      // Sort students from the mapped institution to the top
      return [...list].sort((a, b) => {
        const aSame = a.institute_id === batch.institute_id ? -1 : 1;
        const bSame = b.institute_id === batch.institute_id ? -1 : 1;
        if (aSame !== bSame) return aSame - bSame;
        return a.name.localeCompare(b.name);
      });
    }
    return list;
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

  // Outcome & Topic handling
  const handleToggleOutcome = (text) => {
    setSelectedOutcomeTexts((prev) =>
      prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]
    );
  };

  const handleAddCustomTopic = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!customTopics.includes(trimmed)) {
      setCustomTopics((prev) => [...prev, trimmed]);
    }
  };

  const handleRemoveCustomTopic = (text) => {
    setCustomTopics((prev) => prev.filter((t) => t !== text));
  };

  const handleClearAllTopics = () => {
    setSelectedOutcomeTexts([]);
    setCustomTopics([]);
    setTopicNotes("");
  };

  const handleInlineAddCustom = (e) => {
    if (e) e.preventDefault();
    if (!customTopicInput.trim()) return;
    handleAddCustomTopic(customTopicInput);
    setCustomTopicInput("");
  };

  const combinedTopicString = useMemo(() => {
    const list = [...selectedOutcomeTexts, ...customTopics];
    if (list.length > 0) return list.join(", ");
    return topicNotes;
  }, [selectedOutcomeTexts, customTopics, topicNotes]);

  const saveAttendance = async () => {
    if (studentsInBatch.length === 0) {
      toast.error("Add students to the batch first");
      return;
    }
    setSavingAttendance(true);
    const absent_ids = studentsInBatch.filter((s) => attendanceState[s.id] === "absent").map((s) => s.id);
    const late_ids = studentsInBatch.filter((s) => attendanceState[s.id] === "late").map((s) => s.id);

    try {
      await api.post(`/batches/${id}/attendance`, {
        date: attendanceDate,
        topic: combinedTopicString,
        absent_ids,
        late_ids,
        selected_outcome_texts: selectedOutcomeTexts,
        custom_topics: customTopics,
      });

      const attendedCount = studentsInBatch.length - absent_ids.length;
      if (selectedOutcomeTexts.length > 0 || customTopics.length > 0) {
        toast.success(`Attendance saved & learning progress updated for ${attendedCount} attending students!`);
      } else {
        toast.success(`Attendance saved for ${attendanceDate}`);
      }

      // Refresh outcomes data to reflect new completion counters immediately
      loadOutcomes();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSavingAttendance(false);
    }
  };

  const addStudent = async (sid) => {
    const updated = [...(batch.student_ids || []), sid];
    try {
      const { data } = await api.patch(`/batches/${id}`, { student_ids: updated });
      setBatch(data);
      loadOutcomes();
      toast.success("Added to batch");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const removeStudent = async (sid) => {
    const updated = (batch.student_ids || []).filter((x) => x !== sid);
    try {
      const { data } = await api.patch(`/batches/${id}`, { student_ids: updated });
      setBatch(data);
      loadOutcomes();
      toast.success("Removed from batch");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const addSlot = async () => {
    const updated = [...(Array.isArray(batch.schedule) ? batch.schedule : []), { day: "mon", time: "17:00", duration_min: 60 }];
    try {
      const { data } = await api.patch(`/batches/${id}`, { schedule: updated });
      setBatch(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const updateSlot = async (idx, patch) => {
    const updated = (Array.isArray(batch.schedule) ? batch.schedule : []).map((s, i) => (i === idx ? { ...s, ...patch } : s));
    try {
      const { data } = await api.patch(`/batches/${id}`, { schedule: updated });
      setBatch(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const removeSlot = async (idx) => {
    const updated = (Array.isArray(batch.schedule) ? batch.schedule : []).filter((_, i) => i !== idx);
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

      {/* Header card with mapped Institution */}
      <div className="bg-white border border-border/40 shadow-sm rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="label-over">{batch.level} · Batch</span>
              {batch.institute_name ? (
                <Link
                  to={`/institutes/${batch.institute_id}`}
                  className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-0.5 rounded-full transition-colors font-medium"
                  title="View Institution Details"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{batch.institute_name}</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Independent / General Batch</span>
                </span>
              )}
            </div>
            <h1 className="text-3xl font-serif" data-testid="batch-name">{batch.name}</h1>
            {batch.coach && <div className="text-sm text-muted-foreground mt-1">Coach: {batch.coach}</div>}
            {batch.notes && <div className="text-xs text-muted-foreground mt-2 italic">{batch.notes}</div>}
          </div>
          <div className="flex flex-col gap-2">
            {(user.role === "admin" || user.role === "staff") && (
              <button onClick={() => setEditOpen(true)} data-testid="batch-edit-btn"
                className="p-3 border border-border/40 shadow-sm rounded-xl hover:bg-secondary" title="Edit Batch & Institution">
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button onClick={() => setDeleteOpen(true)} data-testid="batch-delete-btn"
                className="p-3 border border-border/40 shadow-sm rounded-xl hover:bg-destructive hover:text-destructive-foreground" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Take attendance & Topics */}
      <section className="bg-white border border-border/40 shadow-sm rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="label-over">Take attendance & teach topics</div>
            <div className="text-xs text-muted-foreground mt-1">
              Select taught learning outcomes below. Attending students are automatically updated.
            </div>
          </div>
          <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)}
            data-testid="attendance-date" className="rounded-xl w-auto" />
        </div>

        {/* Enhanced Topic Field & Learning Outcomes Selector */}
        <div className="bg-muted/15 border border-border/40 rounded-xl p-4 mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Label className="text-xs uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>Class Topics & Learning Progress Outcomes</span>
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Select from syllabus outcomes and/or add custom topics taught in this class.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTopicPickerOpen(true)}
              className="rounded-xl h-8 text-xs shrink-0 bg-white shadow-sm hover:border-primary"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5 text-primary" /> Browse Outcomes Checklist
            </Button>
          </div>

          {/* Selected Topics Chips */}
          <div className="flex flex-wrap items-center gap-1.5 min-h-[32px] pt-1">
            {selectedOutcomeTexts.map((text) => {
              const outcomeData = (batchOutcomes || []).find((o) => o.text === text);
              return (
                <span
                  key={text}
                  className="inline-flex items-center gap-1.5 text-xs bg-white text-foreground border border-primary/30 shadow-xs px-2.5 py-1 rounded-lg"
                  title={text}
                >
                  <BookOpen className="w-3 h-3 text-primary shrink-0" />
                  <span className="font-medium max-w-[280px] truncate">{text}</span>
                  {outcomeData && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-mono">
                      {outcomeData.completed_count}/{outcomeData.total_students} done
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleOutcome(text)}
                    className="hover:text-destructive p-0.5"
                    title="Remove outcome"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {customTopics.map((ct) => (
              <span
                key={ct}
                className="inline-flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/30 px-2.5 py-1 rounded-lg"
                title={ct}
              >
                <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="font-medium max-w-[280px] truncate">{ct}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCustomTopic(ct)}
                  className="hover:text-destructive p-0.5"
                  title="Remove custom topic"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedOutcomeTexts.length === 0 && customTopics.length === 0 && (
              <span className="text-xs text-muted-foreground italic">
                No topics selected yet. Pick outcomes from the syllabus or add a custom topic below.
              </span>
            )}

            {(selectedOutcomeTexts.length > 0 || customTopics.length > 0) && (
              <button
                type="button"
                onClick={handleClearAllTopics}
                className="text-[11px] text-destructive hover:underline ml-2"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Quick Custom Topic Input */}
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={customTopicInput}
              onChange={(e) => setCustomTopicInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInlineAddCustom(e)}
              placeholder="Or add custom topic (e.g. Blitz tournament, Queen's Gambit trap)..."
              data-testid="attendance-topic"
              className="rounded-xl h-9 text-xs bg-white"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleInlineAddCustom}
              disabled={!customTopicInput.trim()}
              className="rounded-xl h-9 text-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>

        {studentsInBatch.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-xl">
            No students in this batch yet. Add some below.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">
                {studentsInBatch.length} student{studentsInBatch.length !== 1 ? 's' : ''}
                {" · "}
                <span className="text-success font-medium">
                  {studentsInBatch.filter((s) => (attendanceState[s.id] || 'present') !== 'absent').length} attending
                </span>
                {" ("}
                <span>{studentsInBatch.filter((s) => (attendanceState[s.id] || 'present') === 'present').length} present</span>
                {studentsInBatch.filter((s) => attendanceState[s.id] === 'late').length > 0 && (
                  <span>, {studentsInBatch.filter((s) => attendanceState[s.id] === 'late').length} late</span>
                )}
                {")"}
              </div>
              <button onClick={markAllPresent} data-testid="mark-all-present"
                className="text-[10px] uppercase tracking-widest border border-border/40 shadow-sm rounded-xl px-2 py-1 hover:bg-secondary">
                Reset all present
              </button>
            </div>
            <div className="divide-y divide-border/60 border border-border/40 shadow-sm rounded-xl overflow-hidden">
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
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {s.level}
                        {s.institute_name && ` · ${s.institute_name}`}
                      </div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-medium ${config.color}`}>{config.label}</span>
                  </button>
                );
              })}
            </div>
            <Button onClick={saveAttendance} disabled={savingAttendance} data-testid="save-attendance"
              className="w-full mt-4 rounded-xl h-11">
              <Save className="w-4 h-4 mr-1.5" />
              {savingAttendance ? "Saving..." : `Save attendance & update progress for ${attendanceDate}`}
            </Button>
          </>
        )}
      </section>

      {/* Schedule */}
      <section className="bg-white border border-border/40 shadow-sm rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="label-over">Weekly schedule</div>
            <div className="text-xs text-muted-foreground mt-1">When this batch meets each week.</div>
          </div>
          <Button size="sm" variant="outline" onClick={addSlot} data-testid="add-slot-btn" className="rounded-xl">
            <Plus className="w-3.5 h-3.5 mr-1" /> Slot
          </Button>
        </div>
        <div className="space-y-2">
          {(Array.isArray(batch.schedule) ? batch.schedule : []).map((slot, i) => (
            <div key={i} className="flex items-center gap-2 border border-border/40 shadow-sm rounded-xl p-2">
              <Select value={slot.day} onValueChange={(v) => updateSlot(i, { day: v })}>
                <SelectTrigger className="rounded-xl w-28" data-testid={`slot-day-${i}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="time" value={slot.time} onChange={(e) => updateSlot(i, { time: e.target.value })}
                data-testid={`slot-time-${i}`} className="rounded-xl w-32" />
              <Input type="number" min="15" step="15" value={slot.duration_min}
                onChange={(e) => updateSlot(i, { duration_min: Number(e.target.value) })}
                data-testid={`slot-duration-${i}`} className="rounded-xl w-20" />
              <span className="text-xs text-muted-foreground">min</span>
              <button onClick={() => removeSlot(i)} data-testid={`slot-remove-${i}`}
                className="ml-auto p-1.5 hover:bg-destructive/10 text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(!Array.isArray(batch.schedule) || batch.schedule.length === 0) && (
            <div className="p-4 text-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-xl">
              No schedule yet. Add a slot to define when this batch meets.
            </div>
          )}
        </div>
      </section>

      {/* Students in batch */}
      <section className="bg-white border border-border/40 shadow-sm rounded-xl p-6">
        <div className="label-over mb-3">Students in this batch ({studentsInBatch.length})</div>
        <div className="space-y-1 mb-4">
          {studentsInBatch.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-2.5 border border-border/40 shadow-sm rounded-xl hover:bg-muted/10 transition-colors">
              <div>
                <Link to={`/students/${s.id}`} className="text-sm font-medium hover:underline">{s.name}</Link>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{s.level}</span>
                  {s.institute_name && (
                    <span className="text-primary font-medium">· {s.institute_name}</span>
                  )}
                </div>
              </div>
              <button onClick={() => removeStudent(s.id)} data-testid={`remove-student-${s.id}`}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg" title="Remove from batch">
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
            <div className="label-over mb-2">Add student to batch</div>
            <Select value="" onValueChange={addStudent}>
              <SelectTrigger data-testid="add-student-to-batch" className="rounded-xl">
                <SelectValue placeholder="Choose a student to add..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 rounded-xl">
                {studentsNotInBatch.map((s) => {
                  const isSameInstitute = batch.institute_id && s.institute_id === batch.institute_id;
                  return (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.level}
                      {isSameInstitute ? ` (${batch.institute_name || "This Institute"})` : s.institute_name ? ` (${s.institute_name})` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </section>

      {/* Topic Picker Modal */}
      <BatchTopicPickerModal
        open={topicPickerOpen}
        onOpenChange={setTopicPickerOpen}
        batch={batch}
        outcomes={batchOutcomes}
        selectedOutcomeTexts={selectedOutcomeTexts}
        onToggleOutcome={handleToggleOutcome}
        customTopics={customTopics}
        onAddCustomTopic={handleAddCustomTopic}
        onRemoveCustomTopic={handleRemoveCustomTopic}
        onClearAll={handleClearAllTopics}
      />

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <BatchEditDialog
          batch={batch}
          institutes={institutes}
          onSaved={() => { setEditOpen(false); loadData(); }}
        />
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">Delete this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the batch and its schedule. Student attendance records are kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="batch-delete-confirm"
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BatchEditDialog({ batch, institutes = [], onSaved }) {
  const [form, setForm] = useState({
    name: batch.name,
    level: batch.level,
    coach: batch.coach || "",
    notes: batch.notes || "",
    institute_id: batch.institute_id || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/batches/${batch.id}`, {
        ...form,
        institute_id: form.institute_id || null,
      });
      toast.success("Batch updated");
      onSaved();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="rounded-xl max-w-lg">
      <DialogHeader><DialogTitle className="font-serif text-2xl">Edit batch</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-widest">Batch name</Label>
          <Input data-testid="batch-edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-widest">Institution</Label>
          <Select
            value={form.institute_id || "none"}
            onValueChange={(v) => setForm({ ...form, institute_id: v === "none" ? "" : v })}
          >
            <SelectTrigger data-testid="batch-edit-institute" className="rounded-xl">
              <SelectValue placeholder="Map to institution..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-60">
              <SelectItem value="none">No Institution (General Batch)</SelectItem>
              {institutes.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name} {inst.type ? `(${inst.type})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest">Level</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Beginner", "Intermediate", "Advanced"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Coach</Label>
            <Input value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value })} className="rounded-xl" />
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl" rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !form.name} data-testid="batch-edit-save" className="rounded-xl">
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
