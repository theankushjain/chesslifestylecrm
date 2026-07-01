import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Phone, Calendar, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { STAGES } from "./Leads";

const OUTCOMES = ["answered", "no_answer", "interested", "not_interested", "voicemail", "busy"];

export default function LeadDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [lead, setLead] = useState(null);
  const [call, setCall] = useState({ outcome: "answered", remarks: "", next_follow_up: "" });
  const [posting, setPosting] = useState(false);

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
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="p-3 border border-border/60 hover:bg-secondary" data-testid="lead-call-btn">
              <Phone className="w-4 h-4" />
            </a>
          )}
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
    </div>
  );
}
