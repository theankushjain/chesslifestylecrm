import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, Users, Target, IndianRupee, TrendingUp, PhoneCall, Circle } from "lucide-react";
import { Link } from "react-router-dom";

const SEVERITY = {
  high: { color: "border-l-destructive", label: "URGENT", tint: "text-destructive" },
  medium: { color: "border-l-warning", label: "SOON", tint: "text-warning" },
  low: { color: "border-l-muted-foreground", label: "INFO", tint: "text-muted-foreground" },
};

const ICONS = {
  unpaid_fee: IndianRupee,
  lead_followup: PhoneCall,
  attendance: AlertTriangle,
};

export default function Dashboard() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [a, s] = await Promise.all([api.get("/alerts"), api.get("/stats")]);
        setAlerts(a.data);
        setStats(s.data);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6 md:mb-10">
        <div className="label-over">Dashboard</div>
        <h1 className="text-4xl md:text-5xl font-serif">Good day, {user.name.split(" ")[0]}.</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what needs your attention today.</p>
      </div>

      {/* Alerts */}
      <section className="mb-8" data-testid="alerts-section">
        <div className="flex items-center justify-between mb-3">
          <div className="label-over">Alerts ({alerts.length})</div>
          <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : alerts.length === 0 ? (
          <div className="border border-border/60 p-6 text-sm text-muted-foreground bg-white">
            All caught up. No alerts right now.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => {
              const sev = SEVERITY[a.severity] || SEVERITY.low;
              const Icon = ICONS[a.type] || Circle;
              const link = a.type === "lead_followup" ? "/leads" :
                          a.type === "unpaid_fee" ? "/payments" : "/students";
              return (
                <Link key={a.id + a.type} to={link} data-testid={`alert-${a.type}-${a.id}`}
                  className={`flex items-start gap-3 p-4 bg-white border border-border/60 border-l-4 ${sev.color} hover:bg-secondary/40 transition-colors`}>
                  <Icon className={`w-4 h-4 mt-0.5 ${sev.tint}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-widest font-medium ${sev.tint}`}>{sev.label}</span>
                    </div>
                    <div className="font-medium text-sm mt-0.5">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{a.message}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Stats */}
      {stats && (
        <section className="mb-8">
          <div className="label-over mb-3">Overview</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60 border border-border/60">
            <StatCard icon={Users} label="Active students" value={stats.total_students} testid="stat-students" />
            <StatCard icon={Target} label="Total leads" value={stats.total_leads} sub={`${stats.hot_leads} hot`} testid="stat-leads" />
            <StatCard icon={IndianRupee} label="Month revenue" value={`₹${stats.month_revenue.toLocaleString('en-IN')}`} testid="stat-revenue" />
            <StatCard icon={AlertTriangle} label="Unpaid this month" value={stats.unpaid_count} testid="stat-unpaid" />
          </div>
        </section>
      )}

      {/* Funnel */}
      {stats && (
        <section>
          <div className="label-over mb-3">Lead pipeline</div>
          <div className="bg-white border border-border/60 p-4 md:p-6">
            <div className="space-y-3">
              {Object.entries(stats.funnel).map(([stage, count]) => {
                const total = Object.values(stats.funnel).reduce((s, v) => s + v, 0) || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={stage} data-testid={`funnel-${stage}`}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="uppercase tracking-widest">{stage.replace("_", " ")}</span>
                      <span className="font-mono">{count} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const StatCard = ({ icon: Icon, label, value, sub, testid }) => (
  <div className="bg-white p-4 md:p-6" data-testid={testid}>
    <div className="flex items-start justify-between">
      <div>
        <div className="label-over text-[9px]">{label}</div>
        <div className="text-2xl md:text-3xl font-serif mt-2">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </div>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
  </div>
);
