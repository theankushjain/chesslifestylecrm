import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Phone, CheckCircle2, XCircle, Clock, Calendar, Pencil, Trash2, Cake } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { WhatsappIcon } from "@/components/crm/WhatsappIcon";
import { openWhatsapp, studentReminderMessage, studentBirthdayMessage, ageFromDob, nextBirthdayDays } from "@/lib/whatsapp";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const STATUS_ICONS = {
  present: { icon: CheckCircle2, color: "text-success" },
  absent: { icon: XCircle, color: "text-destructive" },
  late: { icon: Clock, color: "text-warning" },
};

export default function StudentDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canEdit = user.role === "admin" || user.role === "staff";
  const canDelete = user.role === "admin";

  const load = async () => {
    const [s, a, p] = await Promise.all([
      api.get(`/students/${id}`),
      api.get(`/attendance?student_id=${id}`),
      api.get(`/payments?student_id=${id}`),
    ]);
    setStudent(s.data);
    setAttendance(a.data);
    setPayments(p.data);
  };
  useEffect(() => { load(); }, [id]);

  const markAttendance = async (status) => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await api.post("/attendance", { student_id: id, date: today, status, topic: "Class" });
      toast.success(`Marked ${status} for today`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const markPaid = async (pid) => {
    try {
      await api.patch(`/payments/${pid}`, { status: "paid", method: "UPI" });
      toast.success("Payment marked paid");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/students/${id}`);
      toast.success("Student deleted");
      nav("/students");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const deletePayment = async (pid) => {
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    try {
      await api.delete(`/payments/${pid}`);
      toast.success("Payment deleted");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  if (!student) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => nav(-1)} className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-4" data-testid="back-btn">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="bg-white border border-border/60 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-primary text-primary-foreground flex items-center justify-center font-serif text-3xl">
            {student.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="label-over !mb-0">{student.level}</div>
              {student.tags?.map((t, i) => (
                <span key={i} className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 bg-primary/10 text-primary font-semibold rounded">{t}</span>
              ))}
            </div>
            <h1 className="text-3xl font-serif" data-testid="student-name">{student.name}</h1>
            <div className="mt-2 text-sm text-muted-foreground space-y-0.5">
              <div>{student.phone || "no phone"}</div>
              <div>Parent: {student.parent_name || "—"} · {student.parent_phone || "—"}</div>
              <div className="font-mono">₹{student.monthly_fee}/month</div>
              {student.dob && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Cake className="w-3.5 h-3.5 text-brand" />
                  <span>{new Date(student.dob).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                    {ageFromDob(student.dob) !== null && ` · ${ageFromDob(student.dob)} yrs`}
                    {(() => {
                      const d = nextBirthdayDays(student.dob);
                      if (d === null) return null;
                      if (d === 0) return <span className="ml-2 text-[10px] uppercase tracking-widest bg-brand text-white px-1.5 py-0.5">Today!</span>;
                      if (d <= 7) return <span className="ml-2 text-[10px] uppercase tracking-widest bg-warning text-white px-1.5 py-0.5">In {d}d</span>;
                      return null;
                    })()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {student.phone && (
              <a href={`tel:${student.phone}`} className="p-3 border border-border/60 hover:bg-secondary" data-testid="student-call-btn">
                <Phone className="w-4 h-4" />
              </a>
            )}
            {(student.parent_phone || student.phone) && (
              <button
                onClick={() => {
                  const unpaid = payments.find((p) => p.status !== "paid");
                  const daysToBday = nextBirthdayDays(student.dob);
                  const msg = daysToBday === 0
                    ? studentBirthdayMessage(student)
                    : studentReminderMessage(student, unpaid);
                  const ok = openWhatsapp(student.parent_phone || student.phone, msg);
                  if (!ok) toast.error("No valid phone number");
                }}
                data-testid="student-whatsapp-btn"
                title={nextBirthdayDays(student.dob) === 0 ? "Send birthday wish" : "Send WhatsApp reminder"}
                className="p-3 border border-border/60 text-[#25D366] hover:bg-[#25D366]/10">
                <WhatsappIcon className="w-4 h-4" />
              </button>
            )}
            {canEdit && (
              <button onClick={() => setEditOpen(true)} data-testid="student-edit-btn"
                className="p-3 border border-border/60 hover:bg-secondary" title="Edit">
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button onClick={() => setDeleteOpen(true)} data-testid="student-delete-btn"
                className="p-3 border border-border/60 hover:bg-destructive hover:text-destructive-foreground" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <StudentEditDialog student={student} onSaved={() => { setEditOpen(false); load(); }} />
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">Delete this student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{student.name}</strong> along with the ability to view their records here. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none" data-testid="student-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="student-delete-confirm"
              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick attendance */}
      <div className="mb-6">
        <div className="label-over mb-2">Mark today's attendance</div>
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => markAttendance("present")} data-testid="mark-present" className="rounded-none bg-success hover:bg-success/90">Present</Button>
          <Button onClick={() => markAttendance("absent")} data-testid="mark-absent" variant="destructive" className="rounded-none">Absent</Button>
          <Button onClick={() => markAttendance("late")} data-testid="mark-late" className="rounded-none bg-warning hover:bg-warning/90 text-white">Late</Button>
        </div>
      </div>

      {/* Payments */}
      <div className="mb-6">
        <div className="label-over mb-2">Fees</div>
        <div className="bg-white border border-border/60 divide-y divide-border/60">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium">{monthName(p.month)} {p.year}</div>
                <div className="text-xs text-muted-foreground font-mono">₹{p.amount} · {p.status}</div>
              </div>
              <div className="flex items-center gap-2">
                {p.status !== "paid" ? (
                  <Button size="sm" variant="outline" onClick={() => markPaid(p.id)} data-testid={`mark-paid-${p.id}`} className="rounded-none">Mark paid</Button>
                ) : (
                  <span className="text-xs text-success uppercase tracking-widest">Paid</span>
                )}
                <button onClick={() => deletePayment(p.id)} className="p-2 text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/30" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {payments.length === 0 && <div className="p-4 text-sm text-muted-foreground">No fee records.</div>}
        </div>
      </div>

      {/* Attendance history */}
      <div>
        <div className="label-over mb-2">Attendance (recent)</div>
        <div className="bg-white border border-border/60 divide-y divide-border/60">
          {attendance.slice(0, 10).map((a) => {
            const Icon = STATUS_ICONS[a.status]?.icon || Clock;
            const color = STATUS_ICONS[a.status]?.color || "";
            return (
              <div key={a.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <div>
                    <div className="text-sm">{a.date}</div>
                    <div className="text-xs text-muted-foreground">{a.topic || "—"}</div>
                  </div>
                </div>
                <span className="text-xs uppercase tracking-widest">{a.status}</span>
              </div>
            );
          })}
          {attendance.length === 0 && <div className="p-4 text-sm text-muted-foreground">No records.</div>}
        </div>
      </div>
    </div>
  );
}

const monthName = (m) => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1];

function StudentEditDialog({ student, onSaved }) {
  const [form, setForm] = useState({
    name: student.name, phone: student.phone || "", parent_name: student.parent_name || "",
    parent_phone: student.parent_phone || "", level: student.level || "Beginner",
    monthly_fee: student.monthly_fee || 0, notes: student.notes || "", status: student.status || "active",
    dob: student.dob || "", tags: student.tags || []
  });
  const [tagsStr, setTagsStr] = useState((student.tags || []).join(", "));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean)
      };
      await api.patch(`/students/${student.id}`, payload);
      toast.success("Student updated");
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <DialogContent className="rounded-none max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl">Edit student</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-widest">Name</Label>
          <Input data-testid="student-edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest">Phone</Label>
            <Input data-testid="student-edit-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-none" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Level</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest">Parent name</Label>
            <Input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} className="rounded-none" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Parent phone</Label>
            <Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} className="rounded-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest">Monthly fee (₹)</Label>
            <Input type="number" data-testid="student-edit-fee" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: Number(e.target.value) })} className="rounded-none" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
                <SelectItem value="exited">Exited</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-none" rows={3} />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Date of birth</Label>
          <Input type="date" data-testid="student-edit-dob" value={form.dob || ""} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="rounded-none" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Tags (comma-separated)</Label>
          <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="e.g. VIP, sibling, tournament" className="rounded-none" />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !form.name} data-testid="student-edit-save" className="rounded-none">
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
