import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronRight, Users, Clock } from "lucide-react";
import { toast } from "sonner";

export const DAYS = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" },
];

export default function Classes() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await api.get("/batches");
    setBatches(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="label-over">Timetable</div>
          <h1 className="text-4xl font-serif">Classes</h1>
          <p className="text-sm text-muted-foreground mt-1">Batches with weekly schedules. Students in a batch are marked present by default.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-batch-btn" className="rounded-none h-10">
              <Plus className="w-4 h-4 mr-1.5" /> Add
            </Button>
          </DialogTrigger>
          <BatchCreateDialog onSaved={() => { setOpen(false); load(); }} />
        </Dialog>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="batches-list">
          {batches.map((b) => (
            <Link key={b.id} to={`/classes/${b.id}`} data-testid={`batch-card-${b.id}`}
              className="bg-white border border-border/60 p-5 hover:border-primary transition-colors group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="label-over text-[9px]">{b.level}</div>
                  <div className="text-xl font-serif mt-0.5">{b.name}</div>
                  {b.coach && <div className="text-xs text-muted-foreground mt-1">Coach: {b.coach}</div>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-mono">{b.student_ids.length} students</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-mono">{b.schedule.length}x / week</span>
                </div>
              </div>
              {b.schedule.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {b.schedule.map((s, i) => (
                    <span key={i} className="text-[10px] uppercase tracking-widest bg-secondary px-2 py-0.5 border border-border/60">
                      {s.day} {s.time}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
          {batches.length === 0 && (
            <div className="col-span-full p-8 text-center text-sm text-muted-foreground bg-white border border-border/60">
              No batches yet. Create one to start scheduling classes.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BatchCreateDialog({ onSaved }) {
  const [form, setForm] = useState({ name: "", level: "Beginner", coach: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.post("/batches", { ...form, student_ids: [], schedule: [] });
      toast.success("Batch created — add students and schedule next");
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };
  return (
    <DialogContent className="rounded-none max-w-lg">
      <DialogHeader><DialogTitle className="font-serif text-2xl">New batch</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-widest">Batch name</Label>
          <Input data-testid="batch-form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-none" placeholder="e.g. Weekend Intermediate" />
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
        <Button onClick={save} disabled={saving || !form.name} data-testid="batch-form-save" className="rounded-none">
          {saving ? "Saving..." : "Create"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
