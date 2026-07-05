import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Phone, Search, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { WhatsappIcon } from "@/components/crm/WhatsappIcon";
import { openWhatsapp, studentReminderMessage } from "@/lib/whatsapp";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await api.get("/students");
    setStudents(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    (s.phone || "").includes(query) ||
    (s.parent_name || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="label-over">Roster</div>
          <h1 className="text-4xl font-serif">Students</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-student-btn" className="rounded-none h-10">
              <Plus className="w-4 h-4 mr-1.5" /> Add
            </Button>
          </DialogTrigger>
          <StudentDialog onSaved={() => { setOpen(false); load(); }} />
        </Dialog>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name, phone or parent..." data-testid="student-search"
          value={query} onChange={(e) => setQuery(e.target.value)}
          className="pl-10 rounded-none bg-white" />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="bg-white border border-border/60 divide-y divide-border/60" data-testid="students-list">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <Link to={`/students/${s.id}`} data-testid={`student-row-${s.id}`}
                className="flex items-center gap-3 min-w-0 flex-1 p-4">
                <div className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center font-serif text-lg shrink-0">
                  {s.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2 truncate">
                    {s.name}
                    {s.tags?.length > 0 && (
                      <span className="flex items-center gap-1">
                        {s.tags.slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary uppercase tracking-wider font-semibold rounded">
                            {t}
                          </span>
                        ))}
                        {s.tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{s.tags.length - 2}</span>}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {s.level} · {s.phone || "no phone"}
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0 px-4">
                <span className="text-xs font-mono hidden sm:inline">₹{s.monthly_fee}/mo</span>
                {s.status === "active" ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                {(s.parent_phone || s.phone) && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation();
                      const ok = openWhatsapp(s.parent_phone || s.phone, studentReminderMessage(s, null));
                      if (!ok) toast.error("No valid phone number");
                    }}
                    data-testid={`whatsapp-student-${s.id}`}
                    title="Send WhatsApp"
                    className="p-1.5 text-[#25D366] hover:bg-[#25D366]/10 rounded transition-colors">
                    <WhatsappIcon className="w-4 h-4" />
                  </button>
                )}
                <Link to={`/students/${s.id}`} className="p-1">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No students found.</div>
          )}
        </div>
      )}
    </div>
  );
}

function StudentDialog({ onSaved, student }) {
  const [form, setForm] = useState(student || {
    name: "", phone: "", parent_name: "", parent_phone: "",
    level: "Beginner", monthly_fee: 2500, notes: "", status: "active", dob: "", tags: []
  });
  const [tagsStr, setTagsStr] = useState((student?.tags || []).join(", "));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean) 
      };
      if (student) {
        await api.patch(`/students/${student.id}`, payload);
        toast.success("Student updated");
      } else {
        await api.post("/students", payload);
        toast.success("Student added");
      }
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <DialogContent className="rounded-none max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl">{student ? "Edit student" : "New student"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-widest">Name</Label>
          <Input data-testid="student-form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest">Phone</Label>
            <Input data-testid="student-form-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-none" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Level</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
              <SelectTrigger data-testid="student-form-level" className="rounded-none"><SelectValue /></SelectTrigger>
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
        <div>
          <Label className="text-xs uppercase tracking-widest">Monthly fee (₹)</Label>
          <Input type="number" data-testid="student-form-fee" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: Number(e.target.value) })} className="rounded-none" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Date of birth</Label>
          <Input type="date" data-testid="student-form-dob" value={form.dob || ""} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="rounded-none" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Tags (comma-separated)</Label>
          <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="e.g. VIP, sibling, tournament" className="rounded-none" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-none" rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !form.name} data-testid="student-form-save" className="rounded-none">
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
