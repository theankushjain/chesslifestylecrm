import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, XCircle, Clock, IndianRupee } from "lucide-react";

export default function StudentPortal() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [s, a, p] = await Promise.all([
        api.get("/students"), api.get("/attendance"), api.get("/payments"),
      ]);
      setStudent(s.data[0]);
      setAttendance(a.data);
      setPayments(p.data);
    };
    load();
  }, []);

  if (!student) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;

  const present = attendance.filter((a) => a.status === "present").length;
  const absent = attendance.filter((a) => a.status === "absent").length;
  const rate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="label-over">Student Portal</div>
        <h1 className="text-4xl font-serif">Hi, {user.name.split(" ")[0]}</h1>
      </div>

      <div className="bg-white border border-border/60 p-6 mb-6">
        <div className="label-over mb-2">You</div>
        <div className="text-2xl font-serif">{student.name}</div>
        <div className="text-sm text-muted-foreground mt-1">{student.level} · ₹{student.monthly_fee}/month</div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border/60 border border-border/60 mb-6">
        <div className="bg-white p-4">
          <div className="label-over text-[9px]">Attendance</div>
          <div className="text-2xl font-serif mt-1">{rate}%</div>
        </div>
        <div className="bg-white p-4">
          <div className="label-over text-[9px]">Present</div>
          <div className="text-2xl font-serif mt-1 text-success">{present}</div>
        </div>
        <div className="bg-white p-4">
          <div className="label-over text-[9px]">Absent</div>
          <div className="text-2xl font-serif mt-1 text-destructive">{absent}</div>
        </div>
      </div>

      <div className="mb-6">
        <div className="label-over mb-2">Fees</div>
        <div className="bg-white border border-border/60 divide-y divide-border/60">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium">{monthName(p.month)} {p.year}</div>
                <div className="text-xs text-muted-foreground font-mono">₹{p.amount}</div>
              </div>
              <span className={`text-xs uppercase tracking-widest ${p.status === "paid" ? "text-success" : "text-destructive"}`}>
                {p.status}
              </span>
            </div>
          ))}
          {payments.length === 0 && <div className="p-4 text-sm text-muted-foreground">No records.</div>}
        </div>
      </div>

      <div>
        <div className="label-over mb-2">Recent classes</div>
        <div className="bg-white border border-border/60 divide-y divide-border/60">
          {attendance.slice(0, 10).map((a) => {
            const Icon = a.status === "present" ? CheckCircle2 : a.status === "absent" ? XCircle : Clock;
            const color = a.status === "present" ? "text-success" : a.status === "absent" ? "text-destructive" : "text-warning";
            return (
              <div key={a.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <div>
                    <div className="text-sm">{a.date}</div>
                    <div className="text-xs text-muted-foreground">{a.topic}</div>
                  </div>
                </div>
                <span className="text-xs uppercase tracking-widest">{a.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const monthName = (m) => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1];
