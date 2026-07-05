import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, IndianRupee, Trash2, Wand2 } from "lucide-react";
import { WhatsappIcon } from "@/components/crm/WhatsappIcon";
import { openWhatsapp, studentReminderMessage } from "@/lib/whatsapp";
import { toast } from "sonner";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    const [p, s] = await Promise.all([api.get("/payments"), api.get("/students")]);
    setPayments(p.data);
    setStudents(Object.fromEntries(s.data.map((x) => [x.id, x])));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const now = new Date();
  const filtered = payments.filter((p) => {
    if (filter === "unpaid") return p.status === "unpaid" || p.status === "overdue";
    if (filter === "paid") return p.status === "paid";
    if (filter === "this_month") return p.month === now.getMonth() + 1 && p.year === now.getFullYear();
    return true;
  });

  const markPaid = async (pid) => {
    try {
      await api.patch(`/payments/${pid}`, { status: "paid", method: "UPI" });
      toast.success("Marked paid");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const generateFees = async () => {
    setGenerating(true);
    try {
      const res = await api.post("/payments/generate");
      toast.success(`Generated ${res.data.generated} fee records for this month`);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setGenerating(false); }
  };

  const deletePayment = async (pid) => {
    if (!confirm("Are you sure you want to delete this payment record?")) return;
    try {
      await api.delete(`/payments/${pid}`);
      toast.success("Payment deleted");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const totalUnpaid = payments.filter((p) => p.status !== "paid")
    .reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter((p) => p.status === "paid" && p.month === now.getMonth() + 1 && p.year === now.getFullYear())
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="label-over">Ledger</div>
          <h1 className="text-4xl font-serif">Fees</h1>
        </div>
        <Button onClick={generateFees} disabled={generating} data-testid="generate-fees-btn" className="rounded-none h-10">
          <Wand2 className="w-4 h-4 mr-1.5" /> {generating ? "Generating..." : "Generate Month Fees"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border/60 border border-border/60 mb-6">
        <div className="bg-white p-4 md:p-6" data-testid="totals-paid">
          <div className="label-over text-[9px]">Collected this month</div>
          <div className="text-2xl md:text-3xl font-serif mt-2 flex items-center">
            <IndianRupee className="w-5 h-5 mr-0.5" />{totalPaid.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-white p-4 md:p-6" data-testid="totals-unpaid">
          <div className="label-over text-[9px]">Total pending</div>
          <div className="text-2xl md:text-3xl font-serif mt-2 flex items-center text-destructive">
            <IndianRupee className="w-5 h-5 mr-0.5" />{totalUnpaid.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {[["all", "All"], ["unpaid", "Unpaid"], ["paid", "Paid"], ["this_month", "This month"]].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} data-testid={`filter-${k}`}
            className={`shrink-0 text-xs uppercase tracking-widest px-3 py-1.5 border ${
              filter === k ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border/60"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : (
        <div className="bg-white border border-border/60 divide-y divide-border/60" data-testid="payments-list">
          {filtered.map((p) => {
            const s = students[p.student_id];
            return (
              <div key={p.id} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{s?.name || "?"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {monthName(p.month)} {p.year} · <span className="font-mono">₹{p.amount}</span>
                  </div>
                </div>
                {p.status === "paid" ? (
                  <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-success">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                  </div>
                ) : (
                  <>
                    <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 ${
                      p.status === "overdue" ? "bg-destructive text-destructive-foreground" : "bg-warning text-white"
                    }`}>{p.status}</span>
                    <Button size="sm" variant="outline" onClick={() => markPaid(p.id)} data-testid={`pay-${p.id}`} className="rounded-none">
                      Mark paid
                    </Button>
                    {(s?.parent_phone || s?.phone) && (
                      <button
                        onClick={() => openWhatsapp(s.parent_phone || s.phone, studentReminderMessage(s, p))}
                        className="p-2 border border-border/60 text-[#25D366] hover:bg-[#25D366]/10"
                        title="Send WhatsApp Reminder">
                        <WhatsappIcon className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => deletePayment(p.id)} className="p-2 ml-1 text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/30" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nothing here.</div>}
        </div>
      )}
    </div>
  );
}

const monthName = (m) => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1];
