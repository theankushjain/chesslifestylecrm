import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Phone, PhoneCall, ChevronRight, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { WhatsappIcon } from "@/components/crm/WhatsappIcon";
import { openWhatsapp, leadOutreachMessage } from "@/lib/whatsapp";

export const STAGES = [
  { key: "new", label: "New", color: "bg-info text-white" },
  { key: "contacted", label: "Contacted", color: "bg-secondary text-foreground" },
  { key: "trial_scheduled", label: "Trial Scheduled", color: "bg-warning text-white" },
  { key: "trial_done", label: "Trial Done", color: "bg-primary text-primary-foreground" },
  { key: "enrolled", label: "Enrolled", color: "bg-success text-white" },
  { key: "not_interested", label: "Not Interested", color: "bg-muted text-muted-foreground" },
];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get("/leads");
    setLeads(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? leads : leads.filter((l) => l.stage === filter);
  const grouped = STAGES.reduce((acc, s) => {
    acc[s.key] = leads.filter((l) => l.stage === s.key);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="label-over">Pipeline</div>
          <h1 className="text-4xl font-serif">Leads</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-lead-btn" className="rounded-none h-10">
              <Plus className="w-4 h-4 mr-1.5" /> Add
            </Button>
          </DialogTrigger>
          <LeadDialog onSaved={() => { setOpen(false); load(); }} />
        </Dialog>
      </div>

      {/* Stage filter chips */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} testid="filter-all">
          All ({leads.length})
        </FilterChip>
        {STAGES.map((s) => (
          <FilterChip key={s.key} active={filter === s.key} onClick={() => setFilter(s.key)} testid={`filter-${s.key}`}>
            {s.label} ({grouped[s.key].length})
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="bg-white border border-border/60 divide-y divide-border/60" data-testid="leads-list">
          {filtered.map((l) => {
            const stage = STAGES.find((s) => s.key === l.stage);
            const lastCall = l.call_logs?.[0];
            const followUpOverdue = l.next_follow_up && new Date(l.next_follow_up) < new Date();
            return (
              <div key={l.id} className="flex items-center gap-3 hover:bg-secondary/50 transition-colors">
                <Link to={`/leads/${l.id}`} data-testid={`lead-row-${l.id}`}
                  className="flex-1 min-w-0 p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium">{l.name}</div>
                    <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 ${stage?.color}`}>{stage?.label}</span>
                    {followUpOverdue && (
                      <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 bg-destructive text-destructive-foreground">Follow-up</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {l.phone || "no phone"} · {l.source}
                  </div>
                  {lastCall && (
                    <div className="text-xs text-muted-foreground mt-1 italic truncate">
                      &ldquo;{lastCall.remarks || lastCall.outcome}&rdquo;
                    </div>
                  )}
                </Link>
                <div className="flex items-center gap-1 pr-4 shrink-0">
                  {l.phone && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation();
                        const ok = openWhatsapp(l.phone, leadOutreachMessage(l));
                        if (!ok) toast.error("No valid phone number");
                      }}
                      data-testid={`whatsapp-lead-${l.id}`}
                      title="Send WhatsApp"
                      className="p-1.5 text-[#25D366] hover:bg-[#25D366]/10 rounded transition-colors">
                      <WhatsappIcon className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No leads in this stage.</div>
          )}
        </div>
      )}
    </div>
  );
}

const FilterChip = ({ active, onClick, children, testid }) => (
  <button onClick={onClick} data-testid={testid}
    className={`shrink-0 text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${
      active ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border/60 hover:bg-secondary"
    }`}>
    {children}
  </button>
);

function LeadDialog({ onSaved }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", source: "Website", stage: "new", notes: "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await api.post("/leads", form);
      toast.success("Lead added");
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };
  return (
    <DialogContent className="rounded-none max-w-lg">
      <DialogHeader><DialogTitle className="font-serif text-2xl">New lead</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-widest">Name</Label>
          <Input data-testid="lead-form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest">Phone</Label>
            <Input data-testid="lead-form-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-none" />
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
          <Label className="text-xs uppercase tracking-widest">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-none" rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !form.name} data-testid="lead-form-save" className="rounded-none">
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
