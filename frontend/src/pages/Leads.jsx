import { useEffect, useState, useMemo } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Phone, PhoneCall, ChevronRight, Calendar, Download, FileText, Printer, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { WhatsappIcon } from "@/components/crm/WhatsappIcon";
import { openWhatsapp, leadOutreachMessage } from "@/lib/whatsapp";
import { useAuth } from "@/context/AuthContext";
import { exportToCSV } from "@/lib/export";
import { generatePDF } from "@/lib/pdfExport";

export const STAGES = [
  { key: "new", label: "New", color: "bg-info text-white" },
  { key: "contacted", label: "Contacted", color: "bg-secondary text-foreground" },
  { key: "trial_scheduled", label: "Trial Scheduled", color: "bg-warning text-white" },
  { key: "trial_done", label: "Trial Done", color: "bg-primary text-primary-foreground" },
  { key: "enrolled", label: "Enrolled", color: "bg-success text-white" },
  { key: "not_interested", label: "Not Interested", color: "bg-muted text-muted-foreground" },
];

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedTag, setSelectedTag] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get("/leads");
    setLeads(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Compute most used tags across leads sorted by frequency
  const popularTags = useMemo(() => {
    const counts = {};
    leads.forEach((l) => {
      if (Array.isArray(l.tags)) {
        l.tags.forEach((t) => {
          const trimmed = (t || "").trim();
          if (trimmed) {
            const lower = trimmed.toLowerCase();
            if (!counts[lower]) {
              counts[lower] = { name: trimmed, count: 0 };
            }
            counts[lower].count += 1;
          }
        });
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [leads]);

  const filtered = leads.filter((l) => {
    const matchesStage = filter === "all" || l.stage === filter;
    const matchesTag = !selectedTag || (
      Array.isArray(l.tags) && l.tags.some((t) => (t || "").trim().toLowerCase() === selectedTag.toLowerCase())
    );
    return matchesStage && matchesTag;
  });

  const grouped = STAGES.reduce((acc, s) => {
    acc[s.key] = leads.filter((l) => {
      const matchesStage = l.stage === s.key;
      const matchesTag = !selectedTag || (
        Array.isArray(l.tags) && l.tags.some((t) => (t || "").trim().toLowerCase() === selectedTag.toLowerCase())
      );
      return matchesStage && matchesTag;
    });
    return acc;
  }, {});

  const handleExportPDF = () => {
    const head = ["Name", "Phone Number", "Stage", "Tags", "Last Call", "Outcome and Remarks"];
    const body = filtered.map(l => {
      const stageObj = STAGES.find(s => s.key === l.stage);
      const stageLabel = stageObj ? stageObj.label : l.stage;
      
      const lastCall = l.call_logs?.[0];
      const lastCallDate = lastCall ? new Date(lastCall.date).toLocaleDateString() : "-";
      let outcomeStr = "-";
      if (lastCall) {
        outcomeStr = lastCall.outcome;
        if (lastCall.remarks) outcomeStr += `: ${lastCall.remarks}`;
      }

      return [
        l.name,
        l.phone || "-",
        stageLabel,
        Array.isArray(l.tags) && l.tags.length > 0 ? l.tags.join(", ") : "-",
        lastCallDate,
        outcomeStr
      ];
    });

    const filterLabel = filter === "all" ? "All Stages" : STAGES.find(s => s.key === filter)?.label || filter;
    const tagLabel = selectedTag ? ` • Tag: #${selectedTag}` : "";
    generatePDF({
      title: `Current Leads Summary (${filterLabel}${tagLabel})`,
      filename: `leads_summary_${filter}${selectedTag ? `_${selectedTag}` : ""}.pdf`,
      summary: [
        `Total Leads in this view: ${filtered.length}`,
        `Action suggestions are based on the scheduled follow-up dates.`
      ],
      head,
      body,
      orientation: "landscape"
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="label-over">Pipeline</div>
          <h1 className="text-4xl font-serif">Leads</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === "admin" && (
            <>
              <Button variant="outline" onClick={() => exportToCSV(leads, "leads_report.csv")} className="rounded-xl h-10">
                <Download className="w-4 h-4 mr-1.5" /> Export
              </Button>
              <Button variant="outline" onClick={handleExportPDF} className="rounded-xl h-10">
                <FileText className="w-4 h-4 mr-1.5" /> PDF
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => window.open("/print-blank-form", "_blank")} className="rounded-xl h-10" title="Download blank registration form PDF">
            <Printer className="w-4 h-4 mr-1.5" /> Blank Form
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-lead-btn" className="rounded-xl h-10">
              <Plus className="w-4 h-4 mr-1.5" /> Add
            </Button>
          </DialogTrigger>
          <LeadDialog onSaved={() => { setOpen(false); load(); }} />
        </Dialog>
        </div>
      </div>

      {/* Stage filter chips */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} testid="filter-all">
          All ({leads.length})
        </FilterChip>
        {STAGES.map((s) => (
          <FilterChip key={s.key} active={filter === s.key} onClick={() => setFilter(s.key)} testid={`filter-${s.key}`}>
            {s.label} ({grouped[s.key].length})
          </FilterChip>
        ))}
      </div>

      {/* Most Used Tags Filter Bar */}
      {popularTags.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground mr-1 text-[11px] uppercase tracking-wider font-semibold shrink-0">
            <Tag className="w-3.5 h-3.5" />
            <span>Tags:</span>
          </div>

          <button
            onClick={() => setSelectedTag(null)}
            className={`shrink-0 text-xs px-2.5 py-1 rounded-lg border transition-all ${
              !selectedTag
                ? "bg-secondary text-foreground font-semibold border-border shadow-xs"
                : "bg-white text-muted-foreground border-border/60 hover:bg-secondary/40"
            }`}
          >
            All Tags
          </button>

          {popularTags.map(({ name, count }) => {
            const isSelected = selectedTag?.toLowerCase() === name.toLowerCase();
            return (
              <button
                key={name}
                onClick={() => setSelectedTag(isSelected ? null : name)}
                className={`shrink-0 text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-white text-muted-foreground border-border/60 hover:border-primary/50 hover:text-foreground"
                }`}
              >
                <span>#{name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
                {isSelected && <X className="w-3 h-3 ml-0.5 opacity-80 hover:opacity-100" />}
              </button>
            );
          })}

          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="text-[11px] text-muted-foreground hover:text-rose-600 transition-colors ml-1 underline shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="bg-white border border-border/40 shadow-sm rounded-xl divide-y divide-border/60" data-testid="leads-list">
          {filtered.map((l) => {
            const stage = STAGES.find((s) => s.key === l.stage);
            const lastCall = l.call_logs?.[0];
            const followUpOverdue = l.next_follow_up && new Date(l.next_follow_up) < new Date();
            return (
              <div key={l.id} className="flex items-center gap-3 hover:bg-secondary/50 transition-colors">
                <Link to={`/leads/${l.id}`} data-testid={`lead-row-${l.id}`}
                  className="flex-1 min-w-0 p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-medium flex items-center gap-2 truncate">
                    {l.name}
                    {Array.isArray(l.tags) && l.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        {l.tags.slice(0, 3).map((t, i) => {
                          const isTagActive = selectedTag?.toLowerCase() === (t || "").trim().toLowerCase();
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedTag(isTagActive ? null : (t || "").trim());
                              }}
                              title={`Filter by tag: #${t}`}
                              className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold transition-colors ${
                                isTagActive
                                  ? "bg-primary text-primary-foreground shadow-xs font-bold ring-1 ring-primary"
                                  : "bg-primary/10 text-primary hover:bg-primary/20"
                              }`}
                            >
                              #{t}
                            </button>
                          );
                        })}
                        {l.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{l.tags.length - 3}</span>}
                      </span>
                    )}
                  </div>
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
            <div className="p-8 text-center text-sm text-muted-foreground space-y-2">
              <p>
                No leads found
                {filter !== "all" ? ` in stage "${STAGES.find((s) => s.key === filter)?.label || filter}"` : ""}
                {selectedTag ? ` with tag #${selectedTag}` : ""}.
              </p>
              {(filter !== "all" || selectedTag) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilter("all");
                    setSelectedTag(null);
                  }}
                  className="rounded-xl text-xs h-8"
                >
                  Reset Filters
                </Button>
              )}
            </div>
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
  const [form, setForm] = useState({ name: "", phone: "", email: "", source: "Website", stage: "new", notes: "", tags: [] });
  const [tagsStr, setTagsStr] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const payload = { 
        ...form, 
        tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean) 
      };
      await api.post("/leads", payload);
      toast.success("Lead added");
      onSaved();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };
  return (
    <DialogContent className="rounded-xl max-w-lg">
      <DialogHeader><DialogTitle className="font-serif text-2xl">New lead</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="text-xs uppercase tracking-widest">Name</Label>
          <Input data-testid="lead-form-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-widest">Phone</Label>
            <Input data-testid="lead-form-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest">Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Website", "Instagram", "Referral", "Google Ads", "Walk-in", "Other"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Tags (comma-separated)</Label>
          <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="e.g. high-priority, tournament" className="rounded-xl" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-widest">Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl" rows={3} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving || !form.name} data-testid="lead-form-save" className="rounded-xl">
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
