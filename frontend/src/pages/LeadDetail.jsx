import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Phone, Calendar, PhoneCall, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { STAGES } from "./Leads";
import { useAuth } from "@/context/AuthContext";

const OUTCOMES = ["answered", "no_answer", "interested", "not_interested", "voicemail", "busy"];

export default function LeadDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [call, setCall] = useState({ outcome: "answered", remarks: "", next_follow_up: "" });
  const [posting, setPosting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canDelete = user.role === "admin";

  const load = async () => {
    const { data } = await api.get(`/leads/${id}`);
    setLead(data);
  };
  useEffect(() => { load(); }, [id]);

  const updateStage = async (stage) => {
    try {
      await api.patch(`/leads/${id}`, { stage });
      toast.success(`Moved to ${stage.replace("_", " ")}`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const logCall = async () => {
    setPosting(true);
    try {
      await api.post(`/leads/${id}/calls`, {
        outcome: call.outcome, remarks: call.remarks,
        next_follow_up: call.next_follow_up || null,
      });
      toast.success("Call logged");
      setCall({ outcome: "answered", remarks: "", next_follow_up: "" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setPosting(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/leads/${id}`);
      toast.success("Lead deleted");
      nav("/leads");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  if (!lead) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;

  const currentStage = STAGES.find((s) => s.key === lead.stage);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => nav(-1)} className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="bg-white border border-border/60 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="label-over">Lead</div>
            <h1 className="text-3xl font-serif" data-testid="lead-name">{lead.name}</h1>
            <div className="text-sm text-muted-foreground mt-2">
              {lead.phone || "no phone"} · Source: {lead.source}
            </div>
            {lead.next_follow_up && (
              <div className="flex items-center gap-1.5 text-xs text-warning mt-2">
                <Calendar className="w-3.5 h-3.5" /> Follow up on {lead.next_follow_up}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="p-3 border border-border/60 hover:bg-secondary" data-testid="lead-call-btn">
                <Phone className="w-4 h-4" />
              </a>
            )}
            <button onClick={() => setEditOpen(true)} data-testid="lead-edit-btn"
              className="p-3 border border-border/60 hover:bg-secondary" title="Edit">
              <Pencil className="w-4 h-4" />
            </button>
            {canDelete && (
              <button onClick={() => setDeleteOpen(true)} data-testid="lead-delete-btn"
                className="p-3 border border-border/60 hover:bg-destructive hover:text-destructive-foreground" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Stage selector */}
        <div className="mt-6">
          <div className="label-over mb-2">Stage</div>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => (
              <button
                key={s.key} onClick={() => updateStage(s.key)}
                data-testid={`stage-${s.key}`}
                className={`text-[10px] uppercase tracking-widest px-2.5 py-1.5 border transition-colors ${
                  lead.stage === s.key ? s.color + " border-transparent" : "bg-white border-border/60 hover:bg-secondary"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Log a call */}
      <div className="bg-white border border-border/60 p-6 mb-6">
        <div className="label-over mb-3">Log call</div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest">Outcome</Label>
              <Select value={call.outcome} onValueChange={(v) => setCall({ ...call, outcome: v })}>
                <SelectTrigger data-testid="call-outcome" className="rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest">Next follow-up</Label>
              <Input type="date" data-testid="call-followup" value={call.next_follow_up} onChange={(e) => setCall({ ...call, next_follow_up: e.target.value })} className="rounded-none" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Remarks</Label>
            <Textarea data-testid="call-remarks" value={call.remarks} onChange={(e) => setCall({ ...call, remarks: e.target.value })} className="rounded-none" rows={3} placeholder="What did they say?" />
          </div>
          <Button onClick={logCall} disabled={posting} data-testid="log-call-btn" className="rounded-none w-full">
            <PhoneCall className="w-4 h-4 mr-1.5" />
            {posting ? "Saving..." : "Log call"}
          </Button>
        </div>
      </div>

      {/* Call history */}
      <div>
        <div className="label-over mb-2">Call history ({lead.call_logs?.length || 0})</div>
        <div className="bg-white border border-border/60 divide-y divide-border/60">
          {(lead.call_logs || []).map((c) => (
            <div key={c.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest font-medium">{c.outcome.replace("_", " ")}</span>
                <span className="text-xs text-muted-foreground font-mono">{new Date(c.date).toLocaleString()}</span>
              </div>
              {c.remarks && <div className="text-sm text-muted-foreground mt-1">{c.remarks}</div>}
            </div>
          ))}
          {(!lead.call_logs || lead.call_logs.length === 0) && (
            <div className="p-4 text-sm text-muted-foreground">No calls logged yet.</div>
          )}
        </div>
      </div>
      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <LeadEditDialog lead={lead} onSaved={() => { setEditOpen(false); load(); }} />
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{lead.name}</strong> and all their call history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none" data-testid="lead-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="lead-delete-confirm"
              className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LeadEditDialog({ lead, onSaved }) {
  const [form, setForm] = useState({
    name: lead.name, phone: lead.phone || "", email: lead.email || "",
    source: lead.source || "Website", notes: lead.notes || "",
    next_follow_up: lead.next_follow_up || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/leads/${lead.id}`, {
        ...form,
        next_follow_up: form.next_follow_up || null,
      });
      toast.success("Lead updated");
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <DialogContent className="rounded-none max-w-lg">
      <DialogHeader><DialogTitle className="font-serif text-2xl">Edit lead</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-widest">Name</Label>
          <Input data-testid="lead-edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest">Phone</Label>
            <Input data-testid="lead-edit-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-none" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Website", "Instagram", "Referral", "Google Ads", "Walk-in", "Other"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-none" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Next follow-up</Label>
          <Input type="date" data-testid="lead-edit-followup" value={form.next_follow_up || ""} onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })} className="rounded-none" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-none" rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !form.name} data-testid="lead-edit-save" className="rounded-none">
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
