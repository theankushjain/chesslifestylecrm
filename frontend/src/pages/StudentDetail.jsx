import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, CheckCircle2, XCircle, Clock, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_ICONS = {
  present: { icon: CheckCircle2, color: "text-success" },
  absent: { icon: XCircle, color: "text-destructive" },
  late: { icon: Clock, color: "text-warning" },
};

export default function StudentDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);

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
            <div className="label-over">{student.level}</div>
            <h1 className="text-3xl font-serif" data-testid="student-name">{student.name}</h1>
            <div className="mt-2 text-sm text-muted-foreground space-y-0.5">
              <div>{student.phone || "no phone"}</div>
              <div>Parent: {student.parent_name || "—"} · {student.parent_phone || "—"}</div>
              <div className="font-mono">₹{student.monthly_fee}/month</div>
            </div>
          </div>
          {student.phone && (
            <a href={`tel:${student.phone}`} className="p-3 border border-border/60 hover:bg-secondary" data-testid="student-call-btn">
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

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
              {p.status !== "paid" ? (
                <Button size="sm" variant="outline" onClick={() => markPaid(p.id)} data-testid={`mark-paid-${p.id}`} className="rounded-none">Mark paid</Button>
              ) : (
                <span className="text-xs text-success uppercase tracking-widest">Paid</span>
              )}
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
