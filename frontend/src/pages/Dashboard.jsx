import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, Users, Target, IndianRupee, TrendingUp, PhoneCall, Circle, Cake, CalendarDays, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { subscribeUserToPush } from "@/lib/push";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing } from "lucide-react";

const SEVERITY = {
  high: { color: "border-l-destructive", label: "URGENT", tint: "text-destructive" },
  medium: { color: "border-l-warning", label: "SOON", tint: "text-warning" },
  low: { color: "border-l-muted-foreground", label: "INFO", tint: "text-muted-foreground" },
};

const ICONS = {
  unpaid_fee: IndianRupee,
  lead_followup: PhoneCall,
  attendance: AlertTriangle,
  birthday: Cake,
};

export default function Dashboard() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [todayClasses, setTodayClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifState, setNotifState] = useState('Notification' in window ? Notification.permission : 'unsupported');

  const handleNotificationClick = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      setNotifState(perm);
      if (perm === 'granted') {
        subscribeUserToPush();
      }
    } else if (Notification.permission === 'granted') {
      // Already granted, just ensure subscribed
      subscribeUserToPush();
    }
  };

  const migrateAdvikProgress = async () => {
    try {
      const { data: students } = await api.get("/students");
      const advik = students.find(s => s.name.toLowerCase().includes("advik"));
      if (!advik) {
        alert("Advik not found");
        return;
      }
      const { data: progress } = await api.get(`/students/${advik.id}/progress`);
      let outcomes = [...progress.outcomes];
      
      let startIndex = outcomes.findIndex(o => o.text.includes('Mate-in-Two: Apply the CCT framework'));
      if (startIndex === -1) {
        for (let i = outcomes.length - 1; i >= 0; i--) {
          if (outcomes[i].module && outcomes[i].module.includes("Module 9")) {
            startIndex = i;
            break;
          }
        }
      }
      
      if (startIndex === -1) {
        alert("Module 9 not found in progress");
        return;
      }
      
      const targetDates = [];
      let current = new Date(2026, 7, 15); // Aug 15 2026
      const stop = new Date(2026, 3, 4); // Apr 4 2026

      for (let i = 0; i <= startIndex; i++) {
        targetDates.push(new Date(current));
        if (current > stop) {
          current.setDate(current.getDate() - 1);
          while (current.getDay() !== 0 && current.getDay() !== 6) {
            current.setDate(current.getDate() - 1);
          }
        }
      }
      
      for (let i = startIndex, j = 0; i >= 0; i--, j++) {
        const d = targetDates[j];
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        outcomes[i].completed = true;
        outcomes[i].completed_date = `${y}-${m}-${day}`;
      }
      
      await api.put(`/students/${advik.id}/progress`, { outcomes });
      alert("Advik's progress updated successfully! Please verify it.");
    } catch (e) {
      console.error(e);
      alert("Failed to migrate: " + e.message);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [a, s, t] = await Promise.all([
          api.get("/alerts"), api.get("/stats"), api.get("/schedule/today")
        ]);
        setAlerts(a.data);
        setStats(s.data);
        setTodayClasses(t.data);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="label-over">Dashboard</div>
          <h1 className="text-4xl md:text-5xl font-serif">Good day, {user.name.split(" ")[0]}.</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what needs your attention today.</p>
        </div>
        
        {notifState !== 'unsupported' && (
          <Button 
            variant="outline" 
            onClick={handleNotificationClick}
            disabled={notifState === 'denied'}
            className={`rounded-none flex items-center gap-2 ${notifState === 'granted' ? 'border-primary text-primary' : ''}`}
          >
            {notifState === 'granted' && <><BellRing className="w-4 h-4" /> Notifications Enabled</>}
            {notifState === 'default' && <><Bell className="w-4 h-4" /> Enable Notifications</>}
            {notifState === 'denied' && <><BellOff className="w-4 h-4" /> Notifications Blocked</>}
          </Button>
        )}
        
        <Button variant="default" onClick={migrateAdvikProgress} className="rounded-none">
          Migrate Advik Progress
        </Button>
      </div>

      {/* Today's Classes */}
      <section className="mb-8" data-testid="today-classes-section">
        <div className="flex items-center justify-between mb-3">
          <div className="label-over">Today's classes ({todayClasses.length})</div>
          <Link to="/classes" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            All batches →
          </Link>
        </div>
        {todayClasses.length === 0 ? (
          <div className="border border-border/60 p-4 text-sm text-muted-foreground bg-white">
            No classes scheduled today. Enjoy the break.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {todayClasses.map((c) => (
              <Link key={c.id} to={`/classes/${c.id}`} data-testid={`today-class-${c.id}`}
                className="flex items-center gap-3 p-4 bg-white border border-border/60 hover:border-primary transition-colors group">
                <div className="w-12 h-12 bg-primary text-primary-foreground flex flex-col items-center justify-center shrink-0">
                  <div className="text-[9px] uppercase tracking-widest opacity-70 leading-none">Class</div>
                  <CalendarDays className="w-4 h-4 mt-0.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.time} · {c.duration_min}m</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.student_count}</span>
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
                  Take →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

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
                          a.type === "unpaid_fee" ? "/payments" :
                          a.type === "birthday" ? `/students/${a.student_id}` : "/students";
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
